import AssetCandidate from "./AssetCandidate"

async function searchAsset(keyword: string): Promise<AssetCandidate[]> {

  const body = await fetch(`/api/asset/search?keyword=${keyword}`).then(res => res.json())

  return body.map((el: { symbol: string; name: string; }) => ({symbol: el.symbol, name: el.name}))
}

export default searchAsset
