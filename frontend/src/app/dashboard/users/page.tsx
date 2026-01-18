'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Shield, 
  Building, 
  Calendar 
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// サンプルユーザーデータ
const sampleUsers = [
  {
    id: '1',
    email: 'admin@peoplebooster.com',
    fullName: 'システム管理者',
    role: 'SYSTEM_ADMIN',
    companyName: '-',
    isActive: true,
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    email: 'company-admin@example.com',
    fullName: '田中 一郎',
    role: 'COMPANY_ADMIN',
    companyName: '株式会社サンプル',
    isActive: true,
    createdAt: '2026-01-12',
  },
  {
    id: '3',
    email: 'user1@example.com',
    fullName: '山田 花子',
    role: 'COMPANY_USER',
    companyName: '株式会社サンプル',
    isActive: true,
    createdAt: '2026-01-13',
  },
  {
    id: '4',
    email: 'user2@example.com',
    fullName: '佐藤 次郎',
    role: 'GENERAL_USER',
    companyName: '-',
    isActive: false,
    createdAt: '2026-01-14',
  },
];

const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  SYSTEM_ADMIN: { label: 'システム管理者', variant: 'destructive' },
  COMPANY_ADMIN: { label: '企業管理者', variant: 'default' },
  COMPANY_USER: { label: '企業ユーザー', variant: 'secondary' },
  GENERAL_USER: { label: '一般ユーザー', variant: 'outline' },
};

export default function UsersPage() {
  const { user, isLoading } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return <PageLoading text="読み込み中..." />;
  }

  if (!user) {
    return null;
  }

  // 権限チェック - 一般ユーザーはアクセス不可
  if (user.role === 'GENERAL_USER') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">アクセス権限がありません</h2>
        <p className="text-gray-500 mt-2">このページを表示する権限がありません。</p>
      </div>
    );
  }

  const filteredUsers = sampleUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600">ユーザーの一覧と管理</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          新規ユーザー
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sampleUsers.length}</p>
                <p className="text-sm text-gray-500">総ユーザー数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sampleUsers.filter(u => u.isActive).length}</p>
                <p className="text-sm text-gray-500">アクティブ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-gray-500">企業管理者</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-gray-500">今月の新規</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ユーザーリスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ユーザー一覧
          </CardTitle>
          <CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="名前またはメールで検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>企業</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleLabels[u.role]?.variant || 'outline'}>
                      {roleLabels[u.role]?.label || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.companyName}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'default' : 'secondary'}>
                      {u.isActive ? 'アクティブ' : '非アクティブ'}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>詳細を表示</DropdownMenuItem>
                        <DropdownMenuItem>編集</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">削除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
