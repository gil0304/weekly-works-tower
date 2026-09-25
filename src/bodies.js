// 段の本体。テーマごとに形そのものを変える(三角柱の面の位置 R/2 だけは共通)。
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();

export function prismGeo(r, h) { return new THREE.CylinderGeometry(r, r, h, 3, 1); }
function triShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 3; i++) { const th = (i * TAU) / 3, x = r * Math.sin(th), y = -r * Math.cos(th); i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath(); return s;
}
// 角の丸い三角柱(面の位置は r/2 のまま)
export function roundedPrismGeo(r, h, b) {
  const g = new THREE.ExtrudeGeometry(triShape(r - 2 * b), { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, -(h - 2 * b) / 2, 0); g.computeVertexNormals();
  return g;
}
function corner(r, i, y = 0) { const th = (i * TAU) / 3; return new THREE.Vector3(r * Math.sin(th), y, r * Math.cos(th)); }
function faceNormal(i) { const th = Math.PI / 3 + (i * TAU) / 3; return new THREE.Vector3(Math.sin(th), 0, Math.cos(th)); }
function faceTangent(i) { const n = faceNormal(i); return new THREE.Vector3(n.z, 0, -n.x); }
function tube(a, b, rad, mat, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function edgeTubes(r, h, rad, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    g.add(tube(corner(r, i, -h / 2), corner(r, i, h / 2), rad, mat));
    g.add(tube(corner(r, i, h / 2), corner(r, j, h / 2), rad, mat));
    g.add(tube(corner(r, i, -h / 2), corner(r, j, -h / 2), rad, mat));
  }
  return g;
}
function inTriangle(x, z, r) {
  const v = [0, 1, 2].map((i) => corner(r, i));
  let neg = false, pos = false;
  for (let i = 0; i < 3; i++) {
    const a = v[i], b = v[(i + 1) % 3];
    const c = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (c < 0) neg = true; if (c > 0) pos = true;
  }
  return !(neg && pos);
}
function setInst(inst, i, p, rot, s) {
  _q.setFromEuler(_e.set(rot.x || 0, rot.y || 0, rot.z || 0));
  _s.set(s.x ?? s, s.y ?? s, s.z ?? s);
  _m.compose(p, _q, _s); inst.setMatrixAt(i, _m);
}
// 側面上のランダムな点
function surfacePoint(r, h, out = new THREE.Vector3(), lift = 0) {
  const i = Math.floor(Math.random() * 3), n = faceNormal(i), tg = faceTangent(i);
  const half = r * Math.sqrt(3) / 2;
  out.copy(n).multiplyScalar(r / 2 + lift).addScaledVector(tg, rnd(-half, half)).setY(rnd(-h / 2, h / 2));
  return out;
}
function baseMat(b, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: b.color, metalness: b.metalness ?? 0.2, roughness: b.roughness ?? 0.5,
    emissive: b.emissive || '#000000', emissiveIntensity: b.emissiveIntensity ?? 0,
    clearcoat: b.clearcoat ?? 0, transmission: b.transmission ?? 0, thickness: b.thickness ?? 0, ior: b.ior ?? 1.5,
    flatShading: !!b.flat, ...extra,
  });
}

export function buildBody(style, R, H) {
  const b = style.body, kind = b.kind || 'stone';
  const accent = new THREE.Color(style.accent);
  const g = new THREE.Group();
  let update = null, faceOffset = 0;

  switch (kind) {
    // 自己紹介アート: 粒子でできた半透明の柱
    case 'particles': {
      g.add(new THREE.Mesh(prismGeo(R, H), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.3, depthWrite: false })));
      const n = 3200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), p = new THREE.Vector3(), white = new THREE.Color('#fff2e8');
      for (let i = 0; i < n; i++) {
        surfacePoint(R, H, p, rnd(0.0, 0.12)); pos.set([p.x, p.y, p.z], i * 3);
        const c = Math.random() < 0.6 ? accent : white; col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
      g.add(new THREE.Points(geo, mat));
      update = (t) => { mat.opacity = 0.75 + 0.2 * Math.sin(t * 1.7); };
      faceOffset = 0.14;
      break;
    }
    // 1日1回の大切さ: 日めくりのように重なった紙の束
    case 'sheets': {
      const n = 14, sh = H / n, mat = baseMat(b);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(prismGeo(R * 0.985, sh * 0.8), mat);
        m.position.set(rnd(-0.04, 0.04), -H / 2 + (i + 0.5) * sh, rnd(-0.04, 0.04));
        m.rotation.y = rnd(-0.02, 0.02);
        g.add(m);
      }
      const stamp = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), new THREE.MeshBasicMaterial({ color: '#d84a3a', toneMapped: false }));
      stamp.rotation.x = -Math.PI / 2; stamp.position.y = H / 2 + 0.005; g.add(stamp);
      break;
    }
    // 広告にありそうなゲーム: 角の丸いキャンディ、表面にトッピング
    case 'candy': {
      g.add(new THREE.Mesh(roundedPrismGeo(R, H, 0.3), baseMat(b)));
      const colors = ['#fff36b', '#5fd9ff', '#c6ff4d', '#ffffff', '#ff9f43'].map((c) => new THREE.Color(c));
      const inst = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), 140);
      const p = new THREE.Vector3();
      for (let i = 0; i < 140; i++) {
        surfacePoint(R - 0.6, H - 0.6, p, 0.32);
        setInst(inst, i, p, { x: rnd(0, TAU), y: rnd(0, TAU), z: rnd(0, TAU) }, 1);
        inst.setColorAt(i, colors[i % colors.length]);
      }
      inst.instanceColor.needsUpdate = true; g.add(inst);
      faceOffset = 0.06;
      break;
    }
    // ちょっとだけ便利な拡張機能: ブロックに差し込む「タブ」が付いた柱
    case 'puzzle': {
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
      const tabMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, emissive: accent, emissiveIntensity: 0.25 });
      const half = R * Math.sqrt(3) / 2;
      for (let i = 0; i < 3; i++) {
        const n = faceNormal(i), tg = faceTangent(i);
        for (const u of [-0.62, 0.62]) {
          const tab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.22), tabMat);
          tab.position.copy(n).multiplyScalar(R / 2 + 0.1).addScaledVector(tg, u * half).setY(H / 2 - 0.42);
          tab.rotation.y = Math.PI / 3 + (i * TAU) / 3;
          g.add(tab);
        }
      }
      const plus = new THREE.Group();
      plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.24), tabMat), new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.9), tabMat));
      plus.position.y = H / 2 + 0.08; g.add(plus);
      faceOffset = 0.02;
      break;
    }
    // 音: 脈打つイコライザ
    case 'equalizer': {
      const n = 14, sh = H / n, dark = baseMat(b), glow = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
      const slices = [];
      for (let i = 0; i < n; i++) {
        const y = -H / 2 + (i + 0.5) * sh;
        const s = new THREE.Mesh(prismGeo(R, sh * 0.62), dark); s.position.y = y; g.add(s); slices.push(s);
        const l = new THREE.Mesh(prismGeo(R * 0.94, sh * 0.16), glow); l.position.y = y + sh * 0.4; g.add(l);
      }
      g.add(new THREE.Mesh(prismGeo(R * 0.9, H), dark)); // 中身
      update = (t) => { slices.forEach((s, i) => { const k = 0.9 + 0.1 * Math.sin(t * 3 + i * 0.8); s.scale.set(k, 1, k); }); };
      faceOffset = 0.04;
      break;
    }
    // iPhoneをコントローラへ: 黒いガラスの端末、光る縁とコントローラ
    case 'phone': {
      g.add(new THREE.Mesh(roundedPrismGeo(R, H, 0.22), baseMat(b, { clearcoat: 1, roughness: 0.25 })));
      const lime = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
      for (let i = 0; i < 3; i++) g.add(tube(corner(R - 0.2, i, -H / 2 + 0.3), corner(R - 0.2, i, H / 2 - 0.3), 0.03, lime));
      const notch = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.7, 4, 12), new THREE.MeshStandardMaterial({ color: '#000', roughness: 0.2 }));
      notch.rotation.z = Math.PI / 2; notch.position.y = H / 2 + 0.02; g.add(notch);
      const pad = new THREE.Group();
      pad.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.26), lime), new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.8), lime));
      pad.position.set(-0.9, H / 2 + 0.07, 0.6);
      for (const [x, z] of [[1.0, 0.35], [1.35, 0.7]]) { const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 20), lime); btn.position.set(x, H / 2 + 0.07, z); g.add(btn); }
      g.add(pad);
      update = (t) => { lime.color.copy(accent).multiplyScalar(0.85 + 0.15 * Math.sin(t * 4)); };
      break;
    }
    // AEとか使ってみた: 黒い柱にネオンの縁
    case 'neon': {
      g.add(new THREE.Mesh(prismGeo(R * 0.93, H * 0.97), baseMat(b)));
      const neon = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
      g.add(edgeTubes(R, H, 0.04, neon));
      update = (t) => { neon.color.copy(accent).multiplyScalar(0.8 + 0.25 * Math.sin(t * 2.3)); };
      faceOffset = 0.02;
      break;
    }
    // Minecraft Mod: ボクセルの塊、上に草と木
    case 'voxel': {
      const s = 0.36, cells = [];
      const layers = Math.floor(H / s);
      for (let ly = 0; ly < layers; ly++) for (let x = -R; x <= R; x += s) for (let z = -R; z <= R; z += s) {
        if (!inTriangle(x, z, R * 0.94)) continue;
        cells.push({ x, y: -H / 2 + s / 2 + ly * s, z, top: ly === layers - 1, depth: layers - 1 - ly });
      }
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), cells.length);
      const grass = new THREE.Color('#6fbf3e'), dirt = new THREE.Color('#7a5230'), stone = new THREE.Color('#8b8b8b'), ore = new THREE.Color('#e8c547');
      cells.forEach((c, i) => {
        setInst(inst, i, new THREE.Vector3(c.x, c.y, c.z), {}, 1);
        let col = c.top ? grass : c.depth < 3 ? dirt : stone;
        if (!c.top && c.depth >= 3 && Math.random() < 0.05) col = ore;
        inst.setColorAt(i, col.clone().multiplyScalar(rnd(0.85, 1.05)));
      });
      inst.instanceColor.needsUpdate = true; g.add(inst);
      // 木
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(s, s * 3, s), new THREE.MeshStandardMaterial({ color: '#5a3a1e', roughness: 1 }));
      trunk.position.set(-0.6, H / 2 + s * 1.5, 0.3); g.add(trunk);
      const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ color: '#3f8f2e', roughness: 1, flatShading: true }), 14);
      let li = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (li < 9) setInst(leaves, li++, new THREE.Vector3(-0.6 + dx * s, H / 2 + s * 3.5, 0.3 + dz * s), {}, 1);
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) setInst(leaves, li++, new THREE.Vector3(-0.6 + dx * s, H / 2 + s * 4.5, 0.3 + dz * s), {}, 1);
      g.add(leaves);
      faceOffset = 0.16;
      break;
    }
    // データの可視化: 棒グラフの森
    case 'chart': {
      const base = new THREE.Mesh(prismGeo(R, 0.5), baseMat(b)); base.position.y = -H / 2 + 0.25; g.add(base);
      g.add(new THREE.Mesh(prismGeo(R * 0.86, H), baseMat(b)));
      const bars = [];
      const step = 0.4;
      for (let x = -R; x <= R; x += step) for (let z = -R; z <= R; z += step) if (inTriangle(x, z, R * 0.96)) bars.push({ x, z, h: rnd(0.5, H - 0.3), ph: Math.random() * TAU });
      const geo = new THREE.BoxGeometry(0.28, 1, 0.28); geo.translate(0, 0.5, 0);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, emissive: accent, emissiveIntensity: 0.35 }), bars.length);
      const lo = new THREE.Color('#134d2a'), hi = accent;
      bars.forEach((bar, i) => inst.setColorAt(i, lo.clone().lerp(hi, bar.h / H)));
      inst.instanceColor.needsUpdate = true; g.add(inst);
      update = (t) => {
        bars.forEach((bar, i) => setInst(inst, i, new THREE.Vector3(bar.x, -H / 2 + 0.5, bar.z), {}, { x: 1, y: bar.h * (0.94 + 0.06 * Math.sin(t * 1.4 + bar.ph)), z: 1 }));
        inst.instanceMatrix.needsUpdate = true;
      };
      faceOffset = 0.05;
      break;
    }
    // 予定を楽しく！: チケット。縁のミシン目と両脇の切り欠き
    case 'ticket': {
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
      const hole = new THREE.MeshStandardMaterial({ color: '#1a0f06', roughness: 0.9 });
      const n = 3 * 2 * 12, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), hole, n);
      let k = 0;
      for (let i = 0; i < 3; i++) for (const y of [H / 2, -H / 2]) {
        const a = corner(R, i, y), c = corner(R, (i + 1) % 3, y);
        for (let j = 0; j < 12; j++) setInst(inst, k++, a.clone().lerp(c, (j + 0.5) / 12), {}, 1);
      }
      g.add(inst);
      for (let i = 0; i < 3; i++) { const notch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), hole); notch.position.copy(corner(R, i, 0)); g.add(notch); }
      break;
    }
    // Webで使えるライブラリ: 骨組みとグリッド
    case 'wire': {
      g.add(new THREE.Mesh(prismGeo(R * 0.86, H * 0.98), baseMat(b, { transparent: true, opacity: 0.92 })));
      const line = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
      g.add(edgeTubes(R, H, 0.022, line));
      const pts = [], half = R * Math.sqrt(3) / 2;
      for (let i = 0; i < 3; i++) {
        const n = faceNormal(i), tg = faceTangent(i), c = n.clone().multiplyScalar(R / 2 + 0.005);
        for (const u of [-0.5, 0, 0.5]) { const p = c.clone().addScaledVector(tg, u * half); pts.push(p.x, -H / 2, p.z, p.x, H / 2, p.z); }
        for (const v of [-0.5, 0, 0.5]) { const a = c.clone().addScaledVector(tg, -half), d = c.clone().addScaledVector(tg, half); pts.push(a.x, v * H / 2, a.z, d.x, v * H / 2, d.z); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.4 })));
      faceOffset = 0.03;
      break;
    }
    // 七夕: 夜空の柱、角に笹、短冊が揺れる
    case 'bamboo': {
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
      const bambooMat = new THREE.MeshStandardMaterial({ color: '#4f9b52', roughness: 0.7 });
      const nodeMat = new THREE.MeshStandardMaterial({ color: '#2f6b33', roughness: 0.8 });
      const tanz = [], colors = ['#e94b5a', '#3f7fd6', '#f2d35b', '#5bb56a', '#b177d3'];
      const strings = [];
      for (let i = 0; i < 3; i++) {
        const c = corner(R * 1.02, i, 0), top = H / 2 + 2.2;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, H + 2.2, 8), bambooMat);
        pole.position.set(c.x, (top - H / 2) / 2, c.z); g.add(pole);
        for (let y = -H / 2 + 0.5; y < top; y += 0.7) { const node = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 6, 12), nodeMat); node.rotation.x = Math.PI / 2; node.position.set(c.x, y, c.z); g.add(node); }
        for (let j = 0; j < 6; j++) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.42), new THREE.MeshStandardMaterial({ color: colors[(i * 6 + j) % 5], side: THREE.DoubleSide, roughness: 0.8 }));
          const a = rnd(0, TAU), r = rnd(0.35, 1.1), y = top - rnd(0.3, 1.6);
          m.position.set(c.x + Math.sin(a) * r, y - 0.21, c.z + Math.cos(a) * r);
          m.rotation.y = rnd(0, TAU); m.userData.ph = rnd(0, TAU);
          strings.push(c.x, top - rnd(0.05, 0.3), c.z, m.position.x, m.position.y + 0.21, m.position.z);
          g.add(m); tanz.push(m);
        }
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(strings, 3));
      g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: '#c9d0da', transparent: true, opacity: 0.5 })));
      update = (t) => tanz.forEach((m) => { m.rotation.z = 0.18 * Math.sin(t * 1.6 + m.userData.ph); });
      break;
    }
    // 夏: 水の柱、泡が昇り、上に太陽
    case 'water': {
      g.add(new THREE.Mesh(roundedPrismGeo(R, H, 0.12), baseMat(b)));
      const n = 140, pos = new Float32Array(n * 3), speed = [];
      for (let i = 0; i < n; i++) { let x, z; do { x = rnd(-R, R); z = rnd(-R, R); } while (!inTriangle(x, z, R * 0.8)); pos.set([x, rnd(-H / 2, H / 2), z], i * 3); speed.push(rnd(0.25, 0.7)); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
      g.add(pts);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }));
      sun.position.y = H / 2 + 1.0; g.add(sun);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.18, depthWrite: false }));
      halo.position.copy(sun.position); g.add(halo);
      update = (t, dt) => {
        const a = pts.geometry.attributes.position;
        for (let i = 0; i < n; i++) { let y = a.getY(i) + speed[i] * dt; if (y > H / 2 - 0.1) y = -H / 2 + 0.1; a.setY(i, y); }
        a.needsUpdate = true;
      };
      break;
    }
    // キャンプ: 丸太を組んだログハウス
    case 'cabin': {
      g.add(new THREE.Mesh(prismGeo(R * 0.9, H), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1 })));
      const n = Math.floor(H / 0.3), len = R * Math.sqrt(3) * 1.08;
      const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.145, 0.145, len, 12), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.95 }), n * 3);
      let k = 0;
      for (let i = 0; i < 3; i++) {
        const nrm = faceNormal(i), tg = faceTangent(i);
        for (let j = 0; j < n; j++) {
          const p = nrm.clone().multiplyScalar(R / 2 - 0.02).addScaledVector(tg, (j % 2 ? 0.08 : -0.08)).setY(-H / 2 + 0.15 + j * 0.3);
          _q.setFromUnitVectors(UP, tg); _m.compose(p, _q, _s.set(1, rnd(0.97, 1.03), 1)); inst.setMatrixAt(k++, _m);
        }
      }
      g.add(inst);
      const roof = new THREE.Mesh(prismGeo(R * 1.08, 0.16), new THREE.MeshStandardMaterial({ color: '#4d3018', roughness: 1 }));
      roof.position.y = H / 2 + 0.08; g.add(roof);
      faceOffset = 0.17;
      break;
    }
    // Webでできる可能性: ガラスの中で回る立方体
    case 'glass': {
      g.add(new THREE.Mesh(roundedPrismGeo(R, H, 0.15), baseMat(b)));
      const cube = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.5, 1.5)), new THREE.LineBasicMaterial({ color: accent }));
      g.add(cube);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }));
      g.add(core);
      const light = new THREE.PointLight(accent, 5, 6, 1.5); g.add(light);
      update = (t) => { cube.rotation.set(t * 0.4, t * 0.6, 0); };
      break;
    }
    // 夏祭り: 屋台。赤い屋根と紅白の幕
    case 'yatai': {
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.15, R * 1.4, 1.0, 3, 1), new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.7, flatShading: true }));
      roof.position.y = H / 2 + 0.5; g.add(roof);
      const c = document.createElement('canvas'); c.width = 256; c.height = 32; const ctx = c.getContext('2d');
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f4f1ea' : '#d83a2e'; ctx.fillRect(i * 32, 0, 32, 32); }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1); tex.magFilter = THREE.NearestFilter;
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.07, R * 1.07, 0.55, 3, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
      skirt.position.y = H / 2 - 0.3; g.add(skirt);
      const ridge = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }));
      ridge.position.y = H / 2 + 1.05; g.add(ridge);
      break;
    }
    // 人のMA: 曇りガラスの中の人影と、残像
    case 'frost': {
      const mat = baseMat(b);
      g.add(new THREE.Mesh(prismGeo(R, H), mat));
      for (const [dx, op] of [[0.35, 0.14], [0.7, 0.07]]) {
        const ghost = new THREE.Mesh(prismGeo(R, H), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: op, depthWrite: false }));
        ghost.position.x = dx; g.add(ghost);
      }
      const silMat = new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.6, emissive: accent, emissiveIntensity: 0.3 });
      for (const [x, z, s] of [[0.2, 0.1, 1], [-0.5, -0.4, 0.85], [0.5, -0.5, 0.7]]) {
        const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 1.0 * s, 6, 12), silMat); p.position.set(x, -H / 2 + 0.8 * s + 0.3, z); g.add(p);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 12, 10), silMat); head.position.set(x, p.position.y + 0.85 * s, z); g.add(head);
      }
      break;
    }
    // Astra使ってみた: 惑星のように、軌道の輪と太陽を持つ柱
    case 'orbit': {
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
      const glow = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
      const ring = new THREE.Group();
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(R * 1.3, 0.03, 8, 96), glow));
      const planet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), glow); planet.position.x = R * 1.3; ring.add(planet);
      ring.rotation.x = Math.PI / 2 + 0.35; g.add(ring);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), glow); sun.position.y = H / 2 + 0.9; g.add(sun);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.15, depthWrite: false })); halo.position.copy(sun.position); g.add(halo);
      update = (t) => { ring.rotation.z = t * 0.35; };
      break;
    }
    // Metal使った: 角の溶けた鏡面の塊、底から滴る
    case 'chrome': {
      const mat = baseMat(b);
      g.add(new THREE.Mesh(roundedPrismGeo(R, H, 0.45), mat));
      const p = new THREE.Vector3();
      for (let i = 0; i < 7; i++) {
        surfacePoint(R - 0.9, 0.01, p, 0.45); p.y = -H / 2 - rnd(0.05, 0.4);
        const drip = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.12, 0.26), 16, 12), mat); drip.scale.y = 1.5; drip.position.copy(p); g.add(drip);
      }
      break;
    }
    default:
      g.add(new THREE.Mesh(prismGeo(R, H), baseMat(b)));
  }
  return { group: g, update, faceOffset };
}
