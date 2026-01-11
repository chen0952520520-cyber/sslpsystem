
import React, { useState, useEffect } from 'react';
import { AuthSession, UserRole } from './types';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import StudentPortal from './components/StudentPortal';
import PasswordChange from './components/PasswordChange';
import { LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic local session persistence for the custom auth system
    const savedSession = localStorage.getItem('sslp_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (session: AuthSession) => {
    setSession(session);
    localStorage.setItem('sslp_session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('sslp_session');
  };

  const handlePasswordChanged = (updatedUser: any) => {
    const newSession = { ...session!, user: updatedUser };
    setSession(newSession);
    localStorage.setItem('sslp_session', JSON.stringify(newSession));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  // Mandatory password change check
  if (session.user.must_change_password) {
    return (
      <PasswordChange 
        user={session.user} 
        onPasswordChanged={handlePasswordChanged} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar - 提升 z-index 到 50，並確保背景完全不透明 */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              S
            </div>
            <h1 className="font-bold text-slate-800 hidden sm:block">服務學習點數管理系統</h1>
            <h1 className="font-bold text-slate-800 sm:hidden">SSLP</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{session.user.name || session.user.username}</p>
              <p className="text-xs text-slate-500">{session.user.role === UserRole.ADMIN ? '管理員' : '學生'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="登出"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - 加入相對定位確保其在 header 下方 */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-0">
        {session.user.role === UserRole.ADMIN ? (
          <AdminPortal />
        ) : (
          <StudentPortal studentId={session.user.username} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400">© 2026 SSLP 學生服務學習點數管理系統 v2.0</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
