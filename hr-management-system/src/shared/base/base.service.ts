import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { BaseEntity } from '@shared/entities';
import { PaginationQuery, PaginatedResult } from '@shared/types';
import { PaginationUtil } from '@shared/utils';
import { ResourceNotFoundException } from '@shared/exceptions';

export abstract class BaseService<T extends BaseEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {}

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<T | null> {
    return await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
  }

  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new ResourceNotFoundException(this.entityName, id);
    }
    return entity;
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    await this.findByIdOrFail(id);
    await this.repository.update(id, data as any);
    return await this.findByIdOrFail(id);
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    await this.repository.delete(id);
  }

  async findAll(
    query: PaginationQuery,
    where?: FindOptionsWhere<T>,
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = PaginationUtil.normalizeQuery(query);
    const skip = PaginationUtil.getSkip(page, limit);

    const [data, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        createdAt: query.sortOrder || 'DESC',
      } as any,
    });

    return {
      data,
      meta: PaginationUtil.getMeta(total, page, limit),
    };
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return await this.repository.count({ where });
  }
}