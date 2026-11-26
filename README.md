<p><img src="public/raiden-logo.svg" alt="Raiden — next class, any time" width="360"></p>

**RAIDEN** is the phone app for the MPSTME timetable (CTTGS). Students and teachers see their next class, the room
and floor, their day and week, and every change the moment it happens. The dean sees who is free, and the admin
adds extra classes, cancels classes and changes rooms for a day.

| Who | Signs in with | Gets |
|---|---|---|
| Student | SAP ID | Next class with countdown and room · today · this and next week (own batch, own electives) · updates · reminders before each class |
| Teacher | college email | The same for their classes · find a free room · when is a class free · request a change (leave, move, swap, extra) |
| Dean | email | Who's free now (All / HODs / Free now, any day and hour) · look up any class, teacher or room · announcements · answer requests |
| Admin | `admin` | Extra class / cancel / change room for one day, clash-checked, everyone notified · requests · announcements · look up |

Built with React + TypeScript + Vite + Tailwind (the same theme as the CTTGS web app) and Capacitor for Android.

## Get the APK
Every push to `main` builds it on GitHub Actions: **Actions → Build Android APK → the latest run → Artifacts →
Raiden-apk**. Push a tag such as `v1.0.0` and the APK is also attached to a GitHub Release.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Install it on the phone (allow "install unknown apps" for the browser or Files app the first time).

## Connect it to the timetable server
1. Run CTTGS **with login** so phones can reach it: `CTTGS.bat lan` (Windows) or `./CTTGS.sh lan` (Linux) on the
   college PC, or Docker / a hosted server. Publish a timetable there.
2. On the phone, open Raiden → **Server** on the sign-in screen → enter the address, e.g. `http://192.168.1.20:8000`
   (the PC's IP on the same Wi-Fi; allow port 8000 through the Windows firewall once). An online server works too
   (`https://...`).
3. Sign in.

**Demo accounts** (created on a fresh CTTGS install):

| Role | Login | Password |
|---|---|---|
| Admin | `admin` | `admin` → you set a new one at the first sign-in |
| Dean | `dean@nmims.edu` | `Raiden@Dean1` |
| Teacher | `poulami.das@nmims.edu` | `Raiden@Teach1` |
| Student | `70572300001` | `Raiden@Stud1` |

Real accounts: in CTTGS, **Users → Import for the RAIDEN app** with the Excel template (role, login, password, name,
class, batch, electives, faculty_name).

## Develop
```bash
npm ci
npm run dev            # http://localhost:5173 — talks to a CTTGS server on :8765 (python launcher.py --auth --port 8765)
npm run build          # web build in dist/
npx cap sync android   # copy it into android/, then open android/ in Android Studio to run on a phone
```

## Notes
* Reminders are local notifications scheduled on the phone for the coming week (5–30 minutes before, set on **Me**).
  Changes and announcements notify when the app opens or comes back to the front; push notifications while the app
  is closed would need Firebase (not set up).
* The APK from Actions is a debug-signed build: fine to install and share. For the Play Store, add a signing key and
  build `assembleRelease`.
* App id `in.mpstme.raiden`, version in `package.json` / `android/app/build.gradle`.
