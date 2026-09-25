import * as THREE from 'three';

// Canvas 2D で描いた文字をテクスチャにする(日本語フォントはブラウザ任せ)
const cache = new Map();
export function textTexture(text, { size = 64, font = 'ja', weight = 500, color = '#ffffff', letterSpacing = 0, maxWidth = 2048 } = {}) {
  const key = [text, size, font, weight, color, letterSpacing].join('|');
  if (cache.has(key)) return cache.get(key);
  const family = font === 'en'
    ? '"Space Grotesk", "Zen Kaku Gothic New", sans-serif'
    : '"Zen Kaku Gothic New", "Hiragino Sans", "Noto Sans JP", sans-serif';
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${weight} ${size}px ${family}`;
  const spacing = letterSpacing * size;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  const pad = size * 0.3;
  c.width = Math.min(maxWidth, Math.ceil(w + pad * 2));
  c.height = Math.ceil(size * 1.5);
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  let x = pad;
  for (const ch of text) { ctx.fillText(ch, x, c.height / 2); x += ctx.measureText(ch).width + spacing; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const out = { texture: tex, aspect: c.width / c.height };
  cache.set(key, out);
  return out;
}

export function textPlane(text, height, opts = {}) {
  const { texture, aspect } = textTexture(text, opts);
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: opts.opacity ?? 1 });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}
