import type { User } from '../../types';

interface Props {
  user: Pick<User, 'name' | 'email' | 'avatar'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-16 w-16 text-2xl',
  lg: 'h-24 w-24 text-3xl',
};

export function getDisplayName(user: Pick<User, 'name' | 'email'>): string {
  if (user.name?.trim()) return user.name.trim();
  return user.email.split('@')[0];
}

export default function UserAvatar({ user, size = 'sm', className = '' }: Props) {
  const label = getDisplayName(user);
  const sizeClass = sizes[size];

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={label}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-indigo-600 font-semibold uppercase text-white ${sizeClass} ${className}`}
    >
      {label.charAt(0)}
    </span>
  );
}
