'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  
  // Local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for a premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (email === 'admin@tdc.com' && password === 'tdc2024') {
      login({
        id: 'mm-1',
        email: 'admin@tdc.com',
        name: 'Admin Matchmaker',
        role: 'admin',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        lastLogin: new Date().toISOString()
      });
      router.push('/dashboard');
    } else {
      setError('Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent opacity-40 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary opacity-50 blur-3xl" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-xl shadow-foreground/5 p-8 z-10 relative"
      >
        {/* Top brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
            <Heart className="size-7 text-primary fill-primary/20 animate-pulse" />
            <Sparkles className="size-4 text-amber-500 absolute -top-1 -right-1" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight text-center">
            The Divine Connection
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center font-medium">
            Matchmaker Portal Login
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-3.5 mb-6 flex items-start gap-3"
            >
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-destructive font-medium leading-relaxed">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/80">
                <Mail className="size-4" />
              </span>
              <input
                id="email-input"
                type="email"
                required
                disabled={isLoading}
                placeholder="admin@tdc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/80">
                <Lock className="size-4" />
              </span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground/80 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="size-4 rounded border-border text-primary focus:ring-primary/20 bg-background cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 text-xs text-muted-foreground font-medium select-none cursor-pointer">
              Remember me on this device
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-primary text-primary-foreground font-medium rounded-xl text-sm transition-all hover:bg-primary/95 flex items-center justify-center shadow-md shadow-primary/10 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center text-[11px] text-muted-foreground font-medium border-t border-border/60 pt-4">
          <p>Mock Credentials: <span className="text-foreground/80 font-semibold bg-secondary px-1.5 py-0.5 rounded">admin@tdc.com</span> / <span className="text-foreground/80 font-semibold bg-secondary px-1.5 py-0.5 rounded">tdc2024</span></p>
        </div>
      </motion.div>
    </div>
  );
}
