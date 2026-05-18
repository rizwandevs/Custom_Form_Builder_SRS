export function serializeUser(user: {
  id: number;
  name: string | null;
  email: string;
  avatar: string | null;
  role: string;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
  };
}
