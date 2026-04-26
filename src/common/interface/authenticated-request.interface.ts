import { Role } from '@prisma/client';
import { Request } from 'express';

export interface RequestUser {
  user_id: string;
  user_username: string;
  user_role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
