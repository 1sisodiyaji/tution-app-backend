const mongoose = require('mongoose'); 
const log = require('./logger');
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    log.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
