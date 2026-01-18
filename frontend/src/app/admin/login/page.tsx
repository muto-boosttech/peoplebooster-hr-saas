'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useAuth, useRedirectIfAuthenticated } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login, verifyMfa, isLoginPending, isMfaPending, loginError, mfaError } = useAuth();
  const { isLoading: isCheckingAuth } = useRedirectIfAuthenticated('/dashboard');
  
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);
      if (result.requiresMfa && result.mfaToken) {
        setMfaRequired(true);
        setMfaToken(result.mfaToken);
      } else {
        // Check if user is system admin
        if (result.user.role !== 'SYSTEM_ADMIN') {
          // Redirect non-admin users to regular dashboard
          router.push('/dashboard');
        } else {
          router.push(redirect);
        }
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleMfaSubmit = async () => {
    try {
      const result = await verifyMfa(mfaToken, mfaCode);
      if (result.user.role !== 'SYSTEM_ADMIN') {
        router.push('/dashboard');
      } else {
        router.push(redirect);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">システム管理者</CardTitle>
          <CardDescription className="text-slate-400">
            {mfaRequired
              ? '二要素認証コードを入力してください'
              : '管理者アカウントでログインしてください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaRequired ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfaCode" className="text-slate-200">認証コード</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  placeholder="6桁のコードを入力"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={6}
                  className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400"
                />
              </div>
              {mfaError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {(mfaError as Error).message || '認証コードが正しくありません'}
                </div>
              )}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={handleMfaSubmit}
                disabled={mfaCode.length !== 6 || isMfaPending}
              >
                {isMfaPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaToken('');
                  setMfaCode('');
                }}
              >
                戻る
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@peoplebooster.com"
                  {...register('email')}
                  className={`border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 ${
                    errors.email ? 'border-destructive' : ''
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`border-slate-600 bg-slate-700 pr-10 text-white placeholder:text-slate-400 ${
                      errors.password ? 'border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              {loginError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {(loginError as Error).message || 'ログインに失敗しました'}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600"
                disabled={isLoginPending}
              >
                {isLoginPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ログイン
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-slate-400">
          <p>
            一般ユーザーの方は{' '}
            <Link href="/login" className="text-amber-400 hover:underline">
              こちら
            </Link>
            {' '}からログインしてください
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
