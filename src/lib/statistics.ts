import covariance from "compute-covariance";

export function cumulative(returns: number[]): number[] {
  const result = [returns[0]]
  for (let i = 1; i < returns.length; i++) {
    result.push((result[result.length - 1] + 1) * (returns[i] + 1) - 1)
  }
  return result
}

export function annualize(returns: number[]): number {
  const cum = returns.map(r => 1 + r).reduce((a, b) => a * b, 1.0)
  return Math.pow(cum, 252 / returns.length) - 1
}

export function variance(returns: number[]): number {
  const cov = covariance([returns])
  return cov[0][0]
}

export function std(returns: number[]): number {
  const v = variance(returns)
  return Math.sqrt(v)
}

export function sharpe(returns: number[]): number {
  const s = std(returns)
  return returns.reduce((a, b) => a + b, 0.0) / returns.length / s * Math.sqrt(252)
}

export function volatility(returns: number[]): number {
  const s = std(returns)
  return s * Math.sqrt(252)
}
