import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request as RequestDecorator,
  HttpCode,
  HttpStatus,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../../shared/dto/pagination.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskPriorityDto } from './dto/update-task-priority.dto';

@Controller('api/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Listar tareas de un proyecto
  @Get('/project/:projectId')
  async findByProject(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.tasksService.findByProject(
      projectId,
      request.user.userId,
      pagination,
    );
  }

  // Crear una nueva tarea
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @RequestDecorator() request: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(createTaskDto, request.user.userId);
  }

  // Obtener una tarea específica
  @Get(':id')
  async findOne(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(id, request.user.userId);
  }

  // Actualizar una tarea
  @Put(':id')
  async update(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto, request.user.userId);
  }

  // Cambiar estado de una tarea
  @Put(':id/status')
  async updateStatus(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, body.status, request.user.userId);
  }

  // Cambiar prioridad de una tarea
  @Put(':id/priority')
  async updatePriority(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTaskPriorityDto,
  ) {
    return this.tasksService.updatePriority(
      id,
      body.priority,
      request.user.userId,
    );
  }

  // Eliminar una tarea
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tasksService.remove(id, request.user.userId);
  }
}
