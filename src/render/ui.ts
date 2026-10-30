import Phaser from 'phaser';
import { COLORS, FONT_CN, FONT_MONO, TXT } from '../config';

export type Origin = 'left' | 'center';

export function cnText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size = 12,
  color: string = TXT.ink,
  origin: Origin = 'left'
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT_CN,
    fontSize: `${size}px`,
    color
  });
  t.setOrigin(origin === 'center' ? 0.5 : 0, 0);
  t.setResolution(1);
  return t;
}

export function monoText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size = 12,
  color: string = TXT.ink,
  origin: Origin = 'left'
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT_MONO,
    fontSize: `${size}px`,
    color
  });
  t.setOrigin(origin === 'center' ? 0.5 : 0, 0);
  t.setResolution(1);
  return t;
}

/** 给文字加荧光感（Text.setShadow 在 WebGL / Canvas 下都可用） */
export function glowText(t: Phaser.GameObjects.Text, color = 'rgba(157,255,90,0.45)', blur = 6): void {
  t.setShadow(0, 0, color, blur, false, true);
}

/** 描边矩形 + 三层“辉光”外框，模拟设计稿里的绿光边 */
export function glowPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; fillAlpha?: number; stroke?: number; glow?: boolean; radius?: number } = {}
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const radius = opts.radius ?? 0;
  const fill = opts.fill ?? 0x0e140a;
  const fillAlpha = opts.fillAlpha ?? 0.65;

  if (opts.glow) {
    g.lineStyle(4, COLORS.green, 0.06);
    radius > 0 ? g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, radius + 3) : g.strokeRect(x - 3, y - 3, w + 6, h + 6);
    g.lineStyle(2, COLORS.green, 0.12);
    radius > 0 ? g.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, radius + 1) : g.strokeRect(x - 1, y - 1, w + 2, h + 2);
  }

  g.fillStyle(fill, fillAlpha);
  radius > 0 ? g.fillRoundedRect(x, y, w, h, radius) : g.fillRect(x, y, w, h);

  g.lineStyle(2, opts.stroke ?? COLORS.greenDim, opts.glow ? 0.95 : 0.6);
  radius > 0 ? g.strokeRoundedRect(x, y, w, h, radius) : g.strokeRect(x, y, w, h);
  return g;
}

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  size?: number;
  mono?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  onClick: () => void;
}

/** 返回以左上角为锚点的容器；按下有 2px 下沉反馈 */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ButtonOpts
): Phaser.GameObjects.Container {
  const { w, h } = opts;
  const variant = opts.variant ?? 'outline';
  const c = scene.add.container(x, y);

  const g = scene.add.graphics();
  if (variant === 'solid') {
    g.fillStyle(0x8fce3f, 1);
    g.fillRect(0, 3, w, h);
    g.fillStyle(0xb4e96a, 1);
    g.fillRect(0, 0, w, h - 2);
    g.lineStyle(2, 0xd9f9a0, 1);
    g.strokeRect(0, 0, w, h - 2);
  } else {
    g.fillStyle(0x0d140a, variant === 'ghost' ? 0.5 : 0.8);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, variant === 'ghost' ? 0x33461f : COLORS.greenDim, 0.8);
    g.strokeRect(0, 0, w, h);
  }
  c.add(g);

  const t = opts.mono
    ? monoText(scene, w / 2, h / 2 + (variant === 'solid' ? -1 : 0), opts.label, opts.size ?? 12, variant === 'solid' ? '#16240a' : TXT.greenSoft, 'center')
    : cnText(scene, w / 2, h / 2 + (variant === 'solid' ? -1 : 0), opts.label, opts.size ?? 12, variant === 'solid' ? '#16240a' : TXT.greenSoft, 'center');

  // 垂直居中：Text 以 top 为原点，手动补偿
  t.setOrigin(0.5, 0.5);
  t.setPosition(w / 2, h / 2 + (variant === 'solid' ? -1 : 0));
  c.add(t);

  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  // 触摸设备上手指轻移会导致 pointerup 不落在原对象上，统一改为“按下即触发”
  c.on('pointerdown', () => {
    c.setY(y + 2);
    opts.onClick();
  });
  c.on('pointerout', () => c.setY(y));
  c.on('pointerup', () => c.setY(y));
  return c;
}

/** 让相机挂上 CRT（不支持的平台静默跳过） */
export function tryCRT(camera: Phaser.Cameras.Scene2D.Camera): void {
  import('./crt').then((m) => m.applyCRT(camera)).catch(() => undefined);
}
