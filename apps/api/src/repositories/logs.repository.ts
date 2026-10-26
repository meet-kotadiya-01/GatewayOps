import { db } from '../config/database';
import { ApiLog } from '../types';
import { LogsQueryParams } from '../dto/logs.dto';
import { PaginationMeta } from '../dto/pagination.dto';

export class LogsRepository {
  async findAll(params: LogsQueryParams & { page: number; limit: number }) {
    const { page, limit, service, statusCode, from, to, search } = params;

    let query = db('api_logs');

    if (service) {
      const serviceRecord = await db('services').where('slug', service).first();
      if (serviceRecord) {
        query = query.where('service_id', serviceRecord.id);
      } else {
        query = query.whereRaw('1 = 0');
      }
    }

    if (statusCode !== undefined && statusCode !== null) {
      if (statusCode >= 1 && statusCode <= 9) {
        // Status class prefix (e.g., 2 -> 200..299, 4 -> 400..499, 5 -> 500..599)
        const minStatus = statusCode * 100;
        const maxStatus = minStatus + 99;
        query = query.whereBetween('status_code', [minStatus, maxStatus]);
      } else {
        // Exact status code (e.g., 200, 404, 500)
        query = query.where('status_code', statusCode);
      }
    }

    if (from && to) {
      query = query.whereBetween('created_at', [from, to]);
    } else if (from) {
      query = query.where('created_at', '>=', from);
    } else if (to) {
      query = query.where('created_at', '<=', to);
    }

    if (search) {
      query = query.where('endpoint', 'like', `%${search}%`);
    }

    const totalResult = await query.clone().count('* as count').first() as any;
    const total = parseInt(totalResult?.count || '0', 10);
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    const offset = (validPage - 1) * validLimit;
    const pages = Math.max(1, Math.ceil(total / validLimit));

    const logs = await query
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(validLimit)
      .offset(offset);

    for (const log of logs) {
      const service = await db('services').where('id', log.service_id).first();
      (log as any).service_name = service?.name;
    }

    return {
      data: logs as ApiLog[],
      logs: logs as ApiLog[],
      meta: {
        page: validPage,
        limit: validLimit,
        total,
        pages,
      } as PaginationMeta,
    };
  }

  async findById(id: string): Promise<ApiLog | null> {
    return await db('api_logs').where('id', id).first();
  }
}
