# Music Learn

Jazz piano theory companion. Deployment is described in [docs/DEPLOY.md](docs/DEPLOY.md).

## CI cost

Tests (`ci`, `visual`) run on pull requests only, not again on push to `main`.
The `deploy` workflow on `main` starts with a no-op `debounce` job bound to the
`main-debounce` environment. That job's concurrency group cancels an older run
still waiting there, so a burst of merges deploys once, for the last merge.
A running build or deploy is never cancelled: `build-push` and `deploy` each
have their own non-cancelling group, so a newer run queues behind an in-flight
one, and a newer pending job may replace an older pending one (it ships the
newer image tag). A push-triggered `deploy` skips its SSH step, yet still ends
green, when `main` already holds a newer commit touching non-doc files; check
the "Skip if a newer commit" step log before assuming a green run deployed.

The `main-debounce` environment must have a 10-minute wait timer (a wait uses
no runner minutes). Set it once:

```sh
gh api -X PUT repos/<owner>/<repo>/environments/main-debounce -F wait_timer=10
```
