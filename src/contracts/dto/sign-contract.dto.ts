import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignContractDto {
  @ApiProperty({ description: 'I agree this constitutes my legally binding electronic signature' })
  @IsBoolean()
  consentElectronicSig: boolean;

  @ApiProperty({ description: 'I consent to receive and sign documents electronically' })
  @IsBoolean()
  consentElectronicDelivery: boolean;

  @ApiProperty({ description: 'I understand I may withdraw consent and request paper copies' })
  @IsBoolean()
  consentWithdrawalRight: boolean;

  @ApiProperty({ description: 'I confirm I have the tools to access this document' })
  @IsBoolean()
  consentAccessibility: boolean;
}
