import { Injectable } from '@nestjs/common';
import { hashSync } from 'bcryptjs';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  roles: string[];
}

@Injectable()
export class UsersService {
  private readonly users: UserRecord[];

  constructor() {
    const email = process.env.AUTH_TEST_USER_EMAIL ?? 'user@agilys.local';
    const password = process.env.AUTH_TEST_USER_PASSWORD ?? 'ChangeMe123!';
    this.users = [
      {
        id: 'user-1',
        email,
        passwordHash: hashSync(password, 10),
        tenantId: 'tenant-1',
        roles: ['admin_client']
      }
    ];
  }

  findByEmail(email: string): UserRecord | undefined {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  findById(id: string): UserRecord | undefined {
    return this.users.find((user) => user.id === id);
  }
}
