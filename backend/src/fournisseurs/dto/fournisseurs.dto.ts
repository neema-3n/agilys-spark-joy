import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class FournisseursQueryDto {
  @IsOptional()
  @IsString()
  statut?: string;
}

export class CreateFournisseurDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsString()
  @IsNotEmpty()
  typeFournisseur!: string;

  @IsOptional()
  @IsString()
  nomCourt?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  telephoneMobile?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @IsString()
  numeroContribuable?: string;

  @IsOptional()
  @IsString()
  registreCommerce?: string;

  @IsOptional()
  @IsString()
  formeJuridique?: string;

  @IsOptional()
  @IsString()
  banque?: string;

  @IsOptional()
  @IsString()
  numeroCompte?: string;

  @IsOptional()
  @IsString()
  codeSwift?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  conditionsPaiement?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  delaiLivraisonMoyen?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  noteEvaluation?: number;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  datePremiereCollaboration?: string;

  @IsOptional()
  @IsString()
  contactNom?: string;

  @IsOptional()
  @IsString()
  contactPrenom?: string;

  @IsOptional()
  @IsString()
  contactFonction?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactTelephone?: string;

  @IsOptional()
  @IsString()
  commentaires?: string;
}

export class UpdateFournisseurDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  typeFournisseur?: string;

  @IsOptional()
  @IsString()
  nomCourt?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  telephoneMobile?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @IsString()
  numeroContribuable?: string;

  @IsOptional()
  @IsString()
  registreCommerce?: string;

  @IsOptional()
  @IsString()
  formeJuridique?: string;

  @IsOptional()
  @IsString()
  banque?: string;

  @IsOptional()
  @IsString()
  numeroCompte?: string;

  @IsOptional()
  @IsString()
  codeSwift?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  conditionsPaiement?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  delaiLivraisonMoyen?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  noteEvaluation?: number;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  datePremiereCollaboration?: string;

  @IsOptional()
  @IsString()
  contactNom?: string;

  @IsOptional()
  @IsString()
  contactPrenom?: string;

  @IsOptional()
  @IsString()
  contactFonction?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactTelephone?: string;

  @IsOptional()
  @IsString()
  commentaires?: string;
}
