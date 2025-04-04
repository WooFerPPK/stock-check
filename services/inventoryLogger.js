const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs', 'inventory');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function logInventory({ url, title, stockResults }) {
  const timestamp = new Date().toISOString();
  const record = {
    timestamp,
    url,
    title,
    stockResults,
  };

  const filePath = path.join(LOG_DIR, `${timestamp.slice(0, 10)}.jsonl`);
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
}

module.exports = { logInventory };