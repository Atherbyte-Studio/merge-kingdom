// مملكة الدمج - المرحلة 1: أرض، أشكال خشب طبيعية، سحب وإفلات مريح، دمج، وحفظ محلي

const W = 600;
const H = 720;
const COLS = 6;
const ROWS = 6;
const SIZE = 80;          // حجم الخلية
const GAP = 8;            // المسافة بين الخلايا
const STEP = SIZE + GAP;
const GRID_X = 40;
const GRID_Y = 160;
const MAX_LEVEL = 3;
const SAVE_KEY = 'merge-kingdom-save-v1';
const FONT = 'system-ui, Tahoma, sans-serif';

const LEVELS = {
  1: { name: 'حطب' },
  2: { name: 'خشب' },
  3: { name: 'لوح' },
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
    // لحاء وخطوط لحاء
    g.lineStyle(1, 0x4a2c12, 0.55);
    g.lineBetween(x + 12, y + 4, x + 24, y + 4);
    g.lineBetween(x + 30, y + 13, x + 48, y + 13);
    // الوجه الدائري للجذع (حلقات السنين)
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
    // عروق الخشب
    g.lineStyle(1, 0x7a4a22, 0.45);
    g.lineBetween(-26, y + 5, 18, y + 4);
    g.lineBetween(-10, y + 10, 26, y + 9);
    // مسامير
    g.fillStyle(0x3d2e22, 1);
    g.fillCircle(-24, y + 7, 2);
    g.fillCircle(24, y + 7, 2);
  });
}

function drawBoard(g) {
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(0, 30, 74, 12);

  // اللوح نفسه
  g.fillStyle(0x7a4a22, 1);
  g.fillRoundedRect(-36, -28, 72, 56, 6);
  g.fillStyle(0xf1c27d, 1);
  g.fillRoundedRect(-34, -26, 68, 52, 5);
  // لمعة فوق
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(-30, -22, 60, 10, 4);
  // عروق عرضية
  g.lineStyle(1, 0xb9833e, 0.5);
  [-10, 0, 10, 18].forEach((y) => g.lineBetween(-28, y, 26, y + 1));
  g.lineBetween(-10, -20, 20, -18);
  // مسامير بالزوايا
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
    this.grid = [];
    this.merges = 0;
    this.itemObjs = [];
    this.input.topOnly = true;
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
    this.updateHUD();
  }

  // ---------- الحفظ والتحميل ----------

  loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      const valid =
        saved &&
        Array.isArray(saved.grid) &&
        saved.grid.length === ROWS &&
        saved.grid.every((row) => Array.isArray(row) && row.length === COLS);
      if (valid) {
        this.grid = saved.grid;
        this.merges = saved.merges || 0;
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
    this.grid[2][2] = 1;
    this.grid[2][3] = 1;
    this.grid[3][2] = 1;
    this.save();
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ grid: this.grid, merges: this.merges }));
    } catch (e) {
      // التخزين مش متاح: اللعبة بتشتغل بدون حفظ
    }
  }

  // ---------- الأرض (بتنرسم مرة وحدة) ----------

  drawGround() {
    const g = this.add.graphics().setDepth(0);

    // السماء
    g.fillStyle(0xa9def2, 1);
    g.fillRect(0, 0, W, 150);
    g.fillStyle(0xffffff, 0.85);
    [[90, 60, 70], [480, 45, 90], [300, 100, 50]].forEach(([x, y, w]) => {
      g.fillEllipse(x, y, w, w * 0.4);
      g.fillEllipse(x + w * 0.35, y + 6, w * 0.7, w * 0.35);
    });

    // العشب
    g.fillStyle(0x7cc05a, 1);
    g.fillRect(0, 150, W, H - 150);
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 3) * W;
      const y = 150 + hash(i * 3 + 1) * (H - 150);
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

    // خلايا التربة
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GRID_X + c * STEP;
        const y = GRID_Y + r * STEP;
        const v = hash(r * COLS + c);
        const base = v > 0.5 ? 0x9b6b3f : 0x8f5f36;
        g.fillStyle(base, 1);
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
    this.add.text(W / 2, 42, 'مملكة الدمج', {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#4a2e12',
    }).setOrigin(0.5).setDepth(30);

    this.hud = this.add.text(W / 2, 90, '', {
      fontFamily: FONT, fontSize: '18px', color: '#2b4a1e',
    }).setOrigin(0.5).setDepth(30);

    this.message = this.add.text(W / 2, H - 22, '', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2b4a1e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
  }

  createButtons() {
    this.makeButton(150, 124, '+ حطب', () => this.spawnWood());
    this.makeButton(450, 124, 'إعادة', () => {
      if (window.confirm('تبدأ من جديد؟ التقدم الحالي رح ينمسح.')) {
        this.newGame();
        this.renderItems();
        this.updateHUD();
        this.say('بداية جديدة');
      }
    });
  }

  makeButton(x, y, label, onClick) {
    const w = 180;
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

    this.add.text(x, y - 2, label, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(31);

    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => draw(0x7d4d20));
    hit.on('pointerup', () => { draw(0x9a6230); onClick(); });
    hit.on('pointerout', () => draw(0x9a6230));
  }

  updateHUD() {
    this.hud.setText(`الدمجات: ${this.merges}   ·   حطب ← خشب ← لوح`);
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(1800, () => {
      if (this.message.text === text) this.message.setText('');
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

  onDrop(obj) {
    const from = obj.cell;
    const to = nearestCell(obj.x, obj.y);
    const level = this.grid[from.r][from.c];
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
      // رجوع للمكان الأصلي بحركة ناعمة
      obj.setDepth(5);
      this.tweens.add({
        targets: obj,
        x: cellX(from.c),
        y: cellY(from.r),
        duration: 120,
        ease: 'Quad.Out',
      });
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
