import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../authentication/persistence/entities/user.entity';
import { Department } from '../../../departments/persistence/entities/department.entity';
import { Role } from '../../../roles/persistence/entities/role.entity';

export enum EmploymentStatus {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
  PROBATION = 'probation',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  employeeCode: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporting_to' })
  reportingTo: Employee;

  @Column({ type: 'varchar', length: 100 })
  jobTitle: string;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  employmentStatus: EmploymentStatus;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'date', nullable: true })
  probationEndDate: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  maritalStatus: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nationality: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  address: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;
}