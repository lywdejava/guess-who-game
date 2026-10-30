import type { DiffKey } from '../core/types';

const PREFIX = 'gw_best_';

interface WxLike {
  getStorageSync?: (k: string) => unknown;
  setStorageSync?: (k: string, v: unknown) => void;
}

function wxApi(): WxLike | null {
  const g = globalThis as unknown as { wx?: WxLike };
  return g.wx && typeof g.wx.getStorageSync === 'function' ? g.wx : null;
}

const memory = new Map<string, string>();

/** 微信原生本地缓存；浏览器调试时回退 localStorage / 内存 */
export const storage = {
  get(key: string): string | null {
    const wx = wxApi();
    try {
      if (wx?.getStorageSync) {
        const v = wx.getStorageSync(key);
        return v === '' || v === undefined || v === null ? null : String(v);
      }
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {
      /* ignore */
    }
    return memory.get(key) ?? null;
  },

  set(key: string, value: string): void {
    const wx = wxApi();
    try {
      if (wx?.setStorageSync) return wx.setStorageSync(key, value);
      if (typeof localStorage !== 'undefined') return localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    memory.set(key, value);
  },

  getBest(diff: DiffKey): number {
    return Number(this.get(PREFIX + diff) || 0);
  },

  /** 写入最高分，返回是否为新的纪录 */
  setBest(diff: DiffKey, score: number): boolean {
    const best = this.getBest(diff);
    if (score > best) {
      this.set(PREFIX + diff, String(score));
      return true;
    }
    return false;
  }
};
