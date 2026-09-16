const puppeteer = require('puppeteer');
const path = require('path');
const OUT = process.env.SHOT_DIR;
(async () => {
  const b = await puppeteer.launch({ headless: true, defaultViewport: { width: 1440, height: 940, deviceScaleFactor: 2 }, args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2', timeout: 90000 });

  // Homepage band
  let band = null;
  try {
    await p.waitForSelector('[aria-label="Active deals"] ul', { timeout: 25000 });
    band = await p.evaluate(() => {
      const s = document.querySelector('[aria-label="Active deals"]');
      const sec = s.closest('section');
      return { slides: s.querySelector('ul').children.length, heading: sec?.innerText.split('\n').slice(0, 3), firstCard: s.querySelector('li article').innerText.replace(/\n/g, ' | ') };
    });
  } catch { band = 'NOT FOUND'; }
  console.log('HOMEPAGE BAND:', JSON.stringify(band));
  if (band !== 'NOT FOUND') {
    await p.evaluate(() => document.querySelector('[aria-label="Active deals"]').closest('section').scrollIntoView({ block: 'center' }));
    await new Promise((r) => setTimeout(r, 800));
    await p.screenshot({ path: path.join(OUT, 'live-home-band.png') });
  }

  // Drawer
  await p.evaluate(() => localStorage.setItem('cart', JSON.stringify({ items: [{ id: '6a79d1335b52ca5a445b44b4', name: 'Sample Product', price: 400, quantity: 4, image: '', maxQuantity: 50 }], total: 1600, itemCount: 4, shippingCost: 0, tax: 0, discount: 0 })));
  await p.reload({ waitUntil: 'networkidle2' });
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Shopping Cart/i.test(x.getAttribute('aria-label') || '')).click());
  await p.waitForSelector('[aria-label="Deals in your cart"] ul', { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 1400));
  console.log('DRAWER:', JSON.stringify(await p.evaluate(() => {
    const panel = document.querySelector('[role="dialog"][aria-modal="true"]');
    return {
      railSlides: panel.querySelectorAll('[aria-label="Deals in your cart"] li').length,
      arrows: [...panel.querySelectorAll('[aria-label="Deals in your cart"] button')].map((x) => x.getAttribute('aria-label')),
      actionBar: [...panel.querySelectorAll('a,button')].map((n) => n.textContent.trim()).filter((x) => /View Cart|Clear Cart/i.test(x)),
      footer: [...panel.querySelector('footer').querySelectorAll('a,button')].map((n) => n.textContent.trim()),
    };
  })));
  await p.screenshot({ path: path.join(OUT, 'live-drawer.png'), clip: { x: 940, y: 0, width: 500, height: 940 } });
  await b.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
