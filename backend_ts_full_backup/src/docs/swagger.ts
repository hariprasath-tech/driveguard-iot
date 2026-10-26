export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DriveGuard IoT Backend API',
    version: '1.0.0',
    description: 'Real-time vehicle safety monitoring platform API for ESP32 gateway telemetry, alerts, and live dashboard.'
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Endpoint'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      deviceKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-device-key'
      }
    },
    schemas: {
      TelemetryPayload: {
        type: 'object',
        required: [
          'deviceId',
          'mq3Raw',
          'mq3Status',
          'heartRaw',
          'heartStatus',
          'flame',
          'smoke',
          'motion',
          'frequency',
          'accident',
          'gps',
          'lat',
          'lng',
          'speedKmph',
          'btConnected',
          'uptimeS'
        ],
        properties: {
          deviceId: { type: 'string', example: 'CAR-001' },
          mq3Raw: { type: 'integer', example: 1200 },
          mq3Status: { type: 'string', enum: ['NORMAL', 'ALERT', 'WARMING UP'] },
          heartRaw: { type: 'integer', example: 2048 },
          heartStatus: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'] },
          flame: { type: 'string', enum: ['DETECTED', 'NOT DETECTED', 'WAITING'] },
          smoke: { type: 'string', enum: ['DETECTED', 'NOT DETECTED', 'WAITING'] },
          motion: { type: 'string', enum: ['DETECTED', 'NOT DETECTED', 'WAITING'] },
          frequency: { type: 'string', enum: ['EMITTED', 'NOT EMITTED', 'WAITING'] },
          accident: { type: 'string', enum: ['DETECTED', 'NOT DETECTED', 'WAITING'] },
          gps: { type: 'string', enum: ['FIXED', 'NO FIX', 'WAITING'] },
          lat: { type: 'number', example: 12.9716 },
          lng: { type: 'number', example: 77.5946 },
          speedKmph: { type: 'number', example: 45.2 },
          btConnected: { type: 'boolean', example: true },
          uptimeS: { type: 'integer', example: 120 }
        }
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string' },
          type: { type: 'string', enum: ['FLAME', 'SMOKE', 'ACCIDENT', 'ALCOHOL', 'HEART', 'DEVICE_OFFLINE', 'DEVICE_ONLINE'] },
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          message: { type: 'string' },
          ts: { type: 'integer' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          acknowledged: { type: 'boolean' }
        }
      }
    }
  },
  paths: {
    '/telemetry': {
      post: {
        summary: 'Ingest sensor telemetry from ESP32 gateway',
        security: [{ deviceKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TelemetryPayload' }
            }
          }
        },
        responses: {
          204: { description: 'Telemetry recorded successfully' },
          400: { description: 'Invalid payload' },
          401: { description: 'Unauthorized device key' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@driveguard.local' },
                  password: { type: 'string', example: 'AdminSecurePass123!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/latest': {
      get: {
        summary: 'Get latest telemetry reading',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'deviceId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Latest telemetry' },
          404: { description: 'No telemetry available' }
        }
      }
    },
    '/history': {
      get: {
        summary: 'Get historical telemetry',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'deviceId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'integer' } },
          { name: 'to', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 500 } },
          { name: 'bucket', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'History array' }
        }
      }
    },
    '/alerts': {
      get: {
        summary: 'Get list of alerts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'acknowledged', 'all'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['critical', 'warning', 'info'] } },
          { name: 'type', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of alerts' }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Server health and uptime',
        responses: {
          200: { description: 'Health status' }
        }
      }
    }
  }
};
