import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileFieldValueDto {
  @ApiProperty()
  @IsString()
  fieldConfigId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fieldValue?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  valueJson?: Record<string, unknown>;
}

export class SaveProfileFieldsDto {
  @ApiProperty({ type: [ProfileFieldValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileFieldValueDto)
  fields: ProfileFieldValueDto[];
}
