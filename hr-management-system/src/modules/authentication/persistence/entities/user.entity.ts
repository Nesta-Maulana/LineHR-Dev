import {
  Entity,
  Column,
  Index,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AuditableEntity } from '@shared/entities';
import { UserStatus } from '@shared/enums';
import { Session } from './session.entity';

@Entity('users')
export class User extends AuditableEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 100, name: 'middle_name', nullable: true })
  middleName?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  @Index()
  status: UserStatus;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'email_verification_token',
    nullable: true,
  })
  @Exclude()
  emailVerificationToken?: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_reset_token',
    nullable: true,
  })
  @Exclude()
  passwordResetToken?: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'password_reset_expires',
    nullable: true,
  })
  passwordResetExpires?: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'last_login_at',
    nullable: true,
  })
  lastLoginAt?: Date;

  @Column({ type: 'int', name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column({
    type: 'timestamp with time zone',
    name: 'locked_until',
    nullable: true,
  })
  lockedUntil?: Date;

  @Column({ type: 'text', name: 'refresh_token', nullable: true })
  @Exclude()
  refreshToken?: string;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  // Virtual properties
  get fullName(): string {
    const parts = [this.firstName];
    if (this.middleName) parts.push(this.middleName);
    parts.push(this.lastName);
    return parts.join(' ');
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeUsername() {
    if (this.username) {
      this.username = this.username.toLowerCase().trim();
    }
  }
}