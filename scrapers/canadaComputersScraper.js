const BaseScraper = require('./baseScraper');
const config = require('../config');

class CanadaComputersScraper extends BaseScraper {
    async scrape(page, url) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: config.taskTimeout });
        } catch (err) {
            console.error(`Navigation error for Canada Computers URL ${url}:`, err.message);
            return { title: 'Canada Computers - Unknown', stockResults: [] };
        }
        
        const productTitle = await page.title();
        const shortTitle =
        productTitle.length > 40 ? productTitle.slice(0, 40) + '…' : productTitle;
        
        console.log(`\n🇨🇦 Checking: ${productTitle}`);
        console.log(`URL: ${url}`);
        
        const hasStores = await page.$('#checkothertores');
        if (!hasStores) {
            console.log('- Element #checkothertores not found.');
            return { title: shortTitle, stockResults: [] };
        }
        
        const stockResults = await page.evaluate(() => {
            const results = [];
            const container = document.querySelector('#collapseON > .card-body');
            if (!container) return results;
            
            const rows = container.querySelectorAll(':scope > .row.align-items-center');
            for (const row of rows) {
                const spans = row.querySelectorAll('span');
                if (spans.length >= 2) {
                    const storeName = spans[0].textContent.trim();
                    const stockText = spans[1].textContent.trim();
                    const stockCount = parseInt(stockText, 10);
                    if (!isNaN(stockCount) && stockCount > 0) {
                        results.push({ store: storeName, stock: stockCount });
                    }
                }
            }
            return results;
        });
        
        return { title: shortTitle, stockResults };
    }
}

module.exports = CanadaComputersScraper;