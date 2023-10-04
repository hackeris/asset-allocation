import express from "express";

import NodeCache from "node-cache";

import xueqiu from "./lib/xueqiu";

const router = express.Router()

const cache = new NodeCache({stdTTL: 300, checkperiod: 120})
router.get('/asset/:symbol/daily', async (req, res, next) => {
  const symbol = req.params.symbol

  const cached = cache.get(symbol)
  if (cached) {
    res.json(cached)
  } else {
    const daily = await xueqiu.getDailyLine(symbol)
    res.json(daily)
    //  cache
    cache.set(symbol, daily)
  }
})

export default router
