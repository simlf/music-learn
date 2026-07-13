# Phase 8: User Setup Required

**Generated:** 2026-07-13
**Phase:** 08-progress-streaks
**Status:** Incomplete

Complete these items for the backend to function. Claude automated everything possible; this item requires a developer-chosen secret that Claude cannot invent.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `API_TOKEN` | Developer-chosen random string, e.g. output of `openssl rand -hex 32` | Server environment (wired to `.env` / docker compose in 08-02) |

## Notes

- The backend (D-03) uses a single static shared-secret bearer token. The server refuses to start when `API_TOKEN` is unset or empty.
- The same value is entered once per device on the client (stored in localStorage) in a later plan of this phase.
- Never commit the token value to the repository.

## Verification

After choosing a token, verify the server boots and answers its health probe:

```bash
API_TOKEN=your-token npm --prefix server run dev
# in another terminal:
node -e "fetch('http://localhost:8080/health').then(r => console.log(r.status))"
```

Expected results:
- Server starts without the API_TOKEN error and logs its listen address.
- The health probe prints `200`.

---

**Once all items complete:** Mark status as "Complete" at top of file.
