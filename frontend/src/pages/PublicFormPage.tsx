import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Form, FormField } from '../types';
import FieldInput from '../components/form/FieldInput';
import { isFieldVisible } from '../utils/conditional';
import { validateAllFields } from '../utils/fieldValidation';

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api<{ form: Form }>(`/api/public/forms/${slug}`)
      .then((data) => setForm(data.form))
      .catch(() => setForm(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleChange = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const validateClient = (fields: FormField[]): boolean => {
    const errs = validateAllFields(fields, values, files, (field) =>
      isFieldVisible(field, values, fields)
    );
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form?.fields || !slug) return;
    if (!validateClient(form.fields)) return;

    setSubmitting(true);
    try {
      const hasFiles = form.fields.some((f) => f.type === 'file' && files[f.name]);
      if (hasFiles) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(values)) {
          if (v) fd.append(k, v);
        }
        for (const [k, file] of Object.entries(files)) {
          fd.append(k, file);
        }
        const res = await fetch(`/api/public/forms/${slug}/submit`, {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submit failed');
        setMessage(data.message);
      } else {
        const data = await api<{ message: string }>(`/api/public/forms/${slug}/submit`, {
          method: 'POST',
          body: JSON.stringify(values),
        });
        setMessage(data.message);
      }
      setSubmitted(true);
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Form not found or not published.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">✓</div>
          <h1 className="mb-2 text-xl font-bold text-slate-900">Submitted!</h1>
          <p className="text-slate-600">{message}</p>
        </div>
      </div>
    );
  }

  const visibleFields =
    form.fields?.filter((f) => isFieldVisible(f, values, form.fields || [])) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-lg md:p-8">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{form.title}</h1>
        {form.description && <p className="mb-6 text-slate-600">{form.description}</p>}

        {errors._form && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errors._form}</div>
        )}

        <form onSubmit={handleSubmit}>
          {visibleFields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              onChange={handleChange}
              onFileChange={(name, file) => {
                if (file) setFiles((f) => ({ ...f, [name]: file }));
                else
                  setFiles((f) => {
                    const next = { ...f };
                    delete next[name];
                    return next;
                  });
              }}
              error={errors[field.name]}
            />
          ))}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
