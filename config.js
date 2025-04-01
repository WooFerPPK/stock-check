module.exports = {
    maxConcurrency: 2, // How many pages to run at once.
    taskTimeout: 30000, // Timeout for each navigation
    retryLimit: 3, // Number of retires for cluster tasks
    baseDelay: 30000, // Delay between checks
    jitter: 20000, // Jitter the base delay
    restartIntervalMs: 20 * 60 * 1000, // Restart the cluster after X amount of time
  
    puppeteerOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    },
  };