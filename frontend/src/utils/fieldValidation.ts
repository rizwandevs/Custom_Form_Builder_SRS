import type { FormField } from '../types';

export type FieldValidation = {
  min?: number;
  max?: number;
  pattern?: string;
  maxFileSize?: number;
  allowedTypes?: string[];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getFieldValidation(field: FormField): FieldValidation {
  return (field.validation as FieldValidation) || {};
}

export function validateFieldValue(
  field: FormField,
  value: string,
  file?: File | null
): string | null {
  const validation = getFieldValidation(field);
  const trimmed = value.trim();

  if (field.required) {
    if (field.type === 'file') {
      if (!file && !trimmed) return `${field.label} is required`;
    } else if (!trimmed) {
      return `${field.label} is required`;
    }
  }

  if (field.type === 'file' && file) {
    if (validation.maxFileSize && file.size > validation.maxFileSize) {
      const mb = (validation.maxFileSize / (1024 * 1024)).toFixed(1);
      return `${field.label} must be ${mb}MB or smaller`;
    }
    if (validation.allowedTypes?.length) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeOk = validation.allowedTypes.some(
        (t) => t === file.type || t.replace('.', '') === ext || t === ext
      );
      if (!mimeOk) {
        return `${field.label} must be one of: ${validation.allowedTypes.join(', ')}`;
      }
    }
    return null;
  }

  if (!trimmed) return null;

  if (field.type === 'email' && !EMAIL_REGEX.test(trimmed)) {
    return `${field.label} must be a valid email`;
  }

  if (field.type === 'number') {
    const num = Number(trimmed);
    if (isNaN(num)) return `${field.label} must be a number`;
    if (validation.min !== undefined && num < validation.min) {
      return `${field.label} must be at least ${validation.min}`;
    }
    if (validation.max !== undefined && num > validation.max) {
      return `${field.label} must be at most ${validation.max}`;
    }
    return null;
  }

  if (validation.pattern) {
    try {
      if (!new RegExp(validation.pattern).test(trimmed)) {
        return `${field.label} format is invalid`;
      }
    } catch {
      /* ignore bad pattern */
    }
  }

  if (validation.min !== undefined && trimmed.length < validation.min) {
    return `${field.label} must be at least ${validation.min} characters`;
  }
  if (validation.max !== undefined && trimmed.length > validation.max) {
    return `${field.label} must be at most ${validation.max} characters`;
  }

  return null;
}

export function validateAllFields(
  fields: FormField[],
  values: Record<string, string>,
  files: Record<string, File>,
  isVisible: (field: FormField) => boolean
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!isVisible(field)) continue;
    const err = validateFieldValue(
      field,
      values[field.name] ?? '',
      files[field.name]
    );
    if (err) errors[field.name] = err;
  }
  return errors;
}
