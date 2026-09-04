export interface BpmScore {
  score: number;
  diff: number;
  percentDiff: number;
  isHalfDouble: boolean;
}

export function scoreBpm(fromBpm: number, toBpm: number): BpmScore {
  if (fromBpm <= 0 || toBpm <= 0) {
    return { score: 15, diff: Math.abs(fromBpm - toBpm), percentDiff: 0, isHalfDouble: false };
  }

  const rawDiff = Math.abs(fromBpm - toBpm);
  const halfDiff1 = Math.abs(fromBpm / 2 - toBpm);
  const halfDiff2 = Math.abs(fromBpm - toBpm / 2);
  const doubleDiff1 = Math.abs(fromBpm * 2 - toBpm);
  const doubleDiff2 = Math.abs(fromBpm - toBpm * 2);

  const effectiveDiff = Math.min(rawDiff, halfDiff1, halfDiff2, doubleDiff1, doubleDiff2);
  const roundedDiff = Math.round(effectiveDiff * 100) / 100;
  const isHalfDouble = effectiveDiff < rawDiff - 0.001;

  const percentDiff = Math.round((roundedDiff / fromBpm) * 1000) / 10;

  let score: number;
  if (roundedDiff <= 1) {
    score = 100;
  } else if (roundedDiff <= 2) {
    score = 90;
  } else if (roundedDiff <= 4) {
    score = 75;
  } else if (roundedDiff <= 6) {
    score = 55;
  } else if (roundedDiff <= 8) {
    score = 35;
  } else {
    score = 15;
  }

  return {
    score,
    diff: roundedDiff,
    percentDiff,
    isHalfDouble,
  };
}
