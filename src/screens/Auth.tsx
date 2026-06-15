import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Auth() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError('Invalid credentials. Check APP_USER / APP_PASSWORD in .env.local');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-surface">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-tertiary/[0.03] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]"></div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-[440px] p-10 md:p-14 rounded-[3rem] relative overflow-hidden text-center z-10"
      >
        <div className="w-20 h-20 rounded-full glass-panel mx-auto mb-10 flex items-center justify-center text-tertiary border-tertiary/20 shadow-[0_0_30px_rgba(233,195,73,0.1)]">
          <LogIn size={36} />
        </div>

        <h1 className="font-display text-4xl text-on-surface mb-4 leading-tight">Sign in</h1>
        <p className="text-on-surface-variant font-sans mb-12 opacity-60">Enter your credentials to continue.</p>

        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant ml-1">Username</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-on-surface placeholder:text-on-surface-variant/20 focus:outline-none focus:border-tertiary/30 transition-all font-sans"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant ml-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-on-surface placeholder:text-on-surface-variant/20 focus:outline-none focus:border-tertiary/30 transition-all font-sans"
            />
          </div>
        </div>

        {error && (
          <div className="mt-6 px-4 py-3 bg-error/10 border border-error/20 rounded-2xl text-error text-sm text-left">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="w-full mt-12 py-5 bg-tertiary text-on-tertiary rounded-3xl font-bold uppercase text-xs tracking-[0.2em] shadow-2xl shadow-tertiary/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-8 pt-8 border-t border-white/5 text-[10px] text-on-surface-variant opacity-40 leading-relaxed">
          Defaults: <span className="text-tertiary font-mono">admin / changeme</span>.<br />Override in <span className="font-mono">.env.local</span>.
        </p>
      </motion.form>
    </div>
  );
}
