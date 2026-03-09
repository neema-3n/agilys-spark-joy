import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  INTERNAL_CONTROL_PLAN_PRIORITIES,
  INTERNAL_CONTROL_PLAN_STATUSES,
  type InternalControlPlanPriority,
  type InternalControlPlanStatus,
} from '../controle-interne.types';

export class InternalControlQueryDto {
  @IsUUID()
  exerciceId!: string;
}

export class InternalControlActionPlanListQueryDto extends InternalControlQueryDto {
  @IsOptional()
  @IsIn(INTERNAL_CONTROL_PLAN_STATUSES)
  status?: InternalControlPlanStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class CreateInternalControlActionPlanDto extends InternalControlQueryDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  ownerUserId!: string;

  @IsDateString()
  dueDate!: string;

  @IsIn(INTERNAL_CONTROL_PLAN_PRIORITIES)
  priority!: InternalControlPlanPriority;

  @IsIn(INTERNAL_CONTROL_PLAN_STATUSES)
  status!: InternalControlPlanStatus;

  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  exceptionId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correlationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceRefs?: string[];

  @ValidateIf((value: CreateInternalControlActionPlanDto) => value.status === 'rejete')
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class UpdateInternalControlActionPlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(INTERNAL_CONTROL_PLAN_PRIORITIES)
  priority?: InternalControlPlanPriority;

  @IsOptional()
  @IsIn(INTERNAL_CONTROL_PLAN_STATUSES)
  status?: InternalControlPlanStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceRefs?: string[];

  @IsOptional()
  @ValidateIf((value: UpdateInternalControlActionPlanDto) => value.status === 'rejete')
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
