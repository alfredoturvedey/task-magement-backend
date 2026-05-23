import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @IsNotEmpty({ message: 'El nombre de la tarea es requerido' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @IsNotEmpty({ message: 'El ID del proyecto es requerido' })
  @IsUUID('4', { message: 'El ID debe ser un UUID válido' })
  projectId: string;

  // @IsNotEmpty({ message: 'El ID del usuario asignado es requerido' })
  // @IsUUID('4', { message: 'El ID debe ser un UUID válido' })
  // assignedToId: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'La prioridad debe ser low, medium o high' })
  priority: TaskPriority = TaskPriority.MEDIUM;
}
