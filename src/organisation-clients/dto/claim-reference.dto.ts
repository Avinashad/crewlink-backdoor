import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimReferenceDto {
  @ApiProperty({ example: 'ABC12XYZ', description: 'Reference code from organisation' })
  @IsString()
  @IsNotEmpty()
  referenceCode: string;
}
