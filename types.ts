
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface User {
  username: string;
  password_hash: string;
  role: UserRole;
  name: string | null;
  must_change_password: boolean;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Course {
  course_code: string;
  semester: string;
  name: string;
  department: string | null;
  teacher: string | null;
  default_points: number;
  created_at: string;
}

export interface StudentRecord {
  id: number;
  student_id: string;
  course_code: string;
  points: number;
  memo: string | null;
  imported_at: string;
  // Joined fields
  course?: Course;
}

export interface AuthSession {
  user: User;
}
