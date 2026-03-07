import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateWorkflowExceptionDto } from './dto/create-workflow-exception.dto';
import { ListWorkflowExceptionsDto } from './dto/list-workflow-exceptions.dto';
import { VoteWorkflowExceptionDto } from './dto/vote-workflow-exception.dto';
import { WorkflowExceptionsService } from './workflow-exceptions.service';

@Controller('workflow-exceptions')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class WorkflowExceptionsController {
  constructor(private readonly workflowExceptionsService: WorkflowExceptionsService) {}

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateWorkflowExceptionDto) {
    return this.workflowExceptionsService.create(user, body);
  }

  @Get()
  @RequirePermissions('referentiels:read')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWorkflowExceptionsDto) {
    return this.workflowExceptionsService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('exerciceId') exerciceId?: string) {
    return this.workflowExceptionsService.getById(user, id, exerciceId);
  }

  @Post(':id/votes')
  @RequirePermissions('referentiels:write')
  vote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: VoteWorkflowExceptionDto) {
    return this.workflowExceptionsService.vote(user, id, body);
  }
}
