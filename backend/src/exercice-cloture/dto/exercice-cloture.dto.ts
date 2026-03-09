import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReouvrirExerciceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  motif!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  approbateur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  impact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  regularisationAttendue?: string;
}
