import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  @IsString()
  userId: string; // Este campo se llenará automáticamente en el controlador
}
