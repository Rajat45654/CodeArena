import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let prismaService: jest.Mocked<any>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked.jwt.token'),
      verify: jest.fn(),
    };

    prismaService = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test_access_secret',
          JWT_REFRESH_SECRET: 'test_refresh_secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({ email: 'test@test.com', username: 'newuser', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.findByUsername as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({ email: 'new@test.com', username: 'takenuser', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on success', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.findByUsername as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      });
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.register({
        email: 'test@test.com',
        username: 'testuser',
        password: 'StrongPass@123',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('mocked.jwt.token');
      expect(result.tokens.refreshToken).toBe('mocked.jwt.token');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      (usersService.findByEmailOrUsername as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ emailOrUsername: 'noone@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPw = await argon2.hash('correctPassword');
      (usersService.findByEmailOrUsername as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        passwordHash: hashedPw,
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      });

      await expect(
        authService.login({ emailOrUsername: 'test@test.com', password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and tokens for correct credentials', async () => {
      const hashedPw = await argon2.hash('correctPassword');
      (usersService.findByEmailOrUsername as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        passwordHash: hashedPw,
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      });
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login({
        emailOrUsername: 'test@test.com',
        password: 'correctPassword',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.tokens.accessToken).toBe('mocked.jwt.token');
    });

    it('should throw UnauthorizedException for disabled account', async () => {
      const hashedPw = await argon2.hash('correctPassword');
      (usersService.findByEmailOrUsername as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
        passwordHash: hashedPw,
        role: 'USER',
        isActive: false,
        createdAt: new Date(),
      });

      await expect(
        authService.login({ emailOrUsername: 'test@test.com', password: 'correctPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token silently', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await expect(authService.logout('some.refresh.token')).resolves.not.toThrow();
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should handle missing token without throwing', async () => {
      await expect(authService.logout('')).resolves.not.toThrow();
    });
  });
});
