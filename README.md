# TruckerChris Web Apps

Installable web apps (PWAs) for iPhone, served by GitHub Pages from the root of `main`.

Open the hub, pick an app, then in Safari tap **Share** and **Add to Home Screen**. Each app keeps its own data in `localStorage` on that device. Nothing is uploaded.

The site is meant to be served from `/truckerchriswebapps/` (GitHub project Pages). Links, manifests, and service workers use relative paths so that prefix works.

## Apps

Sorted A to Z on the hub when the page loads.

| App | Folder | Version |
| --- | --- | --- |
| AutoCare | `autocare/` | 1.3 |
| BandFit | `bandfit/` | 1.0 |
| Checkers | `checkers/` | 1.0 |
| Daily Mantra | `daily-mantra/` | 1.0 |
| Hazmat Helper | `hazmathelper/` | 1.0 |
| MedMinder | `medminder/` | 1.0 |
| Music Hub | `music-hub/` | 1.4.0 |
| Pokes Football | `pokes-football/` | 1.0 |
| RigCare | `rigcare/` | 1.2 |
| RigFuel | `rigfuel/` | 1.0 |
| Rig Hub | `rig-hub/` | 1.3 |
| Rune Lore | `rune-lore/` | 1.0 |
| Solitaire | `solitaire/` | 1.0 |
| StormTrack | `stormtrack/` | 1.0 |
| Truck Cab Nutrition | `truck-cab-nutrition/` | 1.0 |
| Truck Health | `truck-health/` | 1.0 |

## What works differently on iPhone

- Reminders (meds, water, workouts, mantras, weather) run while the app is open. After you add it to the Home Screen you can allow notifications, but iOS will not keep firing alarms after the app is fully closed. There is no exact-alarm or battery-optimization setting on iPhone.
- Backups use the share sheet or a downloaded `.json` file (Save to Files). They do not open Google Drive by themselves.
- Rig Hub shift miles use GPS only while Trip Logger stays open. Miles pause if the screen locks or you leave the app.
- Rig Nav still needs your own HERE API key, typed in that app’s settings. Search and truck routing do not run without it. The key stays in `localStorage` on the phone.
- Music Hub’s YouTube Music, Amazon Music, and SiriusXM pages open those sites in the browser. My Music plays files you pick from Files (there is no access to the phone’s music library). Podcasts stream; full episode downloads are not stored for offline play. Feed refresh uses a public RSS reader because many shows block browser requests.
- Hazmat Helper runs offline. Search, placards, and the load checker use the tables shipped in the app. There is no Android bridge, and nothing is uploaded.
- Pokes Football asks ESPN for the schedule, standings, rankings, and stats. ESPN blocks that request from a normal browser, so Safari shows an empty board unless this device already has saved data. The Android app loaded the same URLs through a native bridge, which is not available here. StormTrack and Rig Hub Weather need a network connection. Weather and alerts cover the United States (National Weather Service).
- RigFuel in this package is the night-haul cab pantry and nutrition screen from the Android app.

## Pages

GitHub Pages should use the `main` branch and the `/` (root) folder. A `.nojekyll` file is included so Pages serves the files as-is.
