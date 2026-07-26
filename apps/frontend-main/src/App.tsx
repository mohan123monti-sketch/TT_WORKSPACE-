import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5001';

function getToken() { return localStorage.getItem('invonix_token'); }
function setToken(t: string) { localStorage.setItem('invonix_token', t); }
function clearToken() { localStorage.removeItem('invonix_token'); }

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ---------- Types ----------
interface User { id: number; name: string; email: string; role: string; }
interface Invoice {
  id: number; invoice_number: string; customer_id: number; customer_name?: string;
  issue_date: string; due_date: string; status: string; total_amount: number; notes?: string;
}
interface Customer { id: number; name: string; email: string; phone?: string; company?: string; }
interface DashboardStats { totalInvoices: number; totalRevenue: number; pending: number; overdue: number; }

// ---------- Login ----------
function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.data.token);
      onLogin(data.data.user);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <h1>INVONIX</h1>
          <p>Invoice Management System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@techturf.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="error-msg">⚠ {error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        <p className="login-footer">Powered by Tech Turf OS</p>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    apiFetch('/api/dashboard/stats').then(d => setStats(d.data)).catch(() => {});
  }, []);

  const cards = stats ? [
    { label: 'Total Invoices', value: stats.totalInvoices, color: '#6c63ff', icon: '📄' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, color: '#00d4aa', icon: '💰' },
    { label: 'Pending', value: stats.pending, color: '#f5a623', icon: '⏳' },
    { label: 'Overdue', value: stats.overdue, color: '#ff4d6d', icon: '🔴' },
  ] : [];

  return (
    <div className="page">
      <h2 className="page-title">Dashboard</h2>
      <div className="stats-grid">
        {stats ? cards.map(c => (
          <div key={c.label} className="stat-card" style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        )) : <div className="loading-pulse">Loading stats...</div>}
      </div>
    </div>
  );
}

// ---------- Invoices ----------
function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/invoices').then(d => setInvoices(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = inv.invoice_number.toLowerCase().includes(q) || (inv.customer_name || '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { paid: '#00d4aa', pending: '#f5a623', overdue: '#ff4d6d', draft: '#888' };
    return <span className="badge" style={{ background: map[s] || '#888' }}>{s.toUpperCase()}</span>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Invoices</h2>
      </div>
      <div className="toolbar">
        <input className="search-input" placeholder="🔍 Search by number or customer..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      {loading ? <div className="loading-pulse">Loading invoices...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Customer</th><th>Issue Date</th><th>Due Date</th><th>Amount</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td><span className="mono">{inv.invoice_number}</span></td>
                  <td>{inv.customer_name || `Customer #${inv.customer_id}`}</td>
                  <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td><strong>₹{Number(inv.total_amount).toLocaleString()}</strong></td>
                  <td>{statusBadge(inv.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Customers ----------
function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/customers').then(d => setCustomers(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2 className="page-title">Customers</h2>
      {loading ? <div className="loading-pulse">Loading customers...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th></tr></thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.company || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Main App ----------
type Page = 'dashboard' | 'invoices' | 'customers';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getToken()) {
      apiFetch('/api/auth/profile')
        .then(d => setUser(d.data))
        .catch(() => clearToken())
        .finally(() => setChecking(false));
    } else { setChecking(false); }
  }, []);

  if (checking) return <div className="splash">Loading Invonix...</div>;
  if (!user) return <LoginPage onLogin={u => setUser(u)} />;

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'invoices', label: 'Invoices', icon: '📄' },
    { id: 'customers', label: 'Customers', icon: '👥' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">INVONIX</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user.name[0].toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-btn" title="Logout" onClick={() => { clearToken(); setUser(null); }}>⏻</button>
        </div>
      </aside>
      <main className="main-content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'invoices' && <Invoices />}
        {page === 'customers' && <Customers />}
      </main>
    </div>
  );
}
