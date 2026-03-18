import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  let errors = [];
  page.on('console', msg => {
      if (msg.type() === 'error') {
          errors.push(`[CONSOLE ERROR] ${msg.text()}`);
          console.error(`[CONSOLE ERROR] ${msg.text()}`);
      }
  });
  
  page.on('pageerror', error => {
      errors.push(`[PAGE ERROR] ${error.message}`);
      console.error(`[PAGE ERROR] ${error.message}`);
  });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    if (errors.length === 0) {
        console.log("No errors found!");
    }
  } catch (e) {
    console.error(`[NAVIGATION ERROR] ${e.message}`);
  } finally {
    await browser.close();
  }
})();
