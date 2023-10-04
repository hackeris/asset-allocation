import {last} from 'lodash'
import alignAssets from '@/lib/align-assets'

const covariance = require('compute-covariance')

function cumulative (returns) {
  const result = [returns[0]]
  for (let i = 1; i < returns.length; i++) {
    result.push((result[result.length - 1] + 1) * (returns[i] + 1) - 1)
  }
  return result
}

function annualize (returns) {
  const cum = returns.map(r => 1 + r).reduce((a, b) => a * b, 1.0)
  return Math.pow(cum, 252 / returns.length) - 1
}

function variance (returns) {
  let cov = covariance([returns])
  return cov[0][0]
}

function std (returns) {
  let v = variance(returns)
  return Math.sqrt(v)
}

function sharpe (returns) {
  const s = std(returns)
  return returns.reduce((a, b) => a + b, 0.0) / returns.length / s * Math.sqrt(252)
}

function volatility (returns) {
  let s = std(returns)
  return s * Math.sqrt(252)
}

function backTesting (assets, benchmark, weightMethod, options) {
  //  align returns
  // {symbol, days, dailyReturns}
  const aligned = alignAssets([benchmark, ...assets])

  benchmark = aligned[0]
  assets = aligned.slice(1)

  const days = aligned[0].days

  const holdings = []
  const lastWeight = assets.map(a => 0.0)
  const returns = []
  for (let i = 0; i < days.length; i += 1) {
    //  each returns
    const holdingReturns = lastWeight
      .map((w, a) => w * assets[a].dailyReturns[i])
    const dailyReturn = holdingReturns.reduce((a, b) => a + b, 0)
    returns.push(dailyReturn)

    let newHolding
    if (i === 0 || i % 53 === 0) {
      const maybeNewHolding = weightMethod(assets, days[i])
      const turnover = maybeNewHolding
        .map((h, i) => Math.abs(lastWeight[i] - h))
        .reduce((a, b) => a + b, 0)
      if (turnover > (options.turnoverConstraint || 0.0)) {
        newHolding = maybeNewHolding
      }
    }

    newHolding = newHolding ||
      holdingReturns.map((r, ai) => (1 + r / lastWeight[ai]) * lastWeight[ai] / (1 + dailyReturn))

    lastWeight.splice(0, lastWeight.length)
    lastWeight.push(...newHolding)

    holdings.push(newHolding)
  }

  let series = cumulative(returns)

  return {
    days,
    assets,
    holdings: holdings,
    dailyReturns: returns,
    series: series,
    benchmark: cumulative(benchmark.dailyReturns),
    annualized: annualize(returns),
    sharpe: sharpe(returns),
    volatility: volatility(returns),
    last: weightMethod(assets, last(days))
  }
}

export default backTesting
