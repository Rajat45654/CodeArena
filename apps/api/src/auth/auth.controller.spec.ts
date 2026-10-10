import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { Role } from '@codearena/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should register a new user and set auth cookies', async () => {
      const mockResult = {
        user: {
          id: 'u-1',
          email: 'student@college.edu',
          username: 'student',
          role: Role.USER,
          isActive: true,
          createdAt: new Date(),
        },
        tokens: {
          accessToken: 'acc.token',
          refreshToken: 'ref.token',
        },
      };

      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.register(
        { email: 'student@college.edu', username: 'student', password: 'Password123!' },
        mockResponse as Response,
      );

      expect(authService.register).toHaveBeenCalledWith({
        email: 'student@college.edu',
        username: 'student',
        password: 'Password123!',
      });
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: {
          id: 'u-1',
          email: 'student@college.edu',
          username: 'student',
          role: Role.USER,
        },
      });
    });
  });

  describe('login', () => {
    it('should login user and set auth cookies', async () => {
      const mockResult = {
        user: {
          id: 'u-1',
          email: 'student@college.edu',
          username: 'student',
          role: Role.USER,
          isActive: true,
          createdAt: new Date(),
        },
        tokens: {
          accessToken: 'acc.token',
          refreshToken: 'ref.token',
        },
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.login(
        { emailOrUsername: 'student@college.edu', password: 'Password123!' },
        mockResponse as Response,
      );

      expect(authService.login).toHaveBeenCalledWith({
        emailOrUsername: 'student@college.edu',
        password: 'Password123!',
      });
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result.user.id).toBe('u-1');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and set new cookies', async () => {
      const mockReq = {
        cookies: {
          refreshToken: 'valid-refresh-token',
        },
      } as unknown as Request;

      (authService.refresh as jest.Mock).mockResolvedValue({
        accessToken: 'new.acc.token',
        refreshToken: 'new.ref.token',
      });

      const result = await controller.refresh(mockReq, mockResponse as Response);

      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Token refreshed successfully' });
    });
  });

  describe('logout', () => {
    it('should revoke token and clear cookies', async () => {
      const mockReq = {
        cookies: {
          refreshToken: 'token-to-revoke',
        },
      } as unknown as Request;

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.logout(mockReq, mockResponse as Response);

      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return current user profile', () => {
      const mockUser = {
        id: 'u-1',
        email: 'student@college.edu',
        username: 'student',
        role: Role.USER,
        createdAt: new Date('2026-01-01'),
      };

      const result = controller.getMe(mockUser);

      expect(result).toEqual({
        id: 'u-1',
        email: 'student@college.edu',
        username: 'student',
        role: Role.USER,
        createdAt: mockUser.createdAt,
      });
    });
  });
});
