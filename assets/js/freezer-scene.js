// «Заготовки на місяць»: a freezer drawer fills up, one row per cooking weekend.
// Every pack carries a hand-written masking-tape label, like a real freezer.
import { cameraPath, seg, textTexture } from './story.js';

export const ITEMS = [
  // week 1 — dough & mince
  ['Вареники', '90 шт', 0xf3e6c4, 'bag'], ['Пельмені', '120 шт', 0xefe0bd, 'bag'], ['Голубці', '20 шт', 0x9fb36a, 'box'], ['Фарширований перець', '12 шт', 0xd9472b, 'box'], ['Тісто для піци', '6 кульок', 0xf1dcae, 'bag'],
  // week 2 — cutlets & pancakes
  ['Котлети курячі', '20 шт', 0xc68a4f, 'bag'], ['Тефтелі в соусі', '30 шт', 0xb2462f, 'box'], ['Сирники', '20 шт', 0xe8b968, 'bag'], ["Млинці з м'ясом", '16 шт', 0xdcae6d, 'bag'], ['Млинці з сиром', '16 шт', 0xe7c784, 'bag'],
  // week 3 — soups & sauces
  ['Борщова заправка', '4 каструлі', 0xa3233b, 'bag'], ['Курячий бульйон', '4 л', 0xe9c46a, 'bag'], ['Суп-набір', '4 набори', 0x7fae5a, 'bag'], ['Болоньєзе', '5 × 500 мл', 0x9a3a22, 'box'], ['Овочеве рагу', '4 порції', 0x8fa35a, 'box'],
  // week 4 — marinades & bakes
  ['Гомілки в маринаді', '2 вечері', 0xa8552a, 'bag'], ['Свинина для запікання', '2 вечері', 0xb8643c, 'bag'], ['Лазанья', '6 порцій', 0xc9652f, 'tray'], ['Смузі-набори', '8 шт', 0xb0365e, 'bag'], ['Сирна запіканка', '8 порцій', 0xefd28f, 'box'],
];

function roundedSlab(THREE, w, d, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: h * 0.35, bevelSize: Math.min(r, h * 0.5), bevelSegments: 4, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, 0);
  return g;
}

function labelTexture(name, qty) {
  return textTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#f3e6b8';
    g.beginPath(); g.moveTo(10, 18); g.lineTo(w - 6, 8); g.lineTo(w - 14, h - 14); g.lineTo(4, h - 6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(120,100,40,.08)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = '#14273a';
    let size = 70;
    g.font = `700 ${size}px Caveat, 'Comic Sans MS', cursive`;
    while (g.measureText(name).width > w - 40 && size > 36) { size -= 2; g.font = `700 ${size}px Caveat, 'Comic Sans MS', cursive`; }
    g.fillText(name, 22, 92);
    g.fillStyle = '#b3264a';
    g.font = `700 54px Caveat, 'Comic Sans MS', cursive`;
    g.fillText(qty, 22, 170);
  }, 512, 220);
}

export function buildFreezer({ THREE, scene, camera, reduced }) {
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x0b1622, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(3, 12, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03;
  scene.add(key);
  const led = new THREE.PointLight(0xbfe3ff, 30, 12, 2);
  led.position.set(0, 4, 0);
  scene.add(led);
  const warm = new THREE.DirectionalLight(0xffb3c4, 0.5);
  warm.position.set(-6, 2, -4);
  scene.add(warm);

  // ---------- drawer ----------
  const drawer = new THREE.Group();
  scene.add(drawer);
  const shell = new THREE.MeshStandardMaterial({ color: 0xeef4f8, roughness: 0.35, metalness: 0.05 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xd7e6ef, roughness: 0.6 });
  const W = 8.4, D = 6.2, H = 1.7, T = 0.16;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), inner); floor.position.y = -T / 2; floor.receiveShadow = true; drawer.add(floor);
  const wallGeoX = new THREE.BoxGeometry(T, H, D), wallGeoZ = new THREE.BoxGeometry(W, H, T);
  [[-W / 2, 0], [W / 2, 0]].forEach(([x]) => { const m = new THREE.Mesh(wallGeoX, shell); m.position.set(x, H / 2 - T, 0); m.castShadow = m.receiveShadow = true; drawer.add(m); });
  const back = new THREE.Mesh(wallGeoZ, shell); back.position.set(0, H / 2 - T, -D / 2); back.receiveShadow = true; drawer.add(back);
  // front panel: taller, with a printed label and a cranberry handle
  const frontTex = textTexture((g, w, h) => {
    g.fillStyle = '#eef4f8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#14273a'; g.font = "800 64px Rubik, Arial, sans-serif"; g.textAlign = 'center';
    g.fillText('МОРОЗИЛКА НА МІСЯЦЬ', w / 2, h * 0.5);
    g.fillStyle = '#5a7184'; g.font = "600 34px Nunito, Arial, sans-serif";
    g.fillText('−18 °C · 20 заготовок · 4 вихідні', w / 2, h * 0.72);
  }, 1024, 256);
  const frontMat = [shell, shell, shell, shell, new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.35 }), shell];
  const front = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, H + 0.3, 0.3), frontMat);
  front.position.set(0, H / 2 - 0.15 - T, D / 2 + 0.1); front.castShadow = true;
  drawer.add(front);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 3.2, 6, 16), new THREE.MeshStandardMaterial({ color: 0xb3264a, roughness: 0.3 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(0, H - 0.12 - T, D / 2 + 0.38);
  drawer.add(handle);

  // ---------- packs ----------
  const cols = 5, rows = 4, cellW = 1.5, cellD = 1.3;
  const packs = ITEMS.map(([name, qty, color, kind], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const g = new THREE.Group();
    const w = kind === 'tray' ? 1.3 : 1.28, d = kind === 'box' ? 1.0 : 1.05, h = kind === 'bag' ? 0.12 : 0.34;
    const content = new THREE.MeshStandardMaterial({ color, roughness: kind === 'bag' ? 0.5 : 0.7 });
    let body;
    if (kind === 'bag') {
      body = new THREE.Mesh(roundedSlab(THREE, w, d, h, 0.18), content);
      const film = new THREE.Mesh(roundedSlab(THREE, w + 0.1, d + 0.1, h + 0.02, 0.22), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transmission: 0.6, transparent: true, opacity: 0.35, thickness: 0.2 }));
      film.position.y = -0.01; g.add(film);
    } else {
      body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: kind === 'tray' ? 0xc9ccd1 : 0xf6f8fa, roughness: kind === 'tray' ? 0.3 : 0.5, metalness: kind === 'tray' ? 0.6 : 0 }));
      body.position.y = h / 2;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04), new THREE.MeshStandardMaterial({ color: kind === 'tray' ? 0xd5d9de : color, roughness: 0.4, metalness: kind === 'tray' ? 0.6 : 0 }));
      lid.position.y = h + 0.02; g.add(lid);
    }
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const top = kind === 'bag' ? h * 1.4 + 0.02 : h + 0.06;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.45), new THREE.MeshStandardMaterial({ map: labelTexture(name, qty), transparent: true, roughness: 0.8 }));
    label.rotation.x = -Math.PI / 2; label.rotation.z = (i % 3 - 1) * 0.06; label.position.set(0, top, 0.08);
    g.add(label);
    const x = (col - (cols - 1) / 2) * cellW, z = (row - (rows - 1) / 2) * cellD;
    g.userData = { x, z, row, col, tilt: ((i * 37) % 7 - 3) * 0.03 };
    g.visible = false;
    drawer.add(g);
    return g;
  });

  // ---------- frost ----------
  const N = 380, fp = new Float32Array(N * 3), fs = [];
  for (let i = 0; i < N; i++) { fp.set([(Math.random() - 0.5) * 22, Math.random() * 12, (Math.random() - 0.5) * 16], i * 3); fs.push(Math.random()); }
  const frostGeo = new THREE.BufferGeometry(); frostGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flake = textTexture((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 64, 64);
  const frost = new THREE.Points(frostGeo, new THREE.PointsMaterial({ size: 0.12, map: flake, transparent: true, opacity: 0.75, depthWrite: false, color: 0xe6f4ff }));
  scene.add(frost);

  const cam = cameraPath([
    { p: 0.00, pos: [0, 2.6, 16], look: [0, 1.0, 0] },
    { p: 0.14, pos: [0, 10, 12.5], look: [0, 0, 0.6] },
    { p: 0.32, pos: [-7.5, 10, 10], look: [0, 0, 0] },
    { p: 0.50, pos: [7.5, 10, 9.5], look: [0, 0, 0] },
    { p: 0.68, pos: [-2.5, 12.5, 9], look: [0, 0, 0] },
    { p: 0.86, pos: [0.01, 16.5, 1.2], look: [0, 0, 0.3] },
    { p: 1.00, pos: [0, 14, 9.5], look: [0, 0, 0] },
  ]);
  const weekStart = [0.16, 0.34, 0.52, 0.70];

  return (p, t) => {
    cam(p, camera);
    // drawer slides out toward the viewer
    const open = seg(p, 0.02, 0.15);
    drawer.position.z = -5.5 + open * 5.5;
    packs.forEach((g, i) => {
      const { x, z, row, col, tilt } = g.userData;
      const a = weekStart[row] + col * 0.022, k = seg(p, a, a + 0.05);
      g.visible = k > 0.001;
      g.position.set(x, 0.02 + (1 - k) * 3.2, z);
      g.rotation.set((1 - k) * 0.6, tilt + (1 - k) * 0.5, (1 - k) * -0.3);
    });
    const arr = frostGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1] = 12 - ((t * (0.25 + fs[i] * 0.35) + fs[i] * 12) % 12);
      if (!reduced) arr[i * 3] += Math.sin(t * 0.6 + fs[i] * 10) * 0.002;
    }
    frostGeo.attributes.position.needsUpdate = true;
  };
}
