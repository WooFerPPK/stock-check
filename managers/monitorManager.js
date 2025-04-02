const { launchCluster } = require('./clusterManager');
const config = require('../config');
const { sendPushoverNotification } = require('../services/notificationService');
const ScraperFactory = require('../scrapers/scraperFactory');

// The URLs you want to monitor
const urls = [];

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
    
    if (stockResults.length === 0) {
        console.log('- Out of stock.');
        lastKnownStock.set(url, '');
    } else if (stockSignature !== lastSignature) {
        console.table(stockResults);
        const message = stockResults.map(entry => `• ${entry.store}: ${entry.stock}`).join('\n');
        await sendPushoverNotification(title, message);
        lastKnownStock.set(url, stockSignature);
    } else {
        console.log('- No change in stock.');
    }
}

// Configures the cluster task with common logic.
function configureClusterTask(cluster) {
    cluster.task(async ({ page, data: url }) => {
        await page.setUserAgent(USER_AGENT);
        await scrapePageTask(page, url);
    });
}

// Monitors a single URL in an infinite loop with a delay between checks.
async function monitorUrl(url, cluster) {
    while (true) {
        try {
            await cluster.execute(url);
        } catch (err) {
            console.error(`Error executing cluster task for ${url}:`, err.message);
        }
        const delay = getRandomDelay();
        console.log(`\nCompleted check for ${url}. Waiting ${delay / 1000}s...\n`);
        await sleep(delay);
    }
}

async function startMonitoring() {
    let cluster = await launchCluster();
    configureClusterTask(cluster);
    
    // Schedule each URL to run in its own loop, staggered by 10 seconds
    urls.forEach((url, index) => {
        setTimeout(() => monitorUrl(url, cluster), index * 10000);
    });
    
    // Periodically restart the cluster to clear stale state
    setInterval(async () => {
        console.log('Restarting browser cluster');
        await cluster.close();
        cluster = await launchCluster();
        configureClusterTask(cluster);
    }, config.restartIntervalMs);
}

module.exports = {
    startMonitoring,
};
