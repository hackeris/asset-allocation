export interface Options {
  minWeight: number
  maxWeight: number
  turnoverConstraint: number
  back: number
}

export function round(weights: number[]): number[] {
  if (weights.length <= 0) {
    return weights
  }

  let min = 0
  for (let i = 0; i < weights.length; i += 1) {
    if (weights[i] < weights[min]) min = i
  }

  const rounded = weights.map(v => Math.round(v * 100) / 100)

  const sum = rounded.reduce((a, b) => a + b, 0)
  rounded[min] -= (sum - 1.0)

  return rounded
}
