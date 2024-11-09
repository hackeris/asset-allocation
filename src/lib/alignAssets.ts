import {chain, range, last, first} from 'lodash'
import AssetInfo from "./AssetInfo"

function alignReturnsInternal(assets: { days: string[], dailyReturns: number[] }[]): {
  days: string[],
  dailyReturns: number[]
}[] {

  const days = chain(assets)
    .map(a => a.days)
    .flatten().uniq()
    .sort((a, b) => a.localeCompare(b))
    .value()

  const result = assets
    .map((a): { days: string[], dailyReturns: number[] } => ({days: [], dailyReturns: []}))

  const cursors = range(assets.length).map(i => 0)
  for (const day of days) {
    for (let j = 0; j < assets.length; j += 1) {
      const c = cursors[j]
      const asset = assets[j]
      const to = result[j]
      to.days.push(day)
      if (c === asset.days.length) {
        to.dailyReturns.push(0)
      } else if (day < asset.days[c]) {
        to.dailyReturns.push(0)
      } else if (day === asset.days[c]) {
        to.dailyReturns.push(asset.dailyReturns[c])
        cursors[j] += 1
      } else {
        throw new Error('should not get here')
      }
    }
  }
  return result
}

export function alignReturns(assets: { days: string[], dailyReturns: number[] }[]): {
  days: string[],
  dailyReturns: number[]
}[] {

  const aligned = alignReturnsInternal(assets)

  //  intersect
  const beginDay = last(
    assets.map(a => first(a.days) as string)
      .sort((a, b) => a.localeCompare(b))
  ) as string
  const endDay = first(
    assets.map(a => last(a.days) as string)
      .sort((a, b) => a.localeCompare(b))
  ) as string

  return aligned.map(a => {
    const begin = a.days.indexOf(beginDay)
    const end = a.days.indexOf(endDay)
    return {
      days: a.days.slice(begin, end + 1),
      dailyReturns: a.dailyReturns.slice(begin, end + 1)
    }
  })
}

export function alignAssets(assets: AssetInfo[]): AssetInfo[] {
  const aligned = alignReturns([
    ...assets,
    ...assets.map(a => ({days: a.days, dailyReturns: a.expected}))
  ])
  const assetReturns = aligned.slice(0, aligned.length / 2)
  const expectedReturns = aligned.slice(aligned.length / 2)
  return assetReturns.map((a, i) => {
    return {
      symbol: assets[i].symbol,
      name: assets[i].name,
      days: a.days,
      dailyReturns: a.dailyReturns,
      expected: expectedReturns[i].dailyReturns
    }
  })
}

export interface Material {
  benchmark: AssetInfo,
  assets: AssetInfo[],
  expected: {
    days: string[],
    dailyReturns: number[]
  }[]
}

export function alignAll(material: Material): Material {

  const series: {
    days: string[],
    dailyReturns: number[]
  }[] = [material.benchmark, ...material.assets, ...material.expected]

  const aligned = alignReturns(series)

  const benchmark = {
    ...material.benchmark,
    days: aligned[0].days,
    dailyReturns: aligned[0].dailyReturns
  }
  const assets = aligned.slice(1, 1 + material.assets.length + 1)
    .map((e, i) => ({
      ...material.assets[i],
      ...e
    }))
  const expected = aligned.slice(1 + material.assets.length)
    .map((e, i) => ({
      ...material.expected[i],
      ...e
    }))
  return {benchmark, assets, expected}
}

export default alignAssets
