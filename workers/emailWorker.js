const { sendEmail } = require('../utils/email');

process.on('message', async (options) => {
  try {
    const result = await sendEmail(options);
    process.send({ status: 'success', result });
  } catch (error) {
    process.send({ status: 'error', error: error.message });
  } finally {
    process.exit(0);
  }
});
