import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const projectId = request.params.id || request.body.projectId;

    const project = await this.projectsService.findOne(projectId);

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }

    return true;
  }
}
