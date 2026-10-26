import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MetricsService } from '../services/metrics.service';
import { AppError } from '../middleware/errorHandler';

const metricsService = new MetricsService();

export class MetricsController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { from, to, refresh } = req.query as { from?: string; to?: string; refresh?: string };
      const shouldRefresh = refresh === 'true' || refresh === '1';
      const summary = await metricsService.getSummary(from, to, shouldRefresh);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getRequestsOverTime(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { interval, from, to } = req.query as { interval?: 'hour' | 'day'; from?: string; to?: string };
      const data = await metricsService.getRequestsOverTime(interval || 'hour', from, to);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getErrorTrends(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await metricsService.getErrorTrends(from, to);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getServiceDistribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await metricsService.getServiceDistribution(from, to);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getDetailedMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await metricsService.getDetailedMetrics();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
}
