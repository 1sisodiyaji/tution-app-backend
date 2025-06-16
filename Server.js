require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const cluster = require('node:cluster');
const numCPUs = require('node:os').cpus().length;
const rateLimit = require('express-rate-limit');
const log = require('./config/logger.js');
const connectDB = require('./config/database.js');
const userRouter = require('./routes/user.routes.js');
const teacherRoutes = require('./routes/mentor.routes.js');
const adminRoutes = require('./routes/Admin.routes.js');

const path = require('path');
require('./cron/EmailCron.js');

if (cluster.isPrimary) {
  log.info(`Primary ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, _code, _signal) => {
    log.info(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
  cluster.on('error', (error) => {
    log.error('Cluster error:', error);
  });
  cluster.on('online', (worker) => {
    log.info(`Worker ${worker.process.pid} is online`);
  });
  log.info(`Primary ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    log.info(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
  cluster.on('error', (error) => {
    log.error('Cluster error:', error);
  });
  cluster.on('online', (worker) => {
    log.info(`Worker ${worker.process.pid} is online`);
  });
} else {
  const app = express();
  app.use(
    cors({
      origin: function (origin, callback) {
        const isDev = process.env.NODE_ENV === 'develpoment';
        if (isDev) {
          log.info(`[CORS] Development mode — allowing all origins`);
          return callback(null, true);
        }

        const allowedOrigins = process.env.ALLOWED_ORIGIN;
        if (!origin) {
          log.info(`[CORS] No Origin provided — allowing request ${origin}`);
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        log.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use((req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const path = req.originalUrl;
    const method = req.method;
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
    });
    log.http(`${ip} , ${method} , ${path}, at the ${timestamp}`);
    // if (isProduction) {
    //   if (
    //     userAgent.toLowerCase().includes('postman') ||
    //     ip.includes('127.0.0.1') ||
    //     ip.includes('::1')
    //   ) {
    //     return res.status(403).json({ message: 'Access denied in production mode' });
    //   }
    // }
    next();
  });
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
      'Content-Disposition'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  });

  connectDB();
  const PORT = process.env.PORT || 5000;
  const limiter = rateLimit({
    windowMs: 15 * 60 * 100,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many Request , please try again later after 15 mins.',
    },
    skip: (req, res) => req.method === 'GET',
  });
  app.use(limiter);
  app.use(helmet());
  app.use(xss());
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.join(__dirname, 'uploads'))
  );
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/teachers', teacherRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.get('/', (req, res) => {
    res.send(`Application  is running at http://localhost:${PORT}`);
  });
  app.listen(PORT, () => {
    log.info(
      `Worker ${process.pid} started - Server running in ${process.env.NODE_ENV} mode on port http://localhost:${PORT}`
    );
  });
}
process.on('unhandledRejection', (err, _promise) => {
  log.error(`Error: ${err.message}`);
  if (cluster.isPrimary) {
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  for (const id in cluster.workers) {
    cluster.workers[id].kill();
  }
  process.exit(0);
});
