// مملكة الدمج - المرحلة 2: طلبات القرية، صندوق اليوم مع سلسلة، ذهب، وحفظ محلي

const W = 600;
const H = 800;
const COLS = 6;
const ROWS = 6;
const SIZE = 80;          // حجم الخلية
const GAP = 8;            // المسافة بين الخلايا
const STEP = SIZE + GAP;
const GRID_X = 40;
const GRID_Y = 172;
const MAX_LEVEL = 3;
const SAVE_KEY = 'merge-kingdom-save-v1';
const FONT = 'system-ui, Tahoma, sans-serif';

// قرية الطلبات
const VILLAGE_Y = 96;
const VILLAGE_H = 64;
const CARD_W = 180;
const CARD_GAP = 10;
const CARD_X0 = (W - (3 * CARD_W + 2 * CARD_GAP)) / 2;

const LEVELS = {
  1: { name: 'حطب', reward: 10 },
  2: { name: 'خشب', reward: 25 },
  3: { name: 'لوح', reward: 60 },
};

function cellX(c) { return GRID_X + c * STEP + SIZE / 2; }
function cellY(r) { return GRID_Y + r * STEP + SIZE / 2; }

// الخلية الأقرب لنقطة (x, y) بإحداثيات المشهد، أو null إذا برا الشبكة
function nearestCell(x, y) {
  const c = Math.round((x - cellX(0)) / STEP);
  const r = Math.round((y - cellY(0)) / STEP);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return { r, c };
}

function cardRect(i) {
  return { x: CARD_X0 + i * (CARD_W + CARD_GAP), y: VILLAGE_Y, w: CARD_W, h: VILLAGE_H };
}

// يرجّع رقم البطاقة اللي فيها النقطة (مع هامش بسيط)، أو -1
function cardAt(x, y) {
  for (let i = 0; i < 3; i++) {
    const r = cardRect(i);
    if (x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 10 && y <= r.y + r.h + 10) return i;
  }
  return -1;
}

// تاريخ اليوم بالتوقيت المحلي بصيغة YYYY-MM-DD
function dayKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// عشوائية ثابتة حسب رقم (عشان الأرض ما تتغيّر مع كل تحديث)
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- رسم الأشياء (بإحداثيات محلية حول المركز 0,0) ----------

function drawLog(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 66, 12);

  const logs = [
    { x: -30, y: -15, w: 60 },
    { x: -26, y: 3, w: 56 },
  ];
  logs.forEach(({ x, y, w }) => {
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
    g.fillStyle(0xe2b07a, 1);
    g.fillCircle(cx, cy, 8);
    g.fillStyle(0xc08a52, 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0xe2b07a, 1);
    g.fillCircle(cx, cy, 2);
  });
}

function drawPlanks(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 27, 68, 12);

  const planks = [
    { y: -22, color: 0xd9a06a },
    { y: -6, color: 0xc68642 },
    { y: 10, color: 0xd09052 },
  ];
  planks.forEach(({ y, color }) => {
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

// ---------- المشهد ----------

class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }

  create() {
    this.input.topOnly = true;
    this.itemObjs = [];
    this.villageObjs = [];
    this.loadGame();

    this.drawGround();
    this.createHeader();
    this.createButtons();

    // السحب والإفلات: الشيء يتبع الإصبع ومحافظ على نقطة الإمساك
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
  }

  // ---------- الحفظ والتحميل ----------

  loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      const validGrid =
        saved &&
        Array.isArray(saved.grid) &&
        saved.grid.length === ROWS &&
        saved.grid.every((row) => Array.isArray(row) && row.length === COLS);
      if (validGrid) {
        this.grid = saved.grid;
        this.merges = saved.merges || 0;
        this.gold = saved.gold || 0;
        this.completed = saved.completed || 0;
        this.streak = saved.streak || 0;
        this.lastClaim = saved.lastClaim || null;
        this.orders = Array.isArray(saved.orders) && saved.orders.length === 3
          ? saved.orders
          : this.makeOrders(this.completed);
        return;
      }
    } catch (e) {
      // حفظ تالف أو localStorage مش متاح: نبدأ من جديد
    }
    this.newGame();
  }

  newGame() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.merges = 0;
    this.gold = 0;
    this.completed = 0;
    this.streak = 0;
    this.lastClaim = null;
    this.grid[2][2] = 1;
    this.grid[2][3] = 1;
    this.grid[3][2] = 1;
    this.orders = this.makeOrders(0);
    this.save();
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        grid: this.grid,
        merges: this.merges,
        gold: this.gold,
        completed: this.completed,
        streak: this.streak,
        lastClaim: this.lastClaim,
        orders: this.orders,
      }));
    } catch (e) {
      // التخزين مش متاح: اللعبة بتشتغل بدون حفظ
    }
  }

  // ---------- الطلبات ----------

  makeOrder(completed) {
    let level;
    if (completed < 3) level = 1;
    else if (completed < 8) level = Math.random() < 0.6 ? 1 : 2;
    else level = [1, 2, 3][Math.floor(Math.random() * 3)];

    const need = level === 1 ? 2 + Math.floor(Math.random() * 3)
      : level === 2 ? 1 + Math.floor(Math.random() * 2)
      : 1;
    return { level, need, have: 0 };
  }

  makeOrders(completed) {
    return [0, 1, 2].map(() => this.makeOrder(completed));
  }

  // ---------- الأرض (بتنرسم مرة وحدة) ----------

  drawGround() {
    const g = this.add.graphics().setDepth(0);

    // السماء
    g.fillStyle(0xa9def2, 1);
    g.fillRect(0, 0, W, 90);
    g.fillStyle(0xffffff, 0.85);
    [[90, 28, 60], [500, 22, 80]].forEach(([x, y, w]) => {
      g.fillEllipse(x, y, w, w * 0.4);
      g.fillEllipse(x + w * 0.35, y + 6, w * 0.7, w * 0.35);
    });

    // العشب
    g.fillStyle(0x7cc05a, 1);
    g.fillRect(0, 90, W, H - 90);
    for (let i = 0; i < 110; i++) {
      const x = hash(i * 3) * W;
      const y = 90 + hash(i * 3 + 1) * (H - 90);
      g.fillStyle(0x65a646, 0.5);
      g.fillEllipse(x, y, 18 + hash(i) * 14, 8);
    }

    // قطعة الأرض تحت الشبكة (تربة)
    const pad = 12;
    const boardW = COLS * STEP - GAP + pad * 2;
    const boardH = ROWS * STEP - GAP + pad * 2;
    const boardX = GRID_X - pad;
    const boardY = GRID_Y - pad;
    g.fillStyle(0x6b4a2b, 1);
    g.fillRoundedRect(boardX - 4, boardY - 4, boardW + 8, boardH + 8, 16);

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

  // ---------- الواجهة ----------

  createHeader() {
    this.add.text(W / 2, 34, 'مملكة الدمج', {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#4a2e12',
    }).setOrigin(0.5).setDepth(30);

    this.hud = this.add.text(W / 2, 66, '', {
      fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#1f3a14',
    }).setOrigin(0.5).setDepth(30);

    this.message = this.add.text(W / 2, H - 14, '', {
      fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
  }

  createButtons() {
    this.makeButton(110, 748, '+ حطب', () => this.spawnWood());
    this.chestBtn = this.makeButton(300, 748, 'صندوق اليوم', () => this.claimChest());
    this.makeButton(490, 748, 'إعادة', () => {
      if (window.confirm('تبدأ من جديد؟ كل التقدم والذهب رح ينمسحوا.')) {
        this.newGame();
        this.renderItems();
        this.renderVillage();
        this.updateHUD();
        this.updateChestButton();
        this.say('بداية جديدة');
      }
    });
  }

  makeButton(x, y, label, onClick) {
    const w = 170;
    const h = 42;
    const g = this.add.graphics().setDepth(30);
    const draw = (color) => {
      g.clear();
      g.fillStyle(0x4a2e12, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, 12);
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(2, 0xf7e7b4, 0.7);
      g.strokeRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, 10);
    };
    draw(0x9a6230);

    const text = this.add.text(x, y - 2, label, {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(31);

    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => draw(0x7d4d20));
    hit.on('pointerup', () => { draw(0x9a6230); onClick(); });
    hit.on('pointerout', () => draw(0x9a6230));

    return { setLabel: (t) => text.setText(t) };
  }

  updateHUD() {
    this.hud.setText(`الذهب: ${this.gold}   ·   الدمجات: ${this.merges}   ·   سلسلة: ${this.streak} يوم`);
  }

  updateChestButton() {
    const today = dayKey(new Date());
    this.chestBtn.setLabel(this.lastClaim === today ? 'استلمت اليوم' : 'صندوق اليوم');
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(2000, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }

  // ---------- قرية الطلبات ----------

  renderVillage(popIndex = null) {
    this.villageObjs.forEach((o) => o.destroy());
    this.villageObjs = [];

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

      const name = this.add.text(76, 14, `${LEVELS[order.level].name} ×${order.need}`, {
        fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#4a2e12',
      }).setOrigin(0, 0.5);

      const progress = this.add.text(76, 42, `${order.have} / ${order.need}`, {
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

  // ---------- رسم الأشياء ----------

  renderItems(popCell = null) {
    this.itemObjs.forEach((o) => o.destroy());
    this.itemObjs = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const level = this.grid[r][c];
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

  // ---------- المنطق ----------

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
    const level = this.grid[from.r][from.c];

    // 1) إفلات على طلب من القرية
    const cardIndex = cardAt(obj.x, obj.y);
    if (cardIndex !== -1) {
      const order = this.orders[cardIndex];
      if (order.level === level) {
        this.grid[from.r][from.c] = 0;
        order.have++;
        if (order.have >= order.need) {
          const reward = LEVELS[order.level].reward * order.need;
          this.gold += reward;
          this.completed++;
          this.orders[cardIndex] = this.makeOrder(this.completed);
          this.say(`اكتمل الطلب! +${reward} ذهب`);
          this.save();
          this.renderItems();
          this.renderVillage(cardIndex);
        } else {
          this.save();
          this.renderItems();
          this.renderVillage(null);
        }
        this.updateHUD();
      } else {
        this.say(`القرية بدها ${LEVELS[order.level].name}، مش ${LEVELS[level].name}`);
        this.snapBack(obj, from);
      }
      return;
    }

    // 2) إفلات داخل منطقة القرية بس مش على طلب: رجوع
    if (obj.y < VILLAGE_Y + VILLAGE_H + 10) {
      this.snapBack(obj, from);
      return;
    }

    // 3) إفلات على الشبكة: نقل أو دمج
    const to = nearestCell(obj.x, obj.y);
    let merged = false;
    let moved = false;

    if (to && !(to.r === from.r && to.c === from.c)) {
      const target = this.grid[to.r][to.c];

      if (target === 0) {
        this.grid[to.r][to.c] = level;
        this.grid[from.r][from.c] = 0;
        moved = true;
      } else if (target === level && level < MAX_LEVEL) {
        this.grid[to.r][to.c] = level + 1;
        this.grid[from.r][from.c] = 0;
        this.merges++;
        merged = true;
      }
    }

    if (moved || merged) {
      if (merged) this.say(`طلع ${LEVELS[level + 1].name}!`);
      this.save();
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
        if (this.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) {
      this.say('الشبكة ممتلئة، ادمج شي أولاً');
      return;
    }
    const pick = Phaser.Utils.Array.GetRandom(empty);
    this.grid[pick.r][pick.c] = 1;
    this.save();
    this.renderItems(pick);
    this.updateHUD();
  }

  claimChest() {
    const now = new Date();
    const today = dayKey(now);
    if (this.lastClaim === today) {
      this.say('استلمت صندوق اليوم، ارجع بكرة');
      return;
    }
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    this.streak = this.lastClaim === yesterday ? this.streak + 1 : 1;
    const reward = 30 + 10 * Math.min(this.streak, 7);
    this.gold += reward;
    this.lastClaim = today;
    this.save();
    this.updateHUD();
    this.updateChestButton();
    this.say(`صندوق اليوم: +${reward} ذهب، سلسلة ${this.streak} يوم`);
  }
}

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
  scene: MainScene,
});
