import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request<
  Record<string, string>,
  unknown,
  { projectId?: string }
> {
  user: AuthenticatedUser;
}
