const express = require('express')
const xueqiu = require('../lib/xueqiu')

const router = express.Router()

router.get('/asset/:symbol/daily', async function (req, res, next) {
  const daily = await xueqiu.getDailyLine(req.params.symbol)
  res.json(daily)
})

module.exports = router
