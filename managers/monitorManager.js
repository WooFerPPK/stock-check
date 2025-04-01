const { launchCluster } = require('./clusterManager');
const config = require('../config');
const { sendPushoverNotification } = require('../services/notificationService');
const ScraperFactory = require('../scrapers/scraperFactory');

// The URLs you want to monitor
const urls = [];

// Keep track of the last known stock signature for each URL
const lastKnownStock = new Map();

function stringifyStock(results) {
    return results.map(entry => `${entry.store}:${entry.stock}`).join('|');
}

function getRandomDelay() {
    return config.baseDelay + Math.floor(Math.random() * config.jitter);
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

async function startMonitoring() {
    let cluster = await launchCluster();
    
    // Define the cluster task
    await cluster.task(async ({ page, data: url }) => {
        // Set a user-agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        );
        await scrapePageTask(page, url);
    });
    
    // Schedule each URL to run in its own loop
    urls.forEach((url, index) => {
        setTimeout(() => {
            (async function monitor() {
                while (true) {
                    try {
                        await cluster.execute(url);
                    } catch (err) {
                        console.error(`Error executing cluster task for ${url}:`, err.message);
                    }
                    const delay = getRandomDelay();
                    console.log(`\n🔄 Completed check for ${url}. Waiting ${delay / 1000}s...\n`);
                    await new Promise(res => setTimeout(res, delay));
                }
            })();
        }, index * 10000); // stagger each start by 10s
    });
    
    // Periodically restart the cluster to clear stale state
    setInterval(async () => {
        console.log('Restarting browser cluster');
        await cluster.close();
        cluster = await launchCluster();
        await cluster.task(async ({ page, data: url }) => {
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            );
            await scrapePageTask(page, url);
        });
    }, config.restartIntervalMs);
}

module.exports = {
    startMonitoring,
};