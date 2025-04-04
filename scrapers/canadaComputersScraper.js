const BaseScraper = require('./baseScraper');
const config = require('../config');

const IGNORED_CITIES = [];

class CanadaComputersScraper extends BaseScraper {
  async scrape(page, url) {
    let shortTitle = 'Canada Computers - Unknown';

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.taskTimeout,
      });

      const productTitle = await page.title();
      shortTitle =
        productTitle.length > 40 ? productTitle.slice(0, 40) + '…' : productTitle;

      console.log(`\n🇨🇦 Checking: ${productTitle}`);
      console.log(`URL: ${url}`);

      const hasStores = await page.$('#checkothertores');
      if (!hasStores) {
        console.warn('- ❓ #checkothertores element not found — may be a different page layout.');
        return { title: shortTitle, stockResults: [] };
      }

      const stockResults = await page.evaluate((ignored) => {
        const results = [];
        const container = document.querySelector('#collapseON > .card-body');
        if (!container) return results;

        const rows = container.querySelectorAll(':scope > .row.align-items-center');
        for (const row of rows) {
          const spans = row.querySelectorAll('span');
          if (spans.length >= 2) {
            const storeName = spans[0].textContent.trim();
            const stockText = spans[1].textContent.trim();
            const storeKey = storeName.toLowerCase();
            const stockCount = parseInt(stockText, 10);

            if (!ignored.includes(storeKey) && !isNaN(stockCount) && stockCount > 0) {
              results.push({ store: storeName, stock: stockCount });
            }
          }
        }
        return results;
      }, IGNORED_CITIES);

      // Removed the explicit out-of-stock logging here.
      return { title: shortTitle, stockResults };
    } catch (err) {
      const isTimeout = err.message && err.message.includes('Navigation timeout');
      console.error(`❌ ${isTimeout ? 'Navigation timed out' : 'Scrape error'} for ${url}:`, err.message);
      return { title: shortTitle, stockResults: [] };
    }
  }
}

module.exports = CanadaComputersScraper;