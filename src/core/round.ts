import { evaluate, filterSpace, sameCombo } from './board';
import { chooseProbe, makeLie, planLieSlots, probeMask } from './hints';
import { SPACE } from './board';
import type { AccuseState, Combo, DiffConfig, Feedback, Guess, Hint, ReviewItem, Secret, Summary } from './types';

/**
 * 一局游戏的完整状态机（纯逻辑，不依赖渲染层）。
 * 场景只负责把事件画出来。
 */
export class Round {
  readonly diff: DiffConfig;
  readonly secret: Secret;
  readonly K: number;

  hints: Hint[] = [];
  guesses: Guess[] = [];
  hintLeft: number;
  guessLeft: number;
  accLeft = 2;
  hintIndex = 0;

  bought = 0;
  wrongGuess = 0;
  correctAcc = 0;
  wrongAcc = 0;
  over = false;
  won = false;

  private lieSlots: number[];
  private readonly rand: () => number;
  private readonly startedAt = Date.now();

  constructor(diff: DiffConfig, rand: () => number = Math.random) {
    this.diff = diff;
    this.rand = rand;
    this.K = diff.K;
    this.secret = SPACE[Math.floor(rand() * SPACE.length)];
    this.hintLeft = diff.buy;
    this.guessLeft = diff.guesses;
    this.lieSlots = planLieSlots(diff.K, diff.init, diff.init + diff.buy, rand);

    // 开局情报：逐条生成，后一条基于前一条之后的候选空间
    for (let i = 0; i < diff.init; i++) this.dealHint();
  }

  candidates(): Secret[] {
    return filterSpace(this.hints, this.guesses, this.K);
  }

  private bannedProbes(): Set<string> {
    const set = new Set<string>();
    this.hints.forEach((h) => set.add(h.probe.join('')));
    this.guesses.forEach((g) => set.add(g.probe.join('')));
    return set;
  }

  private dealHint(): Hint {
    const candidates = this.candidates();
    const probe = chooseProbe(candidates, this.secret, this.bannedProbes(), this.rand);
    const pm = probeMask(probe);
    const truth = evaluate(this.secret, probe, pm);
    const isLie = this.lieSlots.indexOf(this.hintIndex) >= 0;
    const shown: Feedback = isLie ? makeLie(truth, this.rand) : truth;

    const hint: Hint = {
      probe,
      pm,
      exact: shown.exact,
      present: shown.present,
      isLie,
      truth,
      accused: null
    };
    this.hints.push(hint);
    this.hintIndex++;
    return hint;
  }

  buyHint(): Hint | null {
    if (this.over || this.hintLeft <= 0) return null;
    this.hintLeft--;
    this.bought++;
    return this.dealHint();
  }

  guess(combo: Combo): { win: boolean; feedback: Feedback | null } {
    if (this.over) return { win: false, feedback: null };
    const pm = probeMask(combo);
    const fb = evaluate(this.secret, combo, pm);

    if (sameCombo(combo, this.secret.d)) {
      this.won = true;
      this.over = true;
      return { win: true, feedback: fb };
    }

    this.guesses.push({ probe: combo, pm, exact: fb.exact, present: fb.present });
    this.wrongGuess++;
    this.guessLeft--;
    if (this.guessLeft <= 0) this.over = true;
    return { win: false, feedback: fb };
  }

  accuse(index: number): AccuseState {
    if (this.over || this.accLeft <= 0) return null;
    const h = this.hints[index];
    if (!h || h.accused) return null;

    this.accLeft--;
    if (h.isLie) {
      h.accused = 'lie';
      this.correctAcc++;
    } else {
      h.accused = 'truth';
      this.wrongAcc++;
    }
    return h.accused;
  }

  giveUp(): void {
    if (this.over) return;
    this.over = true;
    this.won = false;
  }

  elapsedSec(): number {
    return Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
  }

  summary(): Summary {
    const secs = this.elapsedSec();
    const d = this.diff;

    let score = 1000;
    score -= this.wrongGuess * 60;
    score -= this.bought * 90;
    score += this.correctAcc * 150;
    score -= this.wrongAcc * 100;
    score += Math.max(0, this.guessLeft) * 40;
    score += Math.max(0, 180 - secs);
    if (!this.won) score = Math.round(score * 0.3);
    score = Math.max(0, Math.round(score * d.mult));

    const rank = !this.won ? 'D' : score >= 1300 ? 'S' : score >= 1000 ? 'A' : score >= 700 ? 'B' : 'C';
    const lieTotal = this.hints.filter((h) => h.isLie).length;
    const lieFound = this.hints.filter((h) => h.isLie && h.accused === 'lie').length;

    const review: ReviewItem[] = [
      ...this.hints.map<ReviewItem>((h) => ({
        kind: 'hint',
        probe: h.probe,
        feedback: { exact: h.exact, present: h.present },
        isLie: h.isLie,
        truth: h.truth,
        accused: h.accused
      })),
      ...this.guesses.map<ReviewItem>((g) => ({
        kind: 'guess',
        probe: g.probe,
        feedback: { exact: g.exact, present: g.present }
      }))
    ];

    return {
      win: this.won,
      answer: this.secret.d,
      secs,
      guessesUsed: this.wrongGuess + (this.won ? 1 : 0),
      guessTotal: d.guesses,
      hintsUsed: this.hints.length,
      lieTotal,
      lieFound,
      wrongAcc: this.wrongAcc,
      score,
      rank,
      diffKey: d.key,
      diffName: d.name,
      mult: d.mult,
      review
    };
  }
}
