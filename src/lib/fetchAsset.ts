import AssetInfo from "./AssetInfo";

async function fetchAsset(symbol: string): Promise<AssetInfo> {

  const body = await fetch(`/api/asset/${symbol}/daily`).then(res => res.json())

  return {
    symbol,
    name: body.name,
    dailyReturns: body.dailyReturns,
    days: body.days
  }
}

export default fetchAsset
