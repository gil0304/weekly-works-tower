// 19段それぞれの材質・光・周囲の装飾。映像(worlds.py)と美術館(MuseumThemeRooms)の世界観に合わせる。
export const THEMES = {
  '自己紹介アート': {
    accent: '#ff7a59', light: '#ffd7c2',
    body: { kind: 'particles', color: '#cfc9bf', metalness: 0.0, roughness: 0.6 },
    decor: { kind: 'points', color: '#ff7a59', count: 900, size: [0.03, 0.06], spin: 0.05, band: [-1.2, 1.4] },
  },
  '1日1回の大切さ': {
    accent: '#f3c96b', light: '#fff1cf',
    body: { kind: 'sheets', color: '#c7bfae', metalness: 0.05, roughness: 0.8 },
    decor: { kind: 'rings', color: '#f3c96b', count: 7, size: [0.9, 2.4], emissive: 0.6, spin: 0.08 },
  },
  '予定を楽しく！': {
    accent: '#ff9f43', light: '#ffe0b3',
    body: { kind: 'ticket', color: '#ffb84d', metalness: 0.1, roughness: 0.45 },
    decor: { kind: 'chips', color: '#ffffff', count: 60, size: [0.18, 0.5], spin: 0.12 },
  },
  '音': {
    accent: '#39e6ff', light: '#8ff0ff',
    body: { kind: 'equalizer', color: '#101820', metalness: 0.4, roughness: 0.35 },
    decor: { kind: 'bars', color: '#39e6ff', count: 96, size: [0.2, 1.6], emissive: 0.8, spin: 0.0 },
  },
  'データの可視化': {
    accent: '#5cf29a', light: '#bdffd9',
    body: { kind: 'chart', color: '#0d1a14', metalness: 0.3, roughness: 0.5 },
    decor: { kind: 'columns', color: '#5cf29a', count: 72, size: [0.3, 2.0], emissive: 0.7, spin: 0.0 },
  },
  'ちょっとだけ便利な拡張機能': {
    accent: '#6ea8ff', light: '#cfe0ff',
    body: { kind: 'puzzle', color: '#c9d0da', metalness: 0.0, roughness: 0.6 },
    decor: { kind: 'chips', color: '#6ea8ff', count: 48, size: [0.2, 0.42], emissive: 0.3, spin: 0.1 },
  },
  'Webで使えるライブラリ': {
    accent: '#b69cff', light: '#dccfff',
    body: { kind: 'wire', color: '#1a1530', metalness: 0.2, roughness: 0.4, wireframe: false },
    decor: { kind: 'frames', color: '#b69cff', count: 26, size: [0.6, 1.6], emissive: 0.7, spin: 0.15 },
  },
  'Webでできる可能性': {
    accent: '#4fd1ff', light: '#c6efff',
    body: { kind: 'glass', color: '#9fd8ff', metalness: 0.0, roughness: 0.05, transmission: 0.85, thickness: 1.2, ior: 1.4 },
    decor: { kind: 'cubes', color: '#4fd1ff', count: 40, size: [0.2, 0.7], emissive: 0.35, spin: 0.1 },
  },
  'Astra使ってみた': {
    accent: '#ff9d4d', light: '#ffc79b',
    body: { kind: 'orbit', color: '#0b0f1e', metalness: 0.6, roughness: 0.3 },
    decor: { kind: 'orbits', color: '#ff9d4d', count: 5, size: [3.2, 6.0], emissive: 0.7, spin: 0.2 },
  },
  'Metal使った': {
    accent: '#dfe6ee', light: '#ffffff',
    body: { kind: 'chrome', color: '#aeb6c0', metalness: 1.0, roughness: 0.08 },
    decor: { kind: 'spheres', color: '#dfe6ee', count: 30, size: [0.12, 0.34], metal: true, spin: 0.12 },
  },
  'AEとか使ってみた': {
    accent: '#ff4fd8', light: '#ff9be8',
    body: { kind: 'neon', color: '#1b0a1c', metalness: 0.5, roughness: 0.3, emissive: '#3a0b36', emissiveIntensity: 0.4 },
    decor: { kind: 'helix', color: '#ff4fd8', count: 120, size: [0.12, 0.3], emissive: 0.9, spin: 0.35 },
  },
  'iPhoneをコントローラへ': {
    accent: '#c6ff4d', light: '#e5ffb0',
    body: { kind: 'phone', color: '#141614', metalness: 0.3, roughness: 0.5 },
    decor: { kind: 'phones', color: '#c6ff4d', count: 30, size: [0.35, 0.7], emissive: 0.5, spin: 0.18 },
  },
  '広告にありそうなゲーム': {
    accent: '#ff5fa2', light: '#ffc2dc',
    body: { kind: 'candy', color: '#ff5fa2', metalness: 0.0, roughness: 0.35, clearcoat: 1.0 },
    decor: { kind: 'spheres', color: '#fff36b', count: 46, size: [0.12, 0.36], candy: true, spin: 0.14 },
  },
  'Minecraft Mod': {
    accent: '#7bd24a', light: '#d3ffb0',
    body: { kind: 'voxel', color: '#6b4a2e', metalness: 0.0, roughness: 0.95, flat: true },
    decor: { kind: 'voxels', color: '#7bd24a', count: 70, size: [0.3, 0.3], spin: 0.06 },
  },
  '夏': {
    accent: '#ffe066', light: '#fff5c2',
    body: { kind: 'water', color: '#7fd0ff', metalness: 0.0, roughness: 0.2, transmission: 0.5, thickness: 0.8 },
    decor: { kind: 'bubbles', color: '#ffffff', count: 60, size: [0.1, 0.45], spin: 0.08 },
  },
  '夏祭り': {
    accent: '#ff4a3d', light: '#ff9b7a',
    body: { kind: 'yatai', color: '#2a0d0b', metalness: 0.1, roughness: 0.7 },
    decor: { kind: 'lanterns', color: '#ff4a3d', count: 30, size: [0.28, 0.42], emissive: 1.0, spin: 0.05 },
  },
  '七夕': {
    accent: '#f5c86a', light: '#ffe9b8',
    body: { kind: 'bamboo', color: '#0b1236', metalness: 0.7, roughness: 0.25, emissive: '#0d1a4a', emissiveIntensity: 0.3 },
    decor: { kind: 'stars', color: '#f5c86a', count: 140, size: [0.05, 0.16], emissive: 1.0, spin: 0.04 },
  },
  'キャンプ': {
    accent: '#ff8c42', light: '#ffc08a',
    body: { kind: 'cabin', color: '#8a5a34', metalness: 0.0, roughness: 0.9 },
    decor: { kind: 'logs', color: '#5b3a20', count: 26, size: [0.9, 1.8], spin: 0.03, embers: true },
  },
  '人のMA': {
    accent: '#5fd9c9', light: '#c9fff6',
    body: { kind: 'frost', color: '#c8cfd1', metalness: 0.0, roughness: 0.5 },
    decor: { kind: 'capsules', color: '#5fd9c9', count: 18, size: [0.6, 1.1], emissive: 0.25, spin: 0.05 },
  },
};

export function themeOf(dir) {
  return THEMES[dir] || { accent: '#ffffff', light: '#ffffff', body: { color: '#888', metalness: 0.2, roughness: 0.6 }, decor: null };
}
