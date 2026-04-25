import { Request } from 'express';

export interface RequestUser {
  user_id: string;
  user_username: string;
  user_name: string;
}

// Tetap butuh ini sebagai tipe di @Req()
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
