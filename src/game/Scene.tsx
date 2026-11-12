import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, Stars } from "@react-three/drei";
import * as THREE from "three";
import { DURATIONS, NEXT, runtime, useGame, type Phase } from "./store";
import { faceAngle, groundTexture, latLonToVec3, planetTexture, type TexKind } from "./textures";
import { getSite, SITES, stepCruise, stepLanding } from "./sim";

// ---------- shared data ----------

const PLANETS: { name: string; kind: TexKind; r: number; d: number; speed: number; start: number }[] = [
  { name: "Mercury", kind: "mercury", r: 0.38, d: 8, speed: 0.5, start: 1 },
  { name: "Venus", kind: "venus", r: 0.95, d: 11, speed: 0.37, start: 4 },
  { name: "Earth", kind: "earth", r: 1, d: 14.5, speed: 0.3, start: 0.6 },
  { name: "Mars", kind: "mars", r: 0.53, d: 18, speed: 0.24, start: 2.5 },
  { name: "Jupiter", kind: "jupiter", r: 2.8, d: 25, speed: 0.13, start: 5.2 },
  { name: "Saturn", kind: "saturn", r: 2.3, d: 32, speed: 0.1, start: 3.3 },
  { name: "Uranus", kind: "uranus", r: 1.4, d: 38, speed: 0.07, start: 0.2 },
  { name: "Neptune", kind: "neptune", r: 1.35, d: 43, speed: 0.05, start: 2 },
];
const planetPos = (i: number, t: number, out = new THREE.Vector3()) => {
  const p = PLANETS[i]!;
  const a = p.start + t * p.speed;
  return out.set(Math.cos(a) * p.d, 0, -Math.sin(a) * p.d);
};

const CAPTION_TIMES: Partial<Record<Phase, number[]>> = {
  solar: [0, 6, 12, 18],
  earth: [0, 4.5],
  pad: [0, 4],
  launch: [0, 5, 8, 13, 16],
};

const SKY = new THREE.Color("#86aed4");
const SPACE = new THREE.Color("#03040a");
const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

// ---------- launch trajectory (shared by rocket + camera) ----------
const LIFTOFF = 5;
function rocketAt(t: number, out = new THREE.Vector3()) {
  const tt = Math.max(0, t - LIFTOFF);
  return out.set(0.06 * tt ** 3, 0.5 + 1.1 * tt ** 3, 0);
}

// ---------- the one stepper ----------

function Stepper() {
  const frames = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = useGame.getState();
    runtime.phaseTime += dt;
    const t = runtime.phaseTime;
    const phase = st.phase;

    const times = CAPTION_TIMES[phase];
    if (times) {
      let idx = 0;
      times.forEach((v, i) => t >= v && (idx = i));
      if (idx !== st.caption) st.setCaption(idx);
    }
    const dur = DURATIONS[phase];
    if (dur && t >= dur && NEXT[phase]) st.setPhase(NEXT[phase]!);

    if (phase === "cruise") {
      const c = runtime.cruise;
      const wasActive = c.active;
      if (!c.lastOutcome) stepCruise(c, dt); // pause while the player reads the result of a choice
      if (c.failed) return st.finish();
      if (c.progress >= 1 && c.active === null && !c.lastOutcome) return st.setPhase("site");
      if (wasActive !== c.active || frames.current % 8 === 0) st.bump();
    }
    if (phase === "landing" && runtime.landing) {
      stepLanding(runtime.landing, dt);
      if (frames.current % 4 === 0) st.bump();
      if (runtime.landing.done) {
        if (runtime.finishAt === null) runtime.finishAt = t + 2.2;
        else if (t >= runtime.finishAt) return st.finish();
      }
    }
    frames.current++;
    if (frames.current === 3) document.body.setAttribute("data-scene-ready", "1");
  });
  return null;
}

// ---------- camera ----------

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
function CameraRig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  useFrame(() => {
    const phase = useGame.getState().phase;
    const t = runtime.phaseTime;
    const pos = tmpA;
    const target = tmpB.set(0, 0, 0);
    if (phase === "solar") {
      const a = 0.5 + t * 0.045;
      const r = THREE.MathUtils.lerp(78, 58, smooth(0, 18, t));
      pos.set(Math.cos(a) * r, THREE.MathUtils.lerp(34, 20, smooth(0, 18, t)), Math.sin(a) * r);
      const k = smooth(18, 24, t);
      if (k > 0) {
        const e = planetPos(2, t);
        pos.lerp(new THREE.Vector3(e.x + 2.5, 1.2, e.z + 3.5), k);
        target.lerp(e, k);
      }
    } else if (phase === "earth") {
      const k = smooth(0, 9, t);
      pos.set(0, THREE.MathUtils.lerp(3, 2.2, k), THREE.MathUtils.lerp(24, 9.5, k));
      target.set(0, THREE.MathUtils.lerp(0, 1.1, k), 0);
    } else if (phase === "pad") {
      const a = 0.9 + t * 0.06;
      pos.set(Math.cos(a) * 30, 7 - t * 0.3, Math.sin(a) * 30);
      target.set(0, 5, 0);
    } else if (phase === "launch") {
      const r = rocketAt(t, new THREE.Vector3());
      const tt = t - LIFTOFF;
      if (tt < 2.5) {
        pos.set(16, 2.5, 20);
        target.set(r.x, r.y + 5, 0);
      } else {
        pos.set(r.x + 12, r.y - 3, 20);
        target.set(r.x, r.y + 5, 0);
      }
    } else if (phase === "cruise") {
      const a = t * 0.05;
      pos.set(Math.sin(a) * 7.5, 1.6, Math.cos(a) * 7.5);
    } else if (phase === "site") {
      pos.set(0, -6.5, 11);
      target.set(0, -1.2, 0);
    } else if (phase === "landing") {
      const alt = runtime.landing?.alt ?? 0;
      const y = 1.5 + alt * 0.05;
      pos.set(10, y + 2.5, 15);
      target.set(0, y - 0.5, 0);
    } else {
      pos.set(0, 2, 15);
    }
    if (phase === "launch" && t - LIFTOFF >= 2.5) {
      camera.position.lerp(pos, 0.12);
    } else camera.position.copy(pos);
    look.current.copy(target);
    camera.lookAt(look.current);
  });
  return null;
}

// ---------- environment: background, fog, stars ----------

function Atmosphere() {
  const { scene } = useThree();
  const stars = useRef<THREE.Group>(null);
  useEffect(() => {
    scene.background = SPACE.clone();
    scene.fog = new THREE.Fog(SKY.clone(), 80, 320);
  }, [scene]);
  useFrame(() => {
    const phase = useGame.getState().phase;
    const t = runtime.phaseTime;
    const bg = scene.background as THREE.Color;
    const fog = scene.fog as THREE.Fog;
    let k = 1; // 0 = blue sky, 1 = space
    if (phase === "pad") k = 0;
    if (phase === "launch") k = smooth(LIFTOFF + 3, LIFTOFF + 9, t);
    bg.copy(SKY).lerp(SPACE, k);
    fog.color.copy(bg);
    fog.far = phase === "pad" || phase === "launch" ? 320 + k * 4000 : 1e6;
    fog.near = phase === "pad" || phase === "launch" ? 80 : 1e5;
    if (stars.current) stars.current.visible = k > 0.6;
  });
  return (
    <group ref={stars}>
      <Stars radius={400} depth={120} count={5000} factor={6} saturation={0.1} fade speed={0.4} />
    </group>
  );
}

// ---------- solar system ----------

function Planet({ i }: { i: number }) {
  const p = PLANETS[i]!;
  const ref = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => planetTexture(p.kind, p.kind === "earth" ? 1024 : 512), [p.kind]);
  const caption = useGame((s) => s.caption);
  useFrame(() => {
    if (ref.current) planetPos(i, runtime.phaseTime, ref.current.position);
    if (mesh.current) mesh.current.rotation.y += 0.004;
  });
  return (
    <group ref={ref}>
      <mesh ref={mesh}>
        <sphereGeometry args={[p.r, 48, 32]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {p.kind === "earth" && <EarthMoonSmall />}
      {p.kind === "saturn" && (
        <mesh rotation={[-Math.PI / 2.3, 0, 0]}>
          <ringGeometry args={[p.r * 1.35, p.r * 2.2, 64]} />
          <meshStandardMaterial color="#d9c49a" side={THREE.DoubleSide} transparent opacity={0.65} />
        </mesh>
      )}
      <Html center position={[0, p.r + 1.1, 0]} zIndexRange={[10, 0]}>
        <div className={`pointer-events-none whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/80 transition-opacity duration-700 ${caption < 3 ? "opacity-100" : "opacity-0"}`}>{p.name}</div>
      </Html>
    </group>
  );
}

function EarthMoonSmall() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => planetTexture("moon"), []);
  useFrame(() => {
    const a = runtime.phaseTime * 0.8;
    ref.current?.position.set(Math.cos(a) * 2, 0.2, Math.sin(a) * 2);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.27, 24, 16]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

function OrbitRing({ d }: { d: number }) {
  const geo = useMemo(() => {
    const pts = Array.from({ length: 129 }, (_, k) => {
      const a = (k / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [d]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color="#8a93a6" transparent opacity={0.22} />
    </lineLoop>
  );
}

function SolarSystem() {
  const sunTex = useMemo(() => planetTexture("sun"), []);
  return (
    <group>
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} color="#fff3dd" />
      <mesh>
        <sphereGeometry args={[4, 64, 48]} />
        <meshBasicMaterial map={sunTex} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.2, 32, 32]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {PLANETS.map((p, i) => (
        <group key={p.name}>
          <OrbitRing d={p.d} />
          <Planet i={i} />
        </group>
      ))}
    </group>
  );
}

// ---------- Earth close-up ----------

const SRIHARIKOTA = { lat: 13.7, lon: 80.2 };

function EarthGlobe({ radius = 5 }: { radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => planetTexture("earth", 1024), []);
  const cloudTex = useMemo(() => planetTexture("clouds", 1024), []);
  const marker = useMemo(() => latLonToVec3(SRIHARIKOTA.lat, SRIHARIKOTA.lon, radius * 1.01), [radius]);
  const base = useMemo(() => faceAngle(SRIHARIKOTA.lat, SRIHARIKOTA.lon), []);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = runtime.phaseTime;
    if (group.current) group.current.rotation.y = base - (9 - t) * 0.06;
    if (clouds.current) clouds.current.rotation.y = t * 0.01;
    if (pulse.current) pulse.current.scale.setScalar(1 + ((t * 1.5) % 1) * 2.5);
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[radius, 96, 64]} />
        <meshStandardMaterial map={tex} roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[radius * 1.012, 96, 64]} />
        <meshStandardMaterial map={cloudTex} transparent depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.06, 64, 48]} />
        <meshBasicMaterial color="#6fa8ff" transparent opacity={0.13} side={THREE.BackSide} />
      </mesh>
      <group position={marker}>
        <mesh>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshBasicMaterial color="#ffb347" toneMapped={false} />
        </mesh>
        <mesh ref={pulse}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.35} />
        </mesh>
        <Html position={[0.25, 0.15, 0]} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-sm border border-primary/50 bg-background/70 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-primary">Sriharikota · Launch site</div>
        </Html>
      </group>
    </group>
  );
}

function EarthCloseup() {
  const moonTex = useMemo(() => planetTexture("moon"), []);
  return (
    <group>
      <ambientLight intensity={0.15} />
      <directionalLight position={[-8, 4, 10]} intensity={2.6} />
      <EarthGlobe />
      <mesh position={[26, 7, -50]}>
        <sphereGeometry args={[1.4, 32, 24]} />
        <meshStandardMaterial map={moonTex} />
      </mesh>
    </group>
  );
}

// ---------- launch site ----------

const WHITE = "#e9e6de";
const ACCENT = "#c8562a";
const STEEL = "#3b3f46";

function Flame({ scale = 1, active }: { scale?: number; active: () => boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const on = active();
    ref.current.visible = on;
    if (on) ref.current.scale.set(scale, scale * (1 + Math.sin(clock.elapsedTime * 40) * 0.12), scale);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh position={[0, -1.4, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.45, 2.8, 20, 1, true]} />
        <meshBasicMaterial color="#ffae4a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.25, 1.6, 16, 1, true]} />
        <meshBasicMaterial color="#fff2c8" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Rocket() {
  const group = useRef<THREE.Group>(null);
  const boosters = useRef<THREE.Group[]>([]);
  const fairing = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k <= 16; k++) {
      const y = (k / 16) * 2.2;
      pts.push(new THREE.Vector2(0.62 * Math.sqrt(Math.max(0, 1 - (y / 2.2) ** 1.6)), y));
    }
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  const launching = () => useGame.getState().phase === "launch" && runtime.phaseTime > LIFTOFF - 0.6;
  useFrame(() => {
    const phase = useGame.getState().phase;
    const t = phase === "launch" ? runtime.phaseTime : 0;
    if (!group.current) return;
    rocketAt(t, group.current.position);
    const tt = Math.max(0, t - LIFTOFF);
    group.current.rotation.z = -0.07 * smooth(1, 4, tt);
    boosters.current.forEach((b, i) => {
      if (!b) return;
      const sep = Math.max(0, tt - 8);
      const side = i === 0 ? -1 : 1;
      b.position.set(side * (0.95 + sep * sep * 0.4), -sep * sep * 4, 0);
      b.rotation.z = side * sep * 0.4;
    });
  });
  return (
    <group ref={group}>
      {/* core stage */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 6, 32]} />
        <meshStandardMaterial color={WHITE} roughness={0.45} metalness={0.1} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.35, 32]} />
        <meshStandardMaterial color={ACCENT} roughness={0.5} />
      </mesh>
      <mesh position={[0, 7.2, 0]}>
        <cylinderGeometry args={[0.6, 0.55, 1.6, 32]} />
        <meshStandardMaterial color={WHITE} roughness={0.45} />
      </mesh>
      <mesh position={[0, 8, 0]} geometry={fairing}>
        <meshStandardMaterial color={WHITE} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.42, 0.6, 20, 1, true]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <Flame active={launching} scale={1.3} />
      {/* strap-on boosters */}
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => { if (el) boosters.current[i] = el; }} position={[i === 0 ? -0.95 : 0.95, 0, 0]}>
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.33, 0.33, 4.2, 24]} />
            <meshStandardMaterial color={WHITE} roughness={0.5} />
          </mesh>
          <mesh position={[0, 5.05, 0]}>
            <coneGeometry args={[0.33, 0.7, 24]} />
            <meshStandardMaterial color={ACCENT} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.28, 0.5, 16, 1, true]} />
            <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
          <group position={[0, 0.3, 0]}>
            <Flame active={() => launching() && runtime.phaseTime < LIFTOFF + 8} scale={0.8} />
          </group>
        </group>
      ))}
    </group>
  );
}

function Smoke() {
  const COUNT = 70;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => Array.from({ length: COUNT }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), age: 99 })), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const next = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const phase = useGame.getState().phase;
    const t = runtime.phaseTime;
    const emitting = phase === "launch" && t > LIFTOFF - 0.5 && t < LIFTOFF + 4;
    if (emitting) {
      const r = rocketAt(t, new THREE.Vector3());
      for (let k = 0; k < 3; k++) {
        const pp = parts[next.current++ % COUNT]!;
        pp.age = 0;
        pp.p.set(r.x + (Math.random() - 0.5), Math.max(0.6, r.y - 0.5), (Math.random() - 0.5));
        const a = Math.random() * Math.PI * 2;
        pp.v.set(Math.cos(a) * 6, Math.random() * 1.5, Math.sin(a) * 6);
      }
    }
    parts.forEach((pp, i) => {
      pp.age += dt;
      pp.p.addScaledVector(pp.v, dt);
      pp.v.multiplyScalar(Math.exp(-1.2 * dt));
      const s = pp.age > 6 ? 0 : (0.6 + pp.age * 0.9) * (1 - pp.age / 6);
      m.makeScale(s, s, s).setPosition(pp.p);
      mesh.current?.setMatrixAt(i, m);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color="#d8d6d0" roughness={1} transparent opacity={0.75} depthWrite={false} />
    </instancedMesh>
  );
}

function Building({ position, size, color, stripe }: { position: [number, number, number]; size: [number, number, number]; color: string; stripe?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {stripe && (
        <mesh position={[0, size[1] * 0.75, size[2] / 2 + 0.02]}>
          <planeGeometry args={[size[0] * 0.8, size[1] * 0.12]} />
          <meshStandardMaterial color={stripe} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

function LaunchSite() {
  const ground = useMemo(() => groundTexture("earth"), []);
  const t = (n: number) => n;
  return (
    <group>
      <hemisphereLight args={["#cfe3ff", "#4a5a32", 0.9]} />
      <directionalLight position={[30, 40, 20]} intensity={2.4} color="#fff1d8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      {/* concrete pad */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[4.5, 5, 0.5, 40]} />
        <meshStandardMaterial color="#9a9890" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color="#8d8b84" roughness={1} />
      </mesh>
      {/* launch tower */}
      <group position={[-2.6, 0, 0]}>
        {[-0.5, 0.5].map((x) => [-0.5, 0.5].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 5.5, z]}>
            <boxGeometry args={[0.14, 11, 0.14]} />
            <meshStandardMaterial color={ACCENT} roughness={0.6} />
          </mesh>
        )))}
        {Array.from({ length: 10 }, (_, k) => (
          <mesh key={k} position={[0, 1 + k * 1.05, 0]}>
            <boxGeometry args={[1.14, 0.08, 1.14]} />
            <meshStandardMaterial color={ACCENT} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0.9, 8.5, 0]}>
          <boxGeometry args={[1.4, 0.15, 0.3]} />
          <meshStandardMaterial color={STEEL} />
        </mesh>
      </group>
      <Rocket />
      <Smoke />
      {/* Vehicle Assembly Building */}
      <Building position={[-22, 0, -18]} size={[11, t(16), 12]} color="#d9d6cc" stripe="#2f4a7a" />
      <Html position={[-22, 17.5, -18]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap font-mono text-[11px] uppercase tracking-widest text-foreground drop-shadow">Vehicle Assembly</div>
      </Html>
      {/* Mission control */}
      <Building position={[20, 0, -12]} size={[10, 3.5, 7]} color="#c9c4b6" stripe="#2f4a7a" />
      <group position={[23, 3.5, -12]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.6, 8]} />
          <meshStandardMaterial color={STEEL} />
        </mesh>
        <mesh position={[0, 1.8, 0]} rotation={[-0.8, 0, 0]}>
          <sphereGeometry args={[1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
          <meshStandardMaterial color="#e6e3da" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Html position={[20, 6.5, -12]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap font-mono text-[11px] uppercase tracking-widest text-foreground drop-shadow">Mission Control</div>
      </Html>
    </group>
  );
}

// ---------- spacecraft / lander ----------

function Spacecraft({ legs = true, flame }: { legs?: boolean; flame?: () => boolean }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.1, 0.9, 1.1]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.4, 20]} />
        <meshStandardMaterial color="#d8d6d0" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* dish */}
      <mesh position={[0, 1.15, 0]} rotation={[0.4, 0, 0]}>
        <sphereGeometry args={[0.45, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        <meshStandardMaterial color="#f0eee8" side={THREE.DoubleSide} />
      </mesh>
      {/* solar panels */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.75, 0.1, 0]}>
          <mesh>
            <boxGeometry args={[2.2, 0.04, 0.85]} />
            <meshStandardMaterial color="#1c2c52" metalness={0.6} roughness={0.25} />
          </mesh>
          <mesh position={[-s * 1.25, 0, 0]}>
            <boxGeometry args={[0.35, 0.05, 0.08]} />
            <meshStandardMaterial color="#9a9890" />
          </mesh>
        </group>
      ))}
      {legs &&
        [0, 1, 2, 3].map((k) => {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <group key={k} rotation={[0, -a, 0]}>
              <mesh position={[0.75, -0.75, 0]} rotation={[0, 0, 0.55]}>
                <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
                <meshStandardMaterial color="#9a9890" metalness={0.6} />
              </mesh>
              <mesh position={[1.02, -1.22, 0]}>
                <cylinderGeometry args={[0.16, 0.18, 0.05, 12]} />
                <meshStandardMaterial color="#9a9890" />
              </mesh>
            </group>
          );
        })}
      <mesh position={[0, -0.6, 0]}>
        <coneGeometry args={[0.25, 0.35, 16, 1, true]} />
        <meshStandardMaterial color={STEEL} metalness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {flame && (
        <group position={[0, -0.6, 0]} scale={0.6}>
          <Flame active={flame} />
        </group>
      )}
    </group>
  );
}

function Cruise() {
  const earth = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const craft = useRef<THREE.Group>(null);
  const moonTex = useMemo(() => planetTexture("moon", 1024), []);
  const earthTex = useMemo(() => planetTexture("earth", 1024), []);
  useFrame(() => {
    const p = runtime.cruise.progress;
    const t = runtime.phaseTime;
    if (earth.current) {
      earth.current.position.set(THREE.MathUtils.lerp(-7, -40, p), THREE.MathUtils.lerp(-3, -8, p), THREE.MathUtils.lerp(-12, -110, p));
      earth.current.rotation.y = t * 0.05;
    }
    if (moon.current) {
      moon.current.position.set(THREE.MathUtils.lerp(40, 9, p), THREE.MathUtils.lerp(8, -1, p), THREE.MathUtils.lerp(-140, -16, p));
      moon.current.rotation.y = t * 0.02;
    }
    if (craft.current) {
      craft.current.rotation.y = t * 0.15;
      craft.current.position.y = Math.sin(t * 0.8) * 0.12;
    }
  });
  return (
    <group>
      <ambientLight intensity={0.18} />
      <directionalLight position={[-10, 4, 8]} intensity={2.8} />
      <group ref={craft}>
        <Spacecraft />
      </group>
      <group ref={earth}>
        <mesh>
          <sphereGeometry args={[3, 64, 48]} />
          <meshStandardMaterial map={earthTex} roughness={0.8} />
        </mesh>
        <mesh>
          <sphereGeometry args={[3.18, 48, 32]} />
          <meshBasicMaterial color="#6fa8ff" transparent opacity={0.13} side={THREE.BackSide} />
        </mesh>
      </group>
      <mesh ref={moon}>
        <sphereGeometry args={[4, 64, 48]} />
        <meshStandardMaterial map={moonTex} roughness={0.95} />
      </mesh>
    </group>
  );
}

// ---------- Moon globe (brief / site / result) ----------

function MoonGlobe() {
  const phase = useGame((s) => s.phase);
  const siteId = useGame((s) => s.siteId);
  const pickSite = useGame((s) => s.pickSite);
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => planetTexture("moon", 1024), []);
  const showMarkers = phase === "site" || phase === "result";
  useFrame(() => {
    if (!group.current) return;
    const t = runtime.phaseTime;
    if (phase === "site") group.current.rotation.set(0, faceAngle(-30, 25) + Math.sin(t * 0.2) * 0.15, 0);
    else group.current.rotation.set(0.25, t * 0.06, 0);
  });
  return (
    <group>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-9, 2, 7]} intensity={3} />
      <group ref={group} position={phase === "brief" ? [4.5, 0, 0] : [0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[6, 128, 96]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
        {showMarkers &&
          SITES.filter((s) => phase === "site" || s.id === siteId).map((s) => (
            <group key={s.id} position={latLonToVec3(s.lat, s.lon, 6.03)}>
              <mesh>
                <sphereGeometry args={[0.09, 16, 12]} />
                <meshBasicMaterial color="#ffb347" toneMapped={false} />
              </mesh>
              <Html position={[0, 0, 0]} zIndexRange={[20, 0]}>
                <button
                  onClick={() => phase === "site" && pickSite(s.id)}
                  className="ml-3 -translate-y-1/2 whitespace-nowrap rounded-sm border border-primary/60 bg-background/80 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {s.name}
                </button>
              </Html>
            </group>
          ))}
      </group>
    </group>
  );
}

// ---------- landing ----------

function LandingScene() {
  const lander = useRef<THREE.Group>(null);
  const ground = useMemo(() => groundTexture("moon"), []);
  const earthTex = useMemo(() => planetTexture("earth"), []);
  const siteId = useGame((s) => s.siteId);
  const site = getSite(siteId);
  const rocks = useMemo(() => {
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 60 }, () => ({ p: [(r() - 0.5) * 120, 0, (r() - 0.5) * 120] as [number, number, number], s: 0.2 + r() * 1.4 }));
  }, []);
  useFrame(() => {
    const l = runtime.landing;
    if (!lander.current || !l) return;
    lander.current.position.y = 1.25 + l.alt * 0.05;
    if (l.done && l.outcome === "crashed") lander.current.rotation.z = THREE.MathUtils.lerp(lander.current.rotation.z, 1.2, 0.08);
    else if (l.done && l.outcome === "hard") lander.current.rotation.z = 0.15;
  });
  const dark = site.sunlight === 0;
  return (
    <group>
      <ambientLight intensity={dark ? 0.05 : 0.1} />
      <directionalLight position={[-40, dark ? 2 : 14, 10]} intensity={dark ? 0.6 : 3} />
      {dark && <pointLight position={[0, 4, 4]} intensity={8} distance={30} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} scale={r.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8d8b86" roughness={1} />
        </mesh>
      ))}
      {site.signal > 0 && (
        <mesh position={[-90, 60, -220]}>
          <sphereGeometry args={[9, 48, 32]} />
          <meshStandardMaterial map={earthTex} emissive="#223355" emissiveIntensity={0.3} />
        </mesh>
      )}
      <group ref={lander}>
        <Spacecraft flame={() => !!runtime.landing?.burning && (runtime.landing?.fuel ?? 0) > 0 && !runtime.landing?.done} />
      </group>
    </group>
  );
}

// ---------- root ----------

export function Scene() {
  const phase = useGame((s) => s.phase);
  return (
    <>
      <Stepper />
      <CameraRig />
      <Atmosphere />
      <Environment resolution={64}>
        <Lightformer intensity={1.2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.6} color="#9bb3d6" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      {phase === "solar" && <SolarSystem />}
      {phase === "earth" && <EarthCloseup />}
      {(phase === "pad" || phase === "launch") && <LaunchSite />}
      {phase === "cruise" && <Cruise />}
      {(phase === "brief" || phase === "site" || phase === "result") && <MoonGlobe />}
      {phase === "landing" && <LandingScene />}
    </>
  );
}
