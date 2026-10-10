import { IsInt, Min, IsString, IsBoolean, IsOptional } from 'class-validator';
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
