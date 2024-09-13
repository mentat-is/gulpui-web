export interface Session {
  token: string;
  server: string;
  expires: number; 
}

export type Sessions = Session[];
