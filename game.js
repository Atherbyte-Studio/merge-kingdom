// مملكة الدمج - اللعبة الكاملة: المملكة (دمج + طلبات القرية + صندوق اليوم)، القصر (أساس، أسوار، برج، سقف)، والغزوات

const W = 600;
const H = 800;
const COLS = 6;
const ROWS = 6;
const SIZE = 80;
const GAP = 8;
const STEP = SIZE + GAP;
const GRID_X = 40;
const GRID_Y = 178;
const MAX_LEVEL = 3;
const SAVE_KEY = 'merge-kingdom-save-v1';
const FONT = 'system-ui, Tahoma, sans-serif';

const VILLAGE_Y = 100;
const VILLAGE_H = 60;
const CARD_W = 180;
const CARD_GAP = 10;
const CARD_X0 = (W - (3 * CARD_W + 2 * CARD_GAP)) / 2;

const RAID_INTERVAL_MS = 4 * 60 * 60 * 1000;   // غزوة كل ٤ ساعات بعد بناء الأسوار
const RAID_DEADLINE_MS = 60 * 60 * 1000;       // لازم تصدها خلال ساعة

const LEVELS = {
  1: { name: 'حطب', reward: 10 },
  2: { name: 'خشب', reward: 25 },
  3: { name: 'لوح', reward: 60 },
};

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

// يرجّع رقم البطاقة اللي فيها النقطة، أو -1
function villageHit(x, y) {
  if (state.raid) {
    return (x >= 20 && x <= W - 20 && y >= VILLAGE_Y - 10 && y <= VILLAGE_Y + VILLAGE_H + 10) ? 0 : -1;
  }
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

// ---------- رسم الأشياء ----------

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

const DRAWERS = { 1: drawLog, 2: drawPlanks, 3: drawBoard };

// ---------- الحالة (محفوظة) ----------

let state = null;

function makeOrder(completed) {
  let level;
  if (completed < 3) level = 1;
  else if (completed < 8) level = Math.random() < 0.6 ? 1 : 2;
  else level = [1, 2, 3][Math.floor(Math.random() * 3)];
  const need = level === 1 ? 2 + Math.floor(Math.random() * 3)
    : level === 2 ? 1 + Math.floor(Math.random() * 2)
    : 1;
  return { level, need, have: 0 };
}

function makeOrders(completed) {
  return [0, 1, 2].map(() => makeOrder(completed));
}

function newState() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  grid[2][2] = 1;
  grid[2][3] = 1;
  grid[3][2] = 1;
  return {
    grid,
    merges: 0,
    gold: 0,
    completed: 0,
    streak: 0,
    lastClaim: null,
    orders: makeOrders(0),
    castle: { foundation: false, walls: false, tower: false, roof: false },
    raid: null,
    lastRaid: 0,
    defended: 0,
    lost: 0,
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    const validGrid =
      saved &&
      Array.isArray(saved.grid) &&
      saved.grid.length === ROWS &&
      saved.grid.every((row) => Array.isArray(row) && row.length === COLS);
    if (validGrid) {
      const base = newState();
      const merged = Object.assign(base, saved);
      merged.castle = Object.assign({ foundation: false, walls: false, tower: false, roof: false }, saved.castle || {});
      if (!Array.isArray(merged.orders) || merged.orders.length !== 3) {
        merged.orders = makeOrders(merged.completed || 0);
      }
      return merged;
    }
  } catch (e) {
    // حفظ تالف: نبدأ من جديد
  }
  return newState();
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // التخزين مش متاح: اللعبة بتشتغل بدون حفظ
  }
}

// يشغّل ويحسب الغزوات. يرجّع نص رسالة إذا صار شي، أو null
function tickRaids(now) {
  if (state.raid && now > state.raid.deadline) {
    state.raid = null;
    state.lastRaid = now;
    state.lost++;
    state.gold = Math.max(0, state.gold - 40);
    saveState();
    return 'الغزاة دخلوا وخسرت 40 ذهب';
  }
  if (!state.raid && state.castle.walls && now - state.lastRaid >= RAID_INTERVAL_MS) {
    const need = Math.min(6, 3 + Math.floor(state.defended / 3));
    state.raid = { need, have: 0, deadline: now + RAID_DEADLINE_MS };
    state.lastRaid = now;
    saveState();
    return 'غزوة! ادفع خشب للأسوار قبل ما ينتهي الوقت';
  }
  return null;
}

// ---------- المملكة ----------

class KingdomScene extends Phaser.Scene {
  constructor() {
    super('kingdom');
  }

  create() {
    this.input.topOnly = true;
    this.itemObjs = [];
    this.villageObjs = [];

    this.drawGround();
    this.createHeader();

    const msg = tickRaids(Date.now());
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
    if (msg) this.say(msg);

    // فحص الغزوات كل ٣٠ ثانية والعداد
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => {
        const m = tickRaids(Date.now());
        this.renderVillage();
        if (m) this.say(m);
      },
    });
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
        const v = hash(r * COLS + c);
        g.fillStyle(v > 0.5 ? 0x9b6b3f : 0x8f5f36, 1);
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

    this.hud = this.add.text(W / 2, 80, '', {
      fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#1f3a14',
    }).setOrigin(0.5).setDepth(30);

    this.message = this.add.text(W / 2, H - 14, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
  }

  createButtons() {
    makeButton(this, 190, 52, 150, 32, 'المملكة', () => {}, true);
    makeButton(this, 410, 52, 150, 32, 'القصر', () => this.scene.start('castle'));

    makeButton(this, 110, 748, 170, 42, '+ حطب', () => this.spawnWood());
    this.chestBtn = makeButton(this, 300, 748, 170, 42, 'صندوق اليوم', () => this.claimChest());
    makeButton(this, 490, 748, 170, 42, 'إعادة', () => {
      if (window.confirm('تبدأ من جديد؟ كل التقدم والذهب والقصر رح ينمسحوا.')) {
        state = newState();
        saveState();
        this.scene.restart();
      }
    });
  }

  updateHUD() {
    this.hud.setText(`الذهب: ${state.gold}  ·  الدمجات: ${state.merges}  ·  سلسلة: ${state.streak} يوم  ·  صدّيت: ${state.defended}`);
  }

  updateChestButton() {
    this.chestBtn.setLabel(state.lastClaim === dayKey(new Date()) ? 'استلمت اليوم' : 'صندوق اليوم');
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(2200, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }

  // ---------- القرية والغزوات ----------

  renderVillage(popIndex = null) {
    this.villageObjs.forEach((o) => o.destroy());
    this.villageObjs = [];

    if (state.raid) {
      const x = 20;
      const w = W - 40;
      const h = VILLAGE_H;
      const bg = this.add.graphics();
      bg.fillStyle(0x3d2412, 0.35);
      bg.fillRoundedRect(3, 4, w, h, 12);
      bg.fillStyle(0xf6d2c4, 1);
      bg.fillRoundedRect(0, 0, w, h, 12);
      bg.lineStyle(3, 0xa3342a, 1);
      bg.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 11);

      const mins = Math.max(0, Math.ceil((state.raid.deadline - Date.now()) / 60000));
      const title = this.add.text(18, 18, `غزوة! ادفع خشب ×${state.raid.need}`, {
        fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#7a2a20',
      }).setOrigin(0, 0.5);
      const sub = this.add.text(18, 42, `${state.raid.have} / ${state.raid.need}   ·   باقي ${mins} دقيقة`, {
        fontFamily: FONT, fontSize: '14px', color: '#7a2a20',
      }).setOrigin(0, 0.5);

      const card = this.add.container(x, VILLAGE_Y, [bg, title, sub]);
      card.setDepth(6);
      this.villageObjs.push(card);
      return;
    }

    this.orders.forEach((order, i) => {
      const rect = cardRect(i);
      const bg = this.add.graphics();
      bg.fillStyle(0x3d2412, 0.35);
      bg.fillRoundedRect(3, 4, rect.w, rect.h, 12);
      bg.fillStyle(0xfbeed0, 1);
      bg.fillRoundedRect(0, 0, rect.w, rect.h, 12);
      bg.lineStyle(3, 0x7a4a1e, 1);
      bg.strokeRoundedRect(1.5, 1.5, rect.w - 3, rect.h - 3, 11);

      const mini = this.add.graphics({ x: 38, y: rect.h / 2 }).setScale(0.42);
      DRAWERS[order.level](mini);

      const name = this.add.text(76, 16, `${LEVELS[order.level].name} ×${order.need}`, {
        fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#4a2e12',
      }).setOrigin(0, 0.5);
      const progress = this.add.text(76, 40, `${order.have} / ${order.need}`, {
        fontFamily: FONT, fontSize: '15px', color: '#7a5a3a',
      }).setOrigin(0, 0.5);

      const card = this.add.container(rect.x, rect.y, [bg, mini, name, progress]);
      card.setDepth(6);
      this.villageObjs.push(card);

      if (popIndex === i) {
        card.setScale(0.9);
        this.tweens.add({ targets: card, scale: 1, duration: 220, ease: 'Back.Out' });
      }
    });
  }

  // ---------- الأشياء على الشبكة ----------

  renderItems(popCell = null) {
    this.itemObjs.forEach((o) => o.destroy());
    this.itemObjs = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const level = state.grid[r][c];
        if (level > 0) this.itemObjs.push(this.makeItem(r, c, level, popCell));
      }
    }
  }

  makeItem(r, c, level, popCell) {
    const g = this.add.graphics({ x: cellX(c), y: cellY(r) }).setDepth(5);
    DRAWERS[level](g);
    g.setInteractive(
      new Phaser.Geom.Rectangle(-SIZE / 2 - 4, -SIZE / 2 - 4, SIZE + 8, SIZE + 8),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(g);
    g.cell = { r, c };
    g.level = level;
    if (popCell && popCell.r === r && popCell.c === c) {
      g.setScale(0.5);
      this.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Back.Out' });
    }
    return g;
  }

  snapBack(obj, from) {
    obj.setDepth(5);
    this.tweens.add({
      targets: obj,
      x: cellX(from.c),
      y: cellY(from.r),
      duration: 120,
      ease: 'Quad.Out',
    });
  }

  onDrop(obj) {
    const from = obj.cell;
    const level = state.grid[from.r][from.c];

    // 1) إفلات على القرية أو الغزوة
    const idx = villageHit(obj.x, obj.y);
    if (idx !== -1) {
      if (state.raid) {
        if (level === 2) {
          state.grid[from.r][from.c] = 0;
          state.raid.have++;
          if (state.raid.have >= state.raid.need) {
            state.gold += 80;
            state.defended++;
            state.raid = null;
            this.say('صدّيت الغزوة! +80 ذهب');
            saveState();
            this.renderItems();
            this.renderVillage();
          } else {
            saveState();
            this.renderItems();
            this.renderVillage();
          }
          this.updateHUD();
        } else {
          this.say('الأسوار بدها خشب!');
          this.snapBack(obj, from);
        }
        return;
      }

      const order = state.orders[idx];
      if (order.level === level) {
        state.grid[from.r][from.c] = 0;
        order.have++;
        if (order.have >= order.need) {
          const reward = LEVELS[order.level].reward * order.need;
          state.gold += reward;
          state.completed++;
          state.orders[idx] = makeOrder(state.completed);
          this.say(`اكتمل الطلب! +${reward} ذهب`);
          saveState();
          this.renderItems();
          this.renderVillage(idx);
        } else {
          saveState();
          this.renderItems();
          this.renderVillage();
        }
        this.updateHUD();
      } else {
        this.say(`القرية بدها ${LEVELS[order.level].name}، مش ${LEVELS[level].name}`);
        this.snapBack(obj, from);
      }
      return;
    }

    // 2) إفلات بمنطقة القرية بس مش على شي: رجوع
    if (obj.y < VILLAGE_Y + VILLAGE_H + 10) {
      this.snapBack(obj, from);
      return;
    }

    // 3) إفلات على الشبكة: نقل أو دمج
    const to = nearestCell(obj.x, obj.y);
    let merged = false;
    let moved = false;
    if (to && !(to.r === from.r && to.c === from.c)) {
      const target = state.grid[to.r][to.c];
      if (target === 0) {
        state.grid[to.r][to.c] = level;
        state.grid[from.r][from.c] = 0;
        moved = true;
      } else if (target === level && level < MAX_LEVEL) {
        state.grid[to.r][to.c] = level + 1;
        state.grid[from.r][from.c] = 0;
        state.merges++;
        merged = true;
      }
    }

    if (moved || merged) {
      if (merged) this.say(`طلع ${LEVELS[level + 1].name}!`);
      saveState();
      this.renderItems(merged && to ? to : null);
      this.updateHUD();
    } else {
      this.snapBack(obj, from);
    }
  }

  spawnWood() {
    const empty = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) {
      this.say('الشبكة ممتلئة، ادمج شي أولاً');
      return;
    }
    const pick = Phaser.Utils.Array.GetRandom(empty);
    state.grid[pick.r][pick.c] = 1;
    saveState();
    this.renderItems(pick);
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

    makeButton(this, 190, 52, 150, 32, 'المملكة', () => this.scene.start('kingdom'));
    makeButton(this, 410, 52, 150, 32, 'القصر', () => {}, true);
    makeButton(this, 300, 748, 220, 42, 'رجوع للمملكة', () => this.scene.start('kingdom'));

    this.renderCastle();
    this.renderPanels();
    this.updateHUD();
  }

  updateHUD() {
    this.hud.setText(`الذهب: ${state.gold}  ·  الغزوات المصدودة: ${state.defended}  ·  الخسائر: ${state.lost}`);
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
    // أرض القصر
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

    // الأساس (حجارة)
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

    // الأسوار (حجر فاتح مع شرفات)
    if (c.walls) {
      g.fillStyle(0x9c8a66, 1);
      g.fillRoundedRect(150, 258, 300, 104, 4);
      g.fillStyle(0xc9b48a, 1);
      g.fillRoundedRect(154, 262, 292, 96, 3);
      for (let x = 150; x < 450; x += 30) {
        g.fillStyle(0x9c8a66, 1);
        g.fillRect(x, 236, 16, 24);
      }
      // الباب
      g.fillStyle(0x4a2e12, 1);
      g.fillRoundedRect(282, 300, 36, 62, 16);
      g.fillStyle(0x7a4a22, 1);
      g.fillRoundedRect(286, 304, 28, 58, 14);
    } else if (c.foundation) {
      this.ghost(g, 150, 258, 300, 104);
    }

    // البرج (يمين ويسار)
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

    // السقف (أحمر مثلث فوق المبنى الرئيسي)
    if (c.roof) {
      g.fillStyle(0x7a2e2e, 1);
      g.fillTriangle(140, 262, 460, 262, 300, 120);
      g.fillStyle(0xa13d3d, 1);
      g.fillTriangle(150, 258, 450, 258, 300, 128);
      g.lineStyle(2, 0x5a1f1f, 0.6);
      [200, 250, 300, 350, 400].forEach((x) => g.lineBetween(x, 258, 300 + (x - 300) * 0.25, 130));
    } else if (c.tower) {
      this.ghost(g, 140, 262, 320, 0);
    }
  }

  ghost(g, x, y, w, h) {
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeRoundedRect(x, y, w, h, 6);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x, y, w, h, 6);
  }

  renderPanels() {
    this.panelObjs = this.panelObjs || [];
    this.panelObjs.forEach((o) => o.destroy());
    this.panelObjs = [];

    const pos = [
      { x: 30, y: 452 }, { x: 310, y: 452 },
      { x: 30, y: 584 }, { x: 310, y: 584 },
    ];
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
    if (part.key === 'walls') state.lastRaid = Date.now(); // أول غزوة بعد ٤ ساعات من بناء الأسوار
    saveState();
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
  scene: [KingdomScene, CastleScene],
});
