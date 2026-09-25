import * as THREE from 'three';
import { themeOf } from './themes.js';
import { buildDecor } from './decor.js';
import { buildBody } from './bodies.js';
import { textPlane } from './text.js';

export const R = 3.2;          // 三角柱の外接円半径
export const H = 3.4;          // 1段の高さ
export const GAP = 0.55;       // 段の隙間
export const PITCH = H + GAP;
export const TWIST = THREE.MathUtils.degToRad(13); // 段ごとのねじれ
export const FACE_R = R / 2;   // 面の中心までの距離

export function floorY(f) { return f * PITCH + H / 2; }
export function faceAngle(f, i) { return TWIST * f + Math.PI / 3 + (i * 2 * Math.PI) / 3; }

const loader = new THREE.TextureLoader();

export function buildTower(scene, data) {
  const tower = new THREE.Group();
  const floors = [];
  const works = [];
  const rimMats = [];

  data.themes.forEach((theme, f) => {
    const style = themeOf(theme.dir);
    const accent = new THREE.Color(style.accent);
    const g = new THREE.Group();
    g.position.y = floorY(f);
    g.rotation.y = TWIST * f;

    // 本体(テーマごとに形が違う)
    const body = buildBody(style, R, H);
    g.add(body.group);

    // 台座と光る縁(三角形)
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.14, R * 1.2, 0.16, 3, 1), new THREE.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.6, metalness: 0.4 }));
    slab.position.y = -H / 2 - 0.08;
    g.add(slab);
    const rimGeo = new THREE.TorusGeometry(R * 1.17, 0.035, 6, 3);
    rimGeo.rotateX(Math.PI / 2); rimGeo.rotateY(-Math.PI / 2);
    const rimMat = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -H / 2 - 0.16;
    g.add(rim);
    rimMats.push(rimMat);

    // 段のライト
    const light = new THREE.PointLight(style.light, 7, 13, 1.6);
    light.position.set(0, H / 2 + 1.2, 0);
    g.add(light);

    // 3つの面
    const faces = [];
    theme.works.forEach((work, i) => {
      const phi = Math.PI / 3 + (i * 2 * Math.PI) / 3; // 段のローカル座標(段自体が twist 分回る)
      const dir = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
      const face = new THREE.Group();
      face.position.copy(dir).multiplyScalar(FACE_R + body.faceOffset);
      face.rotation.y = phi;

      // 画面のサイズ(縦横比を保つ)
      const aspect = work.w / work.h;
      let sw, sh;
      if (aspect >= 1) { sw = Math.min(4.3, (H - 1.0) * aspect); sh = sw / aspect; }
      else { sh = 2.45; sw = sh * aspect; }
      const thumb = loader.load(work.thumb);
      thumb.colorSpace = THREE.SRGBColorSpace;
      const screenMat = new THREE.MeshBasicMaterial({ map: thumb, toneMapped: false });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
      screen.position.set(0, -0.08, 0.04);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.09, sh + 0.09), new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(0.6), toneMapped: false }));
      frame.position.set(0, -0.08, 0.02);
      const shade = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.5, sh + 0.5), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35 }));
      shade.position.set(0, -0.08, 0.008);

      // ラベル
      const top = textPlane(`WEEK ${String(theme.order).padStart(2, '0')}   ${theme.dir}`, 0.19, { font: 'ja', weight: 500, color: '#ffffff', letterSpacing: 0.06, opacity: 0.85 });
      top.position.set(0, H / 2 - 0.34, 0.03);
      const name = textPlane(work.name, 0.3, { font: 'en', weight: 600, color: '#ffffff', letterSpacing: 0.02 });
      name.position.set(0, -H / 2 + 0.36, 0.03);
      const kind = textPlane(work.kind.toUpperCase(), 0.12, { font: 'en', weight: 500, color: style.accent, letterSpacing: 0.2, opacity: 0.95 });
      kind.position.set(0, -H / 2 + 0.12, 0.03);

      face.add(shade, frame, screen, top, name, kind);
      g.add(face);

      const entry = { work, theme, floor: f, slot: i, index: works.length, face, screen, screenMat, thumb, worldAngle: faceAngle(f, i) };
      screen.userData.entry = entry;
      faces.push(entry);
      works.push(entry);
    });

    // 装飾
    const decor = buildDecor(style.decor, H);
    g.add(decor);

    tower.add(g);
    floors.push({ group: g, theme, style, faces, decor, y: floorY(f), light, bodyUpdate: body.update });
  });

  scene.add(tower);
  return { group: tower, floors, works, rimMats, height: floors.length * PITCH };
}
