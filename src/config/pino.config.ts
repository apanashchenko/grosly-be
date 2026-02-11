import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

// export const loggerConfig: Params = {
//   pinoHttp: {
//     level: process.env.LOG_LEVEL ?? 'info',
//     mixin() {
//       const cls = ClsServiceManager.getClsService();
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       const requestId = cls?.get('requestId');
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       return requestId ? { requestId } : {};
//     },
//     ...(!isProduction && {
//       transport: {
//         target: 'pino-pretty',
//         options: {
//           colorize: true,
//           // translateTime: 'SYS:standard',
//           singleLine: true,
//         },
//       },
//     }),
//   },
// };

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
              ignore: 'pid,hostname',
              singleLine: true,
            },
          }
        : undefined, // Production: JSON logs
      autoLogging: true,
      quietReqLogger: false,
      // Add requestId to all logs within request context
      customProps: (req) => ({
        context: 'HTTP',
        requestId: req.id, // Propagate requestId to all child logs
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
