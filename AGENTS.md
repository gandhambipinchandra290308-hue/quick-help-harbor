# Project rules

- Mission rules (events, telemetry, landing physics, scoring) live in `src/game/sim.ts` as pure TypeScript with vitest tests; the 3D scene and HUD only read that state, so rules can change without touching rendering.
- Per-frame state lives in the `runtime` object in `src/game/store.ts`; zustand holds only phase/caption/tick for the HUD, so frames never re-render React.
- One `Stepper` useFrame in `src/game/Scene.tsx` advances phase timers, cruise and landing in a fixed order.
- Planet and ground textures are generated procedurally on canvas (`src/game/textures.ts`) so the game has no runtime asset downloads.
- The app opens on a `home` phase; flow is home -> brief -> design (loadout, mass budget) -> intro -> cruise -> site -> landing -> result. `/?phase=design|cruise|site|landing|brief|result` deep-links into a phase; in dev, `window.__game` exposes `{ useGame, runtime }` for scripted checks.
- Sound is synthesized with Web Audio in `src/game/audio.ts` (no audio files); cues fire from HUD effects, and the mute choice persists in localStorage.
- `/learn` is a plain 2D route with no three.js imports, so it loads fast and server-renders.
