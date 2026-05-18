export interface User {
  id: number;
  name?: string | null;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt?: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  avatarFile?: File | null;
  removeAvatar?: boolean;
}

export interface FormField {
  id?: number;
  type: string;
  label: string;
  name: string;
  order: number;
  required: boolean;
  options?: string[] | null;
  validation?: Record<string, unknown> | null;
  settings?: {
    placeholder?: string;
    helpText?: string;
    showWhen?: { field: string; equals: string };
  } | null;
}

export interface Form {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  status: 'draft' | 'published';
  settings?: { thankYouMessage?: string } | null;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
  fields?: FormField[];
}

export interface Submission {
  id: number;
  createdAt: string;
  values: Record<string, string>;
}

export interface DashboardStats {
  totalForms: number;
  totalSubmissions: number;
  submissionsLast7Days: number;
  recentSubmissions: Array<{
    id: number;
    formId: number;
    formTitle: string;
    formSlug: string;
    createdAt: string;
  }>;
  forms: Form[];
  submissionsChart: Array<{ date: string; count: number }>;
}

export const FIELD_TYPES = [
  { type: 'text', label: 'Text' },
  { type: 'email', label: 'Email' },
  { type: 'number', label: 'Number' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'select', label: 'Select' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'radio', label: 'Radio' },
  { type: 'file', label: 'File' },
] as const;
