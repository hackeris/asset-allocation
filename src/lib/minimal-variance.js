const qp = require('quadprog')
const {transpose} = require('lodash-transpose')
const covariance = require('compute-covariance')

function pretend (array) {
  if (array[0] instanceof Array) {
    array.forEach(a => a.unshift([]))
    array.unshift([])
  } else {
    array.unshift(0)
  }
  return array
}

function minimalVarianceOptimizer (options) {
  const {minWeight, maxWeight} = options
  return function (assets, day) {
    const dayIndex = assets[0].days.indexOf(day)
    if (dayIndex < 20) {
      return assets.map(a => 1.0 / assets.length)
    }

    const covStart = Math.max(dayIndex - (options.back || 60), 0)
    const history = assets.map(a => a.dailyReturns.slice(covStart, dayIndex + 1))

    const Dmat = pretend(
      covariance(history)
    )
    const dvec = pretend(
      assets.map(a => 0)
    )

    const Amat = pretend(transpose(
      [
        assets.map(a => 1.0),
        ...assets.map((a, i) => assets.map((aa, j) => i === j ? 1 : 0)),
        ...assets.map((a, i) => assets.map((aa, j) => i === j ? -1 : 0))
      ]
    ))
    const bvec = pretend(
      [
        1.0,
        ...assets.map(a => minWeight),
        ...assets.map(a => -maxWeight)
      ]
    )
    const result = qp.solveQP(Dmat, dvec, Amat, bvec, 1)
    return result.solution.slice(1)
  }
}

export default minimalVarianceOptimizer
