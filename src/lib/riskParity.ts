import {riskModel} from "./riskAnalysis"

function riskContributions(weights: any[], cov: number[][]) {
  const riskResult = riskModel(weights, cov)
  return riskResult.risks.map(r => r / riskResult.totalRisk)
}

function riskParityObjective(weights: any[], cov: number[][]): number {
  const contributions = riskContributions(weights, cov)
  return contributions.map(ci => {
    return contributions.reduce((acc, cj) => acc + (ci - cj) * (ci - cj), 0)
  }).reduce((acc, cc) => acc + cc, 0)
}

function totalRiskObjective(weights: any[], cov: number[][]): number {
  const risk = riskModel(weights, cov)
  return risk.totalRisk
}

export function riskParityAndMinimalVariance(ratio: number): ((weights: any[], cov: number[][]) => number) {
  return (weights: any[], cov: number[][]) => {
    const rp = ratio
    const mv = 1 - ratio
    return rp * riskParityObjective(weights, cov) + mv * totalRiskObjective(weights, cov)
  }
}

export default riskParityObjective
