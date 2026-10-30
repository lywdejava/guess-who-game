import Phaser from 'phaser';
import { DIFFS, SCREEN, TXT } from '../config';
import { Round } from '../core/round';
import type { Combo, DiffKey } from '../core/types';
import { applyCRT } from '../render/crt';
import { drawMonitor, drawRoom } from '../render/frame';
import { button, cnText, glowPanel, glowText, monoText } from '../render/ui';

const PAD = 8;
const CONTENT_W = SCREEN.w - PAD * 2; // 296

/** 线索行 */
const ROW_H = 18;
const ROW_PITCH = 21;
const LIST_Y = 50;

/** 滚轮式数字输入 */
const WHEEL_Y = 246;
const COL_W = 54;
const COL_GAP = 12;
const ARROW_H = 14;
const DIGIT_H = 32;

export class GameScene extends Phaser.Scene {
  private diffKey: DiffKey = 'normal';
  private round?: Round;
  private digits: number[] = [0, 0, 0, 0];
  private locked = false;

  private listLayer!: Phaser.GameObjects.Container;
  private digitTexts: Phaser.GameObjects.Text[] = [];
  private hintText!: Phaser.GameObjects.Text;
  private possText!: Phaser.GameObjects.Text;
  private guessChip!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Text;
  private hintBtnLabel!: Phaser.GameObjects.Text;
  private hintBtn!: Phaser.GameObjects.Container;
  private barCells: Phaser.GameObjects.Rectangle[] = [];
  private warnLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('Game');
  }

  create(data: { diffKey: DiffKey }): void {
    this.diffKey = data?.diffKey ?? 'normal';
    this.digits = [0, 0, 0, 0];
    this.locked = false;

    drawRoom(this);
    drawMonitor(this);
    applyCRT(this.cameras.main);

    this.buildHud();
    this.listLayer = this.add.container(SCREEN.x + PAD, SCREEN.y + LIST_Y);
    this.buildWheel();
    this.buildActions();
    this.buildProgressBar();

    this.hintText = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 318, '正在布置现场…', 10, TXT.dim, 'center');

    // 生成一局（首次生成含 3~6 条情报，耗时约 100ms，故延迟一帧再做）
    this.time.delayedCall(40, () => {
      this.round = new Round(DIFFS[this.diffKey]);
      this.refresh();
      this.renderDigits();
      this.setHint('转动每一位数字，组成你的答案', false);
    });
  }

  // ---------- 布局 ----------

  private buildHud(): void {
    const y = SCREEN.y + 8;
    button(this, SCREEN.x + PAD, y, {
      w: 26,
      h: 22,
      label: '‹',
      size: 13,
      variant: 'ghost',
      onClick: () => this.scene.start('Menu')
    });

    const d = DIFFS[this.diffKey];
    const title = cnText(this, SCREEN.x + PAD + 32, y + 3, `${d.name} · 至多 ${d.K} 条谎言`, 11.5, TXT.green);
    glowText(title, 'rgba(157,255,90,0.18)', 4);

    cnText(this, SCREEN.x + PAD + 32, y + 17, '可能性', 8, TXT.dimmer);
    this.possText = monoText(this, SCREEN.x + PAD + 66, y + 16, '-', 9, TXT.dim);

    // 右侧两枚计数值
    const chip = (cx: number, label: string) => {
      glowPanel(this, cx, y, 44, 22, { fill: 0x0d140a, fillAlpha: 0.9, stroke: 0x33461f });
      cnText(this, cx + 5, y + 3, label, 8, TXT.dimmer);
      return monoText(this, cx + 5, y + 10, '0', 11, TXT.ink);
    };
    this.guessChip = chip(SCREEN.x + SCREEN.w - PAD - 92, '猜');
    this.hintChip = chip(SCREEN.x + SCREEN.w - PAD - 44, '情');

    cnText(this, SCREEN.x + PAD, SCREEN.y + 36, '线 索 情 报', 9, TXT.dimmer);
  }

  private buildWheel(): void {
    const groupW = COL_W * 4 + COL_GAP * 3;
    const startX = SCREEN.x + (SCREEN.w - groupW) / 2;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (COL_W + COL_GAP);

      // 上箭头：数值 +1
      button(this, x, SCREEN.y + WHEEL_Y, {
        w: COL_W,
        h: ARROW_H,
        label: '▲',
        size: 9,
        variant: 'ghost',
        onClick: () => this.spin(i, 1)
      });

      // 数字窗：点击整体 +1
      const dy = SCREEN.y + WHEEL_Y + ARROW_H + 2;
      glowPanel(this, x, dy, COL_W, DIGIT_H, { fill: 0x080c06, fillAlpha: 0.95, stroke: 0x3a4d26 });
      const t = monoText(this, x + COL_W / 2, dy + 3, '0', 22, TXT.green, 'center');
      this.digitTexts.push(t);
      const zone = this.add.zone(x, dy, COL_W, DIGIT_H).setOrigin(0, 0);
      zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, COL_W, DIGIT_H), Phaser.Geom.Rectangle.Contains);
      zone.on('pointerdown', () => this.spin(i, 1));

      // 下箭头：数值 -1
      button(this, x, SCREEN.y + WHEEL_Y + ARROW_H + DIGIT_H + 4, {
        w: COL_W,
        h: ARROW_H,
        label: '▼',
        size: 9,
        variant: 'ghost',
        onClick: () => this.spin(i, -1)
      });
    }
  }

  private buildActions(): void {
    button(this, SCREEN.x + PAD, SCREEN.y + 334, {
      w: CONTENT_W,
      h: 24,
      label: '提 交 答 案',
      size: 13,
      variant: 'solid',
      onClick: () => this.submit()
    });

    const y = SCREEN.y + 364;
    const half = (CONTENT_W - 6) / 2;
    this.hintBtn = button(this, SCREEN.x + PAD, y, {
      w: half,
      h: 24,
      label: '求情报',
      size: 11,
      variant: 'outline',
      onClick: () => this.buyHint()
    });
    this.hintBtnLabel = this.hintBtn.getAt(1) as Phaser.GameObjects.Text;

    button(this, SCREEN.x + PAD + half + 6, y, {
      w: half,
      h: 24,
      label: '认 输',
      size: 11,
      variant: 'ghost',
      onClick: () => this.giveUp()
    });
  }

  /** 底部 10 格失败进度条：错一次亮一格，格满即失败 */
  private buildProgressBar(): void {
    const y = SCREEN.y + 396;
    const h = 12;
    const gap = 3;
    const cw = Math.floor((CONTENT_W - gap * 9) / 10);
    const startX = SCREEN.x + PAD + Math.floor((CONTENT_W - (cw * 10 + gap * 9)) / 2);

    for (let i = 0; i < 10; i++) {
      const cell = this.add.rectangle(startX + i * (cw + gap), y, cw, h, 0x1a2412);
      cell.setOrigin(0, 0);
      cell.setStrokeStyle(1, 0x33461f, 0.9);
      this.barCells.push(cell);
    }
  }

  // ---------- 交互 ----------

  /** 独立调节第 i 位数字，无需按顺序输入 */
  private spin(i: number, dir: number): void {
    if (!this.round || this.round.over || this.locked) return;
    this.digits[i] = (this.digits[i] + dir + 10) % 10;
    this.renderDigits();
    this.clearWarn();
    this.setHint('转动每一位数字，组成你的答案', false);
  }

  private renderDigits(): void {
    this.digitTexts.forEach((t, i) => t.setText(String(this.digits[i])));
  }

  private submit(): void {
    const r = this.round;
    if (!r || r.over || this.locked) return;

    if (new Set(this.digits).size < 4) {
      this.warn('数字不能重复', true);
      return;
    }

    const combo = [...this.digits] as Combo;
    const res = r.guess(combo);

    if (res.win) {
      this.setHint('猜中了 —— 案件告破', false);
      this.finish();
      return;
    }

    this.renderBar(r.wrongGuess, true);
    this.warn(`判定失败 · 位置 ${res.feedback!.exact} · 数值 ${res.feedback!.present}`, true);
    this.refresh();
    if (r.guessLeft <= 0) this.time.delayedCall(900, () => this.finish());
  }

  private buyHint(): void {
    const r = this.round;
    if (!r || r.over || r.hintLeft <= 0) return;
    r.buyHint();
    this.refresh();
    this.setHint('线人给了新情报，真假自辨', false);
  }

  private accuse(index: number): void {
    const r = this.round;
    if (!r || r.over || r.accLeft <= 0) return;
    const res = r.accuse(index);
    if (!res) return;
    this.setHint(res === 'lie' ? '拆穿成功 +150' : '这是真情报 -100', res !== 'lie');
    this.refresh();
  }

  private giveUp(): void {
    if (!this.round || this.round.over) return;
    this.round.giveUp();
    this.finish();
  }

  private finish(): void {
    if (this.locked) return;
    this.locked = true;
    const summary = this.round!.summary();
    this.time.delayedCall(520, () => this.scene.start('End', { summary }));
  }

  // ---------- 渲染 ----------

  private refresh(): void {
    const r = this.round;
    if (!r) return;
    this.guessChip.setText(String(r.guessLeft));
    this.hintChip.setText(String(r.hintLeft));
    this.guessChip.setColor(r.guessLeft <= 2 ? TXT.red : TXT.ink);
    this.hintChip.setColor(r.hintLeft <= 0 ? TXT.red : TXT.ink);
    this.possText.setText(`${r.candidates().length} 种`);

    this.hintBtnLabel.setText(r.hintLeft > 0 ? `求情报 ${r.hintLeft}` : '情报已尽');
    this.hintBtn.setAlpha(r.hintLeft > 0 ? 1 : 0.45);

    this.renderList();
  }

  /** 全量线索列表：一屏显示所有情报，无需翻页滚动 */
  private renderList(): void {
    const r = this.round;
    if (!r) return;
    this.listLayer.removeAll(true);

    r.hints.forEach((h, i) => {
      const c = this.add.container(0, i * ROW_PITCH);

      const revealed = h.accused !== null;
      const g = this.add.graphics();
      g.fillStyle(revealed ? (h.accused === 'lie' ? 0x1e0c0a : 0x0e1a0c) : 0x0b1108, 0.9);
      g.fillRect(0, 0, CONTENT_W, ROW_H);
      g.fillStyle(revealed ? (h.accused === 'lie' ? 0x7a3028 : 0x4d7a2c) : 0x33461f, 1);
      g.fillRect(0, 0, 2, ROW_H);
      c.add(g);

      const idx = monoText(this, 6, 5, `#${String(i + 1).padStart(2, '0')}`, 8, TXT.dimmer);
      c.add(idx);

      const probe = monoText(this, 26, 2, h.probe.map((x) => String(x)).join(' '), 14, revealed ? '#8a7568' : TXT.ink);
      c.add(probe);

      const fb = cnText(this, 88, 5, `位置 ${h.exact} · 数值 ${h.present}`, 10, revealed ? TXT.dim : TXT.greenSoft);
      c.add(fb);

      if (h.accused) {
        const flag = cnText(
          this,
          CONTENT_W - 6,
          5,
          h.accused === 'lie' ? '假情报' : '真情报',
          9,
          h.accused === 'lie' ? TXT.red : TXT.greenSoft
        );
        flag.setOrigin(1, 0);
        c.add(flag);
      } else if (r.accLeft > 0 && !r.over) {
        const acc = cnText(this, CONTENT_W - 10, 5, '指认 ⌖', 9, TXT.red);
        acc.setOrigin(1, 0);
        const zone = this.add.zone(CONTENT_W - 44, 0, 44, ROW_H).setOrigin(0, 0);
        zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, 44, ROW_H), Phaser.Geom.Rectangle.Contains);
        zone.on('pointerdown', () => this.accuse(i));
        c.add(acc);
        c.add(zone);
      }

      this.listLayer.add(c);
    });
  }

  private renderBar(used: number, pulse: boolean): void {
    this.barCells.forEach((cell, i) => {
      if (i < used) {
        cell.setFillStyle(i === used - 1 && pulse ? 0xff4f46 : 0x8f2b24);
        cell.setStrokeStyle(1, 0xb03a30, 1);
      } else {
        cell.setFillStyle(0x1a2412);
        cell.setStrokeStyle(1, 0x33461f, 0.9);
      }
    });
    if (pulse) this.cameras.main.shake(120, 0.004);
  }

  /** 红色警告框：闪烁数次后消失 */
  private warn(msg: string, bad: boolean): void {
    this.clearWarn();
    this.setHint(msg, bad);

    const cx = SCREEN.x + SCREEN.w / 2;
    const cy = SCREEN.y + 148;
    const w = SCREEN.w - 60;
    const h = 44;

    const layer = this.add.container(cx, cy).setDepth(30);
    const g = this.add.graphics();
    g.fillStyle(0x2a0b09, 0.94);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(2, 0xff4f46, 1);
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.lineStyle(4, 0xff4f46, 0.18);
    g.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
    layer.add(g);

    const t = cnText(this, 0, -8, '!', 16, TXT.red, 'center');
    t.setFontStyle('bold');
    layer.add(t);
    const m = cnText(this, 0, 4, msg, 10.5, TXT.red, 'center');
    layer.add(m);

    layer.setAlpha(0);
    this.warnLayer = layer;
    this.tweens.add({
      targets: layer,
      alpha: { from: 0, to: 1 },
      duration: 130,
      yoyo: true,
      repeat: 3,
      onYoyo: () => layer.setAlpha(0.35),
      onRepeat: () => layer.setAlpha(1),
      onComplete: () => {
        layer.setAlpha(0.9);
        this.time.delayedCall(650, () => {
          if (this.warnLayer === layer) this.clearWarn();
        });
      }
    });
    this.cameras.main.shake(140, 0.005);
  }

  private clearWarn(): void {
    this.warnLayer?.destroy();
    this.warnLayer = undefined;
  }

  private setHint(msg: string, bad: boolean): void {
    this.hintText.setText(msg);
    this.hintText.setColor(bad ? TXT.red : TXT.dim);
  }
}
