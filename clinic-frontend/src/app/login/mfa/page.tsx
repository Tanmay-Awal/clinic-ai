'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Copy, Check } from 'lucide-react';

const OTPInput = ({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled: boolean;
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(6 - value.length).fill(''));

  const handleChange = (index: number, newValue: string) => {
    if (disabled) return;
    
    // Handle paste
    if (newValue.length > 1) {
      const pastedValue = newValue.replace(/\D/g, '').slice(0, 6);
      onChange(pastedValue);
      const nextIndex = Math.min(pastedValue.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit
    if (!/^\d*$/.test(newValue)) return;
    
    const newDigits = [...digits];
    newDigits[index] = newValue;
    const newCode = newDigits.join('').replace(/\s/g, '');
    onChange(newCode);

    // Auto-advance
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; return undefined; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

function LoginMFAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const mfaToken = searchParams.get('mfa_token');

  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'email'>('totp');
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Mock recovery codes
  const recoveryCodes = [
    'xxxx-1234',
    'xxxx-5678',
    'xxxx-9012',
    'xxxx-3456',
    'xxxx-7890',
  ];

  // Redirect if no MFA token
  useEffect(() => {
    if (!mfaToken) {
      router.push('/login');
    }
  }, [mfaToken, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !isVerifying) {
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    
    setIsVerifying(true);
    setError(null);

    // Simulate verification
    setTimeout(() => {
      setIsVerifying(false);

      // Mock: success on 123456
      if (code === '123456') {
        router.push(returnUrl);
        return;
      }

      // Mock: failure
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setError('Too many failed attempts. Please wait 5 minutes before trying again.');
      } else {
        setError('Invalid or expired code. Please try again.');
      }
      
      setCode('');
    }, 800);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    
    setResendCooldown(30);
    setError(null);
    // Simulate resend API call
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
        console.log('Resending code via', method);
    }
  };

  const handleMethodSwitch = () => {
    setMethod(method === 'totp' ? 'email' : 'totp');
    setCode('');
    setError(null);
  };

  const copyRecoveryCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!mfaToken) {
    return null;
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
              Two-Factor Authentication
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {method === 'totp' 
                ? 'Enter the 6-digit code from your authenticator app'
                : 'Enter the code sent to your email'
              }
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Attempts warning */}
          {attempts >= 3 && attempts < 5 && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {5 - attempts} attempt(s) remaining before temporary lockout
              </AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
          <div className="mb-6">
            <OTPInput 
              value={code} 
              onChange={setCode} 
              disabled={isVerifying || attempts >= 5}
            />
          </div>

          {/* Actions */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying || attempts >= 5}
              className="h-11 w-full font-medium"
            >
              {isVerifying ? 'Verifying...' : 'Verify Code'}
            </Button>

            {method === 'email' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="h-11 w-full"
              >
                {resendCooldown > 0 
                  ? `Resend code (${resendCooldown}s)` 
                  : 'Resend code'
                }
              </Button>
            )}
          </div>

          {/* Alternative method */}
          <div className="text-center space-y-2">
            <button
              onClick={handleMethodSwitch}
              className="text-sm text-primary hover:underline"
            >
              Use {method === 'totp' ? 'email code' : 'authenticator app'} instead
            </button>
            <br />
            <button
              onClick={() => setShowRecoveryCodes(true)}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Use recovery code
            </button>
          </div>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to login
            </a>
          </div>
        </div>

        {/* Hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          Hint: Use code 123456 for testing
        </p>
      </div>

      {/* Recovery Codes Modal */}
      <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery Codes</DialogTitle>
            <DialogDescription>
              Use one of these codes if you don't have access to your authenticator app.
              Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {recoveryCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-4 py-2"
              >
                <code className="text-sm font-mono">{code}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyRecoveryCode(code)}
                  className="h-8 w-8 p-0"
                >
                  {copiedCode === code ? (
                    <Check className="h-4 w-4 text-foreground" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginMFA() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginMFAContent />
    </Suspense>
  );
}
