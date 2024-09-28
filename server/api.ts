import express from "express"

import NodeCache from "node-cache"

import xueqiu from "./crawler/xueqiu"

const router = express.Router()

// noinspection JSIgnoredPromiseFromCall
xueqiu.initXueqiuCookie()

const cache = new NodeCache({stdTTL: 300, checkperiod: 120})
router.get('/asset/:symbol/detail', async (req, res, next) => {
  const symbol = req.params.symbol

  const cached = cache.get(symbol)
  if (cached) {
    res.json(cached)
  } else {
    const daily = await xueqiu.getAssetDetail(symbol)
    res.json(daily)
    //  cache
    cache.set(symbol, daily)
  }
})

router.get('/asset/search', async (req, res) => {

  const keyword = req.query.keyword

  const result = await xueqiu.search(keyword as string)

  res.json(result)
})

export default router
