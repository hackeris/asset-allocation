import AssetInfo from "./AssetInfo"
import covariance from "compute-covariance"

export interface RiskAnalysis {
  totalRisk: number,
  risks: number[]
}

function multiply(a: number[][], b: number[][]): number[][] {
  const aRows = a.length
  const aCols = a[0].length
  const bCols = b[0].length
  const result: number[][] = new Array(aRows)
  for (let r = 0; r < aRows; ++r) {
    const row = new Array(bCols)
    result[r] = row
    const ar = a[r]
    for (let c = 0; c < bCols; ++c) {
      let sum = 0.
      for (let i = 0; i < aCols; ++i) {
        sum += ar[i] * b[i][c]
      }
      row[c] = sum
    }
  }
  return result
}

export function riskModel(weights: number[], cov: number[][]): RiskAnalysis {

  const variance = multiply(
    multiply([weights], cov),
    weights.map(r => [r])
  )

  const totalRisk = Math.sqrt(variance[0][0]) * Math.sqrt(252)

  const risks = weights.map((w, i) => {
    return totalRisk * w * cov[i].reduce((acc, c, j) => acc + c * weights[j], 0.0) / variance[0][0]
  })

  return {
    totalRisk,
    risks
  }
}

export function historicalRiskModel(weights: number[],
                                    assets: AssetInfo[],
                                    back: number): RiskAnalysis {
  const cov = covariance(assets.map(a => {
    return a.dailyReturns.slice(Math.max(0, a.dailyReturns.length - back))
  }))
  return riskModel(weights, cov)
}
