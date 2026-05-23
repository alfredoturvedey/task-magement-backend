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

    // Validar que el usuario es propietario o miembro
    const isOwner = project.ownerId === userId;
    //const isMember = project.members.some((m) => m.id === userId);
    const isMember = await this.projectsRepository
      .createQueryBuilder('project')
      .innerJoin('project.members', 'members', 'members.id = :memberId', {
        memberId: createTaskDto.assignedToId,
      })
      .where('project.id = :projectId', { projectId: createTaskDto.projectId })
      .getOne();

    if (!isOwner && !isMember) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    // Validar que el usuario asignado es miembro del proyecto
    if (
      createTaskDto.assignedToId !== userId &&
      !isMember &&
      createTaskDto.assignedToId !== project.ownerId
    ) {
      throw new BadRequestException(
        'El usuario asignado no es miembro del proyecto',
      );
    }

    const assignedUser = await this.usersRepository.findOne({
      where: { id: createTaskDto.assignedToId },
    });

    if (!assignedUser) {
      throw new NotFoundException('El usuario asignado no existe');
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      project,
      projectId: createTaskDto.projectId,
      assignedTo: assignedUser,
      assignedToId: createTaskDto.assignedToId,
    });

    return this.tasksRepository.save(task);
  }

  // Listar tareas de un proyecto específico
  async findByProject(projectId: string, userId: string): Promise<Task[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: { members: true },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    // Validar que el usuario es miembro
    const isOwner = project.ownerId === userId;
    //const isMember = project.members.some((m) => m.id === userId);
    const isMember = await this.projectsRepository
      .createQueryBuilder('project')
      .innerJoin('project.members', 'members', 'members.id = :memberId', {
        memberId: userId,
      })
      .where('project.id = :projectId', { projectId: projectId })
      .getOne();

    if (!isOwner && !isMember) {
      throw new ForbiddenException('No eres miembro de este proyecto');
    }

    return this.tasksRepository.find({
      where: { projectId },
      relations: { assignedTo: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Obtener una tarea por ID
  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { project: true, assignedTo: true },
    });

    if (!task) {
      throw new NotFoundException('La tarea no existe');
    }

    return task;
  }

  // Actualizar una tarea
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id);
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

    // Solo el dueño del proyecto o quien asignó la tarea puede editarla
    const isOwner = project.ownerId === userId;
    const isAssignedToUser = task.assignedToId === userId;

    if (!isOwner && !isAssignedToUser) {
      throw new ForbiddenException('No tienes permisos para editar esta tarea');
    }

    // Si se asigna a otro usuario, debe ser miembro del proyecto
    if (
      updateTaskDto.assignedToId &&
      updateTaskDto.assignedToId !== task.assignedToId
    ) {
      if (
        !project.members.some((m) => m.id === updateTaskDto.assignedToId) &&
        updateTaskDto.assignedToId !== project.ownerId
      ) {
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

    return this.tasksRepository.save(task);
  }

  // Eliminar una tarea
  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);
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

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede eliminar tareas',
      );
    }

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
    const task = await this.findOne(id);
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

    const isOwner = project.ownerId === userId;
    const isAssignedToUser = task.assignedToId === userId;

    if (!isOwner && !isAssignedToUser) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar esta tarea',
      );
    }

    task.status = status;
    return this.tasksRepository.save(task);
  }

  // Cambiar prioridad de una tarea
  async updatePriority(
    id: string,
    priority: TaskPriority,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id);
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

    const isOwner = project.ownerId === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'Solo el jefe del proyecto puede cambiar la prioridad',
      );
    }

    task.priority = priority;
    return this.tasksRepository.save(task);
  }
}
