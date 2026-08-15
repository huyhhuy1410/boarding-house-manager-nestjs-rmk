export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface LoginResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
  }

  export interface User {
    id: string;
    authUserId: string;
    name: string;
    email: string;
    role: 'OWNER' | 'STAFF';
  }
