import {last} from 'lodash'
import alignAssets from './alignAssets'

import covariance from 'compute-covariance'
import AssetInfo from "./AssetInfo";
import {Options as MinVarOptions} from "./minimalVariance";
import {annualize, cumulative, sharpe, volatility} from "./statistics";
import {historicalRiskModel, RiskAnalysis} from "./riskAnalysis";

interface Performance {
  days: string[],
  dailyReturns: number[],
  accumulativeReturns: number[],
  annualized: number,
  sharpe: number,
  volatility: number
}

export interface TestingResult {
  days: string[],
  assets: AssetInfo[],
  holdings: number[][],
  profolio: Performance,
  benchmark: Performance,
  benchmarkName: string,
  latest: number[],
  risk: RiskAnalysis
}

export type Period = 'quarterly' | 'semi_annually' | 'annually'

function shouldRebalance(i: number, period: Period): boolean {
  switch (period) {
    case "quarterly":
      return i % 53 === 0;
    case "semi_annually":
      return i % 126 === 0;
    case "annually":
      return i % 252 === 0;
  }
}

function slice(result: TestingResult, start: number): TestingResult {

  const days = result.days.slice(start)
  const assets = result.assets.map(a => ({
    name: a.name,
    symbol: a.symbol,
    dailyReturns: a.dailyReturns.slice(start),
    days: a.days.slice(start)
  }))
  const holdings = [assets.map(a => 0), ...result.holdings.slice(start + 1)]

  const dailyReturns = [0, ...result.profolio.dailyReturns.slice(start + 1)]
  const benchmarkDailyReturns = [0, ...result.benchmark.dailyReturns.slice(start + 1)]

  return {
    days,
    assets,
    holdings,
    profolio: {
      days,
      dailyReturns,
      accumulativeReturns: cumulative(dailyReturns),
      annualized: annualize(dailyReturns),
      volatility: volatility(dailyReturns),
      sharpe: sharpe(dailyReturns)
    },
    benchmark: {
      days,
      dailyReturns: benchmarkDailyReturns,
      accumulativeReturns: cumulative(benchmarkDailyReturns),
      annualized: annualize(benchmarkDailyReturns),
      volatility: volatility(benchmarkDailyReturns),
      sharpe: sharpe(benchmarkDailyReturns)
    },
    benchmarkName: result.benchmarkName,
    latest: result.latest,
    risk: result.risk
  }
}

function backTesting(assets: AssetInfo[],
                     benchmark: AssetInfo,
                     weightMethod: (assets: AssetInfo[], day: string) => number[],
                     period: Period,
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
    if (di === 0 || di === 20 || shouldRebalance(di, period)) {
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

  const lastWeights = weightMethod(assets, last(days) as string)
  const risk = historicalRiskModel(lastWeights, assets, options.back)

  return slice({
    days,
    assets,
    holdings,
    benchmarkName: benchmark.name,
    profolio: {
      days,
      dailyReturns: returns,
      accumulativeReturns: series,
      annualized: annualize(returns),
      sharpe: sharpe(returns),
      volatility: volatility(returns),
    },
    benchmark: {
      days,
      dailyReturns: benchmark.dailyReturns,
      accumulativeReturns: cumulative(benchmark.dailyReturns),
      annualized: annualize(benchmark.dailyReturns),
      sharpe: sharpe(benchmark.dailyReturns),
      volatility: volatility(benchmark.dailyReturns)
    },
    latest: lastWeights,
    risk
  }, 20)
}

export default backTesting
