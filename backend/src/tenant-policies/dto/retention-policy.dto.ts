import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RetentionPolicyQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateRetentionPolicyDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36500)
  retentionDays!: number;

  @IsBoolean()
  legalHoldEnabled!: boolean;
}
