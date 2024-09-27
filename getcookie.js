const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto('https://xueqiu.com');

  await page.waitForSelector('#app');

  const cookies = await page.cookies();

  fs.writeFileSync('./xueqiu_cookie.json', JSON.stringify(cookies, null, 2));

  const loadedCookies = JSON.parse(fs.readFileSync('./xueqiu_cookie.json'));
  console.log(loadedCookies);

  await browser.close();
})();
