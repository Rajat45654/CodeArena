import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestCaseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty({ example: '3\n1 2 3' })
  @IsString()
  input: string;

  @ApiProperty({ example: '6' })
  @IsString()
  expectedOutput: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isSample?: boolean = false;
}

export class CreateProblemDto {
  @ApiProperty({ example: 'Two Sum' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'two-sum' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: '# Two Sum\n\nGiven an array of integers...' })
  @IsString()
  @IsNotEmpty()
  statementMd: string;

  @ApiPropertyOptional({ example: 2000, default: 2000 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(10000)
  timeLimitMs?: number = 2000;

  @ApiPropertyOptional({ example: 256, default: 256 })
  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(1024)
  memoryLimitMb?: number = 256;

  @ApiPropertyOptional({ example: 'EASY' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;

  @ApiProperty({ type: [CreateTestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases: CreateTestCaseDto[];
}
