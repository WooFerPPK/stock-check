class BaseScraper {
    /**
    * Override this method in subclasses to implement scraping logic.
    * @param {import('puppeteer').Page} page - Puppeteer Page object
    * @param {string} url - The URL to scrape
    * @returns {Promise<{ title: string, stockResults: Array<{ store: string, stock: number }> }>}
    */
    async scrape(page, url) {
        throw new Error('BaseScraper: scrape() must be implemented by subclass');
    }
}

module.exports = BaseScraper;