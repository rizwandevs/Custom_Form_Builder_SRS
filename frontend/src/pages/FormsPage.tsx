import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchForms,
  createForm,
  deleteForm,
  duplicateForm,
} from '../store/slices/formsSlice';

export default function FormsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((s) => s.forms);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    dispatch(fetchForms());
  }, [dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(createForm({ title }));
    if (createForm.fulfilled.match(result)) {
      setShowCreate(false);
      setTitle('');
      navigate(`/forms/${result.payload.id}/edit`);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Forms</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Form
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <label className="mb-1 block text-sm font-medium">Form title</label>
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="My Form"
              required
            />
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading forms...</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-500">No forms yet. Create your first form!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Submissions</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((form) => (
                <tr key={form.id} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-medium">{form.title}</td>
                  <td className="px-6 py-3 text-slate-500">{form.slug}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        form.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {form.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">{form.submissionCount ?? 0}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/forms/${form.id}/edit`}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/forms/${form.id}/submissions`}
                        className="text-indigo-600 hover:underline"
                      >
                        Submissions
                      </Link>
                      {form.status === 'published' && (
                        <Link
                          to={`/f/${form.slug}`}
                          target="_blank"
                          className="text-indigo-600 hover:underline"
                        >
                          View
                        </Link>
                      )}
                      <button
                        onClick={() => dispatch(duplicateForm(form.id))}
                        className="text-slate-600 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this form?')) dispatch(deleteForm(form.id));
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
