import { PaginationQuery, PaginationMeta } from '@shared/types';

export class PaginationUtil {
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static getMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    };
  }

  static normalizeQuery(query: PaginationQuery): Required<Omit<PaginationQuery, 'search' | 'sortBy' | 'sortOrder'>> {
    return {
      page: Math.max(1, query.page || 1),
      limit: Math.min(100, Math.max(1, query.limit || 10)),
    };
  }
}