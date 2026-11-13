import * as THREE from "three";

// Procedural planet textures drawn on a canvas, sampled on the sphere so there is no seam.

function hash(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * (3 - 2 * t);
function noise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}
export function fbm(x: number, y: number, z: number, seed: number, oct = 5) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f, seed + i * 17);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sat = (t: number) => Math.max(0, Math.min(1, t));

export type TexKind = "sun" | "mercury" | "venus" | "earth" | "clouds" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "moon";

function shade(kind: TexKind, x: number, y: number, z: number, lat: number): [number, number, number, number] {
  switch (kind) {
    case "sun": {
      const n = fbm(x * 6, y * 6, z * 6, 1);
      const c = mix([255, 140, 30], [255, 230, 140], n);
      return [...c, 255];
    }
    case "mercury": {
      const n = fbm(x * 5, y * 5, z * 5, 2);
      const v = 90 + n * 110;
      return [v, v * 0.95, v * 0.9, 255];
    }
    case "venus": {
      const n = fbm(x * 2 + fbm(x * 3, y * 3, z * 3, 3) * 2, y * 8, z * 2, 4);
      return [...mix([200, 160, 100], [240, 215, 160], n), 255];
    }
    case "mars": {
      const n = fbm(x * 4, y * 4, z * 4, 5);
      let c = mix([120, 45, 20], [215, 110, 60], n);
      if (Math.abs(lat) > 1.3) c = mix(c, [240, 235, 230], sat((Math.abs(lat) - 1.3) * 6));
      return [...c, 255];
    }
    case "jupiter": {
      const warp = fbm(x * 4, y * 4, z * 4, 6) * 0.6;
      const band = Math.sin((y + warp * 0.3) * 22) * 0.5 + 0.5;
      const c = mix([150, 100, 70], [235, 215, 185], band);
      return [...c, 255];
    }
    case "saturn": {
      const band = Math.sin((y + fbm(x * 3, y * 3, z * 3, 7) * 0.1) * 26) * 0.5 + 0.5;
      return [...mix([190, 160, 110], [240, 220, 170], band), 255];
    }
    case "uranus": {
      const n = fbm(x * 2, y * 6, z * 2, 8);
      return [...mix([140, 200, 210], [180, 230, 235], n), 255];
    }
    case "neptune": {
      const band = Math.sin((y + fbm(x * 3, y * 3, z * 3, 9) * 0.3) * 14) * 0.5 + 0.5;
      return [...mix([40, 70, 170], [80, 120, 220], band), 255];
    }
    case "moon": {
      const maria = fbm(x * 1.6, y * 1.6, z * 1.6, 10, 4);
      const detail = fbm(x * 12, y * 12, z * 12, 11, 4);
      let v = 150 + detail * 70;
      if (maria > 0.55) v -= (maria - 0.55) * 260;
      return [v, v, v * 0.98, 255];
    }
    case "earth": {
      const n = fbm(x * 2.2, y * 2.2, z * 2.2, 12, 6);
      let c: RGB;
      if (n < 0.5) c = mix([12, 35, 90], [25, 80, 140], sat(n * 2));
      else {
        const m = fbm(x * 6, y * 6, z * 6, 13);
        c = mix([60, 110, 50], [170, 145, 95], sat((m - 0.35) * 2 + Math.max(0, 0.6 - Math.abs(lat)) * 0.6));
      }
      if (Math.abs(lat) > 1.2) c = mix(c, [240, 245, 250], sat((Math.abs(lat) - 1.2) * 5));
      return [...c, 255];
    }
    case "clouds": {
      const n = fbm(x * 3 + 5, y * 5, z * 3, 14, 5);
      const a = sat((n - 0.5) * 3.2) * 230;
      return [255, 255, 255, a];
    }
  }
}

const cache = new Map<string, THREE.CanvasTexture>();

export function planetTexture(kind: TexKind, w = 512): THREE.CanvasTexture {
  const key = `${kind}-${w}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = w / 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - (j + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const lon = ((i + 0.5) / w) * Math.PI * 2;
      const p = shade(kind, cl * Math.cos(lon), sl, cl * Math.sin(lon), lat);
      const o = (j * w + i) * 4;
      img.data[o] = p[0];
      img.data[o + 1] = p[1];
      img.data[o + 2] = p[2];
      img.data[o + 3] = p[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  if (kind === "moon" || kind === "mercury") {
    // craters
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < (w > 600 ? 260 : 140); k++) {
      const cx = rnd() * w, cy = h * 0.08 + rnd() * h * 0.84, r = 1 + Math.pow(rnd(), 3) * w * 0.03;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40,40,40,0.25)";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.15, cy - r * 0.15, r * 0.8, r * 0.8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(235,235,230,0.25)";
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Tileable ground texture for the launch site / lunar surface. */
export function groundTexture(kind: "earth" | "moon"): THREE.CanvasTexture {
  const key = `ground-${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = w;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, w);
  for (let j = 0; j < w; j++)
    for (let i = 0; i < w; i++) {
      // torus mapping keeps the tile seamless
      const a = (i / w) * Math.PI * 2, b = (j / w) * Math.PI * 2;
      const n = fbm(Math.cos(a) * 2, Math.sin(a) * 2, Math.cos(b) * 2 + Math.sin(b) * 1.3, kind === "earth" ? 20 : 21, 5);
      const c: RGB = kind === "earth" ? mix([70, 95, 45], [125, 135, 70], n) : mix([95, 95, 92], [170, 168, 162], n);
      const o = (j * w + i) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(kind === "earth" ? 30 : 14, kind === "earth" ? 30 : 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Convert latitude/longitude to a point on a three.js SphereGeometry of radius r. */
export function latLonToVec3(lat: number, lon: number, r: number): [number, number, number] {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return [-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r];
}

/** Y-rotation that turns a lat/lon spot to face the +Z camera. */
export function faceAngle(lat: number, lon: number) {
  const [x, , z] = latLonToVec3(lat, lon, 1);
  return -Math.atan2(x, z);
}

function canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Crinkled gold insulation foil (MLI) that wraps real spacecraft bodies. */
export function foilTexture() {
  return canvasTex("foil", 256, 256, (ctx) => {
    ctx.fillStyle = "#b8862e";
    ctx.fillRect(0, 0, 256, 256);
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 420; k++) {
      const x = r() * 256, y = r() * 256, sz = 6 + r() * 26;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let q = 0; q < 4; q++) ctx.lineTo(x + (r() - 0.5) * sz, y + (r() - 0.5) * sz);
      ctx.closePath();
      const l = r();
      ctx.fillStyle = l > 0.5 ? `rgba(255,226,140,${0.15 + l * 0.25})` : `rgba(90,55,10,${0.15 + l * 0.3})`;
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(70,45,10,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);
  });
}

/** Solar panel: dark blue cells with silver grid lines. */
export function solarCellTexture() {
  return canvasTex("cells", 512, 256, (ctx) => {
    ctx.fillStyle = "#c9ccd2";
    ctx.fillRect(0, 0, 512, 256);
    const cols = 12, rows = 6, gap = 3;
    const cw = 512 / cols, ch = 256 / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const g = ctx.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch);
        g.addColorStop(0, "#1b2f66");
        g.addColorStop(1, "#0b1636");
        ctx.fillStyle = g;
        ctx.fillRect(i * cw + gap, j * ch + gap, cw - gap * 2, ch - gap * 2);
        ctx.strokeStyle = "rgba(160,180,220,0.25)";
        ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(i * cw + gap, j * ch + (ch * k) / 4);
          ctx.lineTo((i + 1) * cw - gap, j * ch + (ch * k) / 4);
          ctx.stroke();
        }
      }
  });
}
