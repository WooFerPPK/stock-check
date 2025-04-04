const { launchCluster } = require('./clusterManager');
const config = require('../config');
const { sendPushoverNotification } = require('../services/notificationService');
const ScraperFactory = require('../scrapers/scraperFactory');
const { logInventory } = require('../services/inventoryLogger');

// The URLs you want to monitor
const urls = [];

// Global cluster instance so that all monitors reference the same cluster.
let cluster;

// Global navigation timeout counter and threshold.
let navigationTimeoutCount = 0;
const NAVIGATION_TIMEOUT_THRESHOLD = 3;

// A flag to prevent concurrent cluster restarts.
let isRestarting = false;

// Keep track of the last known stock signature for each URL
const lastKnownStock = new Map();

// Define a constant for the user agent to avoid duplication
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

function stringifyStock(results) {
  return results.map(entry => `${entry.store}:${entry.stock}`).join('|');
}

function getRandomDelay() {
  return config.baseDelay + Math.floor(Math.random() * config.jitter);
}

// A helper function to pause execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePageTask(page, url) {
  const scraper = ScraperFactory.getScraper(url);
  if (!scraper) return;

  const { title, stockResults } = await scraper.scrape(page, url);
  const stockSignature = stringifyStock(stockResults);
  const lastSignature = lastKnownStock.get(url);

  if (stockSignature !== lastSignature) {
    // ✅ Only log inventory if the stock has changed
    logInventory({ url, title, stockResults });

    if (stockResults.length === 0) {
      console.log('- Out of stock.');
      lastKnownStock.set(url, '');
    } else {
      console.table(stockResults);
      const message = stockResults.map(entry => `• ${entry.store}: ${entry.stock}`).join('\n');
      await sendPushoverNotification(title, message);
      lastKnownStock.set(url, stockSignature);
    }
  } else {
    console.log('- No change in stock.');
  }
}

// Configures the cluster task with common logic.
function configureClusterTask(cluster) {
  cluster.task(async ({ page, data: url }) => {
    try {
      await page.setUserAgent(USER_AGENT);
      await scrapePageTask(page, url);
    } catch (err) {
      console.error(`Error processing ${url}:`, err.message);
    } finally {
      // Ensure the page is properly closed after task execution.
      // This is an extra safeguard; many cluster libraries auto-release pages.
      if (!page.isClosed()) {
        await page.close();
      }
    }
  });
}

// Monitors a single URL in an infinite loop with a delay between checks.
async function monitorUrl(url) {
  while (true) {
    try {
      await cluster.execute(url);
      // Reset timeout count on success.
      navigationTimeoutCount = 0;
    } catch (err) {
      console.error(`Error executing cluster task for ${url}:`, err.message);
      if (err.message && err.message.includes('Navigation timeout')) {
        navigationTimeoutCount++;
        console.warn(`Navigation timeouts count: ${navigationTimeoutCount}`);
        if (navigationTimeoutCount >= NAVIGATION_TIMEOUT_THRESHOLD && !isRestarting) {
          isRestarting = true;
          console.log('Too many navigation timeouts – restarting cluster now...');
          await cluster.close();
          // Wait a moment to let Chrome processes exit
          await sleep(2000);
          cluster = await launchCluster();
          configureClusterTask(cluster);
          navigationTimeoutCount = 0;
          isRestarting = false;
        }
      } else {
        // Reset count if error is not a navigation timeout.
        navigationTimeoutCount = 0;
      }
    }
    const delay = getRandomDelay();
    console.log(`\nCompleted check for ${url}. Waiting ${delay / 1000}s...\n`);
    await sleep(delay);
  }
}

async function startMonitoring() {
  cluster = await launchCluster();
  configureClusterTask(cluster);

  // Start monitoring for all URLs concurrently.
  urls.forEach(url => {
    // No need to await: each monitor runs concurrently.
    monitorUrl(url).catch(err => 
      console.error(`Error monitoring ${url}:`, err.message)
    );
  });

  // Periodically restart the cluster to clear stale state.
  setInterval(async () => {
    console.log('Periodic restart: Restarting browser cluster');
    await cluster.close();
    // Wait a moment to ensure Chrome processes have closed.
    await sleep(2000);
    cluster = await launchCluster();
    configureClusterTask(cluster);
  }, config.restartIntervalMs);
}

// Graceful shutdown: close cluster on process exit
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  await cluster.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  await cluster.close();
  process.exit(0);
});

module.exports = {
  startMonitoring,
};