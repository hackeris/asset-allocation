import covariance from "compute-covariance";
import AssetInfo from "./AssetInfo";
import {Options, round} from "./modelCommon";
import {riskModel} from "./riskAnalysis";

function riskContributions(weights: any[], cov: number[][]) {
  const riskResult = riskModel(weights, cov);
  return riskResult.risks.map(r => r / riskResult.totalRisk);
}

function riskParityObjective(weights: any[], cov: number[][]): number {
  const contributions = riskContributions(weights, cov);
  return contributions.map(ci => {
    return contributions.reduce((acc, cj) => acc + (ci - cj) * (ci - cj), 0)
  }).reduce((acc, cc) => acc + cc, 0)
}

export function optimizeByRiskParity(cov: number[][], minW: number, maxW: number) {

  const minIterate = 10;
  const maxIterate = 50000;

  let weights = Array(cov.length).fill(1 / cov.length);

  // Optimization loop
  const learningRate = 0.002;
  const tolerance = 0.0001;
  const delta = 0.00005;
  let diff = tolerance + 1;
  let iter = 0;

  while ((diff > tolerance || iter < minIterate) && iter < maxIterate) {

    const gradient = weights.map((w, i) => {

      const weightsPlus = weights.slice();
      weightsPlus[i] += delta;
      const weightsMinus = weights.slice();
      weightsMinus[i] -= delta;

      const objPlus = riskParityObjective(weightsPlus, cov);
      const objMinus = riskParityObjective(weightsMinus, cov);

      return (objPlus - objMinus) / (2 * delta);
    })

    // Update weights with constraints
    const lastWeights = weights.slice();
    weights = weights.map((weight, i) => {
      //  过早收敛，则增加学习率
      const dynamic = (iter < minIterate && diff < tolerance) ? 5 : 1;
      const lr = learningRate * (1 + Math.random()) * dynamic;
      const weightToBe = weight - lr * gradient[i];
      return Math.max(minW, Math.min(maxW, weightToBe));
    });

    // Apply constraints to ensure weights sum up to 1 and are within bounds
    const sumWeights = weights.reduce((sum, weight) => sum + weight, 0);
    weights = weights.map(weight => weight / sumWeights);

    // Calculate the difference in weights for convergence check
    diff = weights.reduce((acc, weight, i) => acc + Math.abs(weight - lastWeights[i]), 0);
    iter += 1;
  }

  return weights
}

function riskParityOptimizer(options: Options) {
  const {back} = options
  return (assets: AssetInfo[], day: string): number[] => {

    const dayIndex = assets[0].days.indexOf(day)
    if (dayIndex < 20) {
      return assets.map(a => 1.0 / assets.length)
    }
    const covStart = Math.max(dayIndex - (back || 60), 0)
    const history = assets.map(a => a.dailyReturns.slice(covStart, dayIndex + 1))

    const cov = covariance(history);
    const weights = optimizeByRiskParity(cov, options.minWeight, options.maxWeight);
    return round(weights);
  }
}

export default riskParityOptimizer
