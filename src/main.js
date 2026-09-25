import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import data from './works.json';
import { buildTower, floorY, FACE_R, H, PITCH } from './tower.js';
import { VideoPool } from './video.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;

// ---------- renderer / scene ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let isMobile = matchMedia('(max-width: 720px)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
const BG = new THREE.Color('#07080c');
scene.background = BG;
scene.fog = new THREE.Fog(BG, 30, 300);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);

scene.add(new THREE.HemisphereLight('#c9d4ff', '#0a0a10', 0.25));
const sun = new THREE.DirectionalLight('#ffffff', 0.6);
sun.position.set(20, 60, 30);
scene.add(sun);

// 地面と星
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: '#0a0b10', roughness: 0.4, metalness: 0.7 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.4;
scene.add(ground);
{
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, r = 60 + Math.random() * 120, y = -10 + Math.random() * 140;
    pos.set([Math.sin(a) * r, y, Math.cos(a) * r], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, transparent: true, opacity: 0.5, depthWrite: false, fog: false })));
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- tower ----------
const manager = THREE.DefaultLoadingManager;
const loadBar = $('#loading .bar i');
manager.onProgress = (_, l, t) => { loadBar.style.width = `${Math.round((l / t) * 100)}%`; };

let tower, works, floors, pool;
const STOPS = 57, UNITS = STOPS + 1; // 0: 入口, 1..57: 各作品, 58: 全景
let unitPx = Math.max(1, innerHeight * 0.7); // 高さ0の瞬間があっても NaN にしない

function setup() {
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  tower = buildTower(scene, data);
  works = tower.works; floors = tower.floors;
  pool = new VideoPool(works);
  buildIndex();
  resize();
  requestAnimationFrame(loop);
  manager.onLoad = () => { $('#loading').classList.add('done'); };
  // サムネイルがすでに全て揃っていた場合
  setTimeout(() => $('#loading').classList.add('done'), 4000);
}

// ---------- camera path ----------
const _pos = new THREE.Vector3(), _tgt = new THREE.Vector3();
let zoomed = false, zoomAmt = 0;

function viewDistance() {
  const a = camera.aspect;
  return Math.max(9.6, 11.5 / a);
}
function stopPose(k, out) {
  const w = works[k];
  const th = w.worldAngle, y = floorY(w.floor);
  const d = viewDistance() * (1 - 0.36 * zoomAmt);
  out.pos.set(Math.sin(th) * d, y + 0.25 - 0.2 * zoomAmt, Math.cos(th) * d);
  out.tgt.set(Math.sin(th) * FACE_R, y - 0.05, Math.cos(th) * FACE_R);
  out.angle = th; out.y = y; out.d = d;
}
const A = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), angle: 0, y: 0, d: 0 };
const B = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), angle: 0, y: 0, d: 0 };

function poseAt(p) {
  if (p < 1) {
    // 入口: 足元から見上げ → 1作品目
    const e = smooth(clamp(p, 0, 1));
    stopPose(0, B);
    const th = B.angle + 0.9 * (1 - e);
    const d = B.d + 9 * (1 - e);
    _pos.set(Math.sin(th) * d, -0.6 + (B.pos.y + 0.6) * e, Math.cos(th) * d);
    _tgt.set(0, 34 * (1 - e) + B.tgt.y * e, 0).lerp(B.tgt, e * 0.85);
    return;
  }
  if (p >= STOPS) {
    // 全景
    const e = smooth(clamp(p - STOPS, 0, 1));
    stopPose(STOPS - 1, A);
    const hgt = tower.height;
    const far = Math.max(95, 105 / camera.aspect);
    const th = A.angle + 1.1 * e;
    const d = A.d + (far - A.d) * e;
    _pos.set(Math.sin(th) * d, A.pos.y + (hgt * 0.62 - A.pos.y) * e, Math.cos(th) * d);
    _tgt.copy(A.tgt).lerp(new THREE.Vector3(0, hgt * 0.47, 0), e);
    return;
  }
  const k = Math.floor(p - 1), f = smooth(p - 1 - k);
  stopPose(k, A);
  stopPose(Math.min(k + 1, STOPS - 1), B);
  let dth = B.angle - A.angle;
  dth = ((dth % TAU) + TAU) % TAU; // 常に同じ向きに回る
  if (k === STOPS - 1) dth = 0;
  const th = A.angle + dth * f;
  const d = A.d + (B.d - A.d) * f + Math.sin(f * Math.PI) * 1.4; // 面と面の間で少し引く
  const y = A.pos.y + (B.pos.y - A.pos.y) * f;
  _pos.set(Math.sin(th) * d, y, Math.cos(th) * d);
  _tgt.copy(A.tgt).lerp(B.tgt, f);
}

// ---------- scroll ----------
let pTarget = 0, pDisp = 0, current = -1;
function readScroll() { const p = scrollY / unitPx; pTarget = Number.isFinite(p) ? clamp(p, 0, UNITS) : 0; }
addEventListener('scroll', readScroll, { passive: true });
function goTo(unit, instant = false) {
  zoomed = false;
  scrollTo({ top: unit * unitPx, behavior: instant ? 'auto' : 'smooth' });
}
addEventListener('keydown', (e) => {
  const k = clamp(Math.round(pDisp - 1), 0, STOPS - 1);
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goTo(Math.min(UNITS, Math.round(pTarget) + 1)); }
  else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(Math.max(0, Math.round(pTarget) - 1)); }
  else if (e.key === 'Home') goTo(0);
  else if (e.key === 'End') goTo(UNITS);
  else if (e.key === 'Escape') zoomed = false;
  else if (e.key === 'Enter') { zoomed = !zoomed; void k; }
});

// ---------- picking ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hover = null, downAt = 0;
function pick(ev) {
  ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const near = works.filter((w) => Math.abs(w.index - current) <= 4).map((w) => w.screen);
  const hit = ray.intersectObjects(near, false)[0];
  return hit ? hit.object.userData.entry : null;
}
canvas.addEventListener('pointermove', (ev) => { hover = pick(ev); canvas.style.cursor = hover ? 'pointer' : ''; });
canvas.addEventListener('pointerdown', () => { downAt = performance.now(); });
canvas.addEventListener('pointerup', (ev) => {
  if (performance.now() - downAt > 300) return;
  const hit = pick(ev);
  if (!hit) { zoomed = false; return; }
  if (hit.index === current) zoomed = !zoomed; else goTo(hit.index + 1);
});

// ---------- ui ----------
function buildIndex() {
  const nav = $('#index'), grid = $('#outro-grid');
  data.themes.forEach((t, f) => {
    const a = document.createElement('a'); a.href = '#'; a.dataset.floor = f;
    a.innerHTML = `<span class="label">${t.dir}</span><i></i>`;
    a.addEventListener('click', (e) => { e.preventDefault(); goTo(1 + f * 3); });
    nav.appendChild(a);
    const b = document.createElement('a'); b.href = '#';
    b.innerHTML = `<b>${String(t.order).padStart(2, '0')}</b><span>${t.dir}</span>`;
    b.addEventListener('click', (e) => { e.preventDefault(); goTo(1 + f * 3); });
    grid.appendChild(b);
  });
  $('#back-top').addEventListener('click', () => goTo(0));
  $('.brand').addEventListener('click', (e) => { e.preventDefault(); goTo(0); });
}

function showWork(k) {
  const w = works[k], t = w.theme, d = w.work;
  $('#cap-week').textContent = `WEEK ${String(t.order).padStart(2, '0')}  ·  ${w.slot + 1}/3`;
  $('#cap-theme').textContent = t.dir;
  $('#cap-name').textContent = d.name;
  $('#cap-tagline').textContent = d.tagline;
  $('#cap-desc').textContent = d.desc;
  $('#cap-kind').textContent = d.kind;
  $('#cap-tech').textContent = d.tech.join('  ·  ');
  const links = [];
  if (d.url) links.push(`<a href="${d.url}" target="_blank" rel="noopener">開く ↗</a>`);
  if (d.github) links.push(`<a href="${d.github}" target="_blank" rel="noopener">GitHub ↗</a>`);
  $('#cap-links').innerHTML = links.join('');
  $('#counter-week').textContent = `WEEK ${String(t.order).padStart(2, '0')}`;
  $('#counter-work').textContent = String(k + 1).padStart(2, '0');
  document.documentElement.style.setProperty('--accent', floors[w.floor].style.accent);
  $('#index').querySelectorAll('a').forEach((a) => a.classList.toggle('active', Number(a.dataset.floor) === w.floor));
}

// ---------- loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (!Number.isFinite(pDisp)) pDisp = 0;
  pDisp += (pTarget - pDisp) * (1 - Math.exp(-dt * 5.5));
  zoomAmt += ((zoomed ? 1 : 0) - zoomAmt) * (1 - Math.exp(-dt * 6));
  if (Math.abs(Math.round(pTarget) - Math.round(pDisp)) > 0.5 && zoomed) zoomed = false;

  const k = clamp(Math.round(pDisp - 1), 0, STOPS - 1);
  if (k !== current) { current = k; showWork(k); pool.update(k); }

  poseAt(pDisp);
  camera.position.copy(_pos);
  camera.lookAt(_tgt);

  // 段の装飾と縁の脈動
  const cf = works[current].floor;
  floors.forEach((fl, i) => {
    const near = Math.abs(i - cf) <= 2 || pDisp >= STOPS;
    fl.decor.visible = near || pDisp >= STOPS - 0.5;
    if (!near) return;
    fl.decor.rotation.y += (fl.decor.userData.spin || 0) * dt;
    fl.decor.userData.update?.(t, dt);
    fl.bodyUpdate?.(t, dt);
    const pulse = i === cf ? 1.0 + 0.25 * Math.sin(t * 2.5) : 0.7;
    tower.rimMats[i].color.set(fl.style.accent).multiplyScalar(pulse);
  });

  // オーバーレイ
  $('#intro').classList.toggle('show', pDisp < 0.55);
  $('#caption').classList.toggle('show', pDisp > 0.75 && pDisp < STOPS + 0.35);
  $('#outro').classList.toggle('show', pDisp > STOPS + 0.5);

  composer.render();
}

function resize() {
  isMobile = matchMedia('(max-width: 720px)').matches;
  camera.aspect = innerWidth / innerHeight;
  // 見出し用に、面を画面の右寄り(スマホでは上寄り)に置く
  if (isMobile) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.11, innerWidth, innerHeight);
  else camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.17, 0, innerWidth, innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
  unitPx = Math.max(1, innerHeight * 0.7);
  $('#scroll').style.height = `${UNITS * unitPx + innerHeight}px`;
  readScroll();
}
addEventListener('resize', resize);

document.fonts.ready.then(setup);
