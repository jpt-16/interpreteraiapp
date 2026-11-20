# Décalage for iPhone

Expo (React Native) app for interpreter performance training: auditory memory, consecutive and simultaneous interpreting, information retention and dialogue simulations, with meaning-based AI feedback. iOS-first; Android is supported but less tested.

## Run it

```bash
cd mobile
npm install
cp .env.example .env        # optional, see below
npx expo start              # scan the QR code with Expo Go on your iPhone
```

It works in **Expo Go**: every native module used (`expo-audio`, `expo-speech`, `expo-symbols`, `expo-blur`, `expo-haptics`, `expo-file-system`) ships with it. With no configuration at all the app runs fully offline in demo mode: curated passages, iPhone voices, on-device scoring, history on the device. Type the rendition, or tap the keyboard's microphone key to dictate.

To turn on the AI features, deploy the API (the Next.js project in the repo root, e.g. on Vercel) with `GEMINI_API_KEY` set, then set `EXPO_PUBLIC_API_URL` to its URL. The phone must be able to reach that URL. Settings → Services shows what is live.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Where the API is deployed. Empty = offline demo mode. |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Optional accounts and synced history (RLS-protected). With these set, sign-in is required and the API only accepts signed-in users. |
| `EXPO_PUBLIC_API_KEY` | Only if the API runs without Supabase and sets `API_ACCESS_TOKEN`. A deterrent, not a secret: it ships inside the app. |

`EXPO_PUBLIC_*` values are bundled into the app. **Never put the Gemini key here**; it lives on the server.

## Design

Built to Apple's Human Interface Guidelines rather than as a web page in a frame:

- **Navigation:** five-tab bar (Overview, Practice, Live, Progress, Glossary) with a blurred bar, a native stack per tab with **large titles that collapse on scroll**, swipe-back, a full-screen exercise cover, and a form sheet for glossary terms. Settings opens from the Overview nav bar; no hamburger menu.
- **Layout:** inset grouped lists, standard rows with chevrons and checkmarks, 44 pt minimum touch targets, safe areas, destructive actions behind confirmation alerts (red, with Cancel).
- **Type and colour:** iOS text styles (size, leading and tracking per style), **Dynamic Type** (text scales; layouts wrap), semantic colours with **light and dark mode** following the system, one accent colour, SF Symbols on iOS.
- **Feel:** press feedback starts on touch-down (scale and dim, no animation delay), haptics only for meaningful moments (recording start/stop, results), motion is limited to press feedback and the audio-activity bars.
- **Accessibility:** labels, roles, states and hints on every control, chart summaries for VoiceOver plus a data table behind "Show data", status never conveyed by colour alone.
- **Data viz:** one axis per chart, thin marks, legend, touch-to-read values. The chart palette was validated for colour-vision deficiency and contrast against both card surfaces. In light mode the green is just under 3:1 contrast, which is why every chart also has a legend and a data table.

## How it is built

```
mobile/
  src/app/            Expo Router routes: (tabs)/{overview,practice,live,progress,glossary}, exercise, session/[id], settings, term, login
  src/ui/             design system: Text, Icon, Screen/Section/Row, Button, Controls, Score, Charts
  src/theme/          colour roles, spacing, iOS type scale
  src/exercise/       Runner (the exercise state machine), Report, audio and recorder hooks, waveforms
  src/data/           config, API client, on-device storage, Supabase client, store
  metro.config.js     resolves "@/…" to ../src (shared logic) and "~/…" to mobile/src
```

The mobile app **shares its domain logic with the web/API project**: exercise content and generators, meaning-unit evaluation, number normalisation, coaching, analytics and types come from `../src/lib` (about 3,500 lines) rather than being copied. Only UI, device audio and storage are mobile-specific.

### Exercise flow

Brief → listen → render → review transcript → (detail check) → evaluation → saved to history.

- **Source audio:** with a server voice, audio is fetched once per (text, language, speed) and cached on the device; otherwise the iPhone's built-in voices (the best installed "Enhanced" voice is preferred). The waveform shows speech activity; neither engine exposes live amplitude.
- **Rendition:** with server transcription, recorded as 16 kHz mono (WAV on iOS), uploaded, transcribed by Gemini verbatim (fillers kept, for the fluency score) and **deleted from the device immediately**. Recordings are never stored. Without it, you type or dictate.
- **Simultaneous:** recording starts together with the source; it stops a few seconds after the speaker ends. Needs transcription; headphones recommended.
- **Evaluation:** server (Gemini) when configured; otherwise, or if the call fails, on-device with a visible warning. Feedback is never lost.

## Verification: what was and was not tested

Done: strict TypeScript, a production **iOS Hermes bundle** (confirms Metro resolves every import, the shared code and the native modules), and a **web export of the same code** driven in a 390×844 and a 375×667 browser in light and dark mode: all five tabs, the full typed-rendition exercise flow, evaluation, saving, history on the Overview, and reopening a saved session.

Not done, because there is no Mac, iPhone or simulator in the environment where this was built:

- Nothing has been run on a real iOS device or simulator. Native large titles, the blurred tab bar, SF Symbols, form sheets, haptics and Dynamic Type are implemented to the documented APIs but unverified visually; the web preview approximates them.
- Microphone recording, WAV encoding, playback of server audio, and the simultaneous-mode audio session are unverified on hardware. Gemini's handling of the recorded WAV (iOS) and of M4A (Android) has not been tested; Android in particular may need a different MIME type.
- Live Gemini calls (evaluation, transcription, voices) have not been made; only their request/response mapping is unit-tested (`../tests/gemini.test.ts`).
- Larger accessibility text sizes and VoiceOver have not been tried.

Please do a first pass on a device with the checklist: recording permission prompt and denial path, recording → transcript → evaluation, server-voice playback and cache, simultaneous mode with headphones, largest Dynamic Type on Overview / Practice / the exercise, VoiceOver through the exercise, dark and light mode.

## Before an App Store submission

- **Account deletion.** Apps that let people create an account must let them delete it in the app (guideline 5.1.1(v)). Settings can delete the practice history and sign out, but deleting the Supabase account itself needs a small server endpoint using the service-role key. Not built yet.
- **Privacy details and policy** covering what is sent to your server and to Google (audio for transcription, transcripts for evaluation).
- Replace the placeholder icon and splash, set a real bundle identifier (`app.decalage.mobile` is a placeholder), and build with EAS (`eas build -p ios`), which needs an Apple Developer account (paid).
- Microphone usage string is set in `app.json` and should be reviewed for wording.
