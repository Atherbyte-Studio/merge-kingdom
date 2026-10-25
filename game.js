// مملكة الدمج - مراحل متسلسلة (١٠ مراحل)، بناء بالعمال، مواد متعددة، ومعارك الحرب العالمية الأولى.
// كل مرحلة: دقيقة لتجهيز المواد للعمال، والعمال بيبنوا كل مبنى بوقت.
// إذا نسبة البناء ٨٠٪ أو أكثر وقت الانتهاء، الدفاع يصمد وتنفتح المرحلة الجاية. وإلا الهجوم ينتصر وتعيد المرحلة.

const W = 600;
const H = 800;
const COLS = 6;
const ROWS = 6;
const SIZE = 80;
const GAP = 8;
const STEP = SIZE + GAP;
const GRID_X = 40;
const GRID_Y = 178;
const MAX_ITEM_LEVEL = 3;
const SAVE_KEY = 'merge-kingdom-save-v2';
const FONT = 'system-ui, Tahoma, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const LEVEL_COUNT = 10;
const MISSION_MS = 60000;   // وقت المرحلة
const BUILD_MS = 12000;     // وقت بناء المبنى بعد ما تنجمع مواده
const WIN_RATIO = 0.8;

const VILLAGE_Y = 100;
const VILLAGE_H = 70;
const CARD_W = 180;
const CARD_GAP = 10;
const CARD_X0 = (W - (3 * CARD_W + 2 * CARD_GAP)) / 2;

// نقاط كل مستوى من أي مادة: المستوى ١ = ١، ٢ = ٣، ٣ = ٩
const POINTS = { 1: 1, 2: 3, 3: 9 };

const ITEM_NAMES = {
  wood: ['حطب', 'خشب', 'لوح'],
  stone: ['حصى', 'حجر', 'كتل حجرية'],
  iron: ['خردة حديد', 'قضبان حديد', 'صفائح فولاذ'],
};
const RES_LABEL = { wood: 'خشب', stone: 'حجر', iron: 'حديد' };
const SPAWN_TYPES = ['wood', 'stone', 'iron'];

// مبنى جديد مختلف لكل مرحلة (الحرب العالمية الأولى)
const EXTRAS = [
  { key: 'sandbag', name: 'أكياس رمل', req: { stone: 6 } },
  { key: 'wire', name: 'أسلاك شائكة', req: { iron: 9 } },
  { key: 'mg', name: 'عش رشاش', req: { iron: 6, wood: 3 } },
  { key: 'artillery', name: 'مدفعية ميدانية', req: { iron: 9, stone: 6 } },
  { key: 'trench', name: 'خندق عميق', req: { stone: 9, wood: 6 } },
  { key: 'hospital', name: 'مستشفى ميداني', req: { stone: 6, wood: 6, iron: 3 } },
  { key: 'tank', name: 'مصيدة دبابات', req: { iron: 12 } },
  { key: 'hq', name: 'مخبأ القيادة', req: { stone: 9, iron: 6, wood: 6 } },
  { key: 'radio', name: 'محطة لاسلكي', req: { iron: 6, wood: 6 } },
  { key: 'depot', name: 'مخزن ذخيرة', req: { wood: 9, stone: 9 } },
];

const CASTLE_PARTS = [
  { key: 'foundation', name: 'الأساس', cost: 100, needs: null },
  { key: 'walls', name: 'الأسوار', cost: 200, needs: 'foundation' },
  { key: 'tower', name: 'البرج', cost: 300, needs: 'walls' },
  { key: 'roof', name: 'السقف', cost: 400, needs: 'tower' },
];

// ---------- أدوات عامة ----------

function cellX(c) { return GRID_X + c * STEP + SIZE / 2; }
function cellY(r) { return GRID_Y + r * STEP + SIZE / 2; }

function nearestCell(x, y) {
  const c = Math.round((x - cellX(0)) / STEP);
  const r = Math.round((y - cellY(0)) / STEP);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return { r, c };
}

function cardRect(i) {
  return { x: CARD_X0 + i * (CARD_W + CARD_GAP), y: VILLAGE_Y, w: CARD_W, h: VILLAGE_H };
}

function villageHit(x, y) {
  for (let i = 0; i < 3; i++) {
    const r = cardRect(i);
    if (x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 10 && y <= r.y + r.h + 10) return i;
  }
  return -1;
}

function dayKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// ---------- صوت واهتزاز (اختياري) ----------

let audioCtx = null;
function audio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (e) {
    return null;
  }
}

function beep(freq, dur, type = 'sine', vol = 0.05) {
  const ctx = audio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + dur);
}

function boom(vol = 0.5) {
  const ctx = audio();
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * 0.7);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start();
}

function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* مش مدعوم */ }
}

// ---------- تأثيرات ----------

function burst(scene, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + hash(i) * 0.5;
    const p = scene.add.circle(x, y, 3 + hash(i + 7) * 4, color).setDepth(40);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * (30 + hash(i + 3) * 25),
      y: y + Math.sin(a) * (30 + hash(i + 5) * 25),
      alpha: 0,
      scale: 0.2,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => p.destroy(),
    });
  }
}

function floatText(scene, x, y, text, color) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color,
    stroke: '#ffffff', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(50);
  scene.tweens.add({
    targets: t, y: y - 50, alpha: 0, duration: 900, ease: 'Cubic.Out',
    onComplete: () => t.destroy(),
  });
}

function makeButton(scene, x, y, w, h, label, onClick, active = false) {
  const g = scene.add.graphics().setDepth(30);
  const draw = (color) => {
    g.clear();
    g.fillStyle(0x4a2e12, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, 12);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    g.lineStyle(2, 0xf7e7b4, 0.7);
    g.strokeRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, 10);
  };
  const base = active ? 0x6b3f18 : 0x9a6230;
  draw(base);
  const text = scene.add.text(x, y - 2, label, {
    fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(31);
  const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0)
    .setDepth(32)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => draw(0x7d4d20));
  hit.on('pointerup', () => { draw(base); onClick(); });
  hit.on('pointerout', () => draw(base));
  return { setLabel: (t) => text.setText(t) };
}

// ---------- رسم المواد ----------

function drawLog(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 66, 12);
  [{ x: -30, y: -15, w: 60 }, { x: -26, y: 3, w: 56 }].forEach(({ x, y, w }) => {
    const h = 18;
    g.fillStyle(0x7a4a22, 1);
    g.fillRoundedRect(x, y, w, h, 9);
    g.fillStyle(0x9a6230, 1);
    g.fillRoundedRect(x + 2, y + 2, w - 4, h - 7, 7);
    g.lineStyle(1, 0x4a2c12, 0.55);
    g.lineBetween(x + 12, y + 4, x + 24, y + 4);
    g.lineBetween(x + 30, y + 13, x + 48, y + 13);
    const cx = x + 4;
    const cy = y + h / 2;
    g.fillStyle(0xe2b07a, 1); g.fillCircle(cx, cy, 8);
    g.fillStyle(0xc08a52, 1); g.fillCircle(cx, cy, 5);
    g.fillStyle(0xe2b07a, 1); g.fillCircle(cx, cy, 2);
  });
}

function drawPlanks(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 68, 12);
  [{ y: -22, color: 0xd9a06a }, { y: -6, color: 0xc68642 }, { y: 10, color: 0xd09052 }].forEach(({ y, color }) => {
    g.fillStyle(0x6b4220, 1);
    g.fillRoundedRect(-33, y, 66, 15, 4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-32, y + 1, 64, 13, 3);
    g.lineStyle(1, 0x7a4a22, 0.45);
    g.lineBetween(-26, y + 5, 18, y + 4);
    g.lineBetween(-10, y + 10, 26, y + 9);
    g.fillStyle(0x3d2e22, 1);
    g.fillCircle(-24, y + 7, 2);
    g.fillCircle(24, y + 7, 2);
  });
}

function drawBoard(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 30, 74, 12);
  g.fillStyle(0x7a4a22, 1);
  g.fillRoundedRect(-36, -28, 72, 56, 6);
  g.fillStyle(0xf1c27d, 1);
  g.fillRoundedRect(-34, -26, 68, 52, 5);
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(-30, -22, 60, 10, 4);
  g.lineStyle(1, 0xb9833e, 0.5);
  [-10, 0, 10, 18].forEach((y) => g.lineBetween(-28, y, 26, y + 1));
  g.lineBetween(-10, -20, 20, -18);
  g.fillStyle(0x3d2e22, 1);
  [[-26, -20], [26, -20], [-26, 20], [26, 20]].forEach(([x, y]) => g.fillCircle(x, y, 2.5));
}

function drawStone1(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 66, 12);
  [
    { x: -22, y: 6, r: 11, c: 0x8e8e88 },
    { x: 4, y: 10, r: 13, c: 0x7a7a74 },
    { x: 22, y: 2, r: 10, c: 0x9c9c96 },
    { x: -6, y: -8, r: 9, c: 0xa8a8a2 },
  ].forEach(({ x, y, r, c }) => {
    g.fillStyle(0x4a4a46, 0.6);
    g.fillEllipse(x, y + 3, r * 2, r * 1.5);
    g.fillStyle(c, 1);
    g.fillEllipse(x, y, r * 2, r * 1.6);
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(x - r * 0.3, y - r * 0.3, r * 0.8, r * 0.5);
  });
}

function drawStone2(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 68, 12);
  g.fillStyle(0x6a6a64, 1);
  g.fillRoundedRect(-30, -20, 60, 44, 12);
  g.fillStyle(0x8e8e88, 1);
  g.fillRoundedRect(-28, -22, 56, 40, 11);
  g.fillStyle(0xbdbdb6, 0.5);
  g.fillRoundedRect(-22, -16, 30, 10, 5);
  g.lineStyle(1, 0x4a4a46, 0.6);
  g.lineBetween(-4, -6, 8, 4);
  g.lineBetween(8, 4, 14, -2);
}

function drawStone3(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 30, 74, 12);
  g.fillStyle(0x6a6a64, 1);
  g.fillRoundedRect(-34, -4, 68, 22, 3);
  g.fillStyle(0x9a9a92, 1);
  g.fillRoundedRect(-32, -6, 64, 20, 3);
  g.fillStyle(0x6a6a64, 1);
  g.fillRoundedRect(-28, -26, 56, 22, 3);
  g.fillStyle(0xa8a8a0, 1);
  g.fillRoundedRect(-26, -28, 52, 20, 3);
  g.lineStyle(1, 0x5a5a54, 0.5);
  g.lineBetween(-6, -28, -6, -8);
  g.lineBetween(10, -6, 10, 14);
}

function drawIron1(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 66, 12);
  g.fillStyle(0x5a5f66, 1);
  g.fillTriangle(-26, 8, -14, -6, -4, 10);
  g.fillStyle(0x7a6a5a, 1);
  g.fillTriangle(0, 12, 12, -4, 22, 12);
  g.fillStyle(0x4a4f56, 1);
  g.fillTriangle(-14, -10, 2, -18, 10, -4);
  g.fillStyle(0x9a5a32, 1);
  g.fillCircle(16, -8, 4);
  g.fillCircle(-18, -2, 3);
}

function drawIron2(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 68, 12);
  [-22, -8, 6].forEach((y) => {
    g.fillStyle(0x4a525c, 1);
    g.fillRoundedRect(-34, y, 68, 10, 4);
    g.fillStyle(0x6f7a86, 1);
    g.fillRoundedRect(-34, y, 68, 7, 4);
    g.fillStyle(0xb8c2cc, 0.6);
    g.fillRoundedRect(-30, y + 1, 30, 2, 1);
    g.fillStyle(0x3a424c, 1);
    g.fillCircle(-30, y + 5, 2);
    g.fillCircle(30, y + 5, 2);
  });
}

function drawIron3(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 30, 74, 12);
  g.fillStyle(0x4f5a66, 1);
  g.fillRoundedRect(-32, -24, 64, 48, 4);
  g.fillStyle(0x6b7785, 1);
  g.fillRoundedRect(-29, -21, 58, 42, 3);
  g.fillStyle(0xb8c2cc, 0.35);
  g.fillRoundedRect(-26, -18, 52, 8, 3);
  g.lineStyle(1, 0x3a424c, 0.5);
  g.lineBetween(-20, 4, 20, 4);
  g.fillStyle(0x2e343c, 1);
  [[-26, -18], [26, -18], [-26, 18], [26, 18]].forEach(([x, y]) => g.fillCircle(x, y, 2.5));
}

const ITEM_DRAWERS = {
  wood: { 1: drawLog, 2: drawPlanks, 3: drawBoard },
  stone: { 1: drawStone1, 2: drawStone2, 3: drawStone3 },
  iron: { 1: drawIron1, 2: drawIron2, 3: drawIron3 },
};

// ---------- الجنود والعمال ----------

// الجندي: مركزه عند القدمين. scaleX سالب = يواجه اليسار
function drawSoldier(g, uniform) {
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 2, 22, 6);
  g.fillStyle(0x3a2e20, 1);
  g.fillRect(-7, -22, 5, 22);
  g.fillRect(2, -22, 5, 22);
  g.fillStyle(uniform, 1);
  g.fillRoundedRect(-10, -43, 20, 24, 4);
  g.fillStyle(0x4a3e2a, 1);
  g.fillRect(-10, -26, 20, 3);
  g.fillStyle(0xd9b98c, 1);
  g.fillCircle(0, -50, 6);
  g.fillStyle(0x6b6b4a, 1);
  g.fillEllipse(0, -55, 18, 10);
  g.lineStyle(2, 0x2a2014, 1);
  g.lineBetween(9, -36, 26, -54);
}

// العامل: بخوذة وشاكوش
function drawWorker(g) {
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 2, 16, 5);
  g.fillStyle(0x3a2e20, 1);
  g.fillRect(-4, -12, 3, 12);
  g.fillRect(1, -12, 3, 12);
  g.fillStyle(0x5a4a2a, 1);
  g.fillRoundedRect(-6, -26, 12, 16, 3);
  g.fillStyle(0xd9b98c, 1);
  g.fillCircle(0, -30, 4);
  g.fillStyle(0x8a7a3a, 1);
  g.fillEllipse(0, -33, 10, 5);
  g.lineStyle(2, 0x3a2e20, 1);
  g.lineBetween(5, -20, 11, -26);
  g.fillStyle(0x4a4a46, 1);
  g.fillRect(9, -30, 4, 6);
}

// ---------- الحالة ----------

let state = null;

function levelDef(level) {
  const f = 1 + 0.15 * (level - 1);
  const extra = EXTRAS[(level - 1) % EXTRAS.length];
  const scale = (req) => {
    const out = {};
    Object.keys(req).forEach((k) => { out[k] = Math.max(1, Math.round(req[k] * f)); });
    return out;
  };
  return [
    { key: 'sniper', name: 'برج قنص', req: scale({ wood: 9, iron: 3 }) },
    { key: 'barracks', name: 'معسكر تدريب', req: scale({ wood: 6, stone: 6 }) },
    { key: extra.key, name: extra.name, req: scale(extra.req) },
  ];
}

function makeMission(level) {
  return {
    level,
    startedAt: Date.now(),
    status: 'building',
    buildings: levelDef(level).map((b) => {
      const delivered = {};
      Object.keys(b.req).forEach((k) => { delivered[k] = 0; });
      return { ...b, delivered, buildStartedAt: null, done: false };
    }),
  };
}

// نسبة مواد المبنى المجمّعة (0..1)
function materialFrac(b) {
  const need = Object.values(b.req).reduce((s, v) => s + v, 0);
  const have = Object.keys(b.req).reduce((s, k) => s + Math.min(b.delivered[k] || 0, b.req[k]), 0);
  return need ? have / need : 0;
}

// تقدم المبنى: المواد نص، والبناء نص
function buildProgress(b, now = Date.now()) {
  if (b.done) return 1;
  if (b.buildStartedAt) return 0.5 + 0.5 * Math.min(1, (now - b.buildStartedAt) / BUILD_MS);
  return 0.5 * materialFrac(b);
}

function missionRatio(now = Date.now()) {
  const bs = state.mission.buildings;
  return bs.reduce((s, b) => s + buildProgress(b, now), 0) / bs.length;
}

function newState() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  grid[2][2] = { t: 'wood', l: 1 };
  grid[2][3] = { t: 'wood', l: 1 };
  grid[3][2] = { t: 'stone', l: 1 };
  grid[3][3] = { t: 'iron', l: 1 };
  return {
    grid,
    merges: 0,
    gold: 0,
    streak: 0,
    lastClaim: null,
    unlocked: 1,
    completed: 0,
    mission: null,
    castle: { foundation: false, walls: false, tower: false, roof: false },
  };
}

function validCell(v) {
  return v === null || (v && ITEM_DRAWERS[v.t] && ITEM_DRAWERS[v.t][v.l]);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    const validGrid =
      saved &&
      Array.isArray(saved.grid) &&
      saved.grid.length === ROWS &&
      saved.grid.every((row) => Array.isArray(row) && row.length === COLS && row.every(validCell));
    if (validGrid) {
      const merged = Object.assign(newState(), saved);
      merged.castle = Object.assign({ foundation: false, walls: false, tower: false, roof: false }, saved.castle || {});
      return merged;
    }
  } catch (e) {
    // حفظ تالف
  }
  return newState();
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // التخزين مش متاح
  }
}

// ---------- قائمة المراحل ----------

class LevelsScene extends Phaser.Scene {
  constructor() {
    super('levels');
  }

  init(data) {
    this.toast = data && data.toast ? data.toast : null;
  }

  create() {
    this.input.topOnly = true;
    this.drawBackground();

    this.add.text(W / 2, 60, 'اختر المرحلة', {
      fontFamily: SERIF, fontSize: '36px', fontStyle: 'bold', color: '#4a2e12',
      stroke: '#f7e7b4', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(W / 2, 104, 'كل مرحلة بتفتح اللي بعدها. أنهِ المرحلة لتفتح التالية.', {
      fontFamily: FONT, fontSize: '15px', color: '#1f3a14', align: 'center', wordWrap: { width: 520 },
    }).setOrigin(0.5);

    this.message = this.add.text(W / 2, H - 14, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);

    for (let L = 1; L <= LEVEL_COUNT; L++) {
      const col = (L - 1) % 2;
      const row = Math.floor((L - 1) / 2);
      this.levelCard(L, 175 + col * 260, 200 + row * 108);
    }

    makeButton(this, 300, 748, 240, 46, 'القصر', () => this.scene.start('castle'));

    if (this.toast) this.say(this.toast);
  }

  drawBackground() {
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 20; i++) {
      g.fillStyle(lerpColor(0xa9def2, 0xd8f0ff, i / 20), 1);
      g.fillRect(0, i * (H * 0.45 / 20), W, H * 0.45 / 20 + 1);
    }
    g.fillStyle(0x7cc05a, 1);
    g.fillRect(0, H * 0.45, W, H * 0.55);
    for (let i = 0; i < 120; i++) {
      g.fillStyle(0x65a646, 0.5);
      g.fillEllipse(hash(i * 3) * W, H * 0.45 + hash(i * 3 + 1) * H * 0.55, 18 + hash(i) * 14, 8);
    }
  }

  levelCard(L, cx, cy) {
    const done = L <= state.completed;
    const open = L <= state.unlocked;
    const w = 240;
    const h = 90;
    const color = done ? 0xd7efc0 : (open ? 0xfbeed0 : 0xb8b2a2);
    const border = done ? 0x4f8a2e : (open ? 0x7a4a1e : 0x6e6a5e);

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x3d2412, 0.35);
    g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    g.lineStyle(3, border, 1);
    g.strokeRoundedRect(cx - w / 2 + 1.5, cy - h / 2 + 1.5, w - 3, h - 3, 13);

    const def = EXTRAS[(L - 1) % EXTRAS.length];
    this.add.text(cx - w / 2 + 16, cy - 20, `المرحلة ${L}`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: open ? '#4a2e12' : '#55504a',
    }).setOrigin(0, 0.5).setDepth(6);
    this.add.text(cx - w / 2 + 16, cy + 6, open ? `جديد: ${def.name}` : 'مقفلة', {
      fontFamily: FONT, fontSize: '14px', color: open ? '#6a4a2a' : '#55504a',
    }).setOrigin(0, 0.5).setDepth(6);
    this.add.text(cx - w / 2 + 16, cy + 28, done ? '✓ مكتملة' : (open ? 'مفتوحة' : '🔒'), {
      fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: done ? '#2f5a1c' : '#6a4a2a',
    }).setOrigin(0, 0.5).setDepth(6);

    if (open) {
      const hit = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.choose(L));
    }
  }

  choose(L) {
    if (!state.mission || state.mission.level !== L) {
      state.mission = makeMission(L);
      saveState();
    }
    this.scene.start('kingdom');
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(2400, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }
}

// ---------- المملكة ----------

class KingdomScene extends Phaser.Scene {
  constructor() {
    super('kingdom');
  }

  init(data) {
    this.toast = data && data.toast ? data.toast : null;
  }

  create() {
    this.input.topOnly = true;
    this.itemObjs = [];
    this.villageObjs = [];
    this.cardRefs = [];
    this.inBattle = false;

    if (!state.mission) {
      this.scene.start('levels');
      return;
    }

    this.drawGround();
    this.createHeader();
    this.createButtons();

    this.input.on('dragstart', (pointer, obj) => {
      obj.setDepth(20);
      obj.grabDX = obj.x - pointer.x;
      obj.grabDY = obj.y - pointer.y;
    });
    this.input.on('drag', (pointer, obj) => {
      obj.x = pointer.x + obj.grabDX;
      obj.y = pointer.y + obj.grabDY;
    });
    this.input.on('dragend', (pointer, obj) => this.onDrop(obj));

    this.renderItems();
    this.renderVillage();
    this.updateHUD();
    this.updateChestButton();

    if (this.toast) this.say(this.toast);
    else if (state.mission.level === 1 && state.merges === 0) {
      this.say('اسحب المواد على البطاقات، والعمال بيبنوا');
    }

    if (state.mission.status === 'battle') {
      this.time.delayedCall(400, () => this.startBattle());
    }

    this.time.addEvent({ delay: 250, loop: true, callback: () => this.tick() });
  }

  drawGround() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0xa9def2, 1);
    g.fillRect(0, 0, W, 92);
    g.fillStyle(0xffffff, 0.85);
    [[90, 28, 60], [500, 22, 80]].forEach(([x, y, w]) => {
      g.fillEllipse(x, y, w, w * 0.4);
      g.fillEllipse(x + w * 0.35, y + 6, w * 0.7, w * 0.35);
    });
    g.fillStyle(0x7cc05a, 1);
    g.fillRect(0, 92, W, H - 92);
    for (let i = 0; i < 110; i++) {
      const x = hash(i * 3) * W;
      const y = 92 + hash(i * 3 + 1) * (H - 92);
      g.fillStyle(0x65a646, 0.5);
      g.fillEllipse(x, y, 18 + hash(i) * 14, 8);
    }
    const pad = 12;
    const boardW = COLS * STEP - GAP + pad * 2;
    const boardH = ROWS * STEP - GAP + pad * 2;
    g.fillStyle(0x6b4a2b, 1);
    g.fillRoundedRect(GRID_X - pad - 4, GRID_Y - pad - 4, boardW + 8, boardH + 8, 16);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GRID_X + c * STEP;
        const y = GRID_Y + r * STEP;
        g.fillStyle(hash(r * COLS + c) > 0.5 ? 0x9b6b3f : 0x8f5f36, 1);
        g.fillRoundedRect(x, y, SIZE, SIZE, 10);
        g.fillStyle(0x000000, 0.12);
        for (let k = 0; k < 4; k++) {
          const dx = 10 + hash(r * 50 + c * 7 + k) * (SIZE - 20);
          const dy = 10 + hash(r * 70 + c * 11 + k) * (SIZE - 20);
          g.fillCircle(x + dx, y + dy, 1.8);
        }
      }
    }
  }

  createHeader() {
    this.add.text(W / 2, 24, 'مملكة الدمج', {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#4a2e12',
    }).setOrigin(0.5).setDepth(30);
    this.hud = this.add.text(W / 2, 82, '', {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#1f3a14',
    }).setOrigin(0.5).setDepth(30);
    this.message = this.add.text(W / 2, H - 14, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
  }

  createButtons() {
    makeButton(this, 190, 52, 150, 32, 'المراحل', () => this.scene.start('levels'));
    makeButton(this, 410, 52, 150, 32, 'القصر', () => this.scene.start('castle'));

    makeButton(this, 110, 748, 170, 42, '+ مواد', () => this.spawnItem());
    this.chestBtn = makeButton(this, 300, 748, 170, 42, 'صندوق اليوم', () => this.claimChest());
    makeButton(this, 490, 748, 170, 42, 'إعادة', () => {
      if (window.confirm('تبدأ من أول شي؟ كل التقدم والمراحل والذهب رح ينمسحوا.')) {
        state = newState();
        saveState();
        this.scene.start('levels');
      }
    });
  }

  updateHUD() {
    const m = state.mission;
    const left = m.status === 'building' ? this.timeLeft() : 0;
    this.hud.setText(`المرحلة ${m.level}  ·  باقي ${left} ث  ·  البناء ${Math.round(missionRatio() * 100)}%  ·  الذهب ${state.gold}`);
  }

  updateChestButton() {
    this.chestBtn.setLabel(state.lastClaim === dayKey(new Date()) ? 'استلمت اليوم' : 'صندوق اليوم');
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(2400, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }

  timeLeft() {
    return Math.max(0, Math.ceil((MISSION_MS - (Date.now() - state.mission.startedAt)) / 1000));
  }

  tick() {
    if (this.inBattle || state.mission.status !== 'building') return;
    const now = Date.now();
    const bs = state.mission.buildings;

    const finished = bs.filter((b) => !b.done && b.buildStartedAt && now - b.buildStartedAt >= BUILD_MS);
    if (finished.length) {
      finished.forEach((b) => { b.done = true; });
      saveState();
      const idx = bs.indexOf(finished[0]);
      this.renderVillage(idx);
      const r = cardRect(idx);
      burst(this, r.x + CARD_W / 2, r.y + VILLAGE_H / 2, 0x6aa84f);
      beep(880, 0.12, 'sine', 0.06);
      this.say(`تم بناء ${finished[0].name}!`);
    }

    this.updateCards(now);
    this.updateHUD();

    const allDone = bs.every((b) => b.done);
    if (allDone || this.timeLeft() <= 0) this.startBattle();
  }

  // ---------- البطاقات (مباني المرحلة) ----------

  renderVillage(popIndex = null) {
    this.villageObjs.forEach((o) => o.destroy());
    this.villageObjs = [];
    this.cardRefs = [];

    state.mission.buildings.forEach((b, i) => {
      const rect = cardRect(i);
      const bg = this.add.graphics();
      bg.fillStyle(0x3d2412, 0.35);
      bg.fillRoundedRect(3, 4, rect.w, rect.h, 12);
      bg.fillStyle(b.done ? 0xd7efc0 : 0xfbeed0, 1);
      bg.fillRoundedRect(0, 0, rect.w, rect.h, 12);
      bg.lineStyle(3, b.done ? 0x4f8a2e : 0x7a4a1e, 1);
      bg.strokeRoundedRect(1.5, 1.5, rect.w - 3, rect.h - 3, 11);

      const name = this.add.text(14, 14, b.name, {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#4a2e12',
      }).setOrigin(0, 0.5);
      const status = this.add.text(rect.w - 14, 14, '', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#6a4a2a',
      }).setOrigin(1, 0.5);
      const mats = Object.keys(b.req).map((k) => `${RES_LABEL[k]} ${b.delivered[k] || 0}/${b.req[k]}`).join('  ·  ');
      const matsText = this.add.text(14, 32, mats, {
        fontFamily: FONT, fontSize: '12px', color: '#6a4a2a',
      }).setOrigin(0, 0.5);
      const bar = this.add.graphics();

      const items = [bg, name, status, matsText, bar];
      if (b.buildStartedAt && !b.done) {
        const w1 = this.add.graphics({ x: rect.w - 58, y: 60 }).setScale(0.8);
        drawWorker(w1);
        const w2 = this.add.graphics({ x: rect.w - 30, y: 60 }).setScale(0.8);
        drawWorker(w2);
        this.tweens.add({ targets: [w1, w2], y: 58, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        items.push(w1, w2);
      }

      const card = this.add.container(rect.x, rect.y, items);
      card.setDepth(6);
      this.villageObjs.push(card);
      this.cardRefs[i] = { bar, status };

      if (popIndex === i) {
        card.setScale(0.9);
        this.tweens.add({ targets: card, scale: 1, duration: 220, ease: 'Back.Out' });
      }
    });
    this.updateCards(Date.now());
  }

  updateCards(now) {
    state.mission.buildings.forEach((b, i) => {
      const ref = this.cardRefs[i];
      if (!ref) return;
      const p = buildProgress(b, now);
      const rect = cardRect(i);
      const barW = rect.w - 28;
      ref.bar.clear();
      ref.bar.fillStyle(0xd9c9a3, 1);
      ref.bar.fillRoundedRect(14, 50, barW, 10, 5);
      if (p > 0) {
        ref.bar.fillStyle(b.done ? 0x6aa84f : 0xc98a10, 1);
        ref.bar.fillRoundedRect(14, 50, Math.max(10, barW * p), 10, 5);
      }
      ref.status.setText(b.done ? '✓ تم' : (b.buildStartedAt ? 'العمال يبنون' : `${Math.round(p * 100)}%`));
    });
  }

  // ---------- الأشياء على الشبكة ----------

  renderItems(pop = null) {
    this.itemObjs.forEach((o) => o.destroy());
    this.itemObjs = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const item = state.grid[r][c];
        if (item) this.itemObjs.push(this.makeItem(r, c, item, pop));
      }
    }
  }

  makeItem(r, c, item, pop) {
    const g = this.add.graphics({ x: cellX(c), y: cellY(r) }).setDepth(5);
    ITEM_DRAWERS[item.t][item.l](g);
    g.setInteractive(
      new Phaser.Geom.Rectangle(-SIZE / 2 - 4, -SIZE / 2 - 4, SIZE + 8, SIZE + 8),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(g);
    g.cell = { r, c };
    g.item = item;
    if (pop && pop.r === r && pop.c === c) {
      if (pop.type === 'drop') {
        g.y -= 90;
        g.alpha = 0;
        this.tweens.add({ targets: g, y: cellY(r), alpha: 1, duration: 420, ease: 'Bounce.Out' });
      } else {
        g.setScale(0.4);
        this.tweens.add({ targets: g, scale: 1, duration: 300, ease: 'Back.Out' });
      }
    }
    return g;
  }

  animateTo(obj, cell, onDone) {
    this.busy = true;
    this.tweens.add({
      targets: obj,
      x: cellX(cell.c),
      y: cellY(cell.r),
      duration: 160,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.busy = false;
        onDone();
      },
    });
  }

  snapBack(obj, from) {
    obj.setDepth(5);
    this.tweens.add({
      targets: obj,
      x: cellX(from.c),
      y: cellY(from.r),
      duration: 260,
      ease: 'Back.Out',
    });
  }

  onDrop(obj) {
    const from = obj.cell;
    const item = state.grid[from.r][from.c];
    if (!item) return;

    if (this.inBattle) {
      this.snapBack(obj, from);
      return;
    }

    const idx = villageHit(obj.x, obj.y);
    if (idx !== -1) {
      this.deliverToBuilding(obj, from, item, idx);
      return;
    }

    if (obj.y < VILLAGE_Y + VILLAGE_H + 10) {
      this.snapBack(obj, from);
      return;
    }

    const to = nearestCell(obj.x, obj.y);
    let merged = false;
    let moved = false;
    if (to && !(to.r === from.r && to.c === from.c)) {
      const target = state.grid[to.r][to.c];
      if (target === null) {
        state.grid[to.r][to.c] = item;
        state.grid[from.r][from.c] = null;
        moved = true;
      } else if (target.t === item.t && target.l === item.l && item.l < MAX_ITEM_LEVEL) {
        state.grid[to.r][to.c] = { t: item.t, l: item.l + 1 };
        state.grid[from.r][from.c] = null;
        state.merges++;
        merged = true;
      }
    }

    if (moved || merged) {
      if (merged) {
        this.say(`طلع ${ITEM_NAMES[item.t][item.l]}!`);
        beep(660, 0.1, 'sine', 0.06);
        buzz(12);
      }
      this.animateTo(obj, to, () => {
        saveState();
        this.renderItems(merged ? { r: to.r, c: to.c, type: 'merge' } : null);
        if (merged) burst(this, cellX(to.c), cellY(to.r), 0xf7e7b4);
        this.updateHUD();
      });
    } else {
      this.snapBack(obj, from);
    }
  }

  deliverToBuilding(obj, from, item, idx) {
    const b = state.mission.buildings[idx];
    const t = item.t;

    if (b.done) {
      this.say(`${b.name} خلص بناؤه`);
      this.snapBack(obj, from);
      return;
    }
    if (!(t in b.req)) {
      this.say(`${b.name} ما بده ${RES_LABEL[t]}`);
      this.snapBack(obj, from);
      return;
    }
    if (b.delivered[t] >= b.req[t]) {
      this.say(`${RES_LABEL[t]} كامل لهالمبنى، العمال شغالين`);
      this.snapBack(obj, from);
      return;
    }

    const pts = POINTS[item.l];
    state.grid[from.r][from.c] = null;
    b.delivered[t] = Math.min(b.req[t], b.delivered[t] + pts);

    const cx = cardRect(idx).x + CARD_W / 2;
    const cy = VILLAGE_Y + VILLAGE_H / 2;
    this.busy = true;
    this.tweens.add({
      targets: obj,
      x: cx,
      y: cy,
      scale: 0.3,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.In',
      onComplete: () => {
        this.busy = false;
        const allIn = Object.keys(b.req).every((k) => b.delivered[k] >= b.req[k]);
        if (allIn && !b.buildStartedAt) {
          b.buildStartedAt = Date.now();
          this.say(`العمال بدأوا ببناء ${b.name}`);
          beep(440, 0.1, 'triangle', 0.05);
        }
        saveState();
        this.renderItems();
        this.renderVillage(allIn ? idx : null);
        this.updateHUD();
        floatText(this, cx, VILLAGE_Y - 6, `+${pts}`, '#c98a10');
      },
    });
    beep(520, 0.08, 'triangle', 0.05);
    buzz(15);
  }

  // ---------- المعركة ----------

  startBattle() {
    if (this.inBattle) return;
    this.inBattle = true;
    state.mission.status = 'battle';
    saveState();
    const ratio = missionRatio();
    this.scene.launch('battle', {
      won: ratio >= WIN_RATIO,
      ratio,
      level: state.mission.level,
      reward: 100 + 40 * state.mission.level,
    });
  }

  resolveBattle(won, reward) {
    const L = state.mission.level;
    if (won) {
      state.gold += reward;
      state.completed = Math.max(state.completed, L);
      state.unlocked = Math.max(state.unlocked, Math.min(L + 1, LEVEL_COUNT));
      state.mission = null;
      saveState();
      this.scene.start('levels', {
        toast: L + 1 <= LEVEL_COUNT
          ? `صمدت الجبهة! +${reward} ذهب. المرحلة ${L + 1} انفتحت`
          : `صمدت الجبهة! +${reward} ذهب. خلصت كل المراحل الحالية`,
      });
    } else {
      state.mission = makeMission(L);
      saveState();
      this.scene.restart({ toast: 'سقطت الجبهة… أعد المرحلة من البداية' });
    }
  }

  spawnItem() {
    if (this.inBattle) return;
    const empty = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.grid[r][c] === null) empty.push({ r, c });
      }
    }
    if (empty.length === 0) {
      this.say('الشبكة ممتلئة، ادمج شي أولاً');
      return;
    }
    const pick = Phaser.Utils.Array.GetRandom(empty);
    const t = Phaser.Utils.Array.GetRandom(SPAWN_TYPES);
    state.grid[pick.r][pick.c] = { t, l: 1 };
    saveState();
    this.renderItems({ r: pick.r, c: pick.c, type: 'drop' });
    this.updateHUD();
  }

  claimChest() {
    const now = new Date();
    const today = dayKey(now);
    if (state.lastClaim === today) {
      this.say('استلمت صندوق اليوم، ارجع بكرة');
      return;
    }
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    state.streak = state.lastClaim === yesterday ? state.streak + 1 : 1;
    const reward = 30 + 10 * Math.min(state.streak, 7);
    state.gold += reward;
    state.lastClaim = today;
    saveState();
    this.updateHUD();
    this.updateChestButton();
    this.say(`صندوق اليوم: +${reward} ذهب، سلسلة ${state.streak} يوم`);
    floatText(this, 300, 700, `+${reward}`, '#c98a10');
  }
}

// ---------- المعركة (مشهد الحرب العالمية الأولى) ----------

class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
  }

  init(data) {
    this.info = data;
  }

  create() {
    const { won, ratio, reward } = this.info;

    const sky = this.add.graphics().setDepth(0);
    for (let i = 0; i < 26; i++) {
      sky.fillStyle(lerpColor(0x161210, 0x9a7a4c, i / 26), 1);
      sky.fillRect(0, i * (H * 0.62 / 26), W, H * 0.62 / 26 + 1);
    }
    sky.fillStyle(0x4a3a27, 1);
    sky.fillRect(0, H * 0.62, W, H * 0.38);
    sky.fillStyle(0x2e2418, 1);
    sky.fillRect(0, 500, W, 42);

    for (let i = 0; i < 9; i++) {
      const s = this.add.ellipse(
        60 + hash(i) * 480, 90 + hash(i + 3) * 200,
        140 + hash(i + 5) * 120, 60 + hash(i + 7) * 40,
        0x5e5a52, 0.35 + hash(i + 9) * 0.2,
      ).setDepth(2);
      this.tweens.add({
        targets: s, x: s.x + (hash(i + 11) > 0.5 ? 40 : -40),
        duration: 4000 + hash(i + 13) * 2500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    }

    [{ x: 140, y: 110 }, { x: 470, y: 150 }].forEach((p, i) => {
      const f = this.add.circle(p.x, p.y, 10, 0xfff1c2, 0.9).setDepth(3);
      this.tweens.add({ targets: f, alpha: 0.1, duration: 900 + i * 300, yoyo: true, repeat: -1 });
    });

    const wire = this.add.graphics().setDepth(4);
    wire.lineStyle(2, 0x2b2620, 0.9);
    for (let x = 300; x < W; x += 24) {
      wire.lineBetween(x, 540, x + 12, 552);
      wire.lineBetween(x + 12, 552, x + 24, 540);
    }

    const bags = this.add.graphics().setDepth(6);
    for (let row = 0; row < 2; row++) {
      for (let x = 20 + row * 16; x < 340; x += 36) {
        bags.fillStyle(0x6e5e3a, 1);
        bags.fillRoundedRect(x, 450 + row * 22, 36, 22, 6);
        bags.fillStyle(0x9c8a5e, 1);
        bags.fillRoundedRect(x + 2, 452 + row * 22, 32, 16, 5);
      }
    }

    const mg = this.add.graphics({ x: 250, y: 446 }).setDepth(7);
    mg.fillStyle(0x2a2a26, 1);
    mg.fillRoundedRect(-14, -8, 28, 12, 3);
    mg.fillRect(-2, -20, 4, 14);
    mg.lineStyle(3, 0x1e1e1a, 1);
    mg.lineBetween(-2, -12, 26, -20);

    [40, 100, 160, 220, 300].forEach((x, i) => {
      const s = this.add.graphics({ x, y: 452 }).setDepth(8);
      drawSoldier(s, 0x6b7a4a);
      this.tweens.add({ targets: s, y: 449, duration: 800 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });

    const pole = this.add.rectangle(560, 380, 3, 80, 0x3a2e20).setDepth(9).setVisible(false);
    const flag = this.add.rectangle(534, 344, 50, 26, won ? 0x4f7a3a : 0x7a2e2e).setDepth(9).setVisible(false);

    const title = this.add.text(W / 2, 110, 'هجوم!', {
      fontFamily: SERIF, fontSize: '54px', fontStyle: 'bold', color: '#f5e6c4',
      stroke: '#2a1e10', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 500, ease: 'Back.Out' });
    this.time.delayedCall(1800, () => this.tweens.add({ targets: title, alpha: 0, duration: 400 }));

    const attackers = [0, 1, 2, 3, 4, 5].map((i) => {
      const s = this.add.graphics({ x: 760 + i * 30, y: 500 + (i % 2) * 40 }).setDepth(10 + i);
      drawSoldier(s, 0x6f7480);
      s.setScale(-1, 1);
      this.tweens.add({ targets: s, y: s.y - 5, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: s, x: 400 + i * 34, duration: 2200, delay: i * 80, ease: 'Sine.Out' });
      return s;
    });

    const impacts = [
      { x: 90, y: 470 }, { x: 170, y: 466 }, { x: 240, y: 472 },
      { x: 300, y: 468 }, { x: 130, y: 490 }, { x: 210, y: 486 },
    ];
    impacts.forEach((t, i) => {
      this.time.delayedCall(2600 + i * 220, () => {
        this.shell(700 + hash(i) * 60, -40, t.x, t.y, () => {
          explode(this, t.x, t.y, won ? 0.6 : 1);
        });
      });
    });

    for (let i = 0; i < 26; i++) {
      this.time.delayedCall(3000 + i * 45, () => {
        this.tracer(250, 446, 420 + hash(i) * 180, 520 + hash(i + 4) * 80);
      });
    }

    this.time.delayedCall(4700, () => {
      if (won) this.victory(ratio, reward, flag, pole);
      else this.defeat(attackers, ratio);
    });

    // يمنع الضغط على الشاشة اللي تحت أثناء المعركة
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(25).setInteractive();
  }

  shell(fx, fy, tx, ty, onImpact) {
    const s = this.add.circle(fx, fy, 5, 0x2a2622).setDepth(60);
    const trail = this.add.graphics().setDepth(59);
    beep(180, 0.5, 'sawtooth', 0.02);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const x = fx + (tx - fx) * t;
        const y = fy + (ty - fy) * t - Math.sin(Math.PI * t) * 260;
        s.x = x;
        s.y = y;
        trail.clear();
        trail.lineStyle(2, 0xffd08a, 0.5);
        trail.lineBetween(x, y, x + 10, y - 12);
      },
      onComplete: () => {
        s.destroy();
        trail.destroy();
        onImpact();
      },
    });
  }

  tracer(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(55);
    beep(900 + hash(x2) * 300, 0.02, 'square', 0.012);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 140,
      onUpdate: (tw) => {
        const t = tw.getValue();
        g.clear();
        g.lineStyle(2, 0xffe27a, 0.9);
        g.lineBetween(x1 + (x2 - x1) * Math.max(0, t - 0.25), y1 + (y2 - y1) * Math.max(0, t - 0.25),
          x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      },
      onComplete: () => g.destroy(),
    });
  }

  victory(ratio, reward, flag, pole) {
    this.cameras.main.shake(300, 0.004);
    pole.setVisible(true);
    flag.setVisible(true);
    this.tweens.add({ targets: flag, scaleX: 0.7, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const t1 = this.add.text(W / 2, 250, 'صمدت الجبهة!', {
      fontFamily: SERIF, fontSize: '42px', fontStyle: 'bold', color: '#f7e7b4',
      stroke: '#2a1e10', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: t1, alpha: 1, y: 240, duration: 600, ease: 'Back.Out' });

    this.add.text(W / 2, 300, `نسبة البناء ${Math.round(ratio * 100)}%   ·   +${reward} ذهب`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2a1e10', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);

    for (let i = 0; i < 16; i++) {
      this.time.delayedCall(i * 60, () => burst(this, 60 + hash(i) * 480, 300 + hash(i + 2) * 120, 0xf7e7b4));
    }
    makeButton(this, W / 2, 700, 240, 50, 'متابعة', () => this.finish(true, reward));
  }

  defeat(attackers, ratio) {
    this.cameras.main.shake(500, 0.01);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(45);
    this.tweens.add({ targets: dim, alpha: 0.45, duration: 800 });

    attackers.forEach((s, i) => {
      this.tweens.add({ targets: s, x: 180 + i * 26, duration: 1600, delay: i * 90, ease: 'Sine.In' });
    });
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 140, () => explode(this, 80 + hash(i) * 260, 470 + hash(i + 3) * 40, 1.2));
    }

    const t1 = this.add.text(W / 2, 250, 'سقطت الجبهة', {
      fontFamily: SERIF, fontSize: '42px', fontStyle: 'bold', color: '#e98a7a',
      stroke: '#2a1e10', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: t1, alpha: 1, duration: 700 });

    this.add.text(W / 2, 300, `البناء ${Math.round(ratio * 100)}%  ·  المطلوب ${WIN_RATIO * 100}%`, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2a1e10', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    makeButton(this, W / 2, 700, 240, 50, 'أعد المرحلة', () => this.finish(false, 0));
  }

  finish(won, reward) {
    const kingdom = this.scene.get('kingdom');
    this.scene.stop();
    kingdom.resolveBattle(won, reward);
  }
}

function explode(scene, x, y, power = 1) {
  boom(0.45 * power);
  scene.cameras.main.shake(160, 0.004 * power);
  const colors = [0xffb347, 0xff7a2e, 0xfff1c2];
  for (let i = 0; i < 9; i++) {
    const p = scene.add.circle(x, y, 6 + hash(i) * 6, colors[i % colors.length]).setDepth(58);
    scene.tweens.add({
      targets: p,
      x: x + (hash(i + 4) - 0.5) * 90 * power,
      y: y - hash(i + 8) * 70 * power,
      scale: 0.1,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out',
      onComplete: () => p.destroy(),
    });
  }
  for (let i = 0; i < 3; i++) {
    const s = scene.add.ellipse(x, y, 50, 40, 0x6b655c, 0.7).setDepth(56);
    scene.tweens.add({
      targets: s,
      x: x + (i - 1) * 25,
      y: y - 30 - i * 10,
      scaleX: 2.4,
      scaleY: 2.0,
      alpha: 0,
      duration: 1400,
      ease: 'Sine.Out',
      onComplete: () => s.destroy(),
    });
  }
}

// ---------- القصر ----------

class CastleScene extends Phaser.Scene {
  constructor() {
    super('castle');
  }

  create() {
    this.input.topOnly = true;
    this.castleObjs = [];
    this.panelObjs = [];

    this.drawPlot();
    this.add.text(W / 2, 24, 'القصر', {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#4a2e12',
    }).setOrigin(0.5).setDepth(30);
    this.hud = this.add.text(W / 2, 80, '', {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#1f3a14',
    }).setOrigin(0.5).setDepth(30);
    this.message = this.add.text(W / 2, H - 14, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);

    makeButton(this, 190, 52, 150, 32, 'المراحل', () => this.scene.start('levels'));
    makeButton(this, 410, 52, 150, 32, 'القصر', () => {}, true);
    makeButton(this, 300, 748, 220, 42, 'رجوع للمراحل', () => this.scene.start('levels'));

    this.renderCastle();
    this.renderPanels();
    this.updateHUD();
  }

  updateHUD() {
    this.hud.setText(`الذهب ${state.gold}  ·  المراحل المكتملة ${state.completed} من ${LEVEL_COUNT}`);
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(2200, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }

  drawPlot() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0xa9def2, 1);
    g.fillRect(0, 0, W, 100);
    g.fillStyle(0x7cc05a, 1);
    g.fillRect(0, 100, W, H - 100);
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 5) * W;
      const y = 100 + hash(i * 5 + 1) * (H - 100);
      g.fillStyle(0x65a646, 0.5);
      g.fillEllipse(x, y, 18 + hash(i) * 14, 8);
    }
    g.fillStyle(0x8f5f36, 1);
    g.fillRoundedRect(70, 330, 460, 110, 18);
    g.fillStyle(0x9b6b3f, 1);
    g.fillRoundedRect(78, 338, 444, 94, 14);
  }

  renderCastle() {
    this.castleObjs.forEach((o) => o.destroy());
    this.castleObjs = [];
    const c = state.castle;
    const g = this.add.graphics().setDepth(5);
    this.castleObjs.push(g);
    if (this.justBuilt) {
      this.justBuilt = false;
      g.setAlpha(0);
      g.y = -18;
      this.tweens.add({ targets: g, alpha: 1, y: 0, duration: 450, ease: 'Back.Out' });
    }

    if (c.foundation) {
      g.fillStyle(0x6e6e62, 1);
      g.fillRoundedRect(120, 362, 360, 52, 6);
      g.fillStyle(0x8a8a7e, 1);
      g.fillRoundedRect(124, 366, 352, 44, 5);
      g.lineStyle(2, 0x5e5e54, 0.6);
      [180, 240, 300, 360, 420].forEach((x) => g.lineBetween(x, 366, x, 410));
      g.lineBetween(124, 388, 476, 388);
    } else {
      this.ghost(g, 120, 362, 360, 52);
    }

    if (c.walls) {
      g.fillStyle(0x9c8a66, 1);
      g.fillRoundedRect(150, 258, 300, 104, 4);
      g.fillStyle(0xc9b48a, 1);
      g.fillRoundedRect(154, 262, 292, 96, 3);
      for (let x = 150; x < 450; x += 30) {
        g.fillStyle(0x9c8a66, 1);
        g.fillRect(x, 236, 16, 24);
      }
      g.fillStyle(0x4a2e12, 1);
      g.fillRoundedRect(282, 300, 36, 62, 16);
      g.fillStyle(0x7a4a22, 1);
      g.fillRoundedRect(286, 304, 28, 58, 14);
    } else if (c.foundation) {
      this.ghost(g, 150, 258, 300, 104);
    }

    if (c.tower) {
      [[118, 180], [442, 180]].forEach(([x, y]) => {
        g.fillStyle(0x7d6c4e, 1);
        g.fillRoundedRect(x, y, 40, 160, 4);
        g.fillStyle(0xb5a07a, 1);
        g.fillRoundedRect(x + 3, y + 3, 34, 154, 3);
        g.fillStyle(0x7d6c4e, 1);
        for (let k = 0; k < 3; k++) g.fillRect(x - 2 + k * 15, y - 14, 10, 16);
        g.fillStyle(0x4a2e12, 1);
        g.fillRoundedRect(x + 14, y + 40, 12, 20, 6);
      });
    } else if (c.walls) {
      this.ghost(g, 118, 180, 40, 160);
      this.ghost(g, 442, 180, 40, 160);
    }

    if (c.roof) {
      g.fillStyle(0x7a2e2e, 1);
      g.fillTriangle(140, 262, 460, 262, 300, 120);
      g.fillStyle(0xa13d3d, 1);
      g.fillTriangle(150, 258, 450, 258, 300, 128);
      g.lineStyle(2, 0x5a1f1f, 0.6);
      [200, 250, 300, 350, 400].forEach((x) => g.lineBetween(x, 258, 300 + (x - 300) * 0.25, 130));
    }
  }

  ghost(g, x, y, w, h) {
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeRoundedRect(x, y, w, h, 6);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x, y, w, h, 6);
  }

  renderPanels() {
    this.panelObjs.forEach((o) => o.destroy());
    this.panelObjs = [];

    const pos = [{ x: 30, y: 452 }, { x: 310, y: 452 }, { x: 30, y: 584 }, { x: 310, y: 584 }];
    CASTLE_PARTS.forEach((part, i) => {
      const { x, y } = pos[i];
      const w = 260;
      const h = 116;
      const built = state.castle[part.key];
      const unlocked = !part.needs || state.castle[part.needs];

      const g = this.add.graphics().setDepth(20);
      g.fillStyle(0x3d2412, 0.35);
      g.fillRoundedRect(x + 3, y + 4, w, h, 14);
      g.fillStyle(built ? 0xd7efc0 : (unlocked ? 0xfbeed0 : 0xd9d2c2), 1);
      g.fillRoundedRect(x, y, w, h, 14);
      g.lineStyle(3, built ? 0x4f8a2e : 0x7a4a1e, 1);
      g.strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 13);

      const title = this.add.text(x + 16, y + 22, part.name, {
        fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#4a2e12',
      }).setOrigin(0, 0.5).setDepth(21);

      let status;
      if (built) status = 'مبني ✓';
      else if (!unlocked) status = `لازم تبني ${CASTLE_PARTS.find((p) => p.key === part.needs).name} أول`;
      else status = `${part.cost} ذهب`;
      const sub = this.add.text(x + 16, y + 60, status, {
        fontFamily: FONT, fontSize: '16px', color: built ? '#2f5a1c' : '#6a4a2a',
      }).setOrigin(0, 0.5).setDepth(21);

      const hint = this.add.text(x + 16, y + 90, built ? '' : (unlocked ? 'اضغط للبناء' : ''), {
        fontFamily: FONT, fontSize: '14px', color: '#7a5a3a',
      }).setOrigin(0, 0.5).setDepth(21);

      const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
        .setDepth(22)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.tryBuild(part));

      this.panelObjs.push(g, title, sub, hint, hit);
    });
  }

  tryBuild(part) {
    if (state.castle[part.key]) {
      this.say(`${part.name} مبني أصلاً`);
      return;
    }
    if (part.needs && !state.castle[part.needs]) {
      this.say(`لازم تبني ${CASTLE_PARTS.find((p) => p.key === part.needs).name} أول`);
      return;
    }
    if (state.gold < part.cost) {
      this.say(`تحتاج ${part.cost - state.gold} ذهب زيادة`);
      return;
    }
    state.gold -= part.cost;
    state.castle[part.key] = true;
    saveState();
    this.justBuilt = true;
    this.renderCastle();
    this.renderPanels();
    this.updateHUD();
    this.say(`تم بناء ${part.name}!`);
  }
}

// الحالة تتحمّل قبل ما تبدأ المشاهد
state = loadState();

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: document.body,
  backgroundColor: '#a9def2',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LevelsScene, KingdomScene, CastleScene, BattleScene],
});
