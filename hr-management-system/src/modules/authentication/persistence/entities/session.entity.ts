import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '@shared/entities';
import { User } from './user.entity';

@Entity('sessions')
export class Session extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'token_hash', unique: true })
  @Index()
  tokenHash: string;

  @Column({ type: 'inet', name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  @Index()
  expiresAt: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_activity',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActivity: Date;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isValid(): boolean {
    return this.isActive && !this.isExpired;
  }
}