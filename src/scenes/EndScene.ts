import Phaser from 'phaser';
import { COLORS, SCREEN, TXT } from '../config';
import type { Summary } from '../core/types';
import { applyCRT } from '../render/crt';
import { drawMonitor, drawRoom } from '../render/frame';
import { button, cnText, glowText, monoText } from '../render/ui';
import { storage } from '../platform/storage';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(data: { summary: Summary }): void {
    const s = data.summary;
    const isNewBest = storage.setBest(s.diffKey, s.score);

    drawRoom(this);
    drawMonitor(this);
    applyCRT(this.cameras.main);

    // 结论
    const v = cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 8, s.win ? '解 决' : '失 守', 20, s.win ? TXT.green : TXT.red, 'center');
    v.setFontStyle('bold');
    glowText(v, s.win ? 'rgba(157,255,90,0.45)' : 'rgba(255,79,70,0.35)', 8);

    cnText(
      this,
      SCREEN.x + SCREEN.w / 2,
      SCREEN.y + 34,
      s.win ? `CASE CLOSED / ${s.diffName}` : s.guessTotal && s.guessesUsed >= s.guessTotal ? '猜测次数耗尽' : '你主动放弃了这局',
      8,
      TXT.dimmer,
      'center'
    );

    // 答案
    cnText(this, SCREEN.x + SCREEN.w / 2, SCREEN.y + 52, '答 案', 9, TXT.dimmer, 'center');
    const bw = 40;
    const gap = 8;
    const total = bw * 4 + gap * 3;
    const startX = SCREEN.x + (SCREEN.w - total) / 2;
    s.answer.forEach((d, i) => {
      const x = startX + i * (bw + gap);
      const y = SCREEN.y + 66;
      const g = this.add.graphics();
      g.fillStyle(0x080c06, 0.9);
      g.fillRect(x, y, bw, 38);
      g.lineStyle(2, 0x6b5320, 1);
      g.strokeRect(x, y, bw, 38);
      monoText(this, x + bw / 2, y + 8, String(d), 20, TXT.amber, 'center');
    });

    // 数据
    const rows: Array<[string, string]> = [
      ['用时', this.fmt(s.secs)],
      ['猜测', `${s.guessesUsed} / ${s.guessTotal} 次`],
      ['情报', `${s.hintsUsed} 张 · 谎言 ${s.lieTotal} 条`],
      ['指认', `拆穿 ${s.lieFound} / ${s.lieTotal} · 误判 ${s.wrongAcc}`],
      ['难度', `${s.diffName} ×${s.mult.toFixed(1)}`],
      ['得分', `${s.score}  [${s.rank}]${isNewBest ? ' NEW' : ''}`]
    ];

    rows.forEach(([k, val], i) => {
      const y = SCREEN.y + 112 + i * 17;
      cnText(this, SCREEN.x + 4, y, k, 10, TXT.dim);
      const t = monoText(this, SCREEN.x + SCREEN.w - 4, y, val, 10, i === rows.length - 1 ? TXT.green : TXT.ink);
      t.setOrigin(1, 0);
      if (i === rows.length - 1) t.setFontSize(12);
    });

    // 复盘（可拖动）
    cnText(this, SCREEN.x + 4, SCREEN.y + 232, '情 报 复 盘（可拖动）', 8, TXT.dimmer);
    this.buildReview(s);

    // 按钮
    const by = SCREEN.y + 376;
    const w1 = 150;
    const w2 = SCREEN.w - w1 - 10;
    button(this, SCREEN.x + 4, by, {
      w: w1,
      h: 28,
      label: '我不服 · 再来',
      size: 12,
      variant: 'solid',
      onClick: () => this.scene.start('Game', { diffKey: s.diffKey })
    });
    button(this, SCREEN.x + 4 + w1 + 6, by, {
      w: w2,
      h: 28,
      label: '返回菜单',
      size: 11,
      variant: 'outline',
      onClick: () => this.scene.start('Menu')
    });
  }

  private buildReview(s: Summary): void {
    const vx = SCREEN.x + 4;
    const vy = SCREEN.y + 246;
    const vw = SCREEN.w - 8;
    const vh = 122;

    const list = this.add.container(vx, vy);

    s.review.forEach((item, i) => {
      const y = i * 20;
      const isLie = item.isLie === true;
      const bg = this.add.graphics();
      bg.fillStyle(isLie ? 0x1a0c0a : 0x0b1108, 0.75);
      bg.fillRect(0, y, vw, 18);
      bg.fillStyle(isLie ? 0x7a3028 : 0x33461f, 1);
      bg.fillRect(0, y, 2, 18);
      list.add(bg);

      const tag = item.kind === 'hint' ? `#${String(i + 1).padStart(2, '0')}` : 'G';
      const tagT = monoText(this, 6, y + 4, tag, 8, TXT.dimmer);
      list.add(tagT);

      const probe = monoText(this, 28, y + 4, item.probe.join(' '), 10, TXT.ink);
      list.add(probe);

      const fb = cnText(this, 104, y + 4, `位置${item.feedback.exact} 数值${item.feedback.present}`, 8.5, TXT.greenSoft);
      list.add(fb);

      let mark = '';
      let color: string = TXT.dimmer;
      if (item.kind === 'hint') {
        if (isLie) {
          mark = item.accused === 'lie' ? '谎言·已拆穿' : '谎言';
          color = TXT.red;
        } else {
          mark = '真话';
          color = TXT.greenSoft;
        }
      }
      if (mark) {
        const mt = cnText(this, vw - 6, y + 4, mark, 8, color);
        mt.setOrigin(1, 0);
        list.add(mt);
      }

      if (isLie && item.truth) {
        const truth = cnText(this, 200, y + 12, `真值 位置${item.truth.exact} 数值${item.truth.present}`, 7, TXT.dimmer);
        list.add(truth);
      }
    });

    const maskG = this.make.graphics({ x: 0, y: 0 });
    maskG.fillStyle(0xffffff);
    maskG.fillRect(vx, vy, vw, vh);
    maskG.setVisible(false);
    list.setMask(maskG.createGeometryMask());

    const maxScroll = Math.min(0, vh - s.review.length * 20);
    const zone = this.add.zone(vx, vy, vw, vh).setOrigin(0, 0);
    zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, vw, vh), Phaser.Geom.Rectangle.Contains);

    let dragging = false;
    let startY = 0;
    let baseY = 0;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true;
      startY = p.y;
      baseY = list.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      list.y = Phaser.Math.Clamp(baseY + (p.y - startY), maxScroll, 0);
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      list.y = Phaser.Math.Clamp(list.y - dy * 0.4, maxScroll, 0);
    });

    // 顶部/底部渐隐提示
    const fade = this.add.graphics();
    fade.fillStyle(0x0a0d0b, 0.85);
    fade.fillRect(vx, vy + vh - 8, vw, 8);
    fade.fillStyle(COLORS.screen, 0.5);
    fade.fillRect(vx, vy, vw, 1);
  }

  private fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
