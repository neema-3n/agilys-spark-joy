import { IsIn, IsString } from 'class-validator';
import { BUSINESS_ROLES } from '../authorization.types';

export class AssignRoleDto {
  @IsString()
  @IsIn([...BUSINESS_ROLES])
  role!: string;
}
