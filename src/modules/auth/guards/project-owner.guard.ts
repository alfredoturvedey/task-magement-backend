import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ProjectsService } from '../../projects/projects.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user.userId;
    const projectId = request.params.id || request.body.projectId;

    if (!projectId) {
      throw new BadRequestException('El ID del proyecto es requerido');
    }

    if (!isUUID(projectId, '4')) {
      throw new BadRequestException(
        'El ID del proyecto debe ser un UUID válido',
      );
    }

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
