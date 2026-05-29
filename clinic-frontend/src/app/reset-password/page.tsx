'use client';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Check, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || null;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const allValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial && passwordsMatch;

  // Password strength calculation
  let strength = 0;
  if (hasMinLength) strength += 20;
  if (hasUpperCase) strength += 20;
  if (hasLowerCase) strength += 20;
  if (hasNumber) strength += 20;
  if (hasSpecial) strength += 20;

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-destructive';
    if (strength < 80) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthLabel = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (!allValid) {
      setError('Please meet all password requirements');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);

      // Mock expired token
      if (token === 'expired') {
        setError('This reset link has expired. Please request a new one.');
        return;
      }

      // Success
      setSuccess(true);
    }, 800);
  };

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or missing reset token. Please request a new password reset link.
              </AlertDescription>
            </Alert>
            <Button asChild className="h-11 w-full mt-4">
              <a href="/forgot">Request new link</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <CheckCircle2 className="h-6 w-6 text-foreground" />
              </div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-2">
                Password reset successful
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Button asChild className="h-11 w-full">
                <a href="/login">Return to Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />
        </div>

      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a strong password for your account
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11 pr-10"
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

              {/* Strength meter */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                  <span className={strength < 40 ? 'text-muted-foreground' : strength < 80 ? 'text-muted-foreground' : 'text-foreground'}>
                    {getStrengthLabel()}
                  </span>
                  </div>
                  <Progress value={strength || 0} className="h-1" indicatorClassName={getStrengthColor().replace('bg-destructive', 'bg-muted-foreground').replace('bg-warning', 'bg-muted-foreground').replace('bg-success', 'bg-foreground')} />
                </div>
              )}
            </div>

            {/* Password requirements */}
            {password && (
              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground font-medium">Password must contain:</p>
                <div className="space-y-1">
                  <RequirementItem met={hasMinLength} label="At least 8 characters" />
                  <RequirementItem met={hasUpperCase} label="One uppercase letter" />
                  <RequirementItem met={hasLowerCase} label="One lowercase letter" />
                  <RequirementItem met={hasNumber} label="One number" />
                  <RequirementItem met={hasSpecial} label="One special character" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={0}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <RequirementItem 
                  met={passwordsMatch as boolean} 
                  label={passwordsMatch ? "Passwords match" : "Passwords don't match"} 
                />
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={!allValid || isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3 w-3 text-foreground" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
