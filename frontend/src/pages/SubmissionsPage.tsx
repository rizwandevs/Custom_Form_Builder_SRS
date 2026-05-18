import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchForm } from '../store/slices/formsSlice';
import {
  fetchSubmissions,
  fetchSubmission,
  clearSubmissions,
} from '../store/slices/submissionsSlice';
import { getToken } from '../api/client';

export default function SubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const formId = parseInt(id || '0', 10);
  const dispatch = useAppDispatch();
  const { current } = useAppSelector((s) => s.forms);
  const { list, current: submission, pagination, loading } = useAppSelector((s) => s.submissions);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchForm(formId));
    return () => {
      dispatch(clearSubmissions());
    };
  }, [dispatch, formId]);

  useEffect(() => {
    dispatch(
      fetchSubmissions({
        formId,
        page,
        search,
        from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      })
    );
  }, [dispatch, formId, page, search, dateFrom, dateTo]);

  useEffect(() => {
    if (detailId) {
      dispatch(fetchSubmission({ formId, submissionId: detailId }));
    }
  }, [dispatch, formId, detailId]);

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const exportCsv = async () => {
    const token = getToken();
    const res = await fetch(`/api/forms/${formId}/submissions/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current?.slug || 'form'}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldLabels = Object.fromEntries(
    (current?.fields || []).map((f) => [f.name, f.label])
  );

  const hasFilters = search || dateFrom || dateTo;

  return (
    <div>
      <div className="mb-6">
        <Link to="/forms" className="text-sm text-indigo-600 hover:underline">
          ← Back to forms
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Submissions: {current?.title || '...'}
        </h1>
      </div>

      <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search submissions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={exportCsv}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Export CSV
          </button>
          <Link
            to={`/forms/${formId}/edit`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Edit Form
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
          {hasFilters ? 'No submissions match your filters.' : 'No submissions yet.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Submitted</th>
                <th className="px-6 py-3">Preview</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-6 py-3">#{s.id}</td>
                  <td className="px-6 py-3">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="max-w-xs truncate px-6 py-3 text-slate-500">
                    {Object.entries(s.values)
                      .slice(0, 2)
                      .map(([k, v]) => `${fieldLabels[k] || k}: ${v}`)
                      .join(' · ')}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setDetailId(s.id)}
                      className="text-indigo-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm">
            Page {page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {detailId && submission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Submission #{submission.id}</h2>
              <button onClick={() => setDetailId(null)} className="text-slate-500 hover:text-slate-800">
                ×
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              {new Date(submission.createdAt).toLocaleString()}
            </p>
            <dl className="space-y-3">
              {Object.entries(submission.values).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs font-medium text-slate-500">{fieldLabels[key] || key}</dt>
                  <dd className="break-words text-sm text-slate-900">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
