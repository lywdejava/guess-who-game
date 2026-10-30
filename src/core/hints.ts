import { SPACE, comboKey, evaluate, maskOf } from './board';
import type { Combo, Feedback, Secret } from './types';

/** 确定性伪随机（可换种子，便于每日挑战 / 回放） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_POOL = 1100;
const PROBE_TRIES = 320;

/**
 * 选出信息熵最大的探针：让候选集在 (exact, present) 上分布最均匀。
 * 排除：答案本身、已用过的探针（情报或自己猜过）。
 */
export function chooseProbe(
  candidates: Secret[],
  secret: Secret,
  banned: Set<string>,
  rand: () => number
): Combo {
  let pool = candidates;
  if (pool.length > SAMPLE_POOL) {
    pool = [];
    for (let i = 0; i < SAMPLE_POOL; i++) pool.push(candidates[Math.floor(rand() * candidates.length)]);
  }

  let best: Combo | null = null;
  let bestH = -1;

  for (let t = 0; t < PROBE_TRIES; t++) {
    const p = SPACE[Math.floor(rand() * SPACE.length)];
    if (banned.has(comboKey(p.d)) || comboKey(p.d) === comboKey(secret.d)) continue;

    const counts = new Map<number, number>();
    for (let i = 0; i < pool.length; i++) {
      const r = evaluate(pool[i], p.d, p.mask);
      const key = r.exact * 5 + r.present;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let h = 0;
    const n = pool.length;
    counts.forEach((v) => {
      const q = v / n;
      h -= q * Math.log2(q);
    });
    if (h > bestH) {
      bestH = h;
      best = p.d;
    }
  }
  return best ?? [1, 2, 3, 4];
}

/**
 * 造一条假话：优先选“最接近真相”的假值。
 * 合法反馈域：exact ∈ [0,4]，present ∈ [exact, 4]（数值含位置对，恒 >= 位置）。
 */
export function makeLie(truth: Feedback, rand: () => number): Feedback {
  const opts: Array<{ f: Feedback; d: number }> = [];
  for (let e = 0; e <= 4; e++) {
    for (let p = e; p <= 4; p++) {
      if (e === truth.exact && p === truth.present) continue;
      opts.push({ f: { exact: e, present: p }, d: Math.abs(e - truth.exact) + Math.abs(p - truth.present) });
    }
  }
  opts.sort((a, b) => a.d - b.d);
  const min = opts[0].d;
  const near = opts.filter((o) => o.d <= min + 1);
  return near[Math.floor(rand() * near.length)].f;
}

/**
 * 安排假话位置：在 [0, total) 的情报槽里选 count 个。
 * 约束：开局情报里至少 1 条假话（机制必然发生）、至少 1 条真话（开局可解）。
 */
export function planLieSlots(count: number, init: number, total: number, rand: () => number): number[] {
  if (count <= 0) return [];
  for (let t = 0; t < 300; t++) {
    const idx = Array.from({ length: total }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const lies = idx.slice(0, count);
    const inInit = lies.filter((i) => i < init).length;
    if (inInit >= 1 && inInit <= init - 1) return lies;
  }
  return Array.from({ length: count }, (_, i) => i);
}

export function probeMask(p: Combo): number {
  return maskOf(p);
}
