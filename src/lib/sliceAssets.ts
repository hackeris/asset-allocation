import AssetInfo from "./AssetInfo";

function sliceAssets(assets: AssetInfo[], start: string): AssetInfo[] {

  const tradingDay = assets[0].days.find(d => d >= start) as string

  return assets.map(a => {
    const from = a.days.indexOf(tradingDay)
    return {
      ...a,
      dailyReturns: a.dailyReturns.slice(from),
      days: a.days.slice(from)
    }
  });
}

export default sliceAssets
