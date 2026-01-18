'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { User, Bell, Shield, Palette, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading } = useAuthStore();
  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return <PageLoading text="読み込み中..." />;
  }

  if (!user) {
    return null;
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600">アカウント設定とプリファレンスを管理します</p>
      </div>

      {/* プロフィール設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール設定
          </CardTitle>
          <CardDescription>基本的な個人情報を編集します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">氏名</Label>
              <Input id="fullName" defaultValue={user.fullName || ''} placeholder="山田 太郎" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">ニックネーム</Label>
              <Input id="nickname" defaultValue={user.nickname || ''} placeholder="ニックネーム" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" defaultValue={user.email} disabled />
            <p className="text-sm text-gray-500">メールアドレスは変更できません</p>
          </div>
        </CardContent>
      </Card>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知設定
          </CardTitle>
          <CardDescription>通知の受信設定を管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">メール通知</p>
              <p className="text-sm text-gray-500">重要な更新をメールで受け取る</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">診断リマインダー</p>
              <p className="text-sm text-gray-500">定期診断のリマインダーを受け取る</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">マーケティングメール</p>
              <p className="text-sm text-gray-500">新機能やキャンペーン情報を受け取る</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* セキュリティ設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            セキュリティ設定
          </CardTitle>
          <CardDescription>アカウントのセキュリティを管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">二要素認証</p>
              <p className="text-sm text-gray-500">ログイン時に追加の認証を要求する</p>
            </div>
            <Switch />
          </div>
          <div className="pt-4 border-t">
            <Button variant="outline">パスワードを変更</Button>
          </div>
        </CardContent>
      </Card>

      {/* 表示設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            表示設定
          </CardTitle>
          <CardDescription>アプリの表示をカスタマイズします</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ダークモード</p>
              <p className="text-sm text-gray-500">暗い配色に切り替える</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">コンパクト表示</p>
              <p className="text-sm text-gray-500">より多くの情報を画面に表示する</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
