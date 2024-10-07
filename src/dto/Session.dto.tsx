export interface Session {
  token: string;
  server: string;
  expires: number;
  user_id: number;
}

export type Sessions = Session[];
