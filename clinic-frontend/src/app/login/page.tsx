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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            <input type="hidden" name="_csrf" value="mock_csrf_token" />

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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked: boolean) => setRememberMe(checked)}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* SSO buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => handleSSOLogin('google')}
              disabled={!!isSSOLoading}
            >
              {isSSOLoading === 'google' ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => handleSSOLogin('microsoft')}
              disabled={!!isSSOLoading}
            >
              {isSSOLoading === 'microsoft' ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0H0v11.4h11.4V0z" />
                  <path d="M24 0H12.6v11.4H24V0z" />
                  <path d="M11.4 12.6H0V24h11.4V12.6z" />
                  <path d="M24 12.6H12.6V24H24V12.6z" />
                </svg>
              )}
              Microsoft
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => handleSSOLogin('okta')}
              disabled={!!isSSOLoading}
            >
              {isSSOLoading === 'okta' ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              Okta
            </Button>
          </div>

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

        {/* Hint for testing */}
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          Hint: Use mfa@test.com to test MFA flow, demo@fail.com to test errors
        </p>
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
