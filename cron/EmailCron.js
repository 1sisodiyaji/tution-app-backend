const cron = require('node-cron');
const log = require('../config/logger');
const { keys, get, del, set } = require('../utils/cacheService');
const { transporter } = require('../utils/email');


async function RetryEmail() {
  const allKeys = keys();
  if (allKeys) {
    const failedEmailKeys = allKeys.filter((k) => k.startsWith('FAILED_EMAIL_'));
    for (const key of failedEmailKeys) {
      const retryData = get(key);
      if (!retryData) continue;

      const { to, subject, html, text, retries } = retryData;

      if (retries >= 3) {
        log.warn(`[MAX RETRIES REACHED]: ${key}, deleting from cache`);
        del(key);
        continue;
      }

      try {
        const info = await transporter.sendMail({
          from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
          to,
          subject,
          text,
        });
        log.info(`[RETRY SUCCESS]: Email sent to ${to}, MessageID: ${info.messageId}`);
        del(key);
      } catch (err) {
        log.error(`[RETRY FAILED]: ${to}, retry count: ${retries}`, err.message);
        set(key, { ...retryData, retries: retries + 1 });
      }
    }
  } else {
    log.info('[EMAIL_CRON_JOB] No Email For Retry.');
  }
}

log.info('[CRON] Initialized cron jobs');
cron.schedule('*/3 * * * *', async () => {
  log.info('[CRON] Running Email_Service_For_Failed_Emails');
  await RetryEmail();
});
