import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createMockContext = (): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if route is marked as @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException in handleRequest if user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException in handleRequest if error exists', () => {
    expect(() => guard.handleRequest(new Error('test error'), null)).toThrow(UnauthorizedException);
  });

  it('should return user in handleRequest if user is valid and no error', () => {
    const user = { id: 'u-1', email: 'student@college.edu' };
    expect(guard.handleRequest(null, user)).toEqual(user);
  });
});
