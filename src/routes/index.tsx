import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "@/game/Scene";
import { Hud } from "@/game/Hud";
import { runtime, useGame, type Phase } from "@/game/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mission Moon · Space Mission Design Game" },
      { name: "description", content: "Launch from Earth, keep your spacecraft alive through real space problems, pick a south-pole landing site and land on the Moon." },
      { property: "og:title", content: "Mission Moon · Space Mission Design Game" },
      { property: "og:description", content: "A 3D mission game: solar system, rocket launch, spacecraft emergencies and a Moon landing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  useEffect(() => {
    // Deep link for demos/testing: /?phase=cruise | site | landing
    const p = new URLSearchParams(window.location.search).get("phase") as Phase | null;
    if (!p) return;
    const st = useGame.getState();
    if (p === "cruise") st.startMission();
    else if (p === "site") { st.startMission(); runtime.cruise.progress = 1; runtime.cruise.nextEvent = 99; st.setPhase("site"); }
    else if (p === "landing") { st.startMission(); st.pickSite("shivshakti"); }
    else st.setPhase(p);
    if (import.meta.env.DEV) Object.assign(window, { __game: { useGame, runtime } });
  }, []);
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 5000, position: [0, 30, 70] }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
    </main>
  );
}
