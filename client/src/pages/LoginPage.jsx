import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login, authError } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      addToast(`Welcome back, ${res.user.username}!`, 'success');
      navigate('/dashboard');
    } catch (error) {
      addToast(error.message || 'Invalid email or password', 'error');
      setErrors((prev) => ({ ...prev, general: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-4 bg-radial-gradient">
      <Card className="w-full max-w-md p-8 border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-indigo-500" />

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-purple-400 group-hover:text-cyan-300">
                <Crown className="w-5 h-5" />
              </div>
            </div>
          </Link>
          <h2 className="text-2xl font-black tracking-tight text-slate-100">Welcome Back</h2>
          <p className="text-sm text-slate-400 mt-1">Sign in to your ChessMaster account</p>
        </div>

        {(errors.general || authError) && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
            {errors.general || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="grandmaster@chess.com"
            icon={Mail}
            value={email}
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={Lock}
            rightIcon={showPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowPassword(!showPassword)}
            value={password}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
            }}
          />

          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0" />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-purple-400 font-semibold hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <Button variant="primary" type="submit" isLoading={isSubmitting} icon={LogIn} className="w-full mt-2 py-3">
            Sign In
          </Button>


        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-400 font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </Card>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={(updatedEmail) => {
          setEmail(updatedEmail);
          setPassword('');
        }}
      />
    </div>
  );
};

export default LoginPage;
