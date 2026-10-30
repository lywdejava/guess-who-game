import Phaser from 'phaser';
import { H, W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

/**
 * 微信小游戏：由 weapp-adapter 注入全局 canvas / window，
 * 直接复用该 canvas 创建 Phaser 实例（不要自己 new Canvas）。
 * 浏览器调试：挂到 #game 容器，FIT 缩放预览。
 */
function isWeapp(): boolean {
  const g = globalThis as unknown as { wx?: unknown; canvas?: unknown };
  return typeof g.wx !== 'undefined' && !!g.canvas;
}

export function createGame(): Phaser.Game {
  const weapp = isWeapp();
  const g = globalThis as unknown as { canvas?: HTMLCanvasElement };

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: W,
    height: H,
    parent: weapp ? undefined : 'game',
    canvas: weapp ? g.canvas : undefined,
    backgroundColor: '#0b0d0c',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    autoFocus: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H
    },
    scene: [BootScene, MenuScene, GameScene, EndScene]
  };

  const game = new Phaser.Game(config);
  (window as unknown as { __phaser?: Phaser.Game }).__phaser = game;
  return game;
}

createGame();

// 浏览器调试入口：?scene=Game&diff=normal 直达场景（微信环境忽略）
if (!isWeapp()) {
  try {
    const q = new URLSearchParams(location.search);
    const target = q.get('scene');
    if (target) {
      const game = (window as unknown as { __phaser?: Phaser.Game }).__phaser;
      if (game) {
        game.scene.stop('Boot');
        game.scene.stop('Menu');
        game.scene.start(target, { diffKey: q.get('diff') || 'normal' });
      }
    }
  } catch {
    /* ignore */
  }
}
