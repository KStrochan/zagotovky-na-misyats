// Scroll-driven 3D story: a tall section with a sticky canvas.
// The scroll position inside the section becomes progress p ∈ [0, 1],
// and the scene's update(p, time) moves the camera like a film dolly.
import * as THREE from '../../vendor/three.module.min.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (t) => t * t * (3 - 2 * t);
/** Local progress of p inside [a, b], eased. */
export const seg = (p, a, b) => smooth(clamp((p - a) / (b - a)));

/** Interpolates camera keyframes [{p, pos:[x,y,z], look:[x,y,z]}] at progress p. */
export function cameraPath(keys) {
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  return (p, camera) => {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const k0 = keys[i], k1 = keys[i + 1];
    const t = smooth(clamp((p - k0.p) / (k1.p - k0.p)));
    pos.copy(A.fromArray(k0.pos)).lerp(B.fromArray(k1.pos), t);
    look.copy(A.fromArray(k0.look)).lerp(B.fromArray(k1.look), t);
    camera.position.copy(pos);
    camera.lookAt(look);
  };
}

/** Draws text onto a canvas and returns a texture (for labels inside the 3D scene). */
export function textTexture(draw, w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createStory({ section, build, onProgress, offset = { wide: [-0.17, 0], tall: [0, 0.17] }, tallZoom = 1 }) {
  const canvas = section.querySelector('canvas');
  const captions = [...section.querySelectorAll('[data-from]')];
  const bar = section.querySelector('.story-progress i');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    section.classList.add('no-webgl');
    if (onProgress) onProgress(1);
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const update = build({ THREE, scene, camera, renderer, reduced });

  let target = 0, current = 0, visible = true, raf = 0, last = performance.now();

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens: widen the lens so the subject stays in frame.
    camera.fov = w / h < 0.8 ? 52 : 38;
    // Shift the subject out from under the captions: right on wide screens, up on phones.
    const [ox, oy] = w / h < 0.8 ? offset.tall : offset.wide;
    camera.setViewOffset(w, h, ox * w, oy * h, w, h);
    camera.zoom = w / h < 0.8 ? tallZoom : 1;
    camera.updateProjectionMatrix();
  }
  function measure() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    target = total > 0 ? clamp(-r.top / total) : 0;
  }
  function captionsAt(p) {
    for (const c of captions) {
      const on = p >= +c.dataset.from && p < +c.dataset.to;
      c.classList.toggle('on', on);
    }
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (onProgress) onProgress(p);
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    current += (target - current) * (reduced ? 1 : 1 - Math.pow(0.0015, dt));
    if (Math.abs(target - current) < 0.0002) current = target;
    update(current, now / 1000);
    captionsAt(current);
    renderer.render(scene, camera);
    if (visible && (!reduced || current !== target)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(section);
  addEventListener('scroll', () => { measure(); kick(); }, { passive: true });
  addEventListener('resize', () => { size(); measure(); kick(); });
  size(); measure(); current = target;
  section.classList.add('ready');
  kick();
}
