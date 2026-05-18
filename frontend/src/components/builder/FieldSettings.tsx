import type { FormField } from '../../types';
import ValidationSettings from './ValidationSettings';

interface Props {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
}

export default function FieldSettings({ field, allFields, onUpdate }: Props) {
  const optionsStr = Array.isArray(field.options) ? field.options.join('\n') : '';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900">Field Settings</h3>

      <div>
        <label className="mb-1 block text-sm font-medium">Label</label>
        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Field name (key)</label>
        <input
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value.replace(/\s/g, '_').toLowerCase() })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Required
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium">Placeholder</label>
        <input
          value={field.settings?.placeholder ?? ''}
          onChange={(e) =>
            onUpdate({ settings: { ...field.settings, placeholder: e.target.value } })
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {['select', 'radio'].includes(field.type) && (
        <div>
          <label className="mb-1 block text-sm font-medium">Options (one per line)</label>
          <textarea
            value={optionsStr}
            onChange={(e) =>
              onUpdate({
                options: e.target.value.split('\n').filter(Boolean),
              })
            }
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Conditional: show when field</label>
        <select
          value={field.settings?.showWhen?.field ?? ''}
          onChange={(e) => {
            const dep = e.target.value;
            onUpdate({
              settings: {
                ...field.settings,
                showWhen: dep
                  ? { field: dep, equals: field.settings?.showWhen?.equals ?? '' }
                  : undefined,
              },
            });
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Always visible</option>
          {allFields
            .filter((f) => f.name !== field.name)
            .map((f) => (
              <option key={f.name} value={f.name}>
                {f.label}
              </option>
            ))}
        </select>
      </div>

      <ValidationSettings field={field} onUpdate={onUpdate} />

      {field.settings?.showWhen && (
        <div>
          <label className="mb-1 block text-sm font-medium">Equals value</label>
          <input
            value={field.settings.showWhen.equals}
            onChange={(e) =>
              onUpdate({
                settings: {
                  ...field.settings,
                  showWhen: { ...field.settings!.showWhen!, equals: e.target.value },
                },
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
