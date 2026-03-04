import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RapprochementsBancairesQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateRapprochementBancaireDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  compteId!: string;

  @IsString()
  @IsNotEmpty()
  dateDebut!: string;

  @IsString()
  @IsNotEmpty()
  dateFin!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  soldeReleve!: number;

  @IsOptional()
  @IsString()
  observations?: string;
}
