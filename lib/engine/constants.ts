/** Engine constants — Kickoff Pack §C.5/§C.8 [LOCKED defaults]. The Method page renders these. */
export const SCALES = {
  o2Pts: 2.0,          // percentage points of O2 per unit
  pressureRatio: 1.25, // one unit = a 25% pressure change (log scale)
  flowCmS: 5.0,        // cm/s per unit
} as const;
export type Scales = { o2Pts: number; pressureRatio: number; flowCmS: number };

export const AXIS_WEIGHTS = { o2: 1, pressure: 1, flow: 1 } as const;
export type AxisWeights = { o2: number; pressure: number; flow: number };

export const VERDICT_THRESHOLDS = { direct: 1.0, near: 2.5 } as const;

export const RANK_WEIGHTS = { P: 0.4, H: 0.2, S: 0.15, C: 0.15, M: 0.1 } as const;
export type RankWeights = { P: number; H: number; S: number; C: number; M: number };

export const SCALE_SCORE = { large: 1.0, bench: 0.6, ground: 0.4 } as const;

export const UNIT = {
  KPA_PER_PSIA: 6.894757,
  KPA_PER_ATM: 101.325,
  KPA_PER_BAR: 100,
  KPA_PER_MMHG: 0.133322,
  KPA_PER_MBAR: 0.1,
} as const;

export const ROBUSTNESS_FACTORS = [0.5, 1, 2] as const;
