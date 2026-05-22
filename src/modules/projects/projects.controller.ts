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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectOwnerGuard } from '../auth/guards/project-owner.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Listar proyectos del usuario autenticado
  @Get(':userId')
  async findAll(@Param('userId') userId: string) {
    return this.projectsService.findByUser(userId);
  }

  // Crear un nuevo proyecto
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  // Obtener un proyecto específico
  @Get(':id')
  @UseGuards(ProjectMemberGuard)
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  // Actualizar un proyecto
  @Put(':id')
  @UseGuards(ProjectOwnerGuard)
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  // Eliminar un proyecto
  @Delete(':userId/:id')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('userId') userId: string, @Param('id') id: string) {
    await this.projectsService.remove(id, userId);
  }

  // Añadir miembro al proyecto
  @Post(':userId/:id/members')
  @UseGuards(ProjectOwnerGuard)
  async addMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMember(id, userId, addMemberDto.userId);
  }

  // Eliminar miembro del proyecto
  @Delete(':userId/:id/members/:memberId')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.projectsService.removeMember(id, userId, memberId);
  }
}
