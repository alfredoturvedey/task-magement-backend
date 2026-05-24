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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectOwnerGuard } from '../auth/guards/project-owner.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { PaginationDto } from '../../shared/dto/pagination.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Listar proyectos del usuario autenticado
  @Get()
  async findAll(
    @RequestDecorator() request: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    return this.projectsService.findByUser(request.user.userId, pagination);
  }

  // Crear un nuevo proyecto
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @RequestDecorator() request: AuthenticatedRequest,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(createProjectDto, request.user.userId);
  }

  // Obtener un proyecto específico
  @Get(':id')
  @UseGuards(ProjectMemberGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  // Actualizar un proyecto
  @Put(':id')
  @UseGuards(ProjectOwnerGuard)
  async update(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(
      id,
      request.user.userId,
      updateProjectDto,
    );
  }

  // Eliminar un proyecto
  @Delete(':id')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.projectsService.remove(id, request.user.userId);
  }

  // Añadir miembro al proyecto
  @Post(':id/members')
  @UseGuards(ProjectOwnerGuard)
  async addMember(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMember(
      id,
      request.user.userId,
      addMemberDto.userId,
    );
  }

  // Eliminar miembro del proyecto
  @Delete(':id/members/:memberId')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @RequestDecorator() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    await this.projectsService.removeMember(id, request.user.userId, memberId);
  }
}
