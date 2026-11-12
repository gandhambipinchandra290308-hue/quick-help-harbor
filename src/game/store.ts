import { create } from "zustand";
import { computeResult, getSite, newCruise, newLanding, type CruiseState, type LandingState, type Result, type SiteId } from "./sim";

export type Phase = "solar" | "earth" | "pad" | "launch" | "brief" | "cruise" | "site" | "landing" | "result";

export const INTRO_PHASES: Phase[] = ["solar", "earth", "pad", "launch"];
export const DURATIONS: Partial<Record<Phase, number>> = { solar: 24, earth: 9, pad: 8, launch: 19 };
export const NEXT: Partial<Record<Phase, Phase>> = { solar: "earth", earth: "pad", pad: "launch", launch: "brief" };

/** Per-frame mutable state lives here, outside React. */
export const runtime = {
  phaseTime: 0,
  cruise: newCruise() as CruiseState,
  landing: null as LandingState | null,
  result: null as Result | null,
};

type GameStore = {
  phase: Phase;
  caption: number;
  tick: number;
  siteId: SiteId | null;
  setPhase: (p: Phase) => void;
  setCaption: (n: number) => void;
  bump: () => void;
  pickSite: (id: SiteId) => void;
  startMission: () => void;
  finish: () => void;
};

export const useGame = create<GameStore>((set, get) => ({
  phase: "solar",
  caption: 0,
  tick: 0,
  siteId: null,
  setPhase: (phase) => {
    runtime.phaseTime = 0;
    set({ phase, caption: 0 });
  },
  setCaption: (caption) => set({ caption }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  pickSite: (id) => {
    const site = getSite(id);
    runtime.landing = newLanding(runtime.cruise.t.fuel, runtime.cruise.t.hull, site);
    set({ siteId: id });
    get().setPhase("landing");
  },
  startMission: () => {
    runtime.cruise = newCruise();
    runtime.landing = null;
    runtime.result = null;
    set({ siteId: null });
    get().setPhase("cruise");
  },
  finish: () => {
    const site = get().siteId ? getSite(get().siteId) : null;
    runtime.result = computeResult(runtime.cruise, runtime.landing, site);
    get().setPhase("result");
  },
}));
