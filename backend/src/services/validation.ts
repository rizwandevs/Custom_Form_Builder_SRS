import { FormField } from '@prisma/client';

export type FieldInput = Record<string, string | string[] | undefined>;

export interface ValidationError {
  field: string;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStringValue(data: FieldInput, name: string): string {
  const val = data[name];
  if (Array.isArray(val)) return val.join(', ');
  return val ?? '';
}

function isFieldVisible(
  field: FormField,
  data: FieldInput,
  allFields: FormField[]
): boolean {
  const settings = field.settings as { showWhen?: { field: string; equals: string } } | null;
  if (!settings?.showWhen) return true;

  const { field: depField, equals } = settings.showWhen;
  const dep = allFields.find((f) => f.name === depField);
  if (!dep) return true;

  return getStringValue(data, depField) === equals;
}

export type UploadedFile = { size: number; mimetype: string; originalname: string };

export function validateSubmission(
  fields: FormField[],
  data: FieldInput,
  uploadedFiles: Record<string, UploadedFile> = {}
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    if (!isFieldVisible(field, data, fields)) continue;

    const value = getStringValue(data, field.name);
    const validation = field.validation as {
      min?: number;
      max?: number;
      pattern?: string;
      maxFileSize?: number;
      allowedTypes?: string[];
    } | null;

    if (field.required) {
      const hasFile = field.type === 'file' && !!uploadedFiles[field.name];
      if (!hasFile && !value.trim()) {
        errors.push({ field: field.name, message: `${field.label} is required` });
        continue;
      }
    }

    if (field.type === 'file') {
      const file = uploadedFiles[field.name];
      if (file) {
        if (validation?.maxFileSize && file.size > validation.maxFileSize) {
          const mb = (validation.maxFileSize / (1024 * 1024)).toFixed(1);
          errors.push({
            field: field.name,
            message: `${field.label} must be ${mb}MB or smaller`,
          });
        }
        if (validation?.allowedTypes?.length) {
          const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
          const ok = validation.allowedTypes.some(
            (t) => t === file.mimetype || t.replace('.', '') === ext || t === ext
          );
          if (!ok) {
            errors.push({
              field: field.name,
              message: `${field.label} must be one of: ${validation.allowedTypes.join(', ')}`,
            });
          }
        }
      }
      continue;
    }

    if (!value.trim()) continue;

    switch (field.type) {
      case 'email':
        if (!EMAIL_REGEX.test(value)) {
          errors.push({ field: field.name, message: `${field.label} must be a valid email` });
        }
        break;

      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field: field.name, message: `${field.label} must be a number` });
        } else {
          if (validation?.min !== undefined && num < validation.min) {
            errors.push({ field: field.name, message: `${field.label} must be at least ${validation.min}` });
          }
          if (validation?.max !== undefined && num > validation.max) {
            errors.push({ field: field.name, message: `${field.label} must be at most ${validation.max}` });
          }
        }
        break;
      }

      default:
        if (validation?.pattern) {
          try {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              errors.push({ field: field.name, message: `${field.label} format is invalid` });
            }
          } catch {
            /* ignore invalid pattern */
          }
        }
        if (validation?.min !== undefined && value.length < validation.min) {
          errors.push({ field: field.name, message: `${field.label} must be at least ${validation.min} characters` });
        }
        if (validation?.max !== undefined && value.length > validation.max) {
          errors.push({ field: field.name, message: `${field.label} must be at most ${validation.max} characters` });
        }
    }
  }

  return errors;
}

export function evaluateVisibility(
  field: FormField,
  data: FieldInput,
  allFields: FormField[]
): boolean {
  return isFieldVisible(field, data, allFields);
}
