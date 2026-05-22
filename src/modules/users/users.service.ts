import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(crearUsuarioDto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashPassword(crearUsuarioDto.password);
    const nuevo = this.usersRepository.create({
      ...crearUsuarioDto,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(nuevo);
    const { password, ...safeUser } = savedUser;
    return safeUser as User;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'createdAt', 'password'],
    });
  }

  async all(
    page = 1,
    limit = 10,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const take = limit;
    const skip = (page - 1) * take;
    const [data, total] = await this.usersRepository.findAndCount({
      skip,
      take,
    });
    return { data, total, page, limit };
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashedBuffer = Buffer.from(key, 'hex');
    return timingSafeEqual(hashedBuffer, derivedKey);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }
}
