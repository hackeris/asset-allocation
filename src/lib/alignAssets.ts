import {chain, range, last, first} from 'lodash'
import AssetInfo from "./AssetInfo";

function alignAssetsInternal(assets: AssetInfo[]): AssetInfo[] {
  const days = chain(assets).map(a => a.days).flatten().uniq().sort((a, b) => a.localeCompare(b)).value()
  const result = assets.map((a): AssetInfo => ({symbol: a.symbol, name: a.name, days: [], dailyReturns: []}))

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

function alignAssets(assets: AssetInfo[]): AssetInfo[] {
  const aligned = alignAssetsInternal(assets)

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
      symbol: a.symbol,
      name: a.name,
      days: a.days.slice(begin, end + 1),
      dailyReturns: a.dailyReturns.slice(begin, end + 1)
    }
  })
}

export default alignAssets
