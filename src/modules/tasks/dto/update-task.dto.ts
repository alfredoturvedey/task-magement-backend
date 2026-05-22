import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, {
    message: 'El estado debe ser pending, in_progress o completed',
  })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'La prioridad debe ser low, medium o high' })
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;
}
