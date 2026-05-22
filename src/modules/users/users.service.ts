import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { timingSafeEqual, scrypt } from 'crypto';

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
    const { password,...safeUser } = savedUser;
    return safeUser as User;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        password: true,
      },
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

    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, (err, derived) => {
        if (err) reject(err);
        else resolve(derived);
      });
    });
    const hashedBuffer = Buffer.from(key, 'hex');
    return timingSafeEqual(hashedBuffer, derivedKey);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ where: { isActive: true } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async deactivate(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: false });
  }
}
