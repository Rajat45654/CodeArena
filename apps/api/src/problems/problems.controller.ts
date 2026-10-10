import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@codearena/shared-types';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemQueryDto } from './dto/problem-query.dto';
import { AddTestCaseDto } from './dto/add-test-case.dto';
import { Public, Roles, CurrentUser } from '../common/decorators';

@ApiTags('Problems')
@Controller()
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  // ============================================================================
  // Public Endpoints
  // ============================================================================

  @Public()
  @Get('problems')
  @ApiOperation({ summary: 'List all published problems (public)' })
  @ApiResponse({ status: 200, description: 'Paginated list of problems' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'difficulty', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getPublicProblems(@Query() query: ProblemQueryDto) {
    return this.problemsService.findAllPublic(query);
  }

  @Public()
  @Get('problems/:slug')
  @ApiOperation({ summary: 'Get problem detail with sample test cases only (public)' })
  @ApiResponse({ status: 200, description: 'Problem details with sample test cases' })
  @ApiResponse({ status: 404, description: 'Problem not found or unpublished' })
  async getPublicProblemBySlug(@Param('slug') slug: string) {
    return this.problemsService.findBySlugPublic(slug);
  }

  // ============================================================================
  // Admin Endpoints (RBAC: ADMIN only)
  // ============================================================================

  @Roles(Role.ADMIN)
  @Post('admin/problems')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new problem with test cases (Admin)' })
  @ApiResponse({ status: 201, description: 'Problem created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  @ApiResponse({ status: 409, description: 'Problem slug already exists' })
  async createProblem(@Body() dto: CreateProblemDto, @CurrentUser() user: any) {
    return this.problemsService.createProblem(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/problems')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all problems including drafts (Admin)' })
  @ApiResponse({ status: 200, description: 'Admin problem list with stats' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  async getAdminProblems(@Query() query: ProblemQueryDto) {
    return this.problemsService.findAllAdmin(query);
  }

  @Roles(Role.ADMIN)
  @Get('admin/problems/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full problem details including all test cases (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem with all test cases' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async getAdminProblemById(@Param('id') id: string) {
    return this.problemsService.findByIdAdmin(id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/problems/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update problem details (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem updated successfully' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async updateProblem(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problemsService.updateProblem(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/problems/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem deleted successfully' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  async deleteProblem(@Param('id') id: string) {
    return this.problemsService.deleteProblem(id);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/problems/:id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle publish status of a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Problem publish status updated' })
  async togglePublish(
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.problemsService.togglePublish(id, isPublished);
  }

  @Roles(Role.ADMIN)
  @Post('admin/problems/:id/test-cases')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a test case to a problem (Admin)' })
  @ApiResponse({ status: 201, description: 'Test case added successfully' })
  @ApiResponse({ status: 409, description: 'Ordinal conflict' })
  async addTestCase(@Param('id') id: string, @Body() dto: AddTestCaseDto) {
    return this.problemsService.addTestCase(id, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin/problems/:id/test-cases/batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload batch test cases to a problem (Admin)' })
  @ApiResponse({ status: 201, description: 'Batch test cases added successfully' })
  async addTestCasesBatch(
    @Param('id') id: string,
    @Body() dto: { testCases: AddTestCaseDto[] },
  ) {
    return this.problemsService.addTestCasesBatch(id, dto.testCases);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/problems/:id/test-cases/:testCaseId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a test case in a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Test case updated successfully' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  async updateTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: Partial<AddTestCaseDto>,
  ) {
    return this.problemsService.updateTestCase(id, testCaseId, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/problems/:id/test-cases/:testCaseId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a test case from a problem (Admin)' })
  @ApiResponse({ status: 200, description: 'Test case deleted successfully' })
  async deleteTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
  ) {
    return this.problemsService.deleteTestCase(id, testCaseId);
  }
}
