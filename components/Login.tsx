
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { AuthSession } from '../types';
import { Lock, Loader2, AlertCircle, Database } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface LoginProps {
  onLogin: (session: AuthSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{title: string, message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanUsername = username.trim();
    const inputPassword = password;

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw { title: '連線異常', message: fetchError.message };
      if (!data) throw { title: '登入失敗', message: '帳號不存在或已被停用' };

      const cleanHash = (data.password_hash || '').trim();

      // Validate password
      const passwordMatch = await bcrypt.compare(inputPassword, cleanHash);
      
      if (!passwordMatch) {
        throw { 
          title: '登入失敗', 
          message: '帳號或密碼輸入錯誤' 
        };
      }

      // Success - Update last login time
      await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('username', cleanUsername);
      onLogin({ user: data });
      
    } catch (err: any) {
      setError(err.title ? err : { title: '發生錯誤', message: err.message || '未知錯誤' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold">服務學習管理系統</h2>
          <p className="text-indigo-100 mt-2 text-sm">請輸入帳號密碼</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{error.title}</p>
                  <p className="text-xs opacity-90 leading-relaxed">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">帳號</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Database size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="請輸入學號或帳號"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">密碼</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : '確認登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
