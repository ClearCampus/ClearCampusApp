export type UserRole = "student" | "club";

interface BaseUser {
  id: string;
  email: string;
  name: string;
}

export interface StudentUser extends BaseUser {
  role: "student";
}

export interface ClubOfficerUser extends BaseUser {
  role: "club";
  clubSlug: string;
}

export type SessionUser = StudentUser | ClubOfficerUser;

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  expiresAt: number;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface SignupParams {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  clubSlug?: string;
}
