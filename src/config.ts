import type { DiffConfig, DiffKey } from './core/types';

/** 设计分辨率（竖屏 9:16），所有布局坐标以此为准 */
export const W = 360;
export const H = 640;

/** 显示器屏幕区域（屏内所有 UI 的父坐标系） */
export const SCREEN = { x: 24, y: 38, w: 312, h: 416 };

/**
 * 难度参数（已用蒙特卡洛标定）：
 * 情报总数必须 >= 2K+3，否则“至多 K 条假话”几乎不产生信息。
 * 统一 10 次猜测机会（底部进度条共 10 格，格满即失败）。
 */
export const DIFFS: Record<DiffKey, DiffConfig> = {
  easy: { key: 'easy', name: '入门', label: '无谎言', K: 0, init: 3, buy: 2, guesses: 10, mult: 1.0 },
  normal: { key: 'normal', name: '普通', label: '一个谎言', K: 1, init: 4, buy: 2, guesses: 10, mult: 1.3 },
  hard: { key: 'hard', name: '困难', label: '两个谎言', K: 2, init: 5, buy: 3, guesses: 10, mult: 1.6 },
  hell: { key: 'hell', name: '地狱', label: '三个谎言', K: 3, init: 6, buy: 3, guesses: 10, mult: 2.0 }
};

export const DIFF_ORDER: DiffKey[] = ['easy', 'normal', 'hard', 'hell'];

/** 像素风配色（与设计稿一致：暗室 + 绿荧光 + 红警示） */
export const COLORS = {
  wall: 0x14171a,
  wallDark: 0x0d0f11,
  bezel: 0x2a2f34,
  bezelHi: 0x3c434a,
  bezelDark: 0x101315,
  screen: 0x0a0d0b,
  green: 0x9dff5a,
  greenDim: 0x4d7a2c,
  greenDeep: 0x22301a,
  ink: 0xe6ebe0,
  dim: 0x7b8a6c,
  red: 0xff4f46,
  amber: 0xffc95e
} as const;

export const TXT = {
  ink: '#e6ebe0',
  green: '#9dff5a',
  greenSoft: '#a5d97a',
  dim: '#7b8a6c',
  dimmer: '#55654a',
  red: '#ff8b80',
  amber: '#ffc95e'
} as const;

export const FONT_CN = '"SimSun","Songti SC","Noto Serif SC",serif';
export const FONT_MONO = '"Courier New",monospace';
