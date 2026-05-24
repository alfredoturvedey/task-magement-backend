import { IsEnum } from 'class-validator';
import { TaskPriority } from '../entities/task.entity';

export class UpdateTaskPriorityDto {
  @IsEnum(TaskPriority, { message: 'La prioridad debe ser low, medium o high' })
  priority: TaskPriority;
}
