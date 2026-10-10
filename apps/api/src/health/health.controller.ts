import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators';

@ApiTags('Health')
@Public()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  getLiveness() {
    return {
      status: 'ok',
      service: 'codearena-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for database connectivity' })
  @ApiResponse({ status: 200, description: 'All critical dependencies are healthy' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are down' })
  async getReadiness(@Res() res: Response) {
    const checks: Record<string, 'ok' | 'failed'> = {};
    let isHealthy = true;

    // PostgreSQL connectivity check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'failed';
      isHealthy = false;
    }

    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json({
      status: isHealthy ? 'ready' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    });
  }
}
