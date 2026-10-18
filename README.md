# Music Learn

Jazz piano theory companion. Deployment is described in [docs/DEPLOY.md](docs/DEPLOY.md).

## CI cost

Tests (`ci`, `visual`) run on pull requests only, not again on push to `main`.
The `deploy` workflow on `main` starts with a no-op `debounce` job bound to the
`main-debounce` environment, and its concurrency group cancels any older run
still waiting, so a burst of merges deploys once, for the last merge.

The `main-debounce` environment must have a 10-minute wait timer (a wait uses
no runner minutes). Set it once:

```sh
gh api -X PUT repos/<owner>/<repo>/environments/main-debounce -F wait_timer=10
```
