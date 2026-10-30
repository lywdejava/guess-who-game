/** 四个位置、每位 0-9、互不重复 */
export type Combo = [number, number, number, number];

export interface Secret {
  d: Combo;
  /** 10 位数字掩码，用于 O(1) 求交集位数 */
  mask: number;
}

/**
 * 情报/猜测的反馈。
 * - exact：位置与数字都正确（「位置」）
 * - present：数字存在于答案中的总数，不考虑位置、含位置对（「数值」）
 *   恒有 present >= exact
 */
export interface Feedback {
  exact: number;
  present: number;
}

export type AccuseState = null | 'lie' | 'truth';

export interface Hint extends Feedback {
  probe: Combo;
  pm: number;
  /** 这条情报本身是否为假话（玩家不可见） */
  isLie: boolean;
  /** 真值，结算复盘时展示 */
  truth: Feedback;
  accused: AccuseState;
}

export interface Guess extends Feedback {
  probe: Combo;
  pm: number;
}

export interface DiffConfig {
  key: DiffKey;
  name: string;
  /** 菜单右侧副标题，如“一个谎言” */
  label: string;
  /** 假话上限 K（对外承诺“至多 K 条”） */
  K: number;
  /** 开局情报条数 */
  init: number;
  /** 可额外购买的情报条数 */
  buy: number;
  /** 猜测次数 */
  guesses: number;
  /** 得分倍率 */
  mult: number;
}

export type DiffKey = 'easy' | 'normal' | 'hard' | 'hell';

export interface ReviewItem {
  kind: 'hint' | 'guess';
  probe: Combo;
  feedback: Feedback;
  isLie?: boolean;
  truth?: Feedback;
  accused?: AccuseState;
}

export interface Summary {
  win: boolean;
  answer: Combo;
  secs: number;
  guessesUsed: number;
  guessTotal: number;
  hintsUsed: number;
  lieTotal: number;
  lieFound: number;
  wrongAcc: number;
  score: number;
  rank: string;
  diffKey: DiffKey;
  diffName: string;
  mult: number;
  review: ReviewItem[];
}
