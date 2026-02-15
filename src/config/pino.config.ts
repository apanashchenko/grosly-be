import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Pino logger configuration factory
 * - Development: Pretty formatted logs with colors
 * - Production: JSON structured logs for log aggregation
 */
export const createPinoConfig = (config: ConfigService): Params => {
  const isDevelopment = config.get('NODE_ENV') !== 'production';

  return {
    pinoHttp: {
      level: isDevelopment ? 'debug' : 'info',
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname,context',
              singleLine: true,
              messageFormat: '[{context}] {msg}',
            },
          }
        : undefined, // Production: JSON logs
      genReqId: (req: IncomingMessage) => {
        const fromHeader = req.headers[REQUEST_ID_HEADER];
        return (
          (Array.isArray(fromHeader) ? fromHeader[0] : fromHeader) ||
          randomUUID()
        );
      },
      autoLogging: true,
      quietReqLogger: false,
      customProps: (req) => ({
        context: 'HTTP',
        requestId: req.id,
      }),
      serializers: {
        req: (req: {
          id?: string | number;
          method?: string;
          url?: string;
          headers?: Record<string, string | string[] | undefined>;
          socket?: { remoteAddress?: string };
          connection?: { remoteAddress?: string };
          ip?: string;
        }) => {
          // Try multiple ways to get IP address
          const forwardedFor = req.headers?.['x-forwarded-for'];
          const ip =
            (Array.isArray(forwardedFor)
              ? forwardedFor[0]
              : forwardedFor?.split(',')[0]) ||
            req.socket?.remoteAddress ||
            req.connection?.remoteAddress ||
            req.ip ||
            '127.0.0.1'; // localhost fallback

          return {
            id: req.id,
            method: req.method,
            url: req.url,
            ip,
          };
        },
        res: (res: { statusCode?: number }) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
};
