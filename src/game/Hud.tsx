import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BatteryCharging, BookOpen, ChevronRight, FlaskConical, Fuel, House, Lock, Radio, Rocket, RotateCcw, Satellite, Shield, SkipForward, Sun, Thermometer, Trophy, Volume2, VolumeX, Wrench } from "lucide-react";
import { INTRO_PHASES, readBest, runtime, useGame } from "./store";
import { canLaunch, chooseOption, distanceKm, EVENTS, getSite, LEVEL_MASS_KG, LIMITS, loadoutMass, MASS_BUDGET_KG, missionDay, PARTS, SITES, TRIP_DAYS, type Level, type StatKey } from "./sim";
import { isMuted, setMuted, sfx, unlock } from "./audio";

const CAPTIONS: Record<string, string[]> = {
  solar: [
    "This is our Solar System: the Sun and eight planets.",
    "Humans have sent spacecraft to every one of them.",
    "But only one other world has ever had people walk on it…",
    "Earth's Moon. 384,400 km away. That's where we're going.",
  ],
  earth: ["Earth. Every space mission starts here.", "Launch site: Satish Dhawan Space Centre, Sriharikota, India."],
  pad: ["The rocket was stacked in the Vehicle Assembly building.", "In Mission Control, engineers watch every number."],
  launch: ["", "Liftoff!", "Max Q: the moment air pushes hardest on the rocket.", "Booster separation. Empty boosters fall away to save weight.", "We're in space. Now the real job starts: keeping the spacecraft alive."],
};

const panel = "rounded-md border border-border bg-card/85 backdrop-blur-md shadow-[var(--shadow-panel)]";

function Shell({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">{children}</div>;
}

const ghostBtn = "pointer-events-auto inline-flex items-center gap-2 rounded-md border border-border bg-card/70 px-3 py-2 font-mono text-xs uppercase tracking-widest text-foreground backdrop-blur hover:border-primary hover:text-primary";

function TopBar() {
  const phase = useGame((s) => s.phase);
  const setPhase = useGame((s) => s.setPhase);
  const intro = INTRO_PHASES.includes(phase);
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <div className="flex items-start justify-between gap-3 p-4 md:p-6">
      <div className="pointer-events-auto">
        {phase !== "home" && (
          <>
            <div className="font-display text-lg font-semibold uppercase tracking-[0.25em] text-foreground">Mission Moon</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Space Mission Design Game · NASA Space Apps</div>
          </>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {intro && (
          <button onClick={() => setPhase("cruise")} className={ghostBtn}>
            Skip intro <SkipForward className="h-4 w-4" />
          </button>
        )}
        {phase !== "home" && (
          <button onClick={() => { sfx.engine(false); setPhase("home"); }} className={ghostBtn} aria-label="Home">
            <House className="h-4 w-4" /><span className="hidden sm:inline">Home</span>
          </button>
        )}
        <button onClick={() => { const m = !muted; setMuted(m); setM(m); if (!m) unlock(); }} className={ghostBtn} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ---------- home ----------

const MISSIONS = [
  { id: "moon", name: "The Moon", tag: "Playable", line: "4 days · 384,400 km · land near the south pole", facts: [] as string[] },
  {
    id: "mars", name: "Mars", tag: "Preview", line: "About 7 months · radio delay up to 22 minutes",
    facts: [
      "Radio takes 3 to 22 minutes each way, so you can't steer live. The spacecraft must think for itself.",
      "Dust storms cover solar panels. NASA's Opportunity rover went silent after a giant storm in 2018.",
      "Left behind: rovers Spirit and Opportunity, and the Ingenuity helicopter, which flew 72 times.",
    ],
  },
  {
    id: "asteroid", name: "Asteroid", tag: "Preview", line: "Almost no gravity · touch, grab, leave",
    facts: [
      "Gravity is so weak that pushing too hard sends you bouncing back into space.",
      "NASA's OSIRIS-REx touched asteroid Bennu for seconds in 2020 and brought the sample home in 2023.",
      "Japan's Hayabusa2 brought back pieces of asteroid Ryugu in 2020.",
    ],
  },
];

function Home() {
  const setPhase = useGame((s) => s.setPhase);
  const [best, setBest] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => setBest(readBest()), []);
  const start = () => { unlock(); sfx.click(); setPhase("brief"); };
  return (
    <div className="relative flex flex-1 flex-col justify-between gap-6 overflow-y-auto px-4 pb-6 md:px-10">
      <div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-background/90 via-background/50 to-transparent md:w-2/3" />
      <div className="pointer-events-auto max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 md:pt-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">NASA Space Apps · Space Mission Design Game</div>
        <h1 className="mt-2 font-display text-6xl font-bold uppercase leading-none tracking-wide text-foreground drop-shadow-lg md:text-8xl">Mission<br />Moon</h1>
        <p className="mt-4 max-w-md text-lg text-foreground/90 drop-shadow">
          Design a spacecraft, launch it, keep it alive through real space emergencies, and land near the Moon's south pole.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={start} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-widest text-primary-foreground shadow-[var(--shadow-panel)] hover:bg-primary/90">
            <Rocket className="h-5 w-5" /> Start mission
          </button>
          <Link to="/learn" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/70 px-5 py-3 font-display font-semibold uppercase tracking-widest text-foreground backdrop-blur hover:border-primary hover:text-primary">
            <BookOpen className="h-5 w-5" /> Real missions
          </Link>
        </div>
        {best > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-4 w-4 text-primary" /> Your best score: <span className="text-foreground">{best}</span>
          </div>
        )}
      </div>
      <div className="pointer-events-auto grid gap-3 sm:grid-cols-3">
        {MISSIONS.map((m) => {
          const playable = m.tag === "Playable";
          const isOpen = open === m.id;
          return (
            <button
              key={m.id}
              onClick={() => (playable ? start() : (sfx.click(), setOpen(isOpen ? null : m.id)))}
              className={`${panel} flex flex-col p-4 text-left hover:border-primary ${playable ? "border-primary/60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-semibold text-foreground">{m.name}</span>
                <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest ${playable ? "text-success" : "text-muted-foreground"}`}>
                  {!playable && <Lock className="h-3 w-3" />}{m.tag}
                </span>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">{m.line}</span>
              {playable && <span className="mt-3 font-mono text-[11px] uppercase tracking-widest text-primary">Tap to fly →</span>}
              {!playable && !isOpen && <span className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Tap to see what makes it hard</span>}
              {isOpen && (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-foreground/85">
                  {m.facts.map((f) => <li key={f}>• {f}</li>)}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Countdown() {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  const left = Math.ceil(5 - runtime.phaseTime);
  if (left <= 0) return null;
  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">Countdown</div>
      <div className="font-display text-8xl font-bold text-primary tabular-nums">T-{left}</div>
    </div>
  );
}

function Captions() {
  const phase = useGame((s) => s.phase);
  const caption = useGame((s) => s.caption);
  const text = CAPTIONS[phase]?.[caption];
  return (
    <div className="mt-auto flex flex-col items-center gap-6 px-6 pb-14">
      {phase === "launch" && caption === 0 && <Countdown />}
      {text && (
        <p key={`${phase}${caption}`} className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 text-center font-display text-2xl leading-snug text-foreground drop-shadow-lg duration-700 md:text-3xl">
          {text}
        </p>
      )}
    </div>
  );
}

// ---------- brief ----------

const STATS: { key: StatKey; label: string; icon: typeof Fuel; why: string }[] = [
  { key: "fuel", label: "Fuel", icon: Fuel, why: "You need it to steer and, most of all, to land." },
  { key: "power", label: "Power", icon: BatteryCharging, why: "Solar panels charge the batteries. At zero, the spacecraft dies." },
  { key: "temp", label: "Temperature", icon: Thermometer, why: `Electronics must stay between ${LIMITS.temp.low} °C and ${LIMITS.temp.high} °C.` },
  { key: "signal", label: "Signal", icon: Radio, why: "Your radio link to Earth. Weaker the farther you go." },
  { key: "hull", label: "Hull", icon: Shield, why: "Damage from radiation and rough moves. A damaged engine is weaker." },
];

function Brief() {
  const setPhase = useGame((s) => s.setPhase);
  return (
    <div className="flex flex-1 items-center px-4 pb-6 md:px-10">
      <div className={`${panel} pointer-events-auto max-h-[78vh] w-full max-w-xl overflow-y-auto p-6 md:p-8`}>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">The challenge</div>
        <p className="mt-2 text-foreground">
          NASA's <span className="font-semibold">Space Mission Design Game</span> challenge asks for a game where students plan, manage and fly a space mission, and learn what it really takes to succeed.
        </p>
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Our solution</div>
        <p className="mt-2 text-foreground">
          You are the flight controller. On the way to the Moon, real problems will hit your spacecraft, the same kinds that hit real NASA and ISRO missions. Every fix costs fuel, power or safety. Whatever you save decides whether you can land.
        </p>
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Keep these five numbers alive</div>
        <ul className="mt-3 space-y-2">
          {STATS.map((s) => (
            <li key={s.key} className="flex gap-3 text-sm">
              <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span><span className="font-semibold text-foreground">{s.label}:</span> <span className="text-muted-foreground">{s.why}</span></span>
            </li>
          ))}
        </ul>
        <button onClick={() => { sfx.click(); setPhase("design"); }} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
          Design your spacecraft <Wrench className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ---------- design ----------

function Design() {
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  const beginLaunch = useGame((s) => s.beginLaunch);
  const startMission = useGame((s) => s.startMission);
  const mass = loadoutMass(loadout);
  const ok = canLaunch(loadout);
  const pct = Math.min(100, (mass / MASS_BUDGET_KG) * 100);
  return (
    <div className="flex flex-1 items-center px-4 pb-6 md:px-10">
      <div className={`${panel} pointer-events-auto max-h-[80vh] w-full max-w-xl overflow-y-auto p-6`}>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Design your spacecraft</div>
        <h2 className="mt-1 font-display text-3xl font-semibold text-foreground">Make it fit on the rocket</h2>
        <p className="mt-2 text-sm text-foreground/90">
          India's LVM3 rocket can send about <span className="font-semibold">4,000 kg</span> toward the Moon. Every part has weight. Make one thing bigger and something else must get smaller. Your choices change what happens on the trip.
        </p>
        <div className="mt-4">
          <div className="flex justify-between font-mono text-xs uppercase tracking-widest">
            <span className="text-muted-foreground">Launch mass</span>
            <span className={ok ? "text-success" : "text-destructive"}>{mass.toLocaleString("en-US")} / {MASS_BUDGET_KG.toLocaleString("en-US")} kg</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all ${ok ? "bg-success" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {PARTS.map((p) => (
            <div key={p.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.why}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {p.levels.map((label, i) => {
                  const on = loadout[p.id] === i;
                  return (
                    <button
                      key={label}
                      onClick={() => { sfx.click(); setLoadout({ ...loadout, [p.id]: i as Level }); }}
                      className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-background/50 text-muted-foreground hover:border-primary/60"}`}
                    >
                      <span className="block font-medium">{label}</span>
                      <span className="block font-mono text-[10px]">{LEVEL_MASS_KG[i]} kg</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] italic text-muted-foreground">{p.realNote}</p>
            </div>
          ))}
        </div>
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-6 pb-6 pt-4">
        <button
          disabled={!ok}
          onClick={() => { sfx.go(); beginLaunch(); }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {ok ? <>Launch the mission <Rocket className="h-5 w-5" /></> : `Too heavy: remove ${(mass - MASS_BUDGET_KG).toLocaleString("en-US")} kg`}
        </button>
        {ok && (
          <button onClick={() => { sfx.click(); startMission(); }} className="mt-2 w-full text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
            Skip the launch movie
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

// ---------- cruise ----------

function statLevel(key: StatKey, v: number): "ok" | "warn" | "bad" {
  if (key === "temp") return v >= LIMITS.temp.high || v <= LIMITS.temp.low ? "bad" : v >= 32 ? "warn" : "ok";
  if (key === "signal") return v < 25 ? "bad" : v < 50 ? "warn" : "ok";
  return v < 25 ? "bad" : v < 50 ? "warn" : "ok";
}
const levelText = { ok: "text-success", warn: "text-warning", bad: "text-destructive" };
const levelBg = { ok: "bg-success", warn: "bg-warning", bad: "bg-destructive" };

function Telemetry() {
  useGame((s) => s.tick);
  const t = runtime.cruise.t;
  return (
    <div className={`${panel} pointer-events-auto w-60 p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Spacecraft</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-success">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Live
        </span>
      </div>
      <div className="space-y-3">
        {STATS.map((s) => {
          const v = t[s.key];
          const lvl = statLevel(s.key, v);
          const pct = s.key === "temp" ? Math.max(0, Math.min(100, (v / LIMITS.temp.fail) * 100)) : v;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><s.icon className="h-3.5 w-3.5" />{s.label}</span>
                <span className={`font-mono tabular-nums ${levelText[lvl]}`}>{s.key === "temp" ? `${Math.round(v)} °C` : `${Math.round(v)}%`}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all duration-300 ${levelBg[lvl]}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Journey() {
  useGame((s) => s.tick);
  const p = runtime.cruise.progress;
  return (
    <div className={`${panel} pointer-events-auto mx-auto w-full max-w-md px-5 py-3`}>
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
        <span className="text-muted-foreground">Earth</span>
        <span className="text-foreground">Day {missionDay(p)} of {TRIP_DAYS} · ~{distanceKm(p).toLocaleString("en-US")} km</span>
        <span className="text-muted-foreground">Moon</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${p * 100}%` }} />
        {EVENTS.map((e) => (
          <span key={e.id} className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-foreground/50" style={{ left: `${e.at * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function EventCard() {
  useGame((s) => s.tick);
  const bump = useGame((s) => s.bump);
  const c = runtime.cruise;
  useEffect(() => { if (c.active !== null) sfx.alarm(); }, [c.active]);
  if (c.lastOutcome) {
    return (
      <div className={`${panel} pointer-events-auto w-full max-w-lg p-6`}>
        <div className={`font-mono text-[11px] uppercase tracking-[0.3em] ${c.lastOutcome.good ? "text-success" : "text-warning"}`}>
          {c.lastOutcome.good ? "Good call" : "It has a cost"}
        </div>
        <p className="mt-2 text-lg text-foreground">{c.lastOutcome.text}</p>
        <button onClick={() => { c.lastOutcome = null; bump(); }} className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }
  if (c.active === null) return null;
  const ev = EVENTS[c.active]!;
  return (
    <div className={`${panel} pointer-events-auto w-full max-w-lg animate-in fade-in zoom-in-95 border-warning/60 p-6`}>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-warning">
        <span className="h-2 w-2 animate-pulse rounded-full bg-warning" /> Alert · {ev.system}
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">{ev.title}</h2>
      <p className="mt-2 text-sm text-foreground/90">{ev.story}</p>
      <div className="mt-4 space-y-2">
        {ev.choices.map((ch, i) => (
          <button key={i} onClick={() => { chooseOption(c, i); (ch.good ? sfx.good : sfx.bad)(); bump(); }} className="group flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-4 py-3 text-left hover:border-primary">
            <span>
              <span className="block font-medium text-foreground group-hover:text-primary">{ch.label}</span>
              <span className="block text-xs text-muted-foreground">{ch.detail}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-xs italic text-muted-foreground">{ev.realNote}</p>
    </div>
  );
}

function MissionLog() {
  useGame((s) => s.tick);
  return (
    <div className={`${panel} pointer-events-auto hidden w-72 p-4 lg:block`}>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Mission log</div>
      <ul className="space-y-1.5 text-xs text-foreground/85">
        {runtime.cruise.log.map((l, i) => <li key={i} className={i === 0 ? "" : "opacity-60"}>{l}</li>)}
      </ul>
    </div>
  );
}

function CruiseHud() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-6 md:px-6">
      <Journey />
      <div className="flex flex-1 flex-col items-center justify-between gap-4 md:flex-row md:items-start">
        <Telemetry />
        <EventCard />
        <MissionLog />
      </div>
    </div>
  );
}

// ---------- site ----------

function Dots({ n, icon: Icon, label }: { n: number; icon: typeof Sun; label: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <span className="flex gap-1">{Array.from({ length: 5 }, (_, i) => <span key={i} className={`h-1.5 w-3 rounded-full ${i < n ? "bg-primary" : "bg-muted"}`} />)}</span>
    </div>
  );
}

function SiteHud() {
  const pickSite = useGame((s) => s.pickSite);
  const t = runtime.cruise.t;
  return (
    <div className="flex flex-1 flex-col justify-end gap-3 px-4 pb-6 md:px-6">
      <div className={`${panel} mx-auto max-w-3xl px-6 py-4 text-center`}>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">You're in Moon orbit · Fuel left {Math.round(t.fuel)}%</div>
        <h2 className="mt-1 font-display text-3xl font-semibold text-foreground">Pick your landing site</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground">Near the south pole, the Sun stays low on the horizon. Some spots get almost constant sunlight, others never see it. Choose between safety, power, signal and science.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SITES.map((s) => (
          <button key={s.id} onClick={() => pickSite(s.id)} className={`${panel} pointer-events-auto flex flex-col p-4 text-left hover:border-primary`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-lg font-semibold text-foreground">{s.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-warning">{s.difficulty}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.region}</span>
            <div className="mt-3 space-y-1.5">
              <Dots n={s.sunlight} icon={Sun} label="Sunlight" />
              <Dots n={s.signal} icon={Satellite} label="Signal to Earth" />
              <Dots n={s.science} icon={FlaskConical} label="Science" />
            </div>
            <p className="mt-3 text-xs text-foreground/85">{s.note}</p>
            <p className="mt-2 border-t border-border pt-2 text-xs italic text-muted-foreground">{s.history}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- landing ----------

function LandingHud() {
  useGame((s) => s.tick);
  const siteId = useGame((s) => s.siteId);
  const bump = useGame((s) => s.bump);
  const site = getSite(siteId);
  const l = runtime.landing;
  const done = l?.done ?? false;
  const empty = (l?.fuel ?? 1) <= 0;
  useEffect(() => {
    if (!done && !empty) return;
    sfx.engine(false);
    if (done) (runtime.landing?.outcome === "crashed" ? sfx.crash : sfx.touchdown)();
  }, [done, empty]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const L = runtime.landing;
      if (e.code === "Space" && L) { e.preventDefault(); if (!L.burning && L.running && !L.done && L.fuel > 0) sfx.engine(true); L.burning = true; }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space" && runtime.landing) { runtime.landing.burning = false; sfx.engine(false); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  if (!l) return null;
  const speed = Math.abs(l.v);
  const falling = l.v < 0;
  const speedLvl = !falling || speed <= l.safeSpeed ? "ok" : speed <= l.safeSpeed * 2.2 ? "warn" : "bad";
  const fire = (on: boolean) => {
    if (!runtime.landing) return;
    runtime.landing.burning = on;
    sfx.engine(on && runtime.landing.fuel > 0 && !runtime.landing.done);
  };
  return (
    <div className="flex flex-1 items-end justify-between gap-4 px-4 pb-6 md:px-6">
      <div className={`${panel} pointer-events-auto w-64 p-4`}>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Descent · {site.name}</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Height</div>
            <div className="font-mono text-2xl tabular-nums text-foreground">{Math.round(l.alt)} m</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Falling speed</div>
            <div className={`font-mono text-2xl tabular-nums ${levelText[speedLvl]}`}>{falling ? speed.toFixed(1) : "0.0"} m/s</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Fuel {Math.round(l.fuel)}%</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${levelBg[l.fuel < 20 ? "bad" : l.fuel < 40 ? "warn" : "ok"]}`} style={{ width: `${l.fuel}%` }} /></div>
        <p className="mt-3 text-xs text-foreground/85">Touch down slower than <span className="font-semibold text-primary">{l.safeSpeed} m/s</span>.{l.thrust < 5 && " Your engine is damaged, so it pushes less."}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        {!l.running ? (
          <div className={`${panel} pointer-events-auto max-w-sm p-5 text-center`}>
            <p className="text-sm text-foreground">You're {site.startAlt.toLocaleString("en-US")} m up and falling at 40 m/s. Hold the button (or the Space bar) to fire the engine and slow down. Don't waste fuel.</p>
            <p className="mt-2 text-xs italic text-muted-foreground">In 2019, Chandrayaan-2's lander lost contact about 2 km above the surface and crashed. Don't repeat it.</p>
            <button onClick={() => { l.running = true; bump(); }} className="mt-4 rounded-md bg-primary px-6 py-3 font-display font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90">Begin descent</button>
          </div>
        ) : !l.done ? (
          <button
            onPointerDown={() => fire(true)} onPointerUp={() => fire(false)} onPointerLeave={() => fire(false)} onPointerCancel={() => fire(false)}
            className={`pointer-events-auto h-28 w-28 select-none touch-none rounded-full border-4 font-display text-sm font-bold uppercase tracking-widest ${l.burning ? "border-primary bg-primary text-primary-foreground" : "border-primary/70 bg-card/80 text-primary"}`}
          >
            Fire<br />engine
          </button>
        ) : (
          <div className={`${panel} p-4 font-display text-2xl text-foreground`}>{l.outcome === "landed" ? "Touchdown!" : l.outcome === "hard" ? "Hard landing…" : "Contact lost…"}</div>
        )}
        {l.running && !l.done && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hold · or press Space</span>}
      </div>
      <div className="hidden w-64 md:block" />
    </div>
  );
}

// ---------- result ----------

const HISTORY = [
  { year: "1969", title: "Apollo 11", text: "First people on the Moon, at the Sea of Tranquility." },
  { year: "2019", title: "Chandrayaan-2", text: "The Vikram lander lost contact about 2 km up and crashed. The orbiter still works today." },
  { year: "2023", title: "Chandrayaan-3", text: "India learned from it and landed safely near the south pole on 23 August." },
];

function ResultHud() {
  const startMission = useGame((s) => s.startMission);
  const setPhase = useGame((s) => s.setPhase);
  const r = runtime.result;
  if (!r) return null;
  const good = r.outcome === "landed";
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 pb-6">
      <div className={`${panel} pointer-events-auto w-full max-w-3xl p-6 md:p-8`}>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className={`font-mono text-[11px] uppercase tracking-[0.3em] ${good ? "text-success" : "text-warning"}`}>Mission report</div>
            <h2 className="mt-1 font-display text-3xl font-semibold text-foreground">{r.title}</h2>
            <p className="mt-2 text-foreground/90">{r.reason}</p>
          </div>
          <div className="text-left md:text-right">
            {runtime.newBest && <div className="font-mono text-[11px] uppercase tracking-widest text-success">New best score!</div>}
            <div className="font-display text-5xl font-bold tabular-nums text-primary">{r.score}</div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{r.rank}</div>
          </div>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {r.breakdown.map((b) => (
            <div key={b.label} className="flex justify-between border-b border-border py-1 text-sm">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-mono tabular-nums text-foreground">+{b.pts}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">What really happened</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {HISTORY.map((h) => (
            <div key={h.title} className="rounded-md border border-border bg-background/50 p-3">
              <div className="font-mono text-xs text-primary">{h.year}</div>
              <div className="font-semibold text-foreground">{h.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{h.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Next missions</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-dashed border-border p-3 opacity-80">
            <div className="font-semibold text-foreground">Mars · coming next</div>
            <p className="text-xs text-muted-foreground">7 months of travel, 20-minute signal delay, and dust storms that cover solar panels.</p>
          </div>
          <div className="rounded-md border border-dashed border-border p-3 opacity-80">
            <div className="font-semibold text-foreground">Asteroid · coming next</div>
            <p className="text-xs text-muted-foreground">Almost no gravity. Touch, grab a sample and leave, like NASA's OSIRIS-REx.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={startMission} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"><RotateCcw className="h-4 w-4" /> Fly again</button>
          <button onClick={() => setPhase("design")} className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-display font-semibold uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"><Wrench className="h-4 w-4" /> Change design</button>
          <Link to="/learn" className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 font-display font-semibold uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"><BookOpen className="h-4 w-4" /> Real missions</Link>
        </div>
      </div>
    </div>
  );
}

function useSoundCues() {
  const phase = useGame((s) => s.phase);
  useEffect(() => {
    const on = () => unlock();
    window.addEventListener("pointerdown", on);
    window.addEventListener("keydown", on);
    return () => { window.removeEventListener("pointerdown", on); window.removeEventListener("keydown", on); };
  }, []);
  useEffect(() => {
    if (phase !== "landing") sfx.engine(false);
    if (phase === "result" && runtime.result?.outcome === "lost") sfx.bad();
    if (phase !== "launch") return;
    const ids = [0, 1, 2, 3, 4].map((i) => setTimeout(sfx.tick, i * 1000));
    ids.push(setTimeout(() => { sfx.go(); sfx.liftoff(); }, 5000));
    ids.push(setTimeout(sfx.separation, 13000));
    return () => ids.forEach(clearTimeout);
  }, [phase]);
}

export function Hud() {
  const phase = useGame((s) => s.phase);
  useSoundCues();
  return (
    <Shell>
      <TopBar />
      {phase === "home" && <Home />}
      {phase === "design" && <Design />}
      {INTRO_PHASES.includes(phase) && <Captions />}
      {phase === "brief" && <Brief />}
      {phase === "cruise" && <CruiseHud />}
      {phase === "site" && <SiteHud />}
      {phase === "landing" && <LandingHud />}
      {phase === "result" && <ResultHud />}
    </Shell>
  );
}
