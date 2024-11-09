import axios from "axios"

function parseJsonp(content: string) {
  return JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1))
}

async function getBondPage(page: number) {

  const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?callback=datatable377546`
    + `&reportName=RPTA_WEB_TREASURYYIELD&columns=ALL&sortColumns=SOLAR_DATE`
    + `&sortTypes=-1&token=894050c76af8597a853f5b408b759f5d&pageNumber=${page}`
    + `&pageSize=50&p=${page}&pageNo=${page}&pageNum=${page}&_=1728813571557`

  const response = await axios.get(url)
  return parseJsonp(response.data)
}

export async function getCnBond() {

  const page = 1;
  const page1 = await getBondPage(page);

  //  2,5,10,30
  //  'EMM00588704', 'EMM00166462', 'EMM00166466', 'EMM00166469'

  const pages = [page1.result.data]
  const totalPages = page1.result.pages as number
  for (let i = 1; i < totalPages; i++) {
    const pageI = await getBondPage(i + 1)
    pages.push(pageI.result.data)
  }

  const rows = pages.flatMap(e => e)
    .filter(r => r.EMM00166462 !== null && r.EMM00166462 !== undefined)
    .sort((a, b) => a.SOLAR_DATE.localeCompare(b.SOLAR_DATE))

  const days = rows.map(r => r.SOLAR_DATE.slice(0, 10))
  const returns = rows.map(r => r.EMM00166462 / 100.0 / 255)

  return {days, dailyReturns: returns}
}
