import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BatteryCharging, Fuel, Radio, Rocket, Shield, Thermometer } from "lucide-react";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Real Missions · Mission Moon" },
      { name: "description", content: "The real Moon, Mars and asteroid missions behind Mission Moon: Apollo, Chandrayaan, Artemis, OSIRIS-REx and more, explained simply." },
      { property: "og:title", content: "Real Missions · Mission Moon" },
      { property: "og:description", content: "The true stories behind every problem in the game, from Apollo 8 to Chandrayaan-3." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Learn,
});

const TIMELINE = [
  { year: "1959", name: "Luna 2", who: "Soviet Union", text: "The first spacecraft to reach the Moon. It crashed into the surface on purpose." },
  { year: "1968", name: "Apollo 8", who: "NASA", text: "First people to fly around the Moon. Their big engine burn happened behind the Moon, with no radio contact." },
  { year: "1969", name: "Apollo 11", who: "NASA", text: "First people to walk on the Moon, at the Sea of Tranquility. Neil Armstrong landed with only seconds of fuel to spare." },
  { year: "1970", name: "Apollo 13", who: "NASA", text: "An oxygen tank exploded on the way. The crew used the lander as a lifeboat and made it home safely." },
  { year: "2008", name: "Chandrayaan-1", who: "ISRO", text: "India's first Moon mission. NASA's M3 instrument on board helped show there is water on the Moon." },
  { year: "2019", name: "Chandrayaan-2", who: "ISRO", text: "The Vikram lander lost contact about 2 km above the surface and crashed. The orbiter still works today." },
  { year: "2019", name: "Chang'e 4", who: "China", text: "The first soft landing on the far side of the Moon, using a relay satellite to talk to Earth." },
  { year: "2022", name: "Artemis I", who: "NASA", text: "An uncrewed Orion capsule flew around the Moon and back to test the spacecraft for astronauts." },
  { year: "2023", name: "Chandrayaan-3", who: "ISRO", text: "India learned from Chandrayaan-2 and landed safely near the south pole on 23 August, at Shiv Shakti Point." },
  { year: "Next", name: "Artemis landings", who: "NASA", text: "NASA plans to land astronauts near the Moon's south pole, where water ice may be hiding in dark craters." },
];

const NUMBERS = [
  { icon: Fuel, name: "Fuel", text: "Every turn and fix uses fuel. Landing needs the most, so save some." },
  { icon: BatteryCharging, name: "Power", text: "Solar panels charge batteries. If batteries hit zero, the spacecraft goes silent forever." },
  { icon: Thermometer, name: "Temperature", text: "In space, the sunny side can pass +120 °C and the shady side −150 °C. Electronics must stay in between." },
  { icon: Radio, name: "Signal", text: "The radio link to Earth. Behind the Moon, or deep in a crater, Earth can't hear you." },
  { icon: Shield, name: "Hull", text: "Solar flares and rough moves damage the spacecraft. A damaged engine pushes less." },
];

const WORDS = [
  { w: "Orbit", d: "Falling around a planet or moon forever without hitting it." },
  { w: "Burn", d: "Firing the engine to change speed or direction." },
  { w: "Safe mode", d: "The spacecraft switches off non-essential parts to protect itself until engineers fix the problem." },
  { w: "Barbecue roll", d: "Slowly rotating the spacecraft so the Sun heats every side evenly." },
  { w: "Telemetry", d: "The live numbers a spacecraft sends home about its health." },
  { w: "Lunar night", d: "About 14 Earth days of darkness and cold below −130 °C." },
  { w: "Shadowed crater", d: "A crater near the poles whose floor never sees sunlight. Ice can survive there." },
  { w: "Launch mass", d: "How much the rocket can carry. Every extra kilogram means something else must go." },
];

const NEXT = [
  { name: "Mars", text: "About 7 months away. Radio takes 3 to 22 minutes each way, so the spacecraft must land itself. Rovers Spirit and Opportunity and the Ingenuity helicopter (72 flights) are still there." },
  { name: "Asteroids", text: "Almost no gravity. NASA's OSIRIS-REx touched asteroid Bennu for seconds in 2020 and brought a sample home in 2023. Japan's Hayabusa2 returned pieces of Ryugu in 2020." },
];

const h2 = "font-display text-2xl font-semibold uppercase tracking-widest text-foreground";
const card = "rounded-md border border-border bg-card p-4";

function Learn() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to the game
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
            <Rocket className="h-4 w-4" /> Play
          </Link>
        </div>

        <header className="mt-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">Mission Moon · Real missions</div>
          <h1 className="mt-2 font-display text-5xl font-bold uppercase text-foreground md:text-6xl">Every problem in the game really happened</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            The emergencies you face come from real NASA and ISRO missions. Here are the stories behind them, explained simply.
          </p>
        </header>

        <section className="mt-12">
          <h2 className={h2}>The five numbers that keep a spacecraft alive</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {NUMBERS.map((n) => (
              <div key={n.name} className={card}>
                <n.icon className="h-5 w-5 text-primary" />
                <div className="mt-2 font-semibold text-foreground">{n.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{n.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className={h2}>Journey to the Moon: a timeline</h2>
          <ol className="mt-6 space-y-4 border-l border-border pl-6">
            {TIMELINE.map((m) => (
              <li key={m.name} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-sm text-primary">{m.year}</span>
                  <span className="font-display text-xl font-semibold text-foreground">{m.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.who}</span>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-foreground/85">{m.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className={h2}>Words to know</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {WORDS.map((w) => (
              <div key={w.w} className={card}>
                <dt className="font-semibold text-foreground">{w.w}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{w.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className={h2}>Coming next in the game</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {NEXT.map((n) => (
              <div key={n.name} className={`${card} border-dashed`}>
                <div className="font-display text-xl font-semibold text-foreground">{n.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{n.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Built for NASA Space Apps · Space Mission Design Game challenge
        </footer>
      </div>
    </main>
  );
}
