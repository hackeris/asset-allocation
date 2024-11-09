import express from "express"

import NodeCache from "node-cache"

import xueqiu from "./crawler/xueqiu"

const router = express.Router()

// noinspection JSIgnoredPromiseFromCall
xueqiu.initXueqiuCookie()

const cache = new NodeCache({stdTTL: 300, checkperiod: 120})
router.get('/asset/:symbol/detail', async (req, res, next) => {
  const symbol = req.params.symbol

  const key = 'detail:' + symbol;
  const cached = cache.get(key)
  if (cached) {
    res.json(cached)
  } else {
    const daily = await xueqiu.getAssetDetail(symbol)
    res.json(daily)
    //  cache
    cache.set(key, daily)
  }
})

router.get('/asset/search', async (req, res) => {

  const keyword = req.query.keyword

  const result = await xueqiu.search(keyword as string)

  res.json(result)
})

router.get('/asset/:symbol/expected', async (req, res, next) => {

  const symbol = req.params.symbol
  const type = req.query.type as string

  const key = 'expected_returns:' + symbol;
  const cached = cache.get(key)
  if (cached) {
    res.json(cached)
  } else {
    const daily = await xueqiu.getExpectedDailyReturn(symbol, type)
    res.json(daily)
    //  cache
    cache.set(key, daily)
  }
})

export default router
