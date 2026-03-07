import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { WORKFLOW_EXCEPTION_VOTE_DECISIONS } from '../workflow-exceptions.types';

export class VoteWorkflowExceptionDto {
  @IsUUID()
  exerciceId!: string;

  @IsIn(WORKFLOW_EXCEPTION_VOTE_DECISIONS)
  decision!: (typeof WORKFLOW_EXCEPTION_VOTE_DECISIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  commentaire?: string;
}
