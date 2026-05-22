import { Entity, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { BaseEntity } from '../../../shared/entity/base-entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // nodevolver el password por defecto
  password: string;

  @Column()
  name: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  // Proyectos que este usuario crea (es el dueño/jefe)
  @OneToMany(() => Project, (project) => project.owner, { lazy: true })
  ownedProjects: Project[];

  // Proyectos a los que pertenece como miembro
  @ManyToMany(() => Project, (project) => project.members, { lazy: true })
  @JoinTable({
    name: 'project_members',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'project_id', referencedColumnName: 'id' },
  })
  projectMemberships: Project[];

  // Tareas asignadas a este usuario
  @OneToMany(() => Task, (task) => task.assignedTo, { lazy: true })
  assignedTasks: Task[];
}
