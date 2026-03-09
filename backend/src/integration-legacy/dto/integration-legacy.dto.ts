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
  MinLength,
} from 'class-validator';
import { INTEGRATION_EVENT_SEVERITIES, INTEGRATION_EVENT_STATUSES } from '../integration-legacy.types';

export class IntegrationDispatchQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class CreateOutgoingIntegrationEventDto {
  @IsUUID()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  eventType!: string;

  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correlationId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  schemaVersion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;
}

export class ConsumeIncomingIntegrationEventDto extends CreateOutgoingIntegrationEventDto {
  @IsString()
  @IsNotEmpty()
  correlationId!: string;
}

export class RetryIntegrationEventDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonMessage?: string;
}

export class ListIntegrationEventsQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsIn(INTEGRATION_EVENT_STATUSES)
  status?: (typeof INTEGRATION_EVENT_STATUSES)[number];

  @IsOptional()
  @IsIn(INTEGRATION_EVENT_SEVERITIES)
  severity?: (typeof INTEGRATION_EVENT_SEVERITIES)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correlationId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

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
