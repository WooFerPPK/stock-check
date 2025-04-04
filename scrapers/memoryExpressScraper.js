const BaseScraper = require('./baseScraper');
const config = require('../config');

class MemoryExpressScraper extends BaseScraper {
  async scrape(page, url) {
    let shortTitle = 'Memory Express - Unknown';

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

      // Evaluate the DOM to find stock availability
      const stockResults = await page.evaluate(() => {
        const results = [];

        // 1) Check ONLINE STORE availability
        //    e.g. <span class="c-capr-inventory-store__availability InventoryState_InStock">10+</span>
        const onlineAvailability = document.querySelector(
          '.c-capr-inventory-selector__details-online .c-capr-inventory-store__availability'
        );
        if (onlineAvailability) {
          const onlineText = onlineAvailability.textContent.trim();

          // Check if it appears to be in stock (by class or by numeric text)
          // For Memory Express, "InStock" might appear in the parent class name
          // but we'll rely on the text to parse a numeric (e.g., "10+" or "8").
          let onlineCount = 0;
          if (/^\d+\+$/.test(onlineText)) {
            // If text is something like "10+", parse it as 10
            onlineCount = parseInt(onlineText, 10) || 10;
          } else {
            // Otherwise try to parse as a normal integer
            const maybeNum = parseInt(onlineText, 10);
            if (!isNaN(maybeNum)) {
              onlineCount = maybeNum;
            }
          }

          // If it's definitely in stock (> 0), add it
          if (onlineCount > 0) {
            results.push({ store: 'Online Store', stock: onlineCount });
          }
        }

        // 2) Check LOCAL STORES by region
        //    Each region has <li data-role="region" ...>, inside there are
        //    <div class="c-capr-inventory-store">
        //       <span class="c-capr-inventory-store__name">Etobicoke:</span>
        //       <span class="c-capr-inventory-store__availability InventoryState_InStock">8</span>
        //    </div>
        const storeDivs = document.querySelectorAll('.c-capr-inventory-region .c-capr-inventory-store');
        for (const div of storeDivs) {
          const storeNameSpan = div.querySelector('.c-capr-inventory-store__name');
          const availabilitySpan = div.querySelector('.c-capr-inventory-store__availability');
          if (!storeNameSpan || !availabilitySpan) continue;

          // Memory Express typically indicates inventory state via the class like "InventoryState_InStock"
          // and the text content is either "Coming Soon", "OutOfStock", a number, or "10+"
          const classList = availabilitySpan.className;
          if (!classList.includes('InventoryState_InStock')) {
            // If the class doesn't say 'InStock', skip it
            continue;
          }

          const storeName = storeNameSpan.textContent.trim().replace(':', '');
          const stockText = availabilitySpan.textContent.trim();

          let stockCount = 0;
          if (/^\d+\+$/.test(stockText)) {
            // For "10+", parseInt gives 10
            stockCount = parseInt(stockText, 10) || 10;
          } else {
            const maybeNum = parseInt(stockText, 10);
            if (!isNaN(maybeNum)) {
              stockCount = maybeNum;
            }
          }

          if (stockCount > 0) {
            results.push({ store: storeName, stock: stockCount });
          }
        }

        return results;
      });

      return { title: shortTitle, stockResults };
    } catch (err) {
      const isTimeout = err.message && err.message.includes('Navigation timeout');
      console.error(`❌ ${isTimeout ? 'Navigation timed out' : 'Scrape error'} for ${url}:`, err.message);
      return { title: shortTitle, stockResults: [] };
    }
  }
}

module.exports = MemoryExpressScraper;