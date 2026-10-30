import { describe, expect, it } from 'vitest';
import { SPACE, comboKey, evaluate, filterSpace, maskOf } from '../src/core/board';
import { chooseProbe, makeLie, planLieSlots, mulberry32 } from '../src/core/hints';
import { Round } from '../src/core/round';
import { DIFFS } from '../src/config';
import type { Combo, Secret } from '../src/core/types';

const seed = mulberry32(20261030);

describe('反馈语义', () => {
  it('位置=位置+数值都对；数值=存在于答案中的数字总数（含位置对）', () => {
    const s: Secret = { d: [1, 2, 3, 4], mask: maskOf([1, 2, 3, 4]) };
    // 1 5 3 6：第 1、3 位全对；数值 = {1,3} 共 2 个
    expect(evaluate(s, [1, 5, 3, 6], maskOf([1, 5, 3, 6]))).toEqual({ exact: 2, present: 2 });
    // 9 8 7 6：全不含
    expect(evaluate(s, [9, 8, 7, 6], maskOf([9, 8, 7, 6]))).toEqual({ exact: 0, present: 0 });
    // 4 3 2 1：全部数字存在、全部位置错
    expect(evaluate(s, [4, 3, 2, 1], maskOf([4, 3, 2, 1]))).toEqual({ exact: 0, present: 4 });
  });

  it('用户示例：谜底 0519', () => {
    const s: Secret = { d: [0, 5, 1, 9], mask: maskOf([0, 5, 1, 9]) };
    // 0 9 1 3：位置 2（0、1），数值 3（0、9、1）
    expect(evaluate(s, [0, 9, 1, 3], maskOf([0, 9, 1, 3]))).toEqual({ exact: 2, present: 3 });
    // 3 6 7 9：位置 1（9），数值 1（仅 9）
    expect(evaluate(s, [3, 6, 7, 9], maskOf([3, 6, 7, 9]))).toEqual({ exact: 1, present: 1 });
  });
});

describe('密码空间', () => {
  it('5040 个不重复四位组合', () => {
    expect(SPACE.length).toBe(5040);
    const keys = new Set(SPACE.map((s) => comboKey(s.d)));
    expect(keys.size).toBe(5040);
  });
});

describe('假话机制', () => {
  it('假话必须与原值不同，且组合合法（present >= exact）', () => {
    for (let i = 0; i < 200; i++) {
      const t = { exact: i % 5, present: (i * 3) % 5 };
      const lie = makeLie(t, seed);
      expect(lie.present).toBeGreaterThanOrEqual(lie.exact);
      expect(lie.present).toBeLessThanOrEqual(4);
      expect(lie.exact === t.exact && lie.present === t.present).toBe(false);
    }
  });

  it('开局至少 1 假 1 真', () => {
    for (let i = 0; i < 100; i++) {
      const slots = planLieSlots(3, 6, 9, seed);
      expect(slots.length).toBe(3);
      const inInit = slots.filter((x) => x < 6).length;
      expect(inInit).toBeGreaterThanOrEqual(1);
      expect(inInit).toBeLessThanOrEqual(5);
    }
  });
});

describe('Round 状态机', () => {
  it('答案始终在候选集中（含假话与拆穿）', () => {
    const r = new Round(DIFFS.hell, seed);
    expect(r.candidates().some((s) => comboKey(s.d) === comboKey(r.secret.d))).toBe(true);
    r.buyHint();
    r.buyHint();
    expect(r.candidates().some((s) => comboKey(s.d) === comboKey(r.secret.d))).toBe(true);
    const lieIdx = r.hints.findIndex((h) => h.isLie);
    if (lieIdx >= 0) {
      r.accuse(lieIdx);
      expect(r.candidates().some((s) => comboKey(s.d) === comboKey(r.secret.d))).toBe(true);
    }
  });

  it('猜中即结束，且得分高于失败局', () => {
    const win = new Round(DIFFS.easy, seed);
    const res = win.guess(win.secret.d as Combo);
    expect(res.win).toBe(true);
    expect(win.over).toBe(true);

    const lose = new Round(DIFFS.easy, seed);
    lose.giveUp();
    expect(win.summary().score).toBeGreaterThan(lose.summary().score);
    expect(lose.summary().rank).toBe('D');
  });

  it('猜测耗尽则失败', () => {
    const r = new Round(DIFFS.easy, seed);
    let guard = 0;
    while (!r.over && guard++ < 20) {
      const wrong = SPACE.find((s) => comboKey(s.d) !== comboKey(r.secret.d))!;
      r.guess(wrong.d);
      if (r.guessLeft <= 0) break;
    }
    expect(r.over).toBe(true);
    expect(r.won).toBe(false);
  });
});

/** 完美玩家：每步挑“最坏分支最小”的猜测，反馈视为真实 */
function perfectSteps(round: Round, maxSteps = 14): number {
  let guesses: Array<{ probe: Combo; pm: number; exact: number; present: number }> = [];
  let cands = filterSpace(round.hints, guesses, round.K);

  for (let step = 0; step < maxSteps; step++) {
    if (cands.length === 1) {
      return comboKey(cands[0].d) === comboKey(round.secret.d) ? step + 1 : 999;
    }
    const pool = cands.length > 160 ? cands.slice(0, 160) : cands;
    let best: Secret | null = null;
    let bestWorst = Number.MAX_SAFE_INTEGER;

    for (let t = 0; t < 70; t++) {
      const p = t < 35 ? pool[Math.floor(seed() * pool.length)] : SPACE[Math.floor(seed() * SPACE.length)];
      const groups = new Map<number, number>();
      for (const c of pool) {
        const r = evaluate(c, p.d, p.mask);
        const k = r.exact * 5 + r.present;
        groups.set(k, (groups.get(k) || 0) + 1);
      }
      let worst = 0;
      groups.forEach((v) => {
        if (v > worst) worst = v;
      });
      if (worst < bestWorst) {
        bestWorst = worst;
        best = p;
      }
    }
    if (!best) return 999;

    const fb = evaluate(round.secret, best.d, best.mask);
    if (fb.exact === 4) return step + 1;
    guesses.push({ probe: best.d, pm: best.mask, exact: fb.exact, present: fb.present });
    cands = filterSpace(round.hints, guesses, round.K);
  }
  return 999;
}

describe('可解性（标定校验）', () => {
  (Object.keys(DIFFS) as Array<keyof typeof DIFFS>).forEach((key) => {
    it(`${DIFFS[key].name}：完美解不超过猜测配额`, () => {
      let worst = 0;
      for (let i = 0; i < 6; i++) {
        const round = new Round(DIFFS[key]);
        const steps = perfectSteps(round);
        expect(steps).toBeLessThanOrEqual(DIFFS[key].guesses);
        worst = Math.max(worst, steps);
      }
      expect(worst).toBeGreaterThan(0);
    });
  });
});

describe('情报选择', () => {
  it('探针不会等于答案、也不会重复', () => {
    const used = new Set<string>();
    const secret = SPACE[123];
    for (let i = 0; i < 5; i++) {
      const p = chooseProbe(SPACE, secret, used, seed);
      const key = comboKey(p);
      expect(key).not.toBe(comboKey(secret.d));
      expect(used.has(key)).toBe(false);
      used.add(key);
    }
  });
});
