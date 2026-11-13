// Pure mission rules: no React, no three.js. The scene and HUD only read this state.

export type Telemetry = { fuel: number; power: number; temp: number; signal: number; hull: number };
export type StatKey = keyof Telemetry;

export type Choice = {
  label: string;
  detail: string;
  effect: Partial<Telemetry>; // instant change
  drain?: Partial<Telemetry>; // extra change per second from now on
  science?: number;
  outcome: string;
  good: boolean;
};

export type MissionEvent = {
  id: string;
  at: number; // journey progress 0..1 when it fires
  system: string;
  title: string;
  story: string;
  realNote: string;
  choices: Choice[];
};

export const CRUISE_SECONDS = 50;
export const MOON_DISTANCE_KM = 384400;
export const TRIP_DAYS = 4;

export const START: Telemetry = { fuel: 100, power: 100, temp: 22, signal: 100, hull: 100 };
const BASE_DRAIN: Telemetry = { fuel: -0.12, power: -0.15, temp: 0, signal: -0.4, hull: 0 };

// ---------------- Spacecraft design (loadout) ----------------

export type PartId = "fuel" | "power" | "shield" | "antenna" | "science";
export type Level = 0 | 1 | 2; // light, standard, heavy
export type Loadout = Record<PartId, Level>;

/** LVM3 can send roughly 4,000 kg toward the Moon (Chandrayaan-3 weighed ~3,900 kg). */
export const MASS_BUDGET_KG = 4000;
export const LEVEL_MASS_KG = [400, 800, 1200] as const;
export const DEFAULT_LOADOUT: Loadout = { fuel: 1, power: 1, shield: 1, antenna: 1, science: 1 };

export type Part = { id: PartId; name: string; why: string; levels: [string, string, string]; realNote: string };
export const PARTS: Part[] = [
  { id: "fuel", name: "Fuel tank", why: "Fuel for steering and, most of all, for landing.", levels: ["Small · 75%", "Standard · 90%", "Large · 100%"], realNote: "More than half of a Moon lander's mass is usually fuel." },
  { id: "power", name: "Solar panels & batteries", why: "Bigger panels and batteries drain slower.", levels: ["Small", "Standard", "Large"], realNote: "Chandrayaan-3's Vikram lander made about 738 W from its solar panels." },
  { id: "shield", name: "Radiation shielding", why: "Protects the hull and computers from solar flares.", levels: ["Thin · 1.5x damage", "Standard", "Thick · 0.6x damage"], realNote: "Shielding is heavy, so engineers only wrap the most sensitive parts." },
  { id: "antenna", name: "Radio antenna", why: "A bigger dish keeps a stronger signal to Earth.", levels: ["Small dish", "Standard dish", "Big dish"], realNote: "NASA's Deep Space Network uses 34 m and 70 m dishes to talk to far spacecraft." },
  { id: "science", name: "Science instruments", why: "More instruments, more discoveries at your site.", levels: ["Few · 0.5x science", "Standard", "Many · 1.5x science"], realNote: "Chandrayaan-1 carried NASA's M3 instrument, which helped find water on the Moon." },
];

export const loadoutMass = (l: Loadout) => (Object.values(l) as Level[]).reduce<number>((a, lv) => a + LEVEL_MASS_KG[lv], 0);
export const canLaunch = (l: Loadout) => loadoutMass(l) <= MASS_BUDGET_KG;

const FUEL_START = [75, 90, 100];
const POWER_START = [75, 90, 100];
const POWER_DRAIN = [-0.2, -0.15, -0.1];
const SIGNAL_DRAIN = [-0.6, -0.4, -0.25];
export const HULL_MULT = [1.5, 1, 0.6];
export const SCIENCE_MULT = [0.5, 1, 1.5];

export const LIMITS = {
  temp: { low: 0, high: 40, fail: 60 },
};

export const EVENTS: MissionEvent[] = [
  {
    id: "panel",
    at: 0.1,
    system: "POWER",
    title: "A solar panel didn't fully open",
    story: "One of your two solar panels is stuck part-way. Power coming in is lower than planned, and the batteries are slowly draining.",
    realNote: "Real story: in 2022, one solar array on NASA's Lucy spacecraft didn't fully latch. Engineers spent months gently running its motor to pull it tighter.",
    choices: [
      { label: "Rock the panel motor back and forth", detail: "Small risk, uses a little power now", effect: { power: 12 }, drain: { power: 0.08 }, outcome: "It worked. The panel latched at about 90% and power is recovering.", good: true },
      { label: "Switch off science instruments", detail: "Saves power, but you'll learn less", effect: { power: 5 }, drain: { power: 0.05 }, science: -15, outcome: "Power is stable, but your instruments are off for part of the trip.", good: false },
      { label: "Ignore it", detail: "Free now, costly later", effect: {}, drain: { power: -0.55 }, outcome: "The batteries keep draining faster than they charge.", good: false },
    ],
  },
  {
    id: "heat",
    at: 0.28,
    system: "TEMPERATURE",
    title: "One side is baking, the other is freezing",
    story: "The side facing the Sun is above +120 °C. The side facing deep space is below −150 °C. Electronics inside are starting to warm up.",
    realNote: "Real story: Apollo crews slowly rotated their spacecraft like meat on a grill, called the \"barbecue roll\", so heat spread evenly.",
    choices: [
      { label: "Start a slow barbecue roll", detail: "Costs a little fuel and power", effect: { temp: -14, fuel: -3, power: -4 }, drain: { temp: -0.05 }, outcome: "Heat is spreading evenly. Inside temperature is back to normal.", good: true },
      { label: "Point the radiator to deep space", detail: "Cools fast, costs more fuel", effect: { temp: -10, fuel: -6 }, outcome: "It's cooler, but turning the spacecraft burned extra fuel.", good: false },
      { label: "Wait and see", detail: "Electronics keep heating", effect: {}, drain: { temp: 0.7 }, outcome: "The temperature keeps rising every hour.", good: false },
    ],
  },
  {
    id: "leak",
    at: 0.45,
    system: "FUEL",
    title: "Thruster 3 is leaking",
    story: "Pressure in one small steering thruster is dropping. Fuel is slowly escaping into space, and you need that fuel to land.",
    realNote: "Real story: spacecraft carry spare (backup) thrusters. Engineers close valves to cut off a bad one and fly on the spares.",
    choices: [
      { label: "Close the valve, use backup thrusters", detail: "Best fix, small fuel loss", effect: { fuel: -4 }, outcome: "Leak stopped. Backup thrusters are steering the spacecraft.", good: true },
      { label: "Do a course burn now, before more leaks", detail: "Uses fuel early", effect: { fuel: -10 }, drain: { fuel: -0.1 }, outcome: "Course is good, but a small leak continues.", good: false },
      { label: "Keep using it", detail: "Fuel keeps escaping", effect: {}, drain: { fuel: -0.8 }, outcome: "Fuel is escaping steadily. Landing will be tight.", good: false },
    ],
  },
  {
    id: "flare",
    at: 0.62,
    system: "HULL / ELECTRONICS",
    title: "Solar flare warning",
    story: "The Sun just released a burst of high-energy particles. They can damage solar cells and flip bits in the computer.",
    realNote: "Real story: spacecraft go into \"safe mode\" to protect themselves. Space-weather alerts come from NOAA's Space Weather Prediction Center.",
    choices: [
      { label: "Go into safe mode until it passes", detail: "Short loss of power and signal", effect: { power: -8, signal: -10, hull: -3 }, outcome: "The storm passed. Minor damage, all systems back online.", good: true },
      { label: "Turn the thick side toward the Sun", detail: "Uses fuel to rotate", effect: { fuel: -5, hull: -10 }, outcome: "The shielding helped, but some particles got through.", good: false },
      { label: "Keep flying normally", detail: "No protection", effect: { hull: -28, power: -10 }, outcome: "The flare hit hard. Computers rebooted and the hull is damaged.", good: false },
    ],
  },
  {
    id: "farside",
    at: 0.8,
    system: "SIGNAL",
    title: "The big burn happens behind the Moon",
    story: "To enter Moon orbit you must fire the engine while behind the Moon, where Earth can't hear you. No radio contact at all.",
    realNote: "Real story: in 1968, Apollo 8 made this burn behind the Moon. Mission Control waited in silence until the crew came back around.",
    choices: [
      { label: "Upload the burn plan before losing signal", detail: "Planned ahead, normal fuel use", effect: { fuel: -12, signal: 5 }, outcome: "Perfect burn on time. You're in Moon orbit.", good: true },
      { label: "Let the onboard computer figure it out", detail: "Less precise", effect: { fuel: -16, hull: -5 }, outcome: "You're in orbit, but the burn was rough and used extra fuel.", good: false },
      { label: "Wait for contact, then burn late", detail: "A late burn costs much more fuel", effect: { fuel: -22 }, outcome: "Orbit reached, but the late burn was expensive.", good: false },
    ],
  },
];

export type CruiseState = {
  t: Telemetry;
  drain: Telemetry;
  progress: number;
  nextEvent: number;
  active: number | null;
  lastOutcome: { text: string; good: boolean } | null;
  goodChoices: number;
  science: number;
  log: string[];
  failed: string | null;
  loadout: Loadout;
  hullMult: number;
  scienceMult: number;
  /** Guided mode: systems are kept just above failure, so the mission always reaches the Moon. */
  guided: boolean;
};

/** In guided mode no number is allowed past these, so nothing can fail. */
export const GUIDED_FLOOR = { power: 8, hull: 10, tempMax: 52 };

export function newCruise(loadout: Loadout = DEFAULT_LOADOUT, guided = false): CruiseState {
  return {
    guided,
    t: { ...START, fuel: FUEL_START[loadout.fuel]!, power: POWER_START[loadout.power]! },
    drain: { ...BASE_DRAIN, power: POWER_DRAIN[loadout.power]!, signal: SIGNAL_DRAIN[loadout.antenna]! },
    loadout: { ...loadout },
    hullMult: HULL_MULT[loadout.shield]!,
    scienceMult: SCIENCE_MULT[loadout.science]!,
    progress: 0,
    nextEvent: 0,
    active: null,
    lastOutcome: null,
    goodChoices: 0,
    science: 100,
    log: ["Launch complete. Heading for the Moon."],
    failed: null,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function clampTelemetry(t: Telemetry, guided = false) {
  t.fuel = clamp(t.fuel, 0, 100);
  t.power = clamp(t.power, guided ? GUIDED_FLOOR.power : 0, 100);
  t.signal = clamp(t.signal, 0, 100);
  t.hull = clamp(t.hull, guided ? GUIDED_FLOOR.hull : 0, 100);
  t.temp = clamp(t.temp, -60, guided ? GUIDED_FLOOR.tempMax : 90);
}

export function checkFailure(t: Telemetry): string | null {
  if (t.power <= 0) return "The batteries ran flat. With no power, the spacecraft went silent.";
  if (t.temp >= LIMITS.temp.fail) return "The electronics overheated and shut down.";
  if (t.hull <= 0) return "The spacecraft was too badly damaged to continue.";
  return null;
}

/** Advance the cruise. Pauses while an event waits for a decision. */
export function stepCruise(s: CruiseState, dt: number) {
  if (s.failed || s.active !== null || s.progress >= 1) return;
  s.progress = Math.min(1, s.progress + dt / CRUISE_SECONDS);
  (Object.keys(s.drain) as StatKey[]).forEach((k) => (s.t[k] += s.drain[k] * dt));
  clampTelemetry(s.t, s.guided);
  s.failed = checkFailure(s.t);
  if (s.failed) return;
  const ev = EVENTS[s.nextEvent];
  if (ev && s.progress >= ev.at) {
    s.active = s.nextEvent;
    s.lastOutcome = null;
  }
}

export function chooseOption(s: CruiseState, choiceIndex: number) {
  if (s.active === null) return;
  const ev = EVENTS[s.active]!;
  const c = ev.choices[choiceIndex];
  if (!c) return;
  (Object.keys(c.effect) as StatKey[]).forEach((k) => {
    const v = c.effect[k] ?? 0;
    s.t[k] += k === "hull" && v < 0 ? v * s.hullMult : v; // shielding scales damage
  });
  if (c.drain) (Object.keys(c.drain) as StatKey[]).forEach((k) => (s.drain[k] += c.drain![k] ?? 0));
  if (c.science) s.science = clamp(s.science + c.science, 0, 100);
  if (c.good) s.goodChoices += 1;
  clampTelemetry(s.t, s.guided);
  s.lastOutcome = { text: c.outcome, good: c.good };
  s.log = [`${ev.system}: ${c.outcome}`, ...s.log].slice(0, 4);
  s.failed = checkFailure(s.t);
  s.active = null;
  s.nextEvent += 1;
}

export const missionDay = (progress: number) => Math.min(TRIP_DAYS, 1 + Math.floor(progress * TRIP_DAYS));
export const distanceKm = (progress: number) => Math.round((progress * MOON_DISTANCE_KM) / 1000) * 1000;

// ---------------- Landing sites ----------------

export type SiteId = "shackleton" | "faustini" | "shivshakti" | "tranquility";

export type Site = {
  id: SiteId;
  name: string;
  region: string;
  lat: number;
  lon: number;
  sunlight: number; // 0..5
  signal: number; // 0..5
  science: number; // 0..5
  difficulty: string;
  safeSpeed: number; // max touchdown speed m/s for a clean landing
  startAlt: number;
  scienceValue: number;
  survival: number;
  note: string;
  history: string;
};

export const SITES: Site[] = [
  {
    id: "shackleton", name: "Shackleton Crater Rim", region: "South Pole", lat: -89.6, lon: 0,
    sunlight: 4, signal: 2, science: 4, difficulty: "Hard", safeSpeed: 2.5, startAlt: 1800, scienceValue: 160, survival: 80,
    note: "Some peaks on this rim are lit by the Sun most of the year, great for solar power. Water ice may hide in the dark crater next door. Earth sits low on the horizon, so signal is weak.",
    history: "NASA's Artemis program is studying landing regions near here for astronauts.",
  },
  {
    id: "faustini", name: "Inside a Shadowed Crater", region: "South Pole (Faustini)", lat: -87.3, lon: 77,
    sunlight: 0, signal: 0, science: 5, difficulty: "Extreme", safeSpeed: 2.5, startAlt: 1800, scienceValue: 200, survival: 0,
    note: "Sunlight never reaches the floor. Water ice is likely trapped here, but solar panels don't work and Earth can't hear you.",
    history: "NASA's LRO orbiter measured shadowed craters like this as some of the coldest places in the solar system.",
  },
  {
    id: "shivshakti", name: "Shiv Shakti Point", region: "Near South Pole (~69°S)", lat: -69.4, lon: 32.3,
    sunlight: 3, signal: 4, science: 3, difficulty: "Medium", safeSpeed: 3, startAlt: 1600, scienceValue: 100, survival: 50,
    note: "About 14 Earth days of sunlight, then a freezing 14-day lunar night. Good signal to Earth.",
    history: "India's Chandrayaan-3 lander Vikram touched down here on 23 Aug 2023, the first landing near the south pole.",
  },
  {
    id: "tranquility", name: "Sea of Tranquility", region: "Near the equator", lat: 0.7, lon: 23.5,
    sunlight: 3, signal: 5, science: 1, difficulty: "Easy", safeSpeed: 4, startAlt: 1500, scienceValue: 40, survival: 50,
    note: "Flat, safe and always facing Earth. But it's already been explored, so less to discover.",
    history: "Apollo 11 landed here on 20 July 1969. The Eagle's lower stage and a laser reflector, still used today, were left behind.",
  },
];

export const getSite = (id: SiteId | null) => SITES.find((s) => s.id === id) ?? SITES[2]!;

// ---------------- Landing ----------------

export const MOON_G = 1.62; // m/s²
export const ENGINE_ACCEL = 5; // m/s² from the landing engine
export const DAMAGED_ENGINE_ACCEL = 4.2;
export const FUEL_BURN = 4; // % of fuel per second of engine firing

export type LandingOutcome = "landed" | "hard" | "crashed";

export type LandingState = {
  alt: number;
  v: number; // vertical speed, negative = falling
  fuel: number;
  thrust: number;
  safeSpeed: number;
  burning: boolean;
  running: boolean;
  done: boolean;
  outcome: LandingOutcome | null;
  touchdownSpeed: number;
  /** Guided mode: autopilot fires the engine (from a reserve tank if needed) when you fall too fast. */
  assist: boolean;
  autopilot: boolean; // true on frames where the autopilot is firing
};

export function newLanding(fuel: number, hull: number, site: Site, assist = false): LandingState {
  return {
    assist,
    autopilot: false,
    alt: site.startAlt,
    v: -40,
    fuel,
    thrust: hull < 50 ? DAMAGED_ENGINE_ACCEL : ENGINE_ACCEL,
    safeSpeed: site.safeSpeed,
    burning: false,
    running: false,
    done: false,
    outcome: null,
    touchdownSpeed: 0,
  };
}

export function landingOutcome(speed: number, safeSpeed: number): LandingOutcome {
  if (speed <= safeSpeed) return "landed";
  if (speed <= safeSpeed * 2.2) return "hard";
  return "crashed";
}

/** Fastest safe falling speed at this height, if the engine can still brake in time. */
export function safeProfileSpeed(alt: number, thrust: number, safeSpeed: number) {
  const brake = (thrust - MOON_G) * 0.75;
  return Math.sqrt((safeSpeed * 0.6) ** 2 + 2 * brake * Math.max(0, alt));
}

export function stepLanding(s: LandingState, dt: number) {
  if (!s.running || s.done) return;
  const tooFast = s.v < 0 && -s.v > safeProfileSpeed(s.alt, s.thrust, s.safeSpeed);
  s.autopilot = s.assist && !s.burning && tooFast;
  const firing = (s.burning && s.fuel > 0) || s.autopilot || (s.assist && s.burning && tooFast);
  s.v += (-MOON_G + (firing ? s.thrust : 0)) * dt;
  s.alt += s.v * dt;
  if (firing) s.fuel = Math.max(0, s.fuel - FUEL_BURN * dt);
  if (s.alt <= 0) {
    s.alt = 0;
    s.done = true;
    s.touchdownSpeed = Math.abs(Math.min(0, s.v));
    if (s.assist) s.touchdownSpeed = Math.min(s.touchdownSpeed, s.safeSpeed * 0.9);
    s.outcome = landingOutcome(s.touchdownSpeed, s.safeSpeed);
  }
}

// ---------------- Score ----------------

export type Result = {
  outcome: LandingOutcome | "lost";
  title: string;
  reason: string;
  score: number;
  rank: string;
  breakdown: { label: string; pts: number }[];
};

export function computeResult(c: CruiseState, l: LandingState | null, site: Site | null): Result {
  if (c.failed || !l || !site) {
    const pts = c.goodChoices * 40;
    return {
      outcome: "lost", title: "Mission lost in space", reason: c.failed ?? "The spacecraft never reached the Moon.",
      score: pts, rank: "Trainee Controller", breakdown: [{ label: "Good decisions", pts }],
    };
  }
  const o = l.outcome ?? "crashed";
  const landingPts = o === "landed" ? 400 : o === "hard" ? 150 : 0;
  const fuelPts = o === "crashed" ? 0 : Math.round(l.fuel * 2);
  const systemsPts = Math.round(((c.t.power + c.t.hull) / 2) * 1.5);
  const decisionPts = c.goodChoices * 40;
  const sciencePts = o === "crashed" ? 0 : Math.round(site.scienceValue * (c.science / 100) * c.scienceMult);
  const survivalPts = o === "crashed" ? 0 : site.survival;
  const dataPts = o === "crashed" ? 0 : Math.round(c.t.signal * (site.signal / 5));
  const breakdown = [
    { label: "Landing", pts: landingPts },
    { label: "Fuel left over", pts: fuelPts },
    { label: "Spacecraft health", pts: systemsPts },
    { label: "Good decisions", pts: decisionPts },
    { label: "Science at your site", pts: sciencePts },
    { label: "Power & signal on the surface", pts: survivalPts },
    { label: "Data sent to Earth", pts: dataPts },
  ];
  const score = breakdown.reduce((a, b) => a + b.pts, 0);
  const rank = score >= 950 ? "Flight Director" : score >= 700 ? "Mission Engineer" : score >= 400 ? "Flight Controller" : "Trainee Controller";
  const speed = l.touchdownSpeed.toFixed(1);
  const title = o === "landed" ? "Safe landing!" : o === "hard" ? "Hard landing, but you're down" : "The lander crashed";
  let reason =
    o === "landed" ? `Touched down at ${speed} m/s at ${site.name}.`
    : o === "hard" ? `Touched down at ${speed} m/s, faster than the safe ${site.safeSpeed} m/s. Legs are bent but the lander survived.`
    : `Hit the surface at ${speed} m/s. Like Chandrayaan-2 in 2019, it came down too fast.`;
  if (o !== "crashed" && site.survival === 0) reason += " But with no sunlight and no signal, the batteries died within hours.";
  return { outcome: o, title, reason, score, rank, breakdown };
}
