export type Rng = () => number;

export const createRng = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type NormalArgs = { rng: Rng; mean: number; sigma: number; min: number; max: number };

export const sampleNormal = ({ rng, mean, sigma, min, max }: NormalArgs): number => {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const v = mean + z * sigma;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

type IntArgs = { rng: Rng; min: number; max: number };

export const sampleInt = ({ rng, min, max }: IntArgs): number =>
  Math.floor(rng() * (max - min + 1)) + min;
