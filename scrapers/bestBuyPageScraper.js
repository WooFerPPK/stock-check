const BaseScraper = require('./baseScraper');
const config = require('../config');

class BestBuyScraper extends BaseScraper {
    async scrape(page, url) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: config.taskTimeout });
        } catch (err) {
            console.error(`Navigation error for Best Buy URL ${url}:`, err.message);
            return { title: 'Best Buy - Unknown', stockResults: [] };
        }
        
        const productTitle = await page.title();
        const shortTitle =
        productTitle.length > 40 ? productTitle.slice(0, 40) + '…' : productTitle;
        
        console.log(`\n🇺🇸 Checking Best Buy: ${productTitle}`);
        console.log(`URL: ${url}`);
        
        try {
            // Wait for the add-to-cart button
            await page.waitForSelector('[data-automation="addToCartButton"]', { timeout: 8000 });
            const isInStock = await page.evaluate(() => {
                const btn = document.querySelector('[data-automation="addToCartButton"]');
                return btn ? !btn.hasAttribute('disabled') : false;
            });
            
            const stockResults = isInStock ? [{ store: 'Best Buy', stock: 1 }] : [];
            return { title: shortTitle, stockResults };
        } catch (err) {
            console.error('Error in Best Buy scraper:', err.message);
            return { title: shortTitle, stockResults: [] };
        }
    }
}

module.exports = BestBuyScraper;