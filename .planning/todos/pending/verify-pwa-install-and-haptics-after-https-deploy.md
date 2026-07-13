---
created: 2026-07-14
source: phase-09 execution checkpoints (09-04, 09-05)
area: mobile
---

# Verify PWA install and key haptics after the HTTPS deploy

During Phase 9 execution the user could not install the PWA on the phone: the app is only served over plain HTTP locally, and Add to Home Screen standalone install requires HTTPS (PLAT-02 deploy, which the user handles himself per the phase scope note). Because install was impossible, the 09-04 haptic feedback (navigator.vibrate on key taps) also went unverified on a real Android device.

After the app is live on the Oracle server over HTTPS:

1. Install the PWA from the phone browser (Add to Home Screen). Confirm it opens standalone (no browser chrome) with the Print Shop "ML" icon and ink theme color, and that the maskable icon is not cropped or stretched.
2. On /drills with a construction question, tap keys and confirm the light haptic buzz fires on Android (Vibration API). No-op on iOS is expected and fine.
3. While there, re-confirm double-tap does not zoom and long-press shows no callout on the keyboard.

Related deploy-time blocker already tracked in STATE.md: CORS_ORIGIN must exactly match the deployed frontend origin (Phase 8 UAT hit this), and the 08-REVIEW.md CR-02 ./data bind-mount ownership check on the Oracle host.
