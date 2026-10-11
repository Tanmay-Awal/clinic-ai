'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // kept in case used later, but no longer controls redirect

  const [email, setEmail] = useState('admin@clinic.ai');
  const [password, setPassword] = useState('adminpassword123');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    auth?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: undefined }));
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      return false;
    }
    setErrors(prev => ({ ...prev, password: undefined }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);

    if (!emailValid || !passwordValid) return;

    setIsLoading(true);

    try {
      // Import authApi dynamically to avoid SSR issues
      const { authApi } = await import('@/lib/api/auth');

      await authApi.login({ email, password });

      // Show success toast
      toast.success('Login successful! Redirecting...', {
        duration: 2000,
      });

      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on user role
      const { useAuthStore, hasActionsOnlyRole } = await import('@/store/authStore');
      const user = useAuthStore.getState().user;
      const isActionsOnly = hasActionsOnlyRole(user);
      router.push(isActionsOnly ? '/actions' : '/dashboard');
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';

      // Show error toast
      toast.error(errorMessage);

      // Track failed attempts for demo purposes
      if (errorMessage.includes('Invalid') || errorMessage.includes('credentials')) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= 5) {
          setErrors({ auth: 'Account locked due to too many failed attempts. Please contact support.' });
        } else if (newAttempts >= 3) {
          setErrors({ auth: 'Invalid credentials. Security check required after next attempt.' });
        } else {
          setErrors({ auth: errorMessage });
        }
      } else {
        setErrors({ auth: errorMessage });
      }
    }
  };

  const handleSSOLogin = async (provider: 'google' | 'microsoft' | 'okta') => {
    setIsSSOLoading(provider);
    setErrors({});

    // Simulate SSO redirect
    setTimeout(() => {
      setIsSSOLoading(null);
      // In real app: window.location.href = `/api/auth/sso/${provider}`;
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-dvh items-center justify-center px-4 bg-background"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-[420px]"
      >
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              CliniCall
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          {/* Auth error banner */}
          {errors.auth && (
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.auth}</AlertDescription>
            </Alert>
          )}

          {/* Rate limit / reCAPTCHA notice */}
          {failedAttempts >= 3 && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Security verification will be required after {5 - failedAttempts} more failed attempt(s).
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                autoComplete="username"
                required
                className="h-11"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={0}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => validatePassword(password)}
                  autoComplete="current-password"
                  required
                  className="h-11 pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Legal */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => e.preventDefault()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => e.preventDefault()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}


export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
