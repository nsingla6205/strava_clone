import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import InstallPrompt from './components/InstallPrompt';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import RunPage from './pages/RunPage';
import ActivityPage from './pages/ActivityPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HistoryPage from './pages/HistoryPage';

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
      <>
        <InstallPrompt />
        <Routes>
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="logo">
          TurfRun
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Map
          </NavLink>
          <NavLink to="/run">Run</NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/leaderboard">Board</NavLink>
        </nav>
        <button className="btn ghost tiny" onClick={logout}>
          Out
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
