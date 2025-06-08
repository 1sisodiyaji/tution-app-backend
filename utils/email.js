const nodemailer = require('nodemailer');
const log = require('../config/logger');
const { set, get } = require('./cacheService');
const getEmailTemplate = require('../config/GetEmailTemplate');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
const sendEmail = async (options) => {
  const recipients = Array.isArray(options.email) ? options.email : [options.email];
  const sendResults = [];

  for (const email of recipients) {
    const mailOptions = {
      from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: getEmailTemplate(options.type, options.data),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      log.info(`[Email sent to]: ${email}  MessageID: ${info.messageId}`);
      sendResults.push({ email, success: true, messageId: info.messageId });
    } catch (error) {
      log.error(`[Email error for]: ${email}`, error);
      const cacheKey = `FAILED_EMAIL_${email}`;
      const current = get(cacheKey);
      const retryData = {
        ...mailOptions,
        retries: current?.retries ? current.retries + 1 : 1,
        timestamp: Date.now(),
      };
      set(cacheKey, retryData);
      sendResults.push({ email, success: false, error: error.message });
    }
  }

  return sendResults;
};

module.exports = { sendEmail, transporter };
