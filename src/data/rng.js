// Deterministic seeded PRNG (mulberry32) so mock data is stable across reloads.
export function mulberry32(seed) {
  let a = seed
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed = 20260101) {
  const rand = mulberry32(seed)
  return {
    float: () => rand(),
    int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    pickWeighted: (arr) => {
      // arr: [{ item, weight }]
      const total = arr.reduce((s, a) => s + a.weight, 0)
      let r = rand() * total
      for (const a of arr) {
        if (r < a.weight) return a.item
        r -= a.weight
      }
      return arr[arr.length - 1].item
    },
    bool: (probTrue = 0.5) => rand() < probTrue,
    round: (n, step = 1000) => Math.round(n / step) * step,
  }
}
