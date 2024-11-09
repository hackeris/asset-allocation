import AssetInfo from "./AssetInfo"
import {alignReturns} from "./alignAssets";

export async function fetchAsset(symbol: string, expectedSymbol?: string): Promise<AssetInfo> {

  const info = await fetch(`/api/asset/${symbol}/detail`).then(res => res.json())

  let expectedInfo: { days: string[], dailyReturns: number[] };
  if (expectedSymbol && !expectedSymbol.startsWith('0.')) {
    expectedInfo = await fetchExpected(expectedSymbol)
  } else {
    expectedInfo = {days: info.days, dailyReturns: (info.days as string[]).map(_ => 0.0)}
  }

  const aligned = alignReturns([info, expectedInfo]);
  const asset = aligned[0];
  const expected = aligned[1];

  return {
    symbol,
    name: info.name,
    dailyReturns: asset.dailyReturns,
    days: asset.days,
    expected: expected.dailyReturns
  }
}

async function fetchExpected(code: string): Promise<{ days: string[], dailyReturns: number[] }> {

  const fields = code.split('.')
  const symbol = fields[0]
  const type = fields[1]

  const body = await fetch(`/api/asset/${symbol}/expected?type=${type}`).then(res => res.json())

  return {...body}
}

export default fetchAsset
