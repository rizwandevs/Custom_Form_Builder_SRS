import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
  }`;

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/forms': 'Forms',
  '/profile': 'Profile',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/forms/') && pathname.endsWith('/edit')) return 'Form Builder';
  if (pathname.includes('/submissions')) return 'Submissions';
  return pageTitles[pathname] ?? 'Form Builder';
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 pt-16 transition-transform lg:static lg:z-auto lg:translate-x-0 lg:pt-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="hidden h-16 items-center border-b border-slate-700 px-4 lg:flex">
          <Link to="/dashboard" className="text-lg font-bold text-white">
            Admin Dashboard
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          <NavLink to="/dashboard" className={navClass} onClick={() => setSidebarOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/forms" className={navClass} onClick={() => setSidebarOpen(false)}>
            Forms
          </NavLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:left-64">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/dashboard" className="text-lg font-bold text-slate-900 lg:hidden">
              Form Builder
            </Link>
            <h1 className="hidden text-lg font-semibold text-slate-800 lg:block">{pageTitle}</h1>
          </div>
          <UserMenu />
        </header>

        <main className="flex-1 overflow-auto p-4 pt-20 md:p-6 md:pt-24 lg:p-8 lg:pt-24">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
