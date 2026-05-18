import type { FormField } from '../../types';
import { getFieldValidation } from '../../utils/fieldValidation';

interface Props {
  field: FormField;
  value: string;
  onChange: (name: string, value: string) => void;
  onFileChange?: (name: string, file: File | null) => void;
  error?: string;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function FieldInput({ field, value, onChange, onFileChange, error }: Props) {
  const opts = (field.options as string[]) || [];
  const validation = getFieldValidation(field);

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.settings?.placeholder}
            rows={4}
            className={inputClass}
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={inputClass}
            required={field.required}
          >
            <option value="">Select...</option>
            {opts.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {opts.map((o) => (
              <label key={o} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={o}
                  checked={value === o}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                />
                {o}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(field.name, e.target.checked ? 'true' : '')}
            />
            {field.label}
          </label>
        );
      case 'file': {
        const accept = validation.allowedTypes?.length
          ? validation.allowedTypes
              .map((t) => (t.startsWith('.') || t.includes('/') ? t : `.${t}`))
              .join(',')
          : undefined;
        return (
          <input
            type="file"
            name={field.name}
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onFileChange?.(field.name, file);
              onChange(field.name, file ? file.name : '');
            }}
            className={inputClass}
            required={field.required}
          />
        );
      }
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.settings?.placeholder}
            className={inputClass}
            required={field.required}
            min={(field.validation as { min?: number })?.min}
            max={(field.validation as { max?: number })?.max}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.settings?.placeholder}
            className={inputClass}
            required={field.required}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.settings?.placeholder}
            className={inputClass}
            required={field.required}
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="mb-4">
        {renderInput()}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {field.settings?.helpText && (
        <p className="mb-1 text-xs text-slate-500">{field.settings.helpText}</p>
      )}
      {field.type === 'file' && validation.maxFileSize && (
        <p className="mb-1 text-xs text-slate-500">
          Max size: {(validation.maxFileSize / (1024 * 1024)).toFixed(1)} MB
        </p>
      )}
      {renderInput()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
