const CanadaComputersScraper = require('./canadaComputersScraper');
const BestBuyScraper = require('./bestBuyScraper');

class ScraperFactory {
    static getScraper(url) {
        if (url.includes('canadacomputers.com')) {
            return new CanadaComputersScraper();
        } else if (url.includes('bestbuy.ca')) {
            return new BestBuyScraper();
        }
        
        // Return null or a default scraper if no match
        console.log(`No scraper implemented for URL: ${url}`);
        return null;
    }
}

module.exports = ScraperFactory;