import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class AnalysesFinancieresQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @Matches(/^\d{4}(-\d{2})?$/, {
    message: 'La periode doit respecter le format AAAA ou AAAA-MM'
  })
  periode?: string;

  @IsOptional()
  @IsUUID()
  projetId?: string;

  @IsOptional()
  @IsUUID()
  structureId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @IsOptional()
  @IsUUID()
  actionId?: string;

  @IsOptional()
  @IsString()
  typeStructure?: string;
}

