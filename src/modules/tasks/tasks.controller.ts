import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskStatus, TaskPriority } from './entities/task.entity';

@Controller('api/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Listar tareas de un proyecto
  @Get('/:userId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.findByProject(projectId, userId);
  }

  // Crear una nueva tarea
  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.create(createTaskDto, userId);
  }

  // Obtener una tarea específica
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // Actualizar una tarea
  @Put(':userId/:id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  // Cambiar estado de una tarea
  @Put(':userId/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { status: TaskStatus },
  ) {
    return this.tasksService.updateStatus(id, body.status, userId);
  }

  // Cambiar prioridad de una tarea
  @Put(':userId/:id/priority')
  async updatePriority(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { priority: TaskPriority },
  ) {
    return this.tasksService.updatePriority(id, body.priority, userId);
  }

  // Eliminar una tarea
  @Delete(':userId/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Param('userId') userId: string) {
    await this.tasksService.remove(id, userId);
  }
}
