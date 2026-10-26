import redis from '../config/redis';
import { MetricsRepository } from '../repositories/metrics.repository';
import { MetricsSummary, TimeSeriesDataPoint, ServiceDistribution, DetailedMetrics } from '../dto/metrics.dto';

const metricsRepo = new MetricsRepository();

export class MetricsService {
  private readonly CACHE_TTL_SECONDS = 30; // 30s TTL allows fresh dashboard data while protecting DB

  async getSummary(from?: string, to?: string, refresh: boolean = false): Promise<MetricsSummary> {
    const cacheKey = `metrics:summary:${from || 'all'}:${to || 'all'}`;

    if (!refresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis GET error in MetricsService, falling back to DB:', err);
      }
    }

    const summary = await metricsRepo.getSummary(from, to);

    try {
      await redis.setEx(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(summary));
    } catch (err) {
      console.error('Redis SETEX error in MetricsService:', err);
    }

    return summary;
  }

  async invalidateCache(): Promise<void> {
    try {
      const keys = await redis.keys('metrics:summary*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (err) {
      console.error('Failed to invalidate metrics cache:', err);
    }
  }

  async getRequestsOverTime(
    interval: 'hour' | 'day' = 'hour',
    from?: string,
    to?: string,
  ): Promise<TimeSeriesDataPoint[]> {
    return await metricsRepo.getRequestsOverTime(interval, from, to);
  }

  async getErrorTrends(from?: string, to?: string): Promise<TimeSeriesDataPoint[]> {
    return await metricsRepo.getErrorTrends(from, to);
  }

  async getServiceDistribution(from?: string, to?: string): Promise<ServiceDistribution[]> {
    return await metricsRepo.getServiceDistribution(from, to);
  }

  async getDetailedMetrics(): Promise<DetailedMetrics> {
    return await metricsRepo.getDetailedMetrics();
  }
}
