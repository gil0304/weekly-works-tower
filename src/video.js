import * as THREE from 'three';

// 近くの作品だけ動画を読み込み・再生し、離れたものは解放する
export class VideoPool {
  constructor(works) {
    this.works = works;
    this.videos = new Map(); // index -> { el, tex }
  }
  ensure(i) {
    if (this.videos.has(i)) return this.videos.get(i);
    const w = this.works[i];
    const el = document.createElement('video');
    el.src = w.work.video;
    el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
    const tex = new THREE.VideoTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    const rec = { el, tex, playing: false };
    el.addEventListener('playing', () => { rec.playing = true; w.screenMat.map = tex; w.screenMat.needsUpdate = true; });
    this.videos.set(i, rec);
    return rec;
  }
  release(i) {
    const rec = this.videos.get(i);
    if (!rec) return;
    const w = this.works[i];
    rec.el.pause(); rec.el.removeAttribute('src'); rec.el.load();
    rec.tex.dispose();
    w.screenMat.map = w.thumb; w.screenMat.needsUpdate = true;
    this.videos.delete(i);
  }
  // current: 今見ている作品の添字
  update(current) {
    for (let i = 0; i < this.works.length; i++) {
      const d = Math.abs(i - current);
      if (d <= 1) {
        const rec = this.ensure(i);
        if (rec.el.paused) rec.el.play().catch(() => {});
      } else if (d <= 3) {
        const rec = this.ensure(i);
        if (!rec.el.paused) rec.el.pause();
      } else if (this.videos.has(i)) {
        this.release(i);
      }
    }
  }
}
