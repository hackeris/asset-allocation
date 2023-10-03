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

function backTesting (assets, weightMethod) {
  //  align returns
  // {symbol, days, dailyReturns}
  const aligned = alignAssets(assets)

  const days = aligned[0].days

  const intervals = []
  const lastWeight = []
  const returns = []
  for (let i = 0; i < days.length; i += 1) {
    //  each returns
    const holdingReturns = lastWeight
      .map((w, a) => w * aligned[a].dailyReturns[i])
    const dailyReturn = holdingReturns.reduce((a, b) => a + b, 0)
    returns.push(dailyReturn)

    let newHolding
    if (i === 0 || i % 53 === 0) {
      newHolding = weightMethod(aligned, days[i])
    } else {
      newHolding = holdingReturns.map((h, ai) => (1 + h) * lastWeight[ai] / (1 + dailyReturn))
    }
    lastWeight.splice(0, lastWeight.length)
    lastWeight.push(...newHolding)
  }

  let series = cumulative(returns)

  return {
    days,
    intervals,
    dailyReturns: returns,
    series: series,
    annualized: annualize(returns),
    sharpe: sharpe(returns),
    volatility: volatility(returns)
  }
}

export default backTesting
