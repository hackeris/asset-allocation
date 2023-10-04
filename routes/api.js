const express = require('express')
const NodeCache = require('node-cache')
const xueqiu = require('../lib/xueqiu')

const router = express.Router()

const assetCache = new NodeCache({stdTTL: 300, checkperiod: 120})
router.get('/asset/:symbol/daily', async function (req, res, next) {
  const symbol = req.params.symbol

  const cached = assetCache.get(symbol)
  if (cached) {
    res.json(cached)
  }

  const daily = await xueqiu.getDailyLine(symbol)
  res.json(daily)

  //  cache
  assetCache.set(symbol, daily)
})

module.exports = router
