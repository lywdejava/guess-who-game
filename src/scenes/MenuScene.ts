import Phaser from 'phaser';
import { COLORS, DIFFS, DIFF_ORDER, SCREEN, TXT, W } from '../config';
import type { DiffKey } from '../core/types';
import { drawMonitor, drawRoom } from '../render/frame';
import { applyCRT } from '../render/crt';
import { button, cnText, glowPanel, glowText, monoText } from '../render/ui';
import { storage } from '../platform/storage';

const ROW_W = 264;
const ROW_H = 36;
const ROW_GAP = 8;

export class MenuScene extends Phaser.Scene {
  private selected: DiffKey = 'normal';
  private rowsLayer!: Phaser.GameObjects.Container;
  private rulesLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('Menu');
  }

  create(): void {
    drawRoom(this);
    drawMonitor(this);
    applyCRT(this.cameras.main);

    this.rowsLayer = this.add.container(0, 0);
    this.renderRows();

    // 屏内静态文案
    const title = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 40, '猜猜我是谁', 26, TXT.ink, 'center');
    title.setFontStyle('bold');
    glowText(title, 'rgba(157,255,90,0.35)', 8);

    cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 76, '选 择 游 戏 难 度', 11, TXT.greenSoft, 'center');

    const link = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 306, '游 戏 规 则', 11, TXT.dim, 'center');
    link.setInteractive({ useHandCursor: true });
    link.on('pointerdown', () => this.openRules());
    link.on('pointerover', () => link.setColor(TXT.green));
    link.on('pointerout', () => link.setColor(TXT.dim));

    // 桌面上的实体开始按钮（设计稿：屏幕外、桌面上）
    const bw = 190;
    const bh = 44;
    const bx = (W - bw) / 2;
    const by = 548;

    const halo = this.add.graphics();
    halo.fillStyle(COLORS.green, 0.06);
    halo.fillRoundedRect(bx - 8, by - 8, bw + 16, bh + 16, 12);

    button(this, bx, by, {
      w: bw,
      h: bh,
      label: '开 始 游 戏',
      size: 17,
      variant: 'solid',
      onClick: () => this.startGame()
    });

    monoText(this, W / 2, 610, 'BULLS & COWS / LIE MODE', 8, TXT.dimmer, 'center');
  }

  private renderRows(): void {
    this.rowsLayer.removeAll(true);
    const x = SCREEN.x + (SCREEN.w - ROW_W) / 2;
    const baseY = SCREEN.y + 100;

    DIFF_ORDER.forEach((key, i) => {
      const d = DIFFS[key];
      const y = baseY + i * (ROW_H + ROW_GAP);
      const on = key === this.selected;
      const c = this.add.container(x, y);

      const g = glowPanel(this, 0, 0, ROW_W, ROW_H, {
        glow: on,
        fill: on ? 0x1e2c12 : 0x0e140a,
        fillAlpha: on ? 0.9 : 0.55,
        stroke: on ? COLORS.green : COLORS.greenDim
      });
      c.add(g);

      if (on) {
        const bar = this.add.graphics();
        bar.fillStyle(COLORS.green, 1);
        bar.fillRect(-2, -2, 3, ROW_H + 4);
        c.add(bar);
      }

      const name = cnText(this, 14, ROW_H / 2, d.name, 15, on ? TXT.ink : '#c9d8ba');
      name.setOrigin(0, 0.5);
      c.add(name);

      const label = cnText(this, ROW_W - 14, ROW_H / 2, d.label, 11.5, on ? TXT.greenSoft : TXT.dim);
      label.setOrigin(1, 0.5);
      c.add(label);

      const best = storage.getBest(key);
      if (best > 0) {
        const b = monoText(this, ROW_W - 14, ROW_H + 1, `BEST ${best}`, 7, TXT.dimmer);
        b.setOrigin(1, 0);
        c.add(b);
      }

      c.setSize(ROW_W, ROW_H);
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, ROW_W, ROW_H), Phaser.Geom.Rectangle.Contains);
      // 按下即选中（触摸时 pointerup 常因手指轻移而丢失，导致难度点不动）
      c.on('pointerdown', () => {
        if (this.selected === key) return;
        this.selected = key;
        this.renderRows();
      });
      this.rowsLayer.add(c);
    });
  }

  private startGame(): void {
    if (this.rulesLayer) return;
    this.scene.start('Game', { diffKey: this.selected });
  }

  private openRules(): void {
    if (this.rulesLayer) return;
    const layer = this.add.container(0, 0).setDepth(50);

    const cover = this.add.graphics();
    cover.fillStyle(0x080b09, 0.96);
    cover.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
    layer.add(cover);

    const t = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 28, '游戏规则', 24, TXT.ink, 'center');
    t.setFontStyle('bold');
    glowText(t, 'rgba(157,255,90,0.3)', 7);
    layer.add(t);

    const sub = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 62, '猜 猜 我 是 谁', 10, TXT.greenSoft, 'center');
    layer.add(sub);

    const rules: Array<[string, string]> = [
      ['目标：', '猜出四位不重复数字'],
      ['反馈：', '位置对几个，数值对几个'],
      ['谎言：', '难度越高，虚假信息越多']
    ];

    rules.forEach(([k, v], i) => {
      const bx = SCREEN.x + 24;
      const by = SCREEN.y + 92 + i * 62;
      layer.add(glowPanel(this, bx, by, SCREEN.w - 48, 50, { fill: 0x0e140a, fillAlpha: 0.6 }));
      const kt = cnText(this, bx + 12, by + 15, k, 11.5, TXT.green);
      const vt = cnText(this, bx + 58, by + 15, v, 11.5, TXT.ink);
      layer.add(kt);
      layer.add(vt);
    });

    const note = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 288, '位置＝位置与数字都对', 9, TXT.dim, 'center');
    const note2 = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 302, '数值＝数字存在于答案（不看位置）', 9, TXT.dim, 'center');
    layer.add(note);
    layer.add(note2);

    const foot = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 330, '— 谨慎判断，别被谎言骗到 —', 11, TXT.greenSoft, 'center');
    layer.add(foot);

    const back = button(this, SCREEN.x + SCREEN.w / 2 - 60, SCREEN.y + 364, {
      w: 120,
      h: 30,
      label: '返 回',
      size: 12,
      variant: 'outline',
      onClick: () => {
        layer.destroy(true);
        this.rulesLayer = undefined;
      }
    });
    layer.add(back);

    this.rulesLayer = layer;
  }
}
