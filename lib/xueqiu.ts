import axios from "axios";

interface DailyResponse {
  data: {
    column: string[],
    item: any[][]
  }
}

interface QuoteResponse {
  data: {
    quote: {
      name: string
    }
  }
}

interface SearchResponse {
  data: { code: string, query: string, stock_type: number, state: number }[]
}

type AssetInfo = {
  symbol: string,
  name: string,
  dailyReturns: number[],
  days: string[]
}

/**
 * to yyyy-MM-dd
 * @param d Date
 */
function dateToString(d: Date): string {
  const d2 = new Date(d.getTime())
  d2.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d2.toISOString().substring(0, 10)
}

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.43'

async function getXueqiuCookie() {
  const homeResponse = await axios.get(
    'https://xueqiu.com',
    {
      headers: {
        'User-Agent': userAgent,
        'Host': 'xueqiu.com',
        'Accept-Encoding': 'gzip'
      }
    })

  const setCookie = homeResponse.headers['set-cookie'] || [];
  return setCookie.map(it => it.split(';')[0]).join('; ');
}

async function search(keyword: string) {

  const cookie = await getXueqiuCookie();

  const url = `https://xueqiu.com/query/v1/suggest_stock.json?${new URLSearchParams({q: keyword}).toString()}`
  const response = await axios.get(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip',
        'Referer': 'https://xueqiu.com/',
        'Cookie': cookie
      }
    })

  const body = response.data as SearchResponse;
  const data = body.data

  // 13-etf/26-CSI/12-index/4-USetf
  return data
    .filter(el => el.stock_type === 13 || el.stock_type === 26 || el.stock_type === 12 || el.stock_type === 4)
    .filter(el => el.state === 1)
    .map(el => ({symbol: el.code, name: el.query}))
}

async function getName(symbol: string, referer: string, cookie: string): Promise<string> {

  const options: { [key: string]: any } = {
    symbol,
    extend: 'detail'
  }

  const url = `https://stock.xueqiu.com/v5/stock/quote.json?${new URLSearchParams(options).toString()}`
  const response = await axios.get(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip',
        'Referer': referer,
        'Cookie': cookie
      }
    })

  const body = response.data as QuoteResponse;
  const data = body.data

  return data.quote.name
}

async function getDailyItems(symbol: string, referer: string, cookie: string) {
  const dailyItems = []
  let begin = new Date().getTime()
  while (true) {
    const options: { [key: string]: any } = {
      symbol,
      begin,
      period: 'day',
      type: 'before',
      count: -1000,
      indicator: 'kline'
    }
    const url = `https://stock.xueqiu.com/v5/stock/chart/kline.json?${new URLSearchParams(options).toString()}`
    const response = await axios.get(
      url,
      {
        headers: {
          'User-Agent': userAgent,
          'Accept-Encoding': 'gzip',
          'Referer': referer,
          'Cookie': cookie
        }
      })

    const body = response.data as DailyResponse;
    const data = body.data

    const tsIndex = data.column.indexOf('timestamp')
    const percentIndex = data.column.indexOf('percent')

    const lastFetched = Object.values(data.item).map(it => ({
      dailyReturn: it[percentIndex] as number / 100.0,
      day: dateToString(new Date(it[tsIndex] as number))
    }))

    dailyItems.push(...lastFetched)

    if (lastFetched.length < 1000) {
      break
    }

    begin = data.item[0][tsIndex] - 86400 * 1000
  }

  return dailyItems.sort((a, b) => a.day.localeCompare(b.day))
}

async function getAssetDetail(symbol: string): Promise<AssetInfo> {

  const cookie = await getXueqiuCookie();
  const referer = 'https://xueqiu.com/S/' + symbol

  const name = await getName(symbol, referer, cookie);
  const dailyItems = await getDailyItems(symbol, referer, cookie);

  return {
    symbol,
    name,
    dailyReturns: dailyItems.map(it => it.dailyReturn),
    days: dailyItems.map(it => it.day)
  }
}

export default {getAssetDetail, search}
