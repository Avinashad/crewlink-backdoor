import { IsString, IsOptional, IsUrl, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;
}

export class CreateJobApplicationDto {
  @ApiProperty({ description: 'Job post ID' })
  @IsString()
  jobPostId: string;

  @ApiPropertyOptional({ description: 'Cover letter' })
  @IsString()
  @IsOptional()
  coverLetter?: string;

  @ApiPropertyOptional({ description: 'Resume URL' })
  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @ApiPropertyOptional({ description: 'Additional documents', type: [DocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  @IsOptional()
  additionalDocuments?: DocumentDto[];
}
