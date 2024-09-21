import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import apiRouter from "./api";

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../build')))

const indexRouter = express.Router()
indexRouter.get('/', (req, res, next) => {
  res.render('index')
})

app.use('/', indexRouter)
app.use('/api', apiRouter)

export default app
