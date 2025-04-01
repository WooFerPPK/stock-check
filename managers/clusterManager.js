const { Cluster } = require('puppeteer-cluster');
const config = require('../config');

async function launchCluster() {
    console.log('Launching new cluster');
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: config.maxConcurrency,
        timeout: config.taskTimeout,
        retryLimit: config.retryLimit,
        puppeteerOptions: config.puppeteerOptions,
    });
    
    return cluster;
}

module.exports = {
    launchCluster,
};