const axios = require('axios')

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.43'

async function getDailyLine (symbol) {
  const homeResponse = await axios.get(
    'https://xueqiu.com',
    {
      headers: {
        'User-Agent': userAgent,
        'Host': 'xueqiu.com',
        'Accept-Encoding': 'gzip'
      }
    })

  const cookie = homeResponse.headers['set-cookie'].map(it => it.split(';')[0]).join('; ')
  const referer = 'https://xueqiu.com/S/' + symbol

  let dailyItems = []
  let begin = new Date().getTime()
  while (true) {
    const options = {
      symbol: symbol,
      begin: begin,
      period: 'day',
      type: 'before',
      count: -1000,
      indicator: 'kline'
    }
    let url = `https://stock.xueqiu.com/v5/stock/chart/kline.json?${new URLSearchParams(options).toString()}`
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

    const data = response.data.data

    const tsIndex = data.column.indexOf('timestamp')
    const percentIndex = data.column.indexOf('percent')

    const lastFetched = Object.values(data.item).map(it => ({
      dailyReturn: it[percentIndex] / 100.0,
      day: new Date(it[tsIndex]).toISOString().substring(0, 10)
    }))

    dailyItems.push(...lastFetched)

    if (lastFetched.length < 1000) {
      break
    }

    begin = data.item[0][tsIndex] - 86400 * 1000
  }

  dailyItems = dailyItems.sort((a, b) => a.day.localeCompare(b.day))
  return {
    symbol,
    dailyReturns: dailyItems.map(it => it.dailyReturn),
    days: dailyItems.map(it => it.day)
  }
}

module.exports = {getDailyLine}
