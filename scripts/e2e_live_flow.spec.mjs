import { chromium } from 'playwright';

const base = process.env.TRYNEXT_BASE_URL || 'https://trynext.pages.dev';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const results = [];
const pass = (name, detail) => results.push({ name, status: 'PASS', detail });
const fail = (name, error) => results.push({ name, status: 'FAIL', detail: String(error) });

try {
  await page.goto(`${base}/product/premium-pullover-hoodie`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /^S$/ }).click();
  await page.getByRole('button', { name: /Select Navy color/ }).click();
  pass('product options', 'selected hoodie size S and Navy');

  const addButton = page.getByTestId('button-add-product-to-cart');
  await addButton.click();
  await page.waitForTimeout(800);
  if (!/Added to Bag/i.test(await addButton.innerText())) throw new Error('Add to Bag did not transition to Added to Bag');
  pass('cart addition', 'Add to Bag completed and button confirmed the item was added');

  const guardContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guardPage = await guardContext.newPage();
  await guardPage.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await guardPage.waitForTimeout(1500);
  if (!/\/cart/.test(guardPage.url())) throw new Error(`checkout guard did not return to cart: ${guardPage.url()}`);
  pass('checkout guard', `empty-cart checkout resolved to ${guardPage.url()}`);
  await guardContext.close();

  await page.goto(`${base}/design-studio?product=hoodie`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /^Back/ }).click();
  await page.getByRole('button', { name: /Select Navy/ }).click();
  await page.getByRole('button', { name: /3D Preview/i }).click();
  await page.waitForTimeout(1000);
  const studioText = await page.locator('body').innerText();
  if (!/Design Studio|Unisex Hoodie/i.test(studioText)) throw new Error('studio shell missing after interaction');
  pass('Design Studio V2', 'back face, Navy color, and 3D Preview interaction completed');
} catch (error) {
  fail('live flow', error);
} finally {
  console.log(JSON.stringify({ base, results }, null, 2));
  await browser.close();
  if (results.some((r) => r.status === 'FAIL')) process.exitCode = 1;
}
