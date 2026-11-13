import { create } from "zustand";
import { computeResult, DEFAULT_LOADOUT, getSite, newCruise, newLanding, type CruiseState, type LandingState, type Loadout, type Result, type SiteId } from "./sim";

export type Phase = "home" | "brief" | "design" | "solar" | "earth" | "pad" | "launch" | "cruise" | "site" | "landing" | "result";

// Flow: home -> brief -> design -> (intro: solar -> earth -> pad -> launch) -> cruise -> site -> landing -> result
export const INTRO_PHASES: Phase[] = ["solar", "earth", "pad", "launch"];
export const DURATIONS: Partial<Record<Phase, number>> = { solar: 24, earth: 9, pad: 8, launch: 19 };
export const NEXT: Partial<Record<Phase, Phase>> = { solar: "earth", earth: "pad", pad: "launch", launch: "cruise" };

const BEST_KEY = "mission-moon-best";
export function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0; } catch { return 0; }
}

/** Per-frame mutable state lives here, outside React. */
export const runtime = {
  phaseTime: 0,
  cruise: newCruise() as CruiseState,
  landing: null as LandingState | null,
  result: null as Result | null,
  finishAt: null as number | null,
  newBest: false,
};

type GameStore = {
  phase: Phase;
  caption: number;
  tick: number;
  siteId: SiteId | null;
  loadout: Loadout;
  /** Guided = can't fail (autopilot + safety limits). Real = you can lose. */
  guided: boolean;
  setGuided: (g: boolean) => void;
  setPhase: (p: Phase) => void;
  setCaption: (n: number) => void;
  bump: () => void;
  setLoadout: (l: Loadout) => void;
  pickSite: (id: SiteId) => void;
  /** Design is done: reset the mission with this loadout and play the launch. */
  beginLaunch: () => void;
  /** Start the journey directly (skip intro / fly again). */
  startMission: () => void;
  finish: () => void;
};

export const useGame = create<GameStore>((set, get) => ({
  phase: "home",
  caption: 0,
  tick: 0,
  siteId: null,
  loadout: { ...DEFAULT_LOADOUT },
  guided: true,
  setGuided: (guided) => set({ guided }),
  setPhase: (phase) => {
    runtime.phaseTime = 0;
    runtime.finishAt = null;
    set({ phase, caption: 0 });
  },
  setCaption: (caption) => set({ caption }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  setLoadout: (loadout) => set({ loadout }),
  pickSite: (id) => {
    const site = getSite(id);
    runtime.landing = newLanding(runtime.cruise.t.fuel, runtime.cruise.t.hull, site, runtime.cruise.guided);
    set({ siteId: id });
    get().setPhase("landing");
  },
  beginLaunch: () => {
    runtime.cruise = newCruise(get().loadout, get().guided);
    runtime.landing = null;
    runtime.result = null;
    set({ siteId: null });
    get().setPhase("solar");
  },
  startMission: () => {
    runtime.cruise = newCruise(get().loadout, get().guided);
    runtime.landing = null;
    runtime.result = null;
    set({ siteId: null });
    get().setPhase("cruise");
  },
  finish: () => {
    const site = get().siteId ? getSite(get().siteId) : null;
    runtime.result = computeResult(runtime.cruise, runtime.landing, site);
    runtime.newBest = false;
    try {
      if (runtime.result.score > readBest()) {
        localStorage.setItem(BEST_KEY, String(runtime.result.score));
        runtime.newBest = true;
      }
    } catch { /* storage blocked */ }
    get().setPhase("result");
  },
}));
