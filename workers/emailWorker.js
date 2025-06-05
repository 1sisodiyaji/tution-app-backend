const { parentPort } = require('worker_threads');
const { sendEmail } = require('../utils/email');

parentPort.on('message', async (options) => {
  try {
    const result = await sendEmail(options);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
