/**
 * Health Check Routes
 * Endpoints for monitoring system health
 */

import { Router, Request, Response } from 'express';
import {
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
} from '../services/health.service';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Comprehensive health check
 *     description: Returns detailed health status of all system components
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 checks:
 *                   type: object
 *       503:
 *         description: System is unhealthy
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Simple check to verify the process is running
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Process is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [alive]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/live', (req: Request, res: Response) => {
  const liveness = getLivenessStatus();
  res.status(200).json(liveness);
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Check if the service is ready to accept traffic
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ready]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const readiness = await getReadinessStatus();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed',
    });
  }
});

/**
 * @openapi
 * /health/metrics:
 *   get:
 *     summary: Basic metrics
 *     description: Returns basic application metrics
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 */
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      pid: process.pid,
      version: process.version,
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.RELEASE_VERSION || 'unknown',
  };
  
  res.status(200).json(metrics);
});

export default router;
