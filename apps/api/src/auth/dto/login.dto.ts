import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'student@college.edu OR rajatmalik' })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  emailOrUsername: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
