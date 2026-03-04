import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class StructuresQueryDto {
  @IsOptional()
  @IsString()
  exerciceId?: string;
}

export class CreateStructureDto {
  @IsOptional()
  @IsString()
  exerciceId?: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsIn(['entite', 'service', 'centre_cout', 'direction'])
  type!: 'entite' | 'service' | 'centre_cout' | 'direction';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';
}

export class UpdateStructureDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsIn(['entite', 'service', 'centre_cout', 'direction'])
  type?: 'entite' | 'service' | 'centre_cout' | 'direction';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';
}
