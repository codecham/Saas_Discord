/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const isDevelopment = process.env.NODE_ENV !== 'production';
const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';

// 🎨 Couleurs ANSI pour les badges d'app
const colors = {
  backend: '\x1b[44m\x1b[97m', // Fond bleu, texte blanc
  gateway: '\x1b[42m\x1b[97m', // Fond vert, texte blanc
  bot: '\x1b[45m\x1b[97m', // Fond magenta, texte blanc
  reset: '\x1b[0m',
};

// 🎨 Format console amélioré avec couleurs et structure
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, stack, service, ...meta } =
      info;

    // Badge coloré de l'app
    const appBadge = service
      ? `${colors[service as keyof typeof colors] || ''}[${String(service).toUpperCase()}]${colors.reset}`
      : '';

    let log = `${timestamp} ${appBadge} ${level}`;

    if (context) {
      log += ` [${context}]`;
    }

    log += ` ${message}`;

    const metaKeys = Object.keys(meta).filter(
      (key) => !['hostname', 'pid', 'timestamp', 'level'].includes(key),
    );
    if (metaKeys.length > 0) {
      const metaObj: Record<string, unknown> = {};
      metaKeys.forEach((key) => {
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

export const createWinstonLogger = (service: string) => {
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
          app: service,
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

  return WinstonModule.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    defaultMeta: {
      service,
      hostname: process.env.HOSTNAME || 'localhost',
      pid: process.pid,
    },
    transports,
  });
};

// Logger par défaut pour la gateway
export const logger = createWinstonLogger('gateway');
