import axios from "axios"
import fs from 'fs/promises'
import {getCookieByBrowser} from '../lib/cookie'
import path from "path"
import {Cookie} from "puppeteer"
import {getCnBond} from "./easymony";

interface DailyResponse {
  data: {
    column: string[],
    item: any[][]
  }
}

interface DailyReturn {
  dailyReturns: number[],
  days: string[]
}

interface QuoteResponse {
  data: {
    quote: {
      name: string
    }
  }
}

interface SearchResponse {
  data: {
    code: string,
    query: string,
    stock_type: number,
    state: number
  }[]
}

interface FundResponse {
  data: {
    fd_name: string,
    fd_full_name: string
  }
}

interface FundDailyResponse {
  data: {
    fund_nav_growth: {
      date: string,
      nav: string,
      percentage: string | null,
      value: string
    }[]
  }
}

interface PeResponse {
  data: {
    index_eva_pe_growths: {
      pe: number,
      ts: number
    }[]
  }
}

interface DailyPe {
  days: string[],
  pe: number[]
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
const cookieFile = path.join(process.cwd(), 'tmp/xueqiu_cookies.json')

export async function initXueqiuCookie(): Promise<Cookie[]> {
  const cookies = await getCookieByBrowser('https://xueqiu.com', '#app')
  await fs.writeFile(cookieFile, JSON.stringify(cookies, null, 2))
  return cookies
}

async function getXueqiuCookie() {

  // @ts-ignore
  const text: string = await fs.readFile(cookieFile, {flag: 'r'})
  const existCookies: Cookie[] = JSON.parse(text)

  const expire = existCookies.filter(c => c.expires && c.expires > 0)
    .map(c => c.expires)
    .reduce((a, b) => Math.min(a, b))
  const nowSeconds = new Date().getTime() / 1000
  if (expire > nowSeconds) {
    return existCookies.map(c => `${c.name}=${c.value}`).join('; ')
  }

  const cookies = await initXueqiuCookie()
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

async function getDanjuanCookie() {
  const homeResponse = await axios.get(
    'https://danjuanfunds.com/',
    {
      headers: {
        'User-Agent': userAgent,
        'Host': 'danjuanfunds.com',
        'Accept-Encoding': 'gzip'
      }
    })

  const setCookie = homeResponse.headers['set-cookie'] || []
  return setCookie.map(it => it.split(';')[0]).join('; ')
}

// 13-etf/26-CSI/12-index/4-USetf/23-fund
const STOCK_TYPES = [13, 26, 12, 4, 23]

async function search(keyword: string) {

  const cookie = await getXueqiuCookie()

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

  const body = response.data as SearchResponse
  const data = body.data

  // 13-etf/26-CSI/12-index/4-USetf/23-fund
  return data
    .filter(el => STOCK_TYPES.indexOf(el.stock_type) >= 0)
    .filter(el => el.state === 1)
    .map(el => ({symbol: el.code, name: el.query}))
}

async function getFundName(symbol: string, cookie: string): Promise<string> {

  const code = symbol.slice(1)

  const url = `https://danjuanfunds.com/djapi/fund/${code}`
  const response = await axios.get(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip',
        'Referer': `https://danjuanfunds.com/funding/${code}`,
        'Cookie': cookie
      }
    })

  const body = response.data as FundResponse
  const data = body.data

  return data.fd_name
}

async function getDailyPe(symbol: string, cookie: string): Promise<DailyPe> {

  const url = `https://danjuanfunds.com/djapi/index_eva/pe_history/${symbol}?day=all`
  const response = await axios.get(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip',
        'Referer': `https://danjuanfunds.com/dj-valuation-table-detail/${symbol}`,
        'Cookie': cookie
      }
    })

  const body = response.data as PeResponse
  const data = body.data

  return {
    days: data.index_eva_pe_growths.map(d => dateToString(new Date(d.ts))),
    pe: data.index_eva_pe_growths.map(e => e.pe)
  }
}

async function getFundDailyReturns(symbol: string, cookie: string): Promise<{ day: string, dailyReturn: number }[]> {

  const code = symbol.slice(1)
  const url = `https://danjuanfunds.com/djapi/fund/growth/${code}?day=all`
  const response = await axios.get(
    url,
    {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip',
        'Referer': `https://danjuanfunds.com/funding/${code}`,
        'Cookie': cookie
      }
    })

  const body = response.data as FundDailyResponse
  const data = body.data

  return data.fund_nav_growth.map((it, i) => {
    const dailyReturn = i === 0 ? 0
      : (parseFloat(it.value) + 1) / (parseFloat(data.fund_nav_growth[i - 1].value) + 1) - 1
    return ({
      dailyReturn,
      day: it.date
    })
  })
}

async function getName(symbol: string, cookie: string): Promise<string> {

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
        'Referer': `https://xueqiu.com/S/${symbol}`,
        'Cookie': cookie
      }
    })

  const body = response.data as QuoteResponse
  const data = body.data

  return data.quote.name
}

async function getDailyReturns(symbol: string, cookie: string): Promise<{ day: string, dailyReturn: number }[]> {

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
          'Referer': `https://xueqiu.com/S/${symbol}`,
          'Cookie': cookie
        }
      })

    const body = response.data as DailyResponse
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

  if (symbol.startsWith("F")) {
    const cookie = await getDanjuanCookie()
    const name = await getFundName(symbol, cookie)
    const dailyItems = await getFundDailyReturns(symbol, cookie)
    return {
      symbol,
      name,
      dailyReturns: dailyItems.map(it => it.dailyReturn),
      days: dailyItems.map(it => it.day)
    }
  } else {
    const cookie = await getXueqiuCookie()
    const name = await getName(symbol, cookie)
    const dailyItems = await getDailyReturns(symbol, cookie)
    return {
      symbol,
      name,
      dailyReturns: dailyItems.map(it => it.dailyReturn),
      days: dailyItems.map(it => it.day)
    }
  }
}

function movingAverage(series: number[], n: number) {
  return series.map((e, i) => {
    const slice = series.slice(Math.max(i - n, 0), i + 1);
    return slice.reduce((a, el) => a + el, 0) / n
  })
}

function mean(series: number[]) {
  return series.reduce((a, e) => a + e, 0.0) / series.length;
}

async function getExpectedDailyReturn(symbol: string, type: string): Promise<DailyReturn> {

  if (type === 'pe') {
    const cookie = await getDanjuanCookie()
    const dailyPe = await getDailyPe(symbol, cookie)

    const originalYields = dailyPe.pe.map(e => 1.0 / e / 255.0)

    const dailyReturns = movingAverage(originalYields, 60);
    return {dailyReturns, days: dailyPe.days}

  } else if (type === 'cnbond') {

    return await getCnBond()

  } else if (type === 'history') {

    const detail = await getAssetDetail(symbol)

    const average = mean(detail.dailyReturns)

    return {days: detail.days, dailyReturns: detail.dailyReturns.map(e => average)}
  }

  throw new Error('Not implemented')
}

export default {getAssetDetail, getExpectedDailyReturn, search, initXueqiuCookie}
