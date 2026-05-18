import type { FormField } from '../types';

export function isFieldVisible(
  field: FormField,
  values: Record<string, string>,
  allFields: FormField[]
): boolean {
  const showWhen = field.settings?.showWhen;
  if (!showWhen) return true;
  const dep = allFields.find((f) => f.name === showWhen.field);
  if (!dep) return true;
  return (values[showWhen.field] ?? '') === showWhen.equals;
}
