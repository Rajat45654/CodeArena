import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(data: { email: string; username: string; password: string }) {
    // Check for existing email
    const existingEmail = await this.usersService.findByEmail(data.email.toLowerCase());
    if (existingEmail) {
      throw new ConflictException('An account with this email already exists');
    }

    // Check for existing username
    const existingUsername = await this.usersService.findByUsername(data.username.toLowerCase());
    if (existingUsername) {
      throw new ConflictException('This username is already taken');
    }

    // Hash password with argon2id
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,   // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.usersService.create({
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      passwordHash,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(data: { emailOrUsername: string; password: string }) {
    const user = await this.usersService.findByEmailOrUsername(data.emailOrUsername);

    if (!user) {
      // Constant-time response to prevent user enumeration
      await argon2.hash('dummy_to_prevent_timing_attack');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await argon2.verify(user.passwordHash, data.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user: safeUser, tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify token exists in DB (one-time use rotation)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or account disabled');
    }

    // Revoke old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;

    try {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, revoked: false },
        data: { revoked: true },
      });
    } catch {
      // Silently fail - token may not exist
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    username: string,
    role: string,
  ): Promise<TokenPair> {
    const basePayload = { email, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, ...basePayload, type: 'access' } satisfies JwtPayload,
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, ...basePayload, type: 'refresh' } satisfies JwtPayload,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const days = parseInt(refreshExpiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }
}
