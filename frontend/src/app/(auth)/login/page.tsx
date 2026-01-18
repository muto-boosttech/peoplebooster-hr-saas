'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Mail, Lock, Shield, AlertCircle } from 'lucide-react';
import { useAuth, useRedirectIfAuthenticated } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

const mfaSchema = z.object({
  code: z.string().length(6, 'MFAコードは6桁で入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MFAFormData = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login, verifyMfa, isLoginPending, loginError } = useAuth();
  const { isLoading: isCheckingAuth } = useRedirectIfAuthenticated('/dashboard');
  
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isMfaLoading, setIsMfaLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mfaForm = useForm<MFAFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);
      if (result.requiresMfa && result.mfaToken) {
        setMfaRequired(true);
        setMfaToken(result.mfaToken);
      } else {
        router.push(redirect);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const onMfaSubmit = async (data: MFAFormData) => {
    if (!mfaToken) return;
    
    setMfaError(null);
    setIsMfaLoading(true);
    try {
      await verifyMfa(mfaToken, data.code);
      router.push(redirect);
    } catch (error: any) {
      setMfaError(error.message || 'MFA認証に失敗しました');
    } finally {
      setIsMfaLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // MFA verification form
  if (mfaRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">2段階認証</CardTitle>
            <CardDescription>
              認証アプリに表示されている6桁のコードを入力してください
            </CardDescription>
          </CardHeader>
          <form onSubmit={mfaForm.handleSubmit(onMfaSubmit)}>
            <CardContent className="space-y-4">
              {mfaError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {mfaError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">認証コード</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  {...mfaForm.register('code')}
                />
                {mfaForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {mfaForm.formState.errors.code.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isMfaLoading}>
                {isMfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                認証
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaToken('');
                  setMfaError(null);
                  mfaForm.reset();
                }}
              >
                ログイン画面に戻る
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Login form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">P</span>
          </div>
          <CardTitle className="text-2xl font-bold">PeopleBooster</CardTitle>
          <CardDescription>
            アカウントにログインしてください
          </CardDescription>
        </CardHeader>
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
          <CardContent className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {(loginError as Error).message || 'ログインに失敗しました'}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  className={`pl-10 ${loginForm.formState.errors.email ? 'border-destructive' : ''}`}
                  {...loginForm.register('email')}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">パスワード</Label>
                <Link
                  href="/password-reset"
                  className="text-sm text-primary hover:underline"
                >
                  パスワードを忘れた方
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${loginForm.formState.errors.password ? 'border-destructive' : ''}`}
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoginPending}>
              {isLoginPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ログイン
            </Button>
          </CardFooter>
        </form>
        <div className="border-t px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            システム管理者の方は{' '}
            <Link href="/admin/login" className="text-primary hover:underline">
              こちら
            </Link>
            {' '}からログインしてください
          </p>
        </div>
      </Card>
    </div>
  );
}
