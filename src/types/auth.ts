import { Role } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
