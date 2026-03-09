import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { OFFLINE_SYNC_STATUSES } from '../offline-sync.types';

export class SyncOfflineItemDto {
  @IsUUID()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  localId!: string;

  @IsString()
  @IsNotEmpty()
  operationType!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  correlationId!: string;

  @IsOptional()
  @IsDateString()
  queuedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  retryCount?: number;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class ListOfflineSyncItemsQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsIn(OFFLINE_SYNC_STATUSES)
  status?: (typeof OFFLINE_SYNC_STATUSES)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correlationId?: string;

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

export class RetryOfflineSyncItemDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonMessage?: string;
}

export class OfflineSyncHealthQueryDto {
  @IsUUID()
  exerciceId!: string;
}
