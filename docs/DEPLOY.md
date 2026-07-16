# Deploying music-learn to infrabox667

CI builds two images and pushes them to GHCR; a manual GitHub Actions run
("deploy" workflow) SSHes into the VM and redeploys. This file covers the
one-time setup CI cannot do for you.

Requires Docker Compose v2.24 or newer on the VM (`docker compose version`);
`docker-compose.prod.yml` uses the `env_file:` long syntax, which older
versions reject at parse time.

## Required GitHub repo secrets

Settings -> Secrets and variables -> Actions:

- `SSH_HOST` - real IP or DNS of the VM (the local `infrabox667` ssh-config
  alias does NOT resolve inside GitHub Actions).
- `SSH_USER` - login user on the VM.
- `SSH_PORT` - SSH port (usually 22).
- `SSH_KEY`  - a private key whose public half is in the VM user's
  `~/.ssh/authorized_keys`.

Pushing images uses the built-in `GITHUB_TOKEN` - no secret needed.

## One-time VM bootstrap (run on infrabox667)

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
   uid=$(docker run --rm ghcr.io/simlf/music-learn-api:latest id -u)
   sudo chown -R "$uid" ~/music-learn/data
   ```
   Symptom if skipped: the api container restarts in a loop with a
   `SQLITE_CANTOPEN` / EACCES error on `/data/music-learn.db`.
2. Copy `docker-compose.prod.yml` from the repo into `~/music-learn/`.
3. Create `~/music-learn/.env`:
   ```
   API_TOKEN=<your-shared-secret>
   WEB_PORT=8090
   ```
   Pick a `WEB_PORT` that does not clash with other stacks on the VM.
4. Authenticate to GHCR so the VM can pull the private images. Create a GitHub
   PAT (classic) with scope `read:packages`, then:
   ```
   echo <PAT> | docker login ghcr.io -u simlf --password-stdin
   ```

## Deploying

1. Merge to `main`; confirm the `ci` workflow is green.
2. GitHub -> Actions -> "deploy" -> Run workflow.
3. It runs tests, builds+pushes both images, then redeploys the VM.

## Rollback

Images are also tagged with the commit sha. On the VM:
```
IMAGE_TAG=<old-sha> docker compose -f docker-compose.prod.yml up -d
```

## TLS / HTTPS

Not handled here. Front the `web` container with whatever reverse proxy the
VM already uses for its other stacks (e.g. a shared nginx/Caddy/Traefik), or
add one as a follow-up.
