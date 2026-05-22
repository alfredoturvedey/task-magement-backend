import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const projectId = request.params.projectId || request.body.projectId;

    const project = await this.projectsService.findOne(projectId);

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    const isMember = project.members.some((member) => member.id === userId);
    const isOwner = project.ownerId === userId;

    if (!isMember && !isOwner) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    return true;
  }
}
