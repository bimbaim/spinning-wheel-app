import { useState } from 'react';
import { Eye, EyeOff, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../utils/supabase/client';
import { DEMO_CREDENTIALS, DEMO_TOKEN, initializeDemoData } from '../utils/demo-data';

interface AdminLoginProps {
  onLoginSuccess: (accessToken: string, isDemoMode: boolean) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if demo credentials
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        initializeDemoData();
        setTimeout(() => {
          onLoginSuccess(DEMO_TOKEN, true);
          setLoading(false);
        }, 500);
        return;
      }

      // Otherwise, use Supabase auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.session?.access_token) {
        onLoginSuccess(data.session.access_token, false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4 shadow-lg shadow-purple-500/50">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-2">Event Admin Panel</h1>
          <p className="text-slate-300">Spinning Wheel System</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email / Username
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-purple-500/50"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo Mode Button */}
          <div className="mt-4">
            <Button
              type="button"
              onClick={handleDemoLogin}
              variant="outline"
              className="w-full bg-gradient-to-r from-green-500/20 to-teal-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:text-green-300"
            >
              <Zap className="w-4 h-4 mr-2" />
              Demo Mode (Without Database)
            </Button>
            <p className="text-slate-500 text-xs text-center mt-2">
              Email: {DEMO_CREDENTIALS.email} | Password: {DEMO_CREDENTIALS.password}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-center text-sm mb-2">
              Don't have an admin account?
            </p>
            <details className="bg-slate-900/50 rounded-lg p-4 text-sm">
              <summary className="text-purple-400 cursor-pointer hover:text-purple-300 text-center">
                Click to view setup guide
              </summary>
              <div className="mt-3 text-slate-400 space-y-2">
                <p className="text-xs">Open Browser Console (F12) and run:</p>
                <code className="block bg-slate-950 p-2 rounded text-purple-300 text-xs overflow-x-auto">
                  setupAdmin("admin@event.com", "admin123", "Admin")
                </code>
                <p className="text-xs">Then login with those credentials.</p>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2025 Event Management System
        </p>
      </div>
    </div>
  );
}
