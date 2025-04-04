const CanadaComputersScraper = require('./canadaComputersScraper');
const BestBuyScraper = require('./bestBuyScraper');
const MemoryExpressScraper = require('./memoryExpressScraper');

class ScraperFactory {
  static getScraper(url) {
    if (url.includes('canadacomputers.com')) {
      return new CanadaComputersScraper();
    } else if (url.includes('bestbuy.ca')) {
      return new BestBuyScraper();
    } else if (url.includes('memoryexpress.com')) {
     return new MemoryExpressScraper();
    }

    // Return null or a default scraper if no match
    console.log(`No scraper implemented for URL: ${url}`);
    return null;
  }
}

module.exports = ScraperFactory;