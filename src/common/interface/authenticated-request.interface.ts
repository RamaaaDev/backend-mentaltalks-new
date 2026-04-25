import { Role } from '@prisma/client';
import { Request } from 'express';

export interface RequestUser {
  user_id: string;
  user_username: string;
  user_name: string;
  user_role: Role;
}

// Tetap butuh ini sebagai tipe di @Req()
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
