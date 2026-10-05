import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import InstallPrompt from './components/InstallPrompt';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import RunPage from './pages/RunPage';
import ActivityPage from './pages/ActivityPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HistoryPage from './pages/HistoryPage';

const tabs = [
  {
    to: '/',
    label: 'Map',
    end: true,
    icon: (
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />
    ),
  },
  {
    to: '/run',
    label: 'Run',
    icon: (
      <path d="M13 4a2 2 0 1 0 0-.01M7 21l3-6 3 2v4m-6-9 3-4 4 1 3 4m-7-1 2 3" />
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: <path d="M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />,
  },
  {
    to: '/leaderboard',
    label: 'Board',
    icon: <path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4" />,
  },
];

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="boot">
        <div className="brand-mark">TurfRun</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-root">
        <InstallPrompt />
        <Routes>
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="logo">
          TurfRun
        </NavLink>
        <button className="btn ghost tiny" onClick={logout}>
          Log out
        </button>
      </header>
      <InstallPrompt />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/run" element={<RunPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/activity/:id" element={<ActivityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
