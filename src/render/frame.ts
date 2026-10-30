import Phaser from 'phaser';
import { COLORS, H, SCREEN, W } from '../config';

/**
 * 画“暗室 + CRT 显示器”这套物理场景，所有页面共用，
 * 保证菜单 / 游戏 / 结算始终处在同一台机器里。
 */
export function drawRoom(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // 墙面
  g.fillGradientStyle(0x1c1f22, 0x1c1f22, 0x0d0f11, 0x0d0f11, 1);
  g.fillRect(0, 0, W, H);

  // 管道
  g.fillStyle(0x0e1113, 1);
  g.fillRect(0, 24, W, 11);
  g.fillStyle(0x262b30, 1);
  g.fillRect(0, 24, W, 2);
  g.fillRect(52, 20, 12, 19);
  g.fillRect(286, 20, 12, 19);
  g.fillStyle(0x101316, 1);
  g.fillRect(330, 24, 9, 150);

  // 墙面杂物：电箱 / 便签 / 划痕 / 指示灯
  g.fillStyle(0x15181b, 1);
  g.fillRect(12, 52, 44, 56);
  g.lineStyle(2, 0x262b30, 1);
  g.strokeRect(12, 52, 44, 56);
  g.fillStyle(0x0b0d0e, 1);
  for (let i = 0; i < 5; i++) g.fillRect(17, 60 + i * 9, 34, 4);

  g.fillStyle(0xb8b49a, 0.10);
  g.fillRect(20, 150, 30, 38);
  g.fillStyle(0x9fae8a, 0.08);
  g.fillRect(46, 196, 24, 32);

  g.lineStyle(2, 0x3a4046, 0.5);
  g.lineBetween(26, 330, 40, 344);
  g.lineBetween(40, 330, 26, 344);

  g.fillStyle(0xff3b30, 0.5);
  g.fillCircle(76, 126, 2.5);
  g.fillCircle(292, 168, 2.5);
  g.fillCircle(18, 470, 2);
  g.fillCircle(342, 300, 2);

  // 桌面
  g.fillStyle(0x1b1f22, 1);
  g.fillRect(0, 514, W, H - 514);
  g.fillStyle(0x363c42, 0.8);
  g.fillRect(0, 514, W, 2);
  g.fillStyle(0x121517, 0.9);
  g.fillRect(0, 600, W, 4);
}

/** 显示器外壳 + 屏幕 + 底座 */
export function drawMonitor(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // 外壳
  g.fillStyle(0x101315, 1);
  g.fillRoundedRect(4, 18, W - 8, 464, 16);
  g.fillStyle(COLORS.bezel, 1);
  g.fillRoundedRect(7, 20, W - 14, 458, 14);
  g.lineStyle(2, COLORS.bezelHi, 0.85);
  g.strokeRoundedRect(7, 20, W - 14, 458, 14);
  g.lineStyle(2, 0x14171a, 0.9);
  g.strokeRoundedRect(12, 25, W - 24, 446, 12);

  // 螺丝
  g.fillStyle(0x0d0f11, 1);
  [
    [16, 30],
    [W - 16, 30],
    [16, 466],
    [W - 16, 466]
  ].forEach(([x, y]) => g.fillCircle(x, y, 3));

  // 屏幕
  g.fillStyle(COLORS.screen, 1);
  g.fillRect(SCREEN.x - 4, SCREEN.y - 4, SCREEN.w + 8, SCREEN.h + 8);
  g.lineStyle(3, 0x080b09, 1);
  g.strokeRect(SCREEN.x - 4, SCREEN.y - 4, SCREEN.w + 8, SCREEN.h + 8);

  // 屏内底色（轻微绿色荧光）
  g.fillStyle(0x0c110c, 1);
  g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // 底座
  g.fillStyle(COLORS.bezel, 1);
  g.fillRoundedRect(44, 478, W - 88, 40, 6);
  g.lineStyle(2, COLORS.bezelHi, 0.7);
  g.strokeRoundedRect(44, 478, W - 88, 40, 6);

  g.fillStyle(0x0b0d0e, 1);
  for (let i = 0; i < 14; i++) g.fillRect(96 + i * 5, 490, 3, 14);
  g.fillRect(258, 492, 42, 12);

  // 红色指示灯
  g.fillStyle(COLORS.red, 0.9);
  g.fillCircle(66, 502, 4);
  g.fillCircle(82, 502, 4);
}

/** 屏幕内的扫描线底纹（CRT 管线之外的兜底装饰） */
export function drawScanlines(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.28);
  for (let y = SCREEN.y; y < SCREEN.y + SCREEN.h; y += 4) {
    g.fillRect(SCREEN.x, y, SCREEN.w, 2);
  }
  return g;
}
