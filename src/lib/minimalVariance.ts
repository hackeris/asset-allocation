import qp from 'quadprog'
import {transpose} from 'lodash-transpose'
import covariance from 'compute-covariance'
import AssetInfo from "./AssetInfo"
import {Options, round} from "./modelCommon"

function pretend(array: number[][] | number[]) {
  if (array[0] instanceof Array) {
    const arr = array as number[][]
    arr.forEach(a => a.unshift(0))
    arr.unshift([])
  } else {
    const arr = array as number[]
    arr.unshift(0)
  }
  return array
}

function minimalVarianceOptimizer(options: Options) {
  const {minWeight, maxWeight} = options
  return (assets: AssetInfo[], day: string): number[] => {

    const dayIndex = assets[0].days.indexOf(day)
    if (dayIndex < 20) {
      return assets.map(a => 1.0 / assets.length)
    }

    const covStart = Math.max(dayIndex - (options.back || 60), 0)
    const history = assets.map(a => a.dailyReturns.slice(covStart, dayIndex))

    const Dmat = pretend(
      covariance(history)
    ) as number[][]
    const dvec = pretend(
      assets.map(a => 0)
    ) as number[]

    const Amat = pretend(transpose(
      [
        assets.map(a => 1.0),
        ...assets.map((a, i) => assets.map((aa, j) => i === j ? 1 : 0)),
        ...assets.map((a, i) => assets.map((aa, j) => i === j ? -1 : 0))
      ]
    )) as number[][]
    const bvec = pretend(
      [
        1.0,
        ...assets.map(a => minWeight),
        ...assets.map(a => -maxWeight)
      ]
    ) as number[]

    const result = qp.solveQP(Dmat, dvec, Amat, bvec, 1)
    return round(result.solution.slice(1))
  }
}

export default minimalVarianceOptimizer
