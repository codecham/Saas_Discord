import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const isDevelopment = process.env.NODE_ENV !== 'production';
const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';

// 🎨 Format console amélioré avec couleurs et structure
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, stack, ...meta } = info;
    
    let log = `${timestamp} ${level}`;
    
    if (context) {
      log += ` [${context}]`;
    }
    
    log += ` ${message}`;
    
    const metaKeys = Object.keys(meta).filter(key => !['service', 'hostname', 'pid', 'timestamp', 'level'].includes(key));
    if (metaKeys.length > 0) {
      const metaObj: Record<string, unknown> = {};
      metaKeys.forEach(key => {
        metaObj[key] = meta[key];
      });
      log += ` ${JSON.stringify(metaObj)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  }),
);

// 📊 Format Loki : JSON structuré
const lokiFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (lokiUrl) {
  transports.push(
    new LokiTransport({
      host: lokiUrl,
      labels: {
        app: 'bot',
        environment: process.env.NODE_ENV || 'development',
      },
      json: true,
      format: lokiFormat,
      replaceTimestamp: true,
      onConnectionError: (err: Error) => {
        console.error('❌ Loki connection error:', err.message);
      },
      batching: true,
      interval: 5,
    }),
  );
}

export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  defaultMeta: {
    service: 'bot',
    hostname: process.env.HOSTNAME || 'localhost',
    pid: process.pid,
  },
  transports,
});