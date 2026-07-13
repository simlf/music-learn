---
status: testing
phase: 09-deploy-to-the-piano
source: [09-VERIFICATION.md]
started: 2026-07-13T23:53:16.300Z
updated: 2026-07-13T23:53:16.300Z
---

## Current Test

number: 1
name: PWA installs to the home screen and opens standalone
expected: |
  After the HTTPS deploy on the Oracle server: Add to Home Screen from the phone
  browser installs the app with the Print Shop "ML" icon. Launching it opens
  standalone (no browser address bar), theme color matches the ink (#221e17),
  and the maskable icon is not cropped or stretched.
awaiting: user response

## Tests

### 1. PWA installs to the home screen and opens standalone
expected: After the HTTPS deploy: Add to Home Screen installs with the Print Shop "ML" icon; app launches standalone (no browser chrome); theme color and maskable icon render correctly.
result: [pending]

### 2. Key taps buzz on Android (haptic feedback)
expected: On the deployed app, /drills construction questions: tapping keys fires a light vibration on Android (Vibration API), alongside the press-down cue. No buzz on iOS/desktop is expected and fine.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
