import {
  IsInt,
  Min,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTestCaseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  ordinal: number;

  @ApiProperty({ example: '1 2' })
  @IsString()
  input: string;

  @ApiProperty({ example: '3' })
  @IsString()
  expectedOutput: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSample?: boolean = false;
}

export class BatchAddTestCasesDto {
  @ApiProperty({ type: [AddTestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddTestCaseDto)
  testCases: AddTestCaseDto[];
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  ordinal?: number;

  @ApiPropertyOptional({ example: '5 6' })
  @IsOptional()
  @IsString()
  input?: string;

  @ApiPropertyOptional({ example: '11' })
  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSample?: boolean;
}
