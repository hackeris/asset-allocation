import {riskModel} from "./riskAnalysis"

function riskContributions(weights: any[], cov: number[][]) {
  const riskResult = riskModel(weights, cov)
  return riskResult.risks.map(r => r / riskResult.totalRisk)
}

function riskParityObjective(weights: any[], expected: number[], cov: number[][]): number {
  const contributions = riskContributions(weights, cov)
  return contributions.map(ci => {
    return contributions.reduce((acc, cj) => acc + (ci - cj) * (ci - cj), 0)
  }).reduce((acc, cc) => acc + cc, 0)
}

function totalRiskObjective(weights: any[], expected: number[], cov: number[][]): number {
  const risk = riskModel(weights, cov)
  return risk.totalRisk
}

export function riskParityAndMinimalVariance(ratio: number): ((weights: number[], expected: number[], cov: number[][]) => number) {
  return (weights: number[], expected: number[], cov: number[][]) => {
    const rp = ratio
    const mv = 1 - ratio
    return rp * riskParityObjective(weights, expected, cov) + mv * totalRiskObjective(weights, expected, cov)
  }
}

export function maximizeSharp(weights: number[], expected: number[], cov: number[][]) {
  const volatility = totalRiskObjective(weights, expected, cov)
  const expectedReturn = weights
    .map((w, i) => w * expected[i])
    .reduce((a, e) => a + e, 0)
  return -expectedReturn / volatility
}

export default riskParityObjective
