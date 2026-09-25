import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

function annulus(rMin, rMax, yMin, yMax) {
  const a = Math.random() * TAU, r = Math.sqrt(rnd(rMin * rMin, rMax * rMax));
  return new THREE.Vector3(Math.sin(a) * r, rnd(yMin, yMax), Math.cos(a) * r);
}
function setInstance(inst, i, pos, rot, scale) {
  _q.setFromEuler(_e.set(rot.x, rot.y, rot.z));
  _s.set(scale.x ?? scale, scale.y ?? scale, scale.z ?? scale);
  _m.compose(pos, _q, _s);
  inst.setMatrixAt(i, _m);
}
function instanced(geo, mat, count, place) {
  const inst = new THREE.InstancedMesh(geo, mat, count);
  for (let i = 0; i < count; i++) place(inst, i);
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

// 段の周囲の装飾。group.userData.spin と userData.update(t, dt) をアニメーションに使う
export function buildDecor(d, H) {
  const g = new THREE.Group();
  if (!d) return g;
  g.userData.spin = d.spin || 0;
  const col = new THREE.Color(d.color);
  const [s0, s1] = d.size;
  const yLo = -H / 2 + 0.2, yHi = H / 2 + 0.6;

  switch (d.kind) {
    case 'points': {
      const n = d.count, pos = new Float32Array(n * 3);
      const [b0, b1] = d.band || [-1, 1];
      for (let i = 0; i < n; i++) { const p = annulus(3.9, 5.3, b0, b1); pos.set([p.x, p.y, p.z], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ color: col, size: rnd(s0, s1) * 2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
      g.add(new THREE.Points(geo, m));
      break;
    }
    case 'rings': {
      for (let i = 0; i < d.count; i++) {
        const r = rnd(s0, s1);
        const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.8 }));
        m.position.copy(annulus(4.2, 5.3, yLo, yHi));
        m.rotation.set(rnd(0, TAU), rnd(0, TAU), 0);
        g.add(m);
      }
      break;
    }
    case 'chips': {
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.1, emissive: col, emissiveIntensity: d.emissive || 0 });
      g.add(instanced(new THREE.BoxGeometry(1, 0.32, 0.12), mat, d.count, (inst, i) => {
        setInstance(inst, i, annulus(4.0, 5.3, yLo, yHi), { x: rnd(-0.6, 0.6), y: rnd(0, TAU), z: rnd(-0.4, 0.4) }, rnd(s0, s1) * 1.6);
      }));
      break;
    }
    case 'bars':
    case 'columns': {
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: d.emissive || 0.5, roughness: 0.4 });
      const geo = new THREE.BoxGeometry(0.12, 1, 0.12); geo.translate(0, 0.5, 0);
      const base = [];
      const inst = instanced(geo, mat, d.count, (inst, i) => {
        const a = d.kind === 'bars' ? (i / d.count) * TAU : Math.random() * TAU;
        const r = d.kind === 'bars' ? 4.6 : rnd(4.2, 6.3);
        const h = rnd(s0, s1);
        base.push({ a, r, h, ph: Math.random() * TAU });
        setInstance(inst, i, new THREE.Vector3(Math.sin(a) * r, -H / 2, Math.cos(a) * r), { x: 0, y: 0, z: 0 }, { x: 1, y: h, z: 1 });
      });
      g.add(inst);
      if (d.kind === 'bars') g.userData.update = (t) => {
        for (let i = 0; i < base.length; i++) {
          const b = base[i], h = b.h * (0.55 + 0.45 * Math.sin(t * 2.2 + b.ph));
          setInstance(inst, i, _p.set(Math.sin(b.a) * b.r, -H / 2, Math.cos(b.a) * b.r), { x: 0, y: 0, z: 0 }, { x: 1, y: h, z: 1 });
        }
        inst.instanceMatrix.needsUpdate = true;
      };
      break;
    }
    case 'frames': {
      const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, toneMapped: false, transparent: true, opacity: 0.7 });
      g.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat, d.count, (inst, i) => {
        setInstance(inst, i, annulus(4.2, 5.3, yLo, yHi), { x: rnd(0, TAU), y: rnd(0, TAU), z: 0 }, { x: rnd(s0, s1), y: rnd(s0, s1) * 0.6, z: rnd(0.05, 0.3) });
      }));
      break;
    }
    case 'cubes':
    case 'voxels': {
      const vox = d.kind === 'voxels';
      const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: vox ? 1 : 0.3, metalness: vox ? 0 : 0.2, flatShading: vox, emissive: vox ? '#000000' : col, emissiveIntensity: d.emissive || 0 });
      const inst = instanced(new THREE.BoxGeometry(1, 1, 1), mat, d.count, (inst, i) => {
        const p = annulus(4.0, 5.3, yLo, yHi);
        if (vox) { p.x = Math.round(p.x / 0.3) * 0.3; p.y = Math.round(p.y / 0.3) * 0.3; p.z = Math.round(p.z / 0.3) * 0.3; }
        setInstance(inst, i, p, vox ? { x: 0, y: 0, z: 0 } : { x: rnd(0, TAU), y: rnd(0, TAU), z: 0 }, rnd(s0, s1));
        if (vox) inst.setColorAt(i, new THREE.Color(Math.random() < 0.55 ? '#7bd24a' : Math.random() < 0.5 ? '#8b5a2b' : '#9a9a9a'));
        else inst.setColorAt(i, col);
      });
      inst.instanceColor.needsUpdate = true;
      g.add(inst);
      break;
    }
    case 'orbits': {
      for (let i = 0; i < d.count; i++) {
        const r = rnd(s0, s1);
        const pivot = new THREE.Group();
        pivot.rotation.set(rnd(-0.6, 0.6), rnd(0, TAU), rnd(-0.3, 0.3));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 128), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.55 }));
        ring.rotation.x = Math.PI / 2;
        const planet = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.08, 0.2), 16, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 }));
        planet.position.set(r, 0, 0);
        pivot.add(ring, planet);
        pivot.userData.w = rnd(0.15, 0.5) * (Math.random() < 0.5 ? 1 : -1);
        g.add(pivot);
      }
      g.userData.update = (t, dt) => g.children.forEach((c) => (c.rotation.y += c.userData.w * dt));
      break;
    }
    case 'spheres':
    case 'bubbles':
    case 'lanterns': {
      let mat;
      if (d.metal) mat = new THREE.MeshStandardMaterial({ color: col, metalness: 1, roughness: 0.08 });
      else if (d.kind === 'bubbles') mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1 });
      else if (d.kind === 'lanterns') mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.6 });
      else mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.05, clearcoat: 1 });
      const geo = d.kind === 'lanterns' ? new THREE.SphereGeometry(1, 20, 14).scale(1, 0.82, 1) : new THREE.SphereGeometry(1, 24, 16);
      const candy = ['#ff5fa2', '#fff36b', '#5fd9ff', '#c6ff4d', '#ff9f43'];
      const inst = instanced(geo, mat, d.count, (inst, i) => {
        setInstance(inst, i, annulus(4.0, 5.3, yLo, yHi), { x: 0, y: 0, z: 0 }, rnd(s0, s1));
        if (d.candy) inst.setColorAt(i, new THREE.Color(candy[i % candy.length]));
      });
      if (d.candy) inst.instanceColor.needsUpdate = true;
      g.add(inst);
      if (d.kind === 'lanterns') {
        // 提灯の吊り紐
        const line = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#3a1a14', transparent: true, opacity: 0.6 }));
        const pts = [];
        for (let i = 0; i < d.count; i++) { inst.getMatrixAt(i, _m); _p.setFromMatrixPosition(_m); pts.push(_p.x, _p.y + 0.3, _p.z, _p.x, yHi + 0.6, _p.z); }
        line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        g.add(line);
      }
      break;
    }
    case 'helix': {
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: d.emissive || 0.6, roughness: 0.3 });
      g.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat, d.count, (inst, i) => {
        const u = i / d.count, a = u * TAU * 2.5, r = 4.4 + Math.sin(u * TAU * 3) * 0.4;
        setInstance(inst, i, new THREE.Vector3(Math.sin(a) * r, yLo + u * (yHi - yLo), Math.cos(a) * r), { x: a, y: a, z: 0 }, rnd(s0, s1));
      }));
      break;
    }
    case 'phones': {
      const body = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3, metalness: 0.6 });
      const screen = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: d.emissive || 0.5 });
      const geo = new THREE.BoxGeometry(0.46, 0.94, 0.05);
      const sg = new THREE.PlaneGeometry(0.4, 0.86); sg.translate(0, 0, 0.026);
      const places = [];
      for (let i = 0; i < d.count; i++) places.push({ p: annulus(4.1, 5.3, yLo, yHi), r: { x: rnd(-0.5, 0.5), y: rnd(0, TAU), z: rnd(-0.5, 0.5) }, s: rnd(s0, s1) * 1.4 });
      g.add(instanced(geo, body, d.count, (inst, i) => setInstance(inst, i, places[i].p, places[i].r, places[i].s)));
      g.add(instanced(sg, screen, d.count, (inst, i) => setInstance(inst, i, places[i].p, places[i].r, places[i].s)));
      break;
    }
    case 'stars': {
      const mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
      g.add(instanced(new THREE.OctahedronGeometry(1, 0), mat, d.count, (inst, i) => {
        setInstance(inst, i, annulus(3.8, 5.3, yLo - 0.6, yHi + 1.0), { x: rnd(0, TAU), y: rnd(0, TAU), z: 0 }, rnd(s0, s1));
      }));
      // 天の川の帯
      const n = 500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const p = annulus(5.5, 5.3, yHi - 0.4, yHi + 1.4); pos.set([p.x, p.y, p.z], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.05, transparent: true, opacity: 0.7, depthWrite: false })));
      break;
    }
    case 'logs': {
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 });
      const geo = new THREE.CylinderGeometry(0.12, 0.12, 1, 10); geo.rotateZ(Math.PI / 2);
      g.add(instanced(geo, mat, d.count, (inst, i) => {
        const p = annulus(4.0, 5.3, yLo - 0.1, yLo + 0.6);
        setInstance(inst, i, p, { x: rnd(-0.2, 0.2), y: rnd(0, TAU), z: rnd(-0.15, 0.15) }, { x: rnd(s0, s1), y: 1, z: 1 });
      }));
      if (d.embers) {
        const n = 160, pos = new Float32Array(n * 3), seed = [];
        for (let i = 0; i < n; i++) { const p = annulus(4.2, 5.3, yLo, yHi + 1); pos.set([p.x, p.y, p.z], i * 3); seed.push(rnd(0.3, 0.9)); }
        const geo2 = new THREE.BufferGeometry(); geo2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(geo2, new THREE.PointsMaterial({ color: '#ff8c42', size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
        g.add(pts);
        g.userData.update = (t, dt) => {
          const a = pts.geometry.attributes.position;
          for (let i = 0; i < n; i++) { let y = a.getY(i) + seed[i] * dt; if (y > yHi + 1) y = yLo; a.setY(i, y); }
          a.needsUpdate = true;
        };
      }
      break;
    }
    case 'capsules': {
      const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.4, transparent: true, opacity: 0.55, emissive: col, emissiveIntensity: d.emissive || 0 });
      g.add(instanced(new THREE.CapsuleGeometry(0.16, 0.6, 6, 12), mat, d.count, (inst, i) => {
        const p = annulus(4.1, 5.3, yLo + 0.4, yLo + 0.4);
        setInstance(inst, i, p, { x: 0, y: rnd(0, TAU), z: 0 }, rnd(s0, s1) * 1.1);
      }));
      break;
    }
  }
  return g;
}
