import type { FormField } from '../../types';
import type { FieldValidation } from '../../utils/fieldValidation';

interface Props {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

export default function ValidationSettings({ field, onUpdate }: Props) {
  const v = (field.validation as FieldValidation) || {};

  const setValidation = (patch: Partial<FieldValidation>) => {
    const next: FieldValidation = { ...v, ...patch };
    (Object.keys(next) as (keyof FieldValidation)[]).forEach((k) => {
      if (next[k] === undefined || next[k] === '' || (typeof next[k] === 'number' && Number.isNaN(next[k]))) {
        delete next[k];
      }
    });
    onUpdate({ validation: Object.keys(next).length ? next : null });
  };

  const numInput = (label: string, key: 'min' | 'max', placeholder: string) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type="number"
        value={v[key] ?? ''}
        onChange={(e) =>
          setValidation({
            [key]: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-semibold text-slate-800">Validation rules</h4>

      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-2">
          {numInput('Min value', 'min', '0')}
          {numInput('Max value', 'max', '100')}
        </div>
      )}

      {['text', 'textarea', 'email'].includes(field.type) && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Pattern (regex)
            </label>
            <input
              value={v.pattern ?? ''}
              onChange={(e) => setValidation({ pattern: e.target.value || undefined })}
              placeholder="e.g. ^[A-Za-z]+$"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {numInput('Min length', 'min', '1')}
            {numInput('Max length', 'max', '255')}
          </div>
        </>
      )}

      {field.type === 'file' && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Max file size (MB)
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={v.maxFileSize ? v.maxFileSize / (1024 * 1024) : ''}
              onChange={(e) =>
                setValidation({
                  maxFileSize:
                    e.target.value === ''
                      ? undefined
                      : Math.round(parseFloat(e.target.value) * 1024 * 1024),
                })
              }
              placeholder="5"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Allowed types (comma-separated)
            </label>
            <input
              value={v.allowedTypes?.join(', ') ?? ''}
              onChange={(e) =>
                setValidation({
                  allowedTypes: e.target.value
                    ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    : undefined,
                })
              }
              placeholder="image/jpeg, image/png, .pdf"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {!['number', 'text', 'textarea', 'email', 'file'].includes(field.type) && (
        <p className="text-xs text-slate-500">
          Use &quot;Required&quot; above. No extra rules for this field type.
        </p>
      )}
    </div>
  );
}
