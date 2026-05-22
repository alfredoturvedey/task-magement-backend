import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { BaseEntity } from '../../../shared/entity/base-entity';

@Entity('projects')
export class Project extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  archived: boolean;

  // Jefe/dueño del proyecto (quien lo creó)
  @ManyToOne(() => User, (user) => user.ownedProjects, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column()
  ownerId: string; // FK explícita para consultas directas

  // Miembros del proyecto
  @ManyToMany(() => User, (user) => user.projectMemberships, { lazy: true })
  @JoinTable({
    name: 'project_members',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  // Tareas del proyecto
  @OneToMany(() => Task, (task) => task.project, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  tasks: Task[];
}
