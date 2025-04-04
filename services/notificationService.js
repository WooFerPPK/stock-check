require('dotenv').config();
const axios = require('axios');

const PUSHOVER_USER_KEY = process.env.PUSHOVER_USER_KEY;
const PUSHOVER_API_TOKEN = process.env.PUSHOVER_API_TOKEN;

if (!PUSHOVER_USER_KEY || !PUSHOVER_API_TOKEN) {
  console.error('Missing Pushover credentials. Check your .env file.');
  process.exit(1);
}

async function sendPushoverNotification(title, message) {
  try {
    await axios.post('https://api.pushover.net/1/messages.json', {
      token: PUSHOVER_API_TOKEN,
      user: PUSHOVER_USER_KEY,
      title,
      message,
    });
    console.log(`📲 Pushover alert sent: ${title}`);
  } catch (err) {
    console.error('Failed to send Pushover notification:', err.message);
  }
}

module.exports = {
  sendPushoverNotification,
};