import type { Combo, Feedback, Guess, Hint, Secret } from './types';

export function maskOf(d: Combo): number {
  return (1 << d[0]) | (1 << d[1]) | (1 << d[2]) | (1 << d[3]);
}

/** 全部合法答案：10 × 9 × 8 × 7 = 5040 */
export const SPACE: Secret[] = (() => {
  const out: Secret[] = [];
  for (let a = 0; a < 10; a++)
    for (let b = 0; b < 10; b++) {
      if (b === a) continue;
      for (let c = 0; c < 10; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d < 10; d++) {
          if (d === a || d === b || d === c) continue;
          const combo: Combo = [a, b, c, d];
          out.push({ d: combo, mask: maskOf(combo) });
        }
      }
    }
  return out;
})();

/** 比较答案与探针，返回 { exact, present } */
export function evaluate(s: Secret, probe: Combo, pm: number): Feedback {
  let exact = 0;
  if (s.d[0] === probe[0]) exact++;
  if (s.d[1] === probe[1]) exact++;
  if (s.d[2] === probe[2]) exact++;
  if (s.d[3] === probe[3]) exact++;

  let bits = s.mask & pm;
  let common = 0;
  while (bits) {
    common += bits & 1;
    bits >>>= 1;
  }
  // 「数值」= 数字存在于答案的总数（不考虑位置、含位置对），恒有 present >= exact
  return { exact, present: common };
}

/**
 * 候选集过滤：玩家视角的唯一合法推理。
 * - 自己的猜测：反馈永远真实，必须完全吻合
 * - 情报：允许与之矛盾，但矛盾总数不得超过 K；被拆穿的假话直接作废
 */
export function filterSpace(hints: Hint[], guesses: Guess[], K: number): Secret[] {
  return SPACE.filter((s) => {
    for (let i = 0; i < guesses.length; i++) {
      const g = guesses[i];
      const r = evaluate(s, g.probe, g.pm);
      if (r.exact !== g.exact || r.present !== g.present) return false;
    }
    let contra = 0;
    for (let i = 0; i < hints.length; i++) {
      const h = hints[i];
      if (h.accused === 'lie') continue;
      const r = evaluate(s, h.probe, h.pm);
      if (r.exact !== h.exact || r.present !== h.present) {
        contra++;
        if (contra > K) return false;
      }
    }
    return true;
  });
}

export function sameCombo(a: Combo, b: Combo): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function comboKey(c: Combo): string {
  return `${c[0]}${c[1]}${c[2]}${c[3]}`;
}
