// مملكة الدمج - المرحلة 1: الشبكة، السحب والإفلات، الدمج، والحفظ المحلي

const COLS = 6;
const ROWS = 6;
const SIZE = 80;          // حجم الخلية
const GAP = 8;            // المسافة بين الخلايا
const STEP = SIZE + GAP;
const GRID_X = 40;
const GRID_Y = 150;
const MAX_LEVEL = 3;
const SAVE_KEY = 'merge-kingdom-save-v1';
const FONT = 'system-ui, Tahoma, sans-serif';

const LEVELS = {
  1: { name: 'حطب', color: 0x8d5524, text: '#ffffff' },
  2: { name: 'خشب', color: 0xc68642, text: '#ffffff' },
  3: { name: 'لوح', color: 0xf1c27d, text: '#3b2a14' },
};

function cellX(c) { return GRID_X + c * STEP + SIZE / 2; }
function cellY(r) { return GRID_Y + r * STEP + SIZE / 2; }

// يرجّع الخلية اللي فيها النقطة (x, y) بإحداثيات المشهد، أو null إذا خارج الشبكة
function cellAt(x, y) {
  const lx = x - GRID_X;
  const ly = y - GRID_Y;
  if (lx < 0 || ly < 0) return null;
  const c = Math.floor(lx / STEP);
  const r = Math.floor(ly / STEP);
  if (c >= COLS || r >= ROWS) return null;
  if (lx - c * STEP > SIZE || ly - r * STEP > SIZE) return null; // داخل الفجوة
  return { r, c };
}

class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }

  create() {
    this.grid = [];
    this.merges = 0;
    this.tileObjs = [];
    this.loadGame();

    this.createHeader();
    this.createButtons();

    // السحب والإفلات
    this.input.on('dragstart', (pointer, box) => {
      box.setDepth(10);
    });
    this.input.on('drag', (pointer, box, dragX, dragY) => {
      box.x = dragX;
      box.y = dragY;
    });
    this.input.on('dragend', (pointer, box) => this.onDrop(box));

    this.renderBoard();
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

  // ---------- الواجهة ----------

  createHeader() {
    this.add.text(300, 40, 'مملكة الدمج', {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#f7e7b4',
    }).setOrigin(0.5);

    this.hud = this.add.text(300, 90, '', {
      fontFamily: FONT, fontSize: '20px', color: '#d9efe3',
    }).setOrigin(0.5);

    this.message = this.add.text(300, 690, '', {
      fontFamily: FONT, fontSize: '20px', color: '#f7e7b4',
    }).setOrigin(0.5);
  }

  createButtons() {
    this.makeButton(150, 125, '+ حطب', () => this.spawnWood());
    this.makeButton(450, 125, 'إعادة', () => {
      if (window.confirm('تبدأ من جديد؟ التقدم الحالي رح ينمسح.')) {
        this.newGame();
        this.renderBoard();
        this.updateHUD();
        this.say('بداية جديدة');
      }
    });
  }

  makeButton(x, y, label, onClick) {
    const bg = this.add.rectangle(x, y, 180, 42, 0x7a4a1e)
      .setStrokeStyle(2, 0xf7e7b4, 0.6)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    bg.on('pointerdown', onClick);
    return bg;
  }

  updateHUD() {
    this.hud.setText(`الدمجات: ${this.merges}`);
  }

  say(text) {
    this.message.setText(text);
    this.time.delayedCall(1800, () => {
      if (this.message.text === text) this.message.setText('');
    });
  }

  // ---------- الرسم ----------

  renderBoard() {
    this.tileObjs.forEach((t) => t.destroy());
    this.tileObjs = [];

    // خلفية الشبكة
    if (!this.boardBg) {
      const pad = 12;
      this.boardBg = this.add.rectangle(
        GRID_X + (COLS * STEP - GAP) / 2,
        GRID_Y + (ROWS * STEP - GAP) / 2,
        COLS * STEP - GAP + pad * 2,
        ROWS * STEP - GAP + pad * 2,
        0x2d5a46,
      ).setDepth(-1);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const level = this.grid[r][c];
        if (level > 0) this.tileObjs.push(this.makeTile(r, c, level));
      }
    }
  }

  makeTile(r, c, level) {
    const def = LEVELS[level];
    const bg = this.add.rectangle(0, 0, SIZE, SIZE, def.color)
      .setStrokeStyle(3, 0x000000, 0.2);
    const name = this.add.text(0, 4, def.name, {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: def.text,
    }).setOrigin(0.5);
    const lvl = this.add.text(SIZE / 2 - 8, -SIZE / 2 + 6, String(level), {
      fontFamily: FONT, fontSize: '14px', color: def.text,
    }).setOrigin(1, 0).setAlpha(0.7);

    const box = this.add.container(cellX(c), cellY(r), [bg, name, lvl]);
    box.setSize(SIZE, SIZE);
    box.setInteractive(
      new Phaser.Geom.Rectangle(-SIZE / 2, -SIZE / 2, SIZE, SIZE),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(box);
    box.cell = { r, c };
    box.level = level;
    return box;
  }

  // ---------- المنطق ----------

  onDrop(box) {
    const from = box.cell;
    const to = cellAt(box.x, box.y);
    const level = this.grid[from.r][from.c];
    let changed = false;

    if (to && !(to.r === from.r && to.c === from.c)) {
      const target = this.grid[to.r][to.c];

      if (target === 0) {
        // نقل لخانة فاضية
        this.grid[to.r][to.c] = level;
        this.grid[from.r][from.c] = 0;
        changed = true;
      } else if (target === level && level < MAX_LEVEL) {
        // دمج: نفس المستوى يطلع أعلى
        this.grid[to.r][to.c] = level + 1;
        this.grid[from.r][from.c] = 0;
        this.merges++;
        changed = true;
        this.say(`طلع ${LEVELS[level + 1].name}!`);
      }
    }

    if (changed) {
      this.save();
      this.renderBoard();
      this.updateHUD();
    } else {
      // رجوع للمكان الأصلي
      box.setPosition(cellX(from.c), cellY(from.r));
      box.setDepth(0);
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
    this.renderBoard();
    this.updateHUD();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 600,
  height: 720,
  parent: document.body,
  backgroundColor: '#1e3a2f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: MainScene,
});
