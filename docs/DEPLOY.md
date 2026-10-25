# Deploying music-learn

Production runs as a two-container `docker compose` stack on the personal
Oracle VM, reachable over the tailnet only:

**https://your-host.your-tailnet.ts.net:8091**

The machine's tailnet hostname is `infra`. `infrabox667` is a local ssh-config
alias for the same box, not a name that resolves anywhere else.

The `deploy` workflow (`.github/workflows/deploy.yml`) runs gate tests, builds
both images and pushes them to GHCR, then SSHes into the VM and redeploys. The
`ci` workflow builds no images at all -- it only runs tests and `svelte-check`.
This file covers the one-time setup CI cannot do for you.

Requires Docker Compose v2.24 or newer on the VM (`docker compose version`);
`docker-compose.prod.yml` uses the `env_file:` long syntax, which older
versions reject at parse time.

The VM's `ubuntu` user is not in the `docker` group, so every docker command
below is run through `sudo` -- same as the deploy workflow does.

## Required GitHub repo secrets

Settings -> Secrets and variables -> Actions:

- `SSH_HOST` - tailnet address of the VM (its Tailscale IP or MagicDNS name).
  SSH is reachable only from the tailnet; the `infrabox667` ssh-config alias
  does not resolve inside GitHub Actions.
- `SSH_USER` - login user on the VM.
- `SSH_PORT` - SSH port.
- `SSH_KEY`  - a private key whose public half is in the VM user's
  `~/.ssh/authorized_keys`.
- `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` - a Tailscale OAuth client with the
  `auth_keys` scope that owns `tag:ci-deploy`. The deploy job uses it to join
  the tailnet as an ephemeral `tag:ci-deploy` node before SSHing in; the
  tailnet ACL must let `tag:ci-deploy` reach the VM's SSH port.

Pushing and pulling images uses the built-in `GITHUB_TOKEN` - no PAT secret
needed. The deploy job logs in to GHCR with an ephemeral token and logs out
again in the same step, so no long-lived registry credential is stored on the
VM.

## One-time VM bootstrap

1. Create the deploy directory the workflow cd's into:
   ```
   mkdir -p ~/music-learn/data
   cd ~/music-learn
   ```
   The `api` container runs as a non-root user, and the `./data:/data` bind
   mount hides the image's own ownership of `/data`. So the container cannot
   write `music-learn.db` unless the host `data` dir is writable by the
   container's user. Discover its uid and chown the dir once (run after
   step 4, when the image can be pulled):
   ```
   uid=$(sudo docker run --rm ghcr.io/simlf/music-learn-api:latest id -u)
   sudo chown -R "$uid" ~/music-learn/data
   ```
   Symptom if skipped: the api container restarts in a loop with a
   `SQLITE_CANTOPEN` / EACCES error on `/data/music-learn.db`.
2. Copy `docker-compose.prod.yml` from the repo into `~/music-learn/`.
3. Create `~/music-learn/.env`:
   ```
   API_TOKEN=<your-shared-secret>
   WEB_PORT=127.0.0.1:8091
   ```
   `WEB_PORT` is interpolated straight into the `web` service's port mapping
   (`docker-compose.prod.yml`: `'${WEB_PORT:-8090}:80'`), so it accepts a
   `host:port` pair, not just a port. Binding to `127.0.0.1` keeps the
   container off the VM's public interfaces and lets Tailscale terminate TLS
   in front of it (see TLS below). Port 8091 rather than the compose default
   8090 because another stack on the VM already holds 8090.

   `CORS_ORIGIN` is not needed here: in production the browser calls the API
   through the `web` container's same-origin `/api` proxy (`nginx.conf`), so
   the api's `@fastify/cors` origin check is never exercised. It only matters
   if you ever point a browser at the api service cross-origin.
4. Authenticate to GHCR so you can pull the private images by hand -- needed
   for step 1's `docker run` and for a manual rollback, but *not* for normal
   deploys, which bring their own token. Create a GitHub PAT (classic) with
   scope `read:packages`, then:
   ```
   echo <PAT> | sudo docker login ghcr.io -u simlf --password-stdin
   ```

## Deploying

The `deploy` workflow triggers two ways:

- automatically on every push to `main` whose changes are not confined to
  `**.md`, `.planning/**` or `docs/**` (see the workflow's `paths-ignore`),
  so **merging a code PR to `main` deploys production**;
- manually: GitHub -> Actions -> "deploy" -> Run workflow.

Either way it runs the gate (root tests, `svelte-check`, server tests), builds
and pushes both `linux/arm64` images, then redeploys the VM with
`docker compose pull` + `up -d`. The gate is skipped only when the merge
commit's tree is identical to the PR head that already passed the `test`
check. Every run first waits 10 minutes in the `main-debounce` environment,
where a newer merge cancels it; see [CI cost](../README.md#ci-cost).

## Rollback

Images are also tagged with the commit sha. On the VM:
```
sudo IMAGE_TAG=<old-sha> docker compose -f docker-compose.prod.yml up -d
```

## TLS / HTTPS

The stack itself speaks plain HTTP; the `web` container is bound to loopback
and Tailscale terminates TLS in front of it, one command per port:
```
sudo tailscale serve --bg --https=8091 http://127.0.0.1:8091
```
That is what makes the site reachable at
`https://your-host.your-tailnet.ts.net:8091`, and it is also what the installable
PWA depends on -- service worker registration and Add to Home Screen both
require a secure origin.

Renaming the machine in Tailscale wipes its `serve` config; re-run the command
above if the URL stops resolving.
