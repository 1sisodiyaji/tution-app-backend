const log = require('../config/logger');

const successResponse = (res, statusCode = 200, message = 'Success', data = {}) => {
  log.info(`${statusCode} ${message}`);
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data && { data }),
  });
};
const errorResponse = (res, statusCode = 500, message = 'Something went wrong', error = {}) => {
  log.error(`${statusCode} ${message} ${error}`);
  return res.status(statusCode).json({
    success: false,
    message,
    ...(error && { error }),
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
