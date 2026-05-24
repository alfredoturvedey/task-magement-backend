import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../shared/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async findTaskById(id: string): Promise<Task> {
    const task = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.id = :id', { id })
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .getOne();

    if (!task) {
      throw new NotFoundException('La tarea no existe');
    }

    return task;
  }

  private isProjectMember(project: Project, userId: string): boolean {
    return (
      project.ownerId === userId ||
      (Array.isArray(project.members) &&
        project.members.some((member) => member.id === userId))
    );
  }

  private isAssignedUserInProject(project: Project, userId: string): boolean {
    return (
      project.ownerId === userId ||
      (Array.isArray(project.members) &&
        project.members.some((member) => member.id === userId))
    );
  }

  private ensureCanManageTask(
    task: Task,
    project: Project,
    userId: string,
  ): void {
    const isOwner = project.ownerId === userId;
    const isAssignedToUser = task.assignedToId === userId;

    if (!isOwner && !isAssignedToUser) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar esta tarea',
      );
    }
  }

  // Crear una nueva tarea
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const project = await this.projectsRepository.findOne({
      where: { id: createTaskDto.projectId },
      relations: { owner: true, members: true },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.archived) {
      throw new BadRequestException(
        'No puedes crear tareas en un proyecto archivado',
      );
    }

    if (!this.isProjectMember(project, userId)) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    const assignedToId = createTaskDto.assignedToId || userId;

    if (project.ownerId !== userId && assignedToId !== userId) {
      throw new ForbiddenException(
        'Solo puedes crear tareas asignadas a ti mismo',
      );
    }

    let assignedUser: User | null = null;

    // Validar que el usuario asignado es miembro del proyecto (si se proporciona)
    if (assignedToId) {
      assignedUser = await this.usersRepository.findOne({
        where: { id: assignedToId },
      });

      if (!assignedUser) {
        throw new NotFoundException('El usuario asignado no existe');
      }

      if (!this.isAssignedUserInProject(project, assignedToId)) {
        throw new BadRequestException(
          'El usuario asignado no es miembro del proyecto',
        );
      }
    }

    const task = this.tasksRepository.create({
      name: createTaskDto.name,
      description: createTaskDto.description,
      priority: createTaskDto.priority,
      projectId: createTaskDto.projectId,
      project: project,
      assignedTo: assignedUser ?? undefined,
      assignedToId,
    });

    const savedTask = await this.tasksRepository.save(task);

    // Retornar la tarea con las relaciones cargadas
    return this.findTaskById(savedTask.id);
  }

  // Listar tareas de un proyecto específico
  async findByProject(
    projectId: string,
    userId: string,
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Task>> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { members: true },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (!this.isProjectMember(project, userId)) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('task.projectId = :projectId', { projectId })
      .orderBy('task.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Obtener una tarea por ID
  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.findTaskById(id);

    if (!this.isProjectMember(task.project, userId)) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    return task;
  }

  // Actualizar una tarea
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findTaskById(id);
    const project = await this.projectsRepository.findOne({
      where: { id: task.projectId },
      relations: { members: true },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.archived) {
      throw new BadRequestException(
        'No puedes editar tareas en un proyecto archivado',
      );
    }

    const isOwner = project.ownerId === userId;
    const isAssignedToUser = task.assignedToId === userId;

    if (!isOwner && !isAssignedToUser) {
      throw new ForbiddenException('No tienes permisos para editar esta tarea');
    }

    if (
      updateTaskDto.assignedToId &&
      !isOwner &&
      updateTaskDto.assignedToId !== task.assignedToId
    ) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede reasignar tareas',
      );
    }

    // Si se asigna a otro usuario, debe ser miembro del proyecto
    if (
      updateTaskDto.assignedToId &&
      updateTaskDto.assignedToId !== task.assignedToId
    ) {
      if (!this.isAssignedUserInProject(project, updateTaskDto.assignedToId)) {
        throw new BadRequestException(
          'El usuario asignado no es miembro del proyecto',
        );
      }

      const assignedUser = await this.usersRepository.findOne({
        where: { id: updateTaskDto.assignedToId },
      });

      if (!assignedUser) {
        throw new NotFoundException('El usuario asignado no existe');
      }

      task.assignedTo = assignedUser;
      task.assignedToId = updateTaskDto.assignedToId;
    }

    Object.assign(task, {
      ...updateTaskDto,
      assignedToId: updateTaskDto.assignedToId || task.assignedToId,
    });

    const savedTask = await this.tasksRepository.save(task);

    // Retornar la tarea con las relaciones cargadas
    return this.findTaskById(savedTask.id);
  }

  // Eliminar una tarea
  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findTaskById(id);
    const project = await this.projectsRepository.findOne({
      where: { id: task.projectId },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.archived) {
      throw new BadRequestException(
        'No puedes eliminar tareas en un proyecto archivado',
      );
    }

    this.ensureCanManageTask(task, project, userId);

    await this.tasksRepository.remove(task);
  }

  // Traspasar tareas cuando se elimina un miembro
  async reassignTasksToOwner(
    projectId: string,
    memberId: string,
    ownerId: string,
  ): Promise<void> {
    await this.tasksRepository.update(
      { projectId, assignedToId: memberId },
      { assignedToId: ownerId },
    );
  }

  // Cambiar estado de una tarea
  async updateStatus(
    id: string,
    status: TaskStatus,
    userId: string,
  ): Promise<Task> {
    const task = await this.findTaskById(id);
    const project = await this.projectsRepository.findOne({
      where: { id: task.projectId },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.archived) {
      throw new BadRequestException(
        'No puedes actualizar tareas en un proyecto archivado',
      );
    }

    this.ensureCanManageTask(task, project, userId);

    task.status = status;
    const savedTask = await this.tasksRepository.save(task);

    return this.findTaskById(savedTask.id);
  }

  // Cambiar prioridad de una tarea
  async updatePriority(
    id: string,
    priority: TaskPriority,
    userId: string,
  ): Promise<Task> {
    const task = await this.findTaskById(id);
    const project = await this.projectsRepository.findOne({
      where: { id: task.projectId },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    if (project.archived) {
      throw new BadRequestException(
        'No puedes actualizar tareas en un proyecto archivado',
      );
    }

    this.ensureCanManageTask(task, project, userId);

    task.priority = priority;
    const savedTask = await this.tasksRepository.save(task);

    return this.findTaskById(savedTask.id);
  }
}
