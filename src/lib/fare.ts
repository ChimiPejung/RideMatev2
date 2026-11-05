import { MAX_SEATS } from '../config';

/** Round-up integer division, so the group never collects less than the fare. */
export function ceilDiv(a: number, b: number) {
  return Math.ceil(a / Math.max(1, b));
}

export function farePerPerson(totalFare: number, riders: number) {
  if (totalFare <= 0) return 0;
  return ceilDiv(totalFare, riders);
}

/** The "what each rider pays" ladder, 1..MAX_SEATS riders. */
export function fareLadder(totalFare: number) {
  return Array.from({ length: MAX_SEATS }, (_, i) => ({
    riders: i + 1,
    each: farePerPerson(totalFare, i + 1),
  }));
}

export function formatNu(n: number) {
  return `Nu. ${n.toLocaleString('en-IN')}`;
}
