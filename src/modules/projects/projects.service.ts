import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private tasksService: TasksService,
  ) {}

  // Crear un nuevo proyecto
  async create(createProjectDto: CreateProjectDto): Promise<Project | null> {
    const user = await this.usersRepository.findOne({
      where: { id: createProjectDto.userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    // Crear el proyecto sin la relación members
    const project = this.projectsRepository.create({
      name: createProjectDto.name,
      description: createProjectDto.description,
      owner: user,
      ownerId: createProjectDto.userId,
    });

    // Guardar el proyecto primero (esto genera el ID)
    const savedProject = await this.projectsRepository.save(project);

    // Luego agregar el miembro usando la relación join table
    // El creador es miembro por defecto
    await this.projectsRepository
      .createQueryBuilder()
      .relation(Project, 'members')
      .of(savedProject.id)
      .add(user.id);

    // Retornar el proyecto con sus relaciones
    return this.projectsRepository.findOne({
      where: { id: savedProject.id },
      relations: {
        owner: true,
        members: true,
      },
    });
  }

  // Listar proyectos del usuario autenticado
  async findByUser(userId: string): Promise<Project[]> {
    return this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .where('project.ownerId = :userId OR members.id = :userId', { userId })
      .distinct(true)
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  // Obtener un proyecto por ID
  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        owner: true,
        members: true,
        tasks: true,
      },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    return project;
  }

  // Actualizar un proyecto
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);

    if (project.ownerId !== updateProjectDto.userId) {
      throw new ForbiddenException('Solo el jefe del proyecto puede editarlo');
    }

    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  // Eliminar un proyecto
  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede eliminarlo',
      );
    }

    await this.projectsRepository.remove(project);
  }

  // Añadir un miembro al proyecto
  async addMember(
    projectId: string,
    userId: string,
    memberId: string,
  ): Promise<Project | null> {
    const project = await this.findOne(projectId);

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede añadir miembros',
      );
    }

    const member = await this.usersRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('El usuario no existe');
    }

    // Verificar si el usuario ya es miembro usando una consulta
    const isMember = await this.projectsRepository
      .createQueryBuilder('project')
      .innerJoin('project.members', 'members', 'members.id = :memberId', {
        memberId,
      })
      .where('project.id = :projectId', { projectId })
      .getOne();

    if (isMember) {
      throw new BadRequestException('El usuario ya es miembro del proyecto');
    }

    // Agregar el miembro usando la relación
    await this.projectsRepository
      .createQueryBuilder()
      .relation(Project, 'members')
      .of(projectId)
      .add(memberId);

    // Retornar el proyecto actualizado
    return this.projectsRepository.findOne({
      where: { id: projectId },
      relations: {
        owner: true,
        members: true,
      },
    });
  }

  // Eliminar un miembro del proyecto
  async removeMember(
    projectId: string,
    userId: string,
    memberId: string,
  ): Promise<Project | null> {
    const project = await this.findOne(projectId);

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede eliminar miembros',
      );
    }

    if (project.ownerId === memberId) {
      throw new BadRequestException('No puedes eliminar al jefe del proyecto');
    }

    // Traspasar tareas del miembro eliminado al jefe
    await this.tasksService.reassignTasksToOwner(
      projectId,
      memberId,
      project.ownerId,
    );

    // Eliminar el miembro usando la relación
    await this.projectsRepository
      .createQueryBuilder()
      .relation(Project, 'members')
      .of(projectId)
      .remove(memberId);

    // Retornar el proyecto actualizado
    return this.projectsRepository.findOne({
      where: { id: projectId },
      relations: {
        owner: true,
        members: true,
      },
    });
  }

  // Verificar si un usuario es propietario
  async isOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await this.findOne(projectId);
    return project.ownerId === userId;
  }

  // Verificar si un usuario es miembro
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const project = await this.findOne(projectId);
    return (
      project.ownerId === userId || project.members.some((m) => m.id === userId)
    );
  }
}
