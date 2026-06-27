export type Role = 'seller' | 'buyer' | 'admin' | 'driver';

export interface AuthUser {
  sub: string; // user id
  role: Role | null;
}
