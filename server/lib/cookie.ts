import puppeteer, {Cookie} from "puppeteer";

export async function getCookieByBrowser(url: string, selectorToWait: string): Promise<Cookie[]> {

  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto(url);

  await page.waitForSelector(selectorToWait);

  const cookies = await page.cookies();
  await browser.close();

  return cookies;
}
