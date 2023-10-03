import {chain, range, last, first} from 'lodash'

// {
//   days: [],
//   dailyReturns: []
// }
function alignAssetsInternal (assets) {
  let days = chain(assets).map(a => a.days).flatten().uniq().sort((a, b) => a.localeCompare(b)).value()
  let result = assets.map(a => ({symbol: a.symbol, days: [], dailyReturns: []}))

  let cursors = range(assets.length).map(i => 0)
  for (let i = 0; i < days.length; i += 1) {
    let day = days[i]
    for (let j = 0; j < assets.length; j += 1) {
      let c = cursors[j]
      let asset = assets[j]
      let to = result[j]
      to.days.push(day)
      if (day < asset.days[c]) {
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

function alignAssets (assets) {
  const aligned = alignAssetsInternal(assets)

  //  intersect
  const beginDay = last(assets.map(a => first(a.days)).sort((a, b) => a.localeCompare(b)))
  const endDay = first(assets.map(a => last(a.days)).sort((a, b) => a.localeCompare(b)))
  return aligned.map(a => {
    const begin = a.days.indexOf(beginDay)
    const end = a.days.indexOf(endDay)
    return {
      symbol: a.symbol,
      days: a.days.slice(begin, end + 1),
      dailyReturns: a.dailyReturns.slice(begin, end + 1)
    }
  })
}

export default alignAssets
