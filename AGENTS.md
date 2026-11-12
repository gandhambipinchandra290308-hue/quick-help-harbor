# Project rules

- Mission rules (events, telemetry, landing physics, scoring) live in `src/game/sim.ts` as pure TypeScript with vitest tests; the 3D scene and HUD only read that state, so rules can change without touching rendering.
- Per-frame state lives in the `runtime` object in `src/game/store.ts`; zustand holds only phase/caption/tick for the HUD, so frames never re-render React.
- One `Stepper` useFrame in `src/game/Scene.tsx` advances phase timers, cruise and landing in a fixed order.
- Planet and ground textures are generated procedurally on canvas (`src/game/textures.ts`) so the game has no runtime asset downloads.
- `/?phase=cruise|site|landing|brief|result` deep-links into a phase; in dev, `window.__game` exposes `{ useGame, runtime }` for scripted checks.
