import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_members')
export class ProjectMember {
  @PrimaryColumn()
  projectId: string;

  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => Project, (project) => project.members)
  project: Project;

  @ManyToOne(() => User, (user) => user.projectMemberships)
  user: User;
}
