import {Options, round} from "./modelCommon"
import AssetInfo from "./AssetInfo"
import covariance from "compute-covariance"

export interface GDOptions {
  minIterate: number,
  maxIterate: number,
  learningRate: number,
  delta: number,
  tolerance: number,
  maxWeight: number,
  minWeight: number
}

export function gradientDescent(
  cov: number[][],
  objective: (weight: number[], cov: number[][]) => number,
  options: Partial<GDOptions>
) {

  const minIterate = options.minIterate || 5000
  const maxIterate = options.maxIterate || 50000
  const maxW = options.maxWeight || 1.0
  const minW = options.minWeight || 0.0

  const learningRate = options.learningRate || 0.002
  const tolerance = options.tolerance || 0.0001
  const delta = options.delta || 0.00005

  // Optimization loop
  let iter = 0
  let diff = tolerance + 1
  let weights = Array(cov.length).fill(1 / cov.length)
  while ((diff > tolerance || iter < minIterate) && iter < maxIterate) {

    const gradient = weights.map((w, i) => {

      const weightsPlus = weights.slice()
      weightsPlus[i] += delta
      const weightsMinus = weights.slice()
      weightsMinus[i] -= delta

      const objPlus = objective(weightsPlus, cov)
      const objMinus = objective(weightsMinus, cov)

      return (objPlus - objMinus) / (2 * delta)
    })

    // Update weights with constraints
    const lastWeights = weights.slice()
    weights = weights.map((weight, i) => {
      //  过早收敛，则增加学习率
      const dynamic = (iter < minIterate && diff < tolerance) ? 5 : 1
      const lr = learningRate * (1 + Math.random()) * dynamic
      const weightToBe = weight - lr * gradient[i]
      return Math.max(minW, Math.min(maxW, weightToBe))
    })

    // Apply constraints to ensure weights sum up to 1 and are within bounds
    const sumWeights = weights.reduce((sum, weight) => sum + weight, 0)
    weights = weights.map(weight => weight / sumWeights)

    // Calculate the difference in weights for convergence check
    diff = weights.reduce((acc, weight, i) => acc + Math.abs(weight - lastWeights[i]), 0)
    iter += 1
  }

  return weights
}

export function gradientDescentOptimizer(
  objective: (weight: number[], cov: number[][]) => number,
  options: Options,
  gdOptions: Partial<GDOptions>
) {
  const {back} = options
  return (assets: AssetInfo[], day: string): number[] => {

    const dayIndex = assets[0].days.indexOf(day)
    if (dayIndex < 20) {
      return assets.map(a => 1.0 / assets.length)
    }
    const covStart = Math.max(dayIndex - (back || 60), 0)
    const history = assets.map(a => a.dailyReturns.slice(covStart, dayIndex))

    const cov = covariance(history)
    const weights = gradientDescent(cov, objective, {
      ...gdOptions,
      minWeight: options.minWeight || gdOptions.minWeight,
      maxWeight: options.maxWeight || gdOptions.maxWeight
    })
    return round(weights)
  }
}

export default gradientDescentOptimizer
