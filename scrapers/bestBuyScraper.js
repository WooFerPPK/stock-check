const axios = require('axios');
const https = require('https');
const BaseScraper = require('./baseScraper');

function parseSkuFromUrl(url) {
  // Matches the last group of digits in the URL path.
  const match = url.match(/\/(\d+)(?:[/?]|$)/);
  return match ? match[1] : null;
}

class BestBuyScraper extends BaseScraper {
  /**
   * Scrapes product availability using the Best Buy API.
   * Expects a full product URL as the second parameter, from which the SKU will be extracted.
   */
  async scrape(page, url) {
    // Extract SKU from the URL (which is the second parameter)
    const sku = parseSkuFromUrl(url);
    if (!sku) {
      console.error(`Unable to parse SKU from URL: ${url}`);
      return { title: 'Best Buy - Unknown SKU', stockResults: [] };
    }

    console.log(`\n Checking Best Buy for SKU: ${sku}`);
    // Create an HTTPS agent (adjust options as needed)
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    try {
      const response = await axios.get(
        `https://www.bestbuy.ca/ecomm-api/availability/products?skus=${sku}&accept-language=en-CA`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          httpsAgent,
          timeout: 5000,
        }
      );

      // Retrieve product details from the API response
      const productData = response.data?.availabilities?.[0] || {};
      const productTitle = productData.productTitle || `Best Buy SKU ${sku}`;
      const shortTitle = productTitle.length > 40 ? productTitle.slice(0, 40) + '…' : productTitle;
      const availability = productData.availabilityStatus;
      const isInStock = availability === 'IN_STOCK';

      const stockResults = isInStock ? [{ store: 'Best Buy', stock: 1 }] : [];
      return { title: shortTitle, stockResults };

    } catch (error) {
      console.error(`Error checking Best Buy API for SKU ${sku}:`, error.message);
      return { title: `Best Buy SKU ${sku}`, stockResults: [] };
    }
  }
}

module.exports = BestBuyScraper;