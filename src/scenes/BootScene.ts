import Phaser from 'phaser';
import { installCRT } from '../render/crt';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    installCRT(this.game);
    this.scene.start('Menu');
  }
}
