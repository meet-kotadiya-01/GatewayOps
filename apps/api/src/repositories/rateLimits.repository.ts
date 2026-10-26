import { db } from '../config/database';
import { RateLimitViolation } from '../types';

export class RateLimitsRepository {
  async getSummary(from?: string, to?: string): Promise<any> {
    let query = db('rate_limit_violations');
    if (from && to) {
      query = query.whereBetween('created_at', [from, to]);
    } else if (from) {
      query = query.where('created_at', '>=', from);
    } else if (to) {
      query = query.where('created_at', '<=', to);
    }

    const totalViolationsResult = await query.clone().count('* as count').first() as any;
    const totalViolations = parseInt(totalViolationsResult?.count || '0', 10);

    let requestsQuery = db('rate_limit_violations');
    if (from && to) {
      requestsQuery = requestsQuery.whereBetween('window_start', [from, to]);
    } else if (from) {
      requestsQuery = requestsQuery.where('window_start', '>=', from);
    } else if (to) {
      requestsQuery = requestsQuery.where('window_start', '<=', to);
    }
    const requestsResult = await requestsQuery.sum('request_count as sum').first() as any;
    const totalRequests = parseFloat(requestsResult?.sum || '0');

    const windowSeconds = from && to 
      ? (new Date(to).getTime() - new Date(from).getTime()) / 1000
      : 3600;

    const validWindowSeconds = !isNaN(windowSeconds) && windowSeconds > 0 ? windowSeconds : 60;
    const rpm = totalRequests > 0 
      ? Math.round(((totalRequests * 60) / validWindowSeconds) * 100) / 100 
      : 0;

    return {
      total_violations: totalViolations,
      requests_per_minute: rpm,
      peak_rpm: 0,
    };
  }

  async getViolations(from?: string, to?: string): Promise<RateLimitViolation[]> {
    let query = db('rate_limit_violations');
    if (from && to) {
      query = query.whereBetween('created_at', [from, to]);
    } else if (from) {
      query = query.where('created_at', '>=', from);
    } else if (to) {
      query = query.where('created_at', '<=', to);
    }
    return await query.orderBy('created_at', 'desc');
  }

  async getTopOffenders(): Promise<any[]> {
    return await db('rate_limit_violations')
      .select('user_id', 'service_id')
      .count('* as violation_count')
      .sum('request_count')
      .groupBy('user_id', 'service_id')
      .orderBy('violation_count', 'desc')
      .limit(10);
  }
}
