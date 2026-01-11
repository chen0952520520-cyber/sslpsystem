
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface PasswordChangeProps {
  user: any;
  onPasswordChanged: (updatedUser: any) => void;
  onLogout: () => void;
}

const PasswordChange: React.FC<PasswordChangeProps> = ({ user, onPasswordChanged, onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation Rules (SRS 4.1.2)
    if (newPassword === user.username) {
      setError('新密碼不得與舊密碼（學號）相同');
      return;
    }
    if (newPassword.length < 6) {
      setError('密碼長度需大於 6 碼');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('密碼確認不符');
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: passwordHash,
          must_change_password: false 
        })
        .eq('username', user.username)
        .select()
        .single();

      if (updateError) throw updateError;
      
      onPasswordChanged(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold">加強帳號安全</h2>
          <p className="text-indigo-100 mt-2">初次登入或重置密碼，請設定新密碼</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">新密碼</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="輸入新密碼"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">確認新密碼</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="再次輸入新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase">密碼規則</h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li className="flex items-center gap-2">• 長度至少 6 碼</li>
              <li className="flex items-center gap-2">• 不得與舊密碼（學號）相同</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                更新並進入系統
                <ArrowRight size={18} />
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onLogout}
            className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors"
          >
            取消登入
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChange;
