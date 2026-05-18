import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DashboardStats } from '../types';
import SubmissionsChart from '../components/dashboard/SubmissionsChart';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/api/dashboard/stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Forms', value: stats.totalForms, color: 'bg-indigo-500' },
    { label: 'Total Submissions', value: stats.totalSubmissions, color: 'bg-emerald-500' },
    { label: 'Last 7 Days', value: stats.submissionsLast7Days, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          to="/forms"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Manage forms
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className={`mb-3 inline-flex rounded-lg ${c.color} px-2 py-1 text-xs font-medium text-white`}>
              {c.label}
            </div>
            <p className="text-3xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 font-semibold text-slate-900">Submissions analytics (last 14 days)</h2>
        <SubmissionsChart data={stats.submissionsChart} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Your forms</h2>
            <Link to="/forms" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.forms.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No forms yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Submissions</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.forms.map((form) => (
                    <tr key={form.id} className="border-t border-slate-100">
                      <td className="px-6 py-3 font-medium">{form.title}</td>
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
                        <Link
                          to={`/forms/${form.id}/edit`}
                          className="text-indigo-600 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Recent submissions</h2>
          </div>
          {stats.recentSubmissions.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Form</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSubmissions.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-6 py-3">
                        <Link
                          to={`/forms/${s.formId}/submissions`}
                          className="text-indigo-600 hover:underline"
                        >
                          {s.formTitle}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
