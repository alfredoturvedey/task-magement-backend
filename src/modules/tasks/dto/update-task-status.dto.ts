import { IsEnum } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus, {
    message: 'El estado debe ser pending, in_progress o completed',
  })
  status: TaskStatus;
}
