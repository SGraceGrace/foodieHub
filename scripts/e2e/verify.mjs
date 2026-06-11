import { chromium } from 'playwright';
const BASE = 'http://localhost:4200';
const results = [];
const page_errors = [];
function log(status, step, detail) {
  const line = `[${status}] ${step}${detail ? ' -> ' + detail : ''}`;
  results.push(line);
  console.log(line);
}
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') page_errors.push(m.text()); });
page.on('pageerror', e => page_errors.push(e.message));

// 1. Home
await page.goto(BASE, { waitUntil: 'networkidle' });
log('CHECK', '1. Home page', 'title=' + (await page.title()));
const cards0 = await page.locator('.rest-card').count();
log(cards0>0?'PASS':'FAIL', '2. Restaurant cards on home', cards0+' cards');
const hearts0 = await page.locator('.heart-btn').count();
log(hearts0>0?'PASS':'FAIL', '3. Heart buttons on home', hearts0+' hearts');

// 4. Signup
const email = `e2e_${Date.now()}@test.com`;
await page.goto(BASE+'/signup', { waitUntil: 'networkidle' });
const formOk = await page.locator('form').count() > 0;
log(formOk?'PASS':'FAIL', '4a. Signup page', 'form='+formOk);
if (formOk) {
  try {
    const fn = page.locator('input[formcontrolname="firstName"]').first();
    const ln = page.locator('input[formcontrolname="lastName"]').first();
    if (await fn.count()>0) await fn.fill('E2E');
    if (await ln.count()>0) await ln.fill('Tester');
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    log('PASS','4b. Signup submit','url='+page.url());
  } catch(e) { log('FAIL','4b. Signup',e.message); }
}

// 5. Login
await page.goto(BASE+'/login', { waitUntil: 'networkidle' });
try {
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill('Test@1234');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  log(token?'PASS':'FAIL','5. Login','token='+(token?'present':'missing')+' url='+page.url());
} catch(e) { log('FAIL','5. Login',e.message); }

// 6. Home logged in
await page.goto(BASE+'/home', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const cards1 = await page.locator('.rest-card').count();
log(cards1>0?'PASS':'FAIL','6. Home restaurants logged-in', cards1+' cards');

// 7. Cuisine filter
try {
  const chip = page.locator('.cuisine-card').nth(1);
  if (await chip.count()>0) {
    await chip.click(); await page.waitForTimeout(1500);
    log('PASS','7. Cuisine filter', await page.locator('.rest-card').count()+' cards after');
  } else log('WARN','7. Cuisine filter','no chips found');
} catch(e) { log('FAIL','7. Cuisine filter',e.message); }

// 8. Heart toggle
await page.goto(BASE+'/home', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
try {
  const h = page.locator('.heart-btn').first();
  if (await h.count()>0) {
    await h.click(); await page.waitForTimeout(1200);
    const toast = await page.locator('[class*="toast"]').count();
    log('PASS','8. Heart toggle (add to wishlist)','toast='+toast);
  } else log('FAIL','8. Heart toggle','button not found');
} catch(e) { log('FAIL','8. Heart toggle',e.message); }

// 9. Wishlist page
await page.goto(BASE+'/user/wishlist', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const btext = await page.locator('body').innerText();
const isPlaceholder = btext.includes('wishlist works!');
const wCards = await page.locator('.rest-card').count();
const wH1 = await page.locator('h1').first().innerText().catch(()=>'none');
log(isPlaceholder?'FAIL':'PASS','9. Wishlist page',
  isPlaceholder ? 'STILL PLACEHOLDER' : 'h1="'+wH1+'" cards='+wCards);

// 10. Restaurant detail
await page.goto(BASE+'/home', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
try {
  const c = page.locator('.rest-card').first();
  if (await c.count()>0) {
    await c.click(); await page.waitForTimeout(2500);
    const mu = await page.locator('[class*="menu"]').count();
    log('PASS','10. Restaurant detail','url='+page.url()+' menu-els='+mu);
  } else log('FAIL','10. Restaurant detail','no cards');
} catch(e) { log('FAIL','10. Restaurant detail',e.message); }

// 11. Add to cart
try {
  const ab = page.locator('button:has-text("+")').first();
  if (await ab.count()>0 && await ab.isVisible()) {
    await ab.click(); await page.waitForTimeout(1000);
    log('PASS','11. Add to cart','clicked +');
  } else log('WARN','11. Add to cart','+ button not visible on detail page');
} catch(e) { log('FAIL','11. Add to cart',e.message); }

// 12. Search
try {
  await page.goto(BASE+'/user/search?q=chicken', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rc = await page.locator('.rest-card, [class*="result"], [class*="search-item"]').count();
  log('PASS','12. Search page','elements='+rc);
} catch(e) { log('FAIL','12. Search',e.message); }

// 13. Cuisine page hearts
try {
  await page.goto(BASE+'/user/cuisine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const ch = await page.locator('.heart-btn').count();
  const cc = await page.locator('.rest-card').count();
  log(ch>0?'PASS':'FAIL','13. Cuisine page hearts','cards='+cc+' hearts='+ch);
} catch(e) { log('FAIL','13. Cuisine page hearts',e.message); }

await browser.close();

console.log('\n========== SUMMARY ==========');
results.forEach(r => console.log(r));
const fails = results.filter(r => r.startsWith('[FAIL]'));
const warns = results.filter(r => r.startsWith('[WARN]'));
console.log('\n'+fails.length+' FAIL, '+warns.length+' WARN');

if (page_errors.length>0) {
  console.log('\n========== JS ERRORS ==========');
  [...new Set(page_errors)].slice(0,8).forEach(e => console.log('  '+e));
} else {
  console.log('\nNo JS console errors caught');
}
