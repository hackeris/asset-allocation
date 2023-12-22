import {last} from 'lodash'
import alignAssets from './alignAssets'

import covariance from 'compute-covariance'
import AssetInfo from "./AssetInfo";
import {Options as MinVarOptions} from "./minimalVariance";

export interface TestingResult {
  days: string[],
  assets: AssetInfo[],
  holdings: number[][],
  dailyReturns: number[],
  series: number[],
  benchmarkName: string,
  benchmark: number[],
  annualized: number,
  sharpe: number,
  volatility: number,
  last: number[]
}

function cumulative(returns: number[]): number[] {
  const result = [returns[0]]
  for (let i = 1; i < returns.length; i++) {
    result.push((result[result.length - 1] + 1) * (returns[i] + 1) - 1)
  }
  return result
}

function annualize(returns: number[]): number {
  const cum = returns.map(r => 1 + r).reduce((a, b) => a * b, 1.0)
  return Math.pow(cum, 252 / returns.length) - 1
}

function variance(returns: number[]): number {
  const cov = covariance([returns])
  return cov[0][0]
}

function std(returns: number[]): number {
  const v = variance(returns)
  return Math.sqrt(v)
}

function sharpe(returns: number[]): number {
  const s = std(returns)
  return returns.reduce((a, b) => a + b, 0.0) / returns.length / s * Math.sqrt(252)
}

function volatility(returns: number[]): number {
  const s = std(returns)
  return s * Math.sqrt(252)
}

function backTesting(assets: AssetInfo[],
                     benchmark: AssetInfo,
                     weightMethod: (assets: AssetInfo[], day: string) => number[],
                     options: MinVarOptions): TestingResult {
  //  align returns
  const aligned = alignAssets([benchmark, ...assets])

  benchmark = aligned[0]
  assets = aligned.slice(1)

  const days = aligned[0].days

  const holdings: number[][] = []
  const lastWeight: number [] = assets.map(a => 0.0)
  const returns: number[] = []
  for (let di = 0; di < days.length; di += 1) {
    //  each returns
    const holdingReturns = lastWeight
      .map((w, a) => w * assets[a].dailyReturns[di])
    const dailyReturn = holdingReturns.reduce((a, b) => a + b, 0)
    returns.push(dailyReturn)

    let newHolding
    if (di === 0 || di % 53 === 0) {
      const maybeNewHolding = weightMethod(assets, days[di])
      const turnover = maybeNewHolding
        .map((h, i) => Math.abs(lastWeight[i] - h))
        .reduce((a, b) => a + b, 0)
      if (turnover > options.turnoverConstraint) {
        newHolding = maybeNewHolding
      }
    }

    newHolding = newHolding ||
      holdingReturns.map((r, ai) => (1 + r / lastWeight[ai]) * lastWeight[ai] / (1 + dailyReturn))

    lastWeight.splice(0, lastWeight.length)
    lastWeight.push(...newHolding)

    holdings.push(newHolding)
  }

  const series = cumulative(returns)

  return {
    days,
    assets,
    holdings,
    dailyReturns: returns,
    series,
    benchmarkName: benchmark.name,
    benchmark: cumulative(benchmark.dailyReturns),
    annualized: annualize(returns),
    sharpe: sharpe(returns),
    volatility: volatility(returns),
    last: weightMethod(assets, last(days) as string)
  }
}

export default backTesting
