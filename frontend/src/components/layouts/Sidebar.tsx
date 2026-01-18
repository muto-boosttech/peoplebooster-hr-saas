'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Building2,
  ClipboardList,
  UserCheck,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CreditCard,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui-store';
import { UserRole } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  roles?: UserRole[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'メイン',
    items: [
      {
        id: 'dashboard',
        label: 'ダッシュボード',
        icon: <Home className="h-5 w-5" />,
        href: '/dashboard',
      },
    ],
  },
  {
    title: '管理',
    items: [
      {
        id: 'users',
        label: 'ユーザー管理',
        icon: <Users className="h-5 w-5" />,
        href: '/dashboard/users',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN'],
      },
      {
        id: 'companies',
        label: '企業管理',
        icon: <Building2 className="h-5 w-5" />,
        href: '/dashboard/companies',
        roles: ['SYSTEM_ADMIN'],
      },
    ],
  },
  {
    title: '診断',
    items: [
      {
        id: 'diagnosis',
        label: '診断管理',
        icon: <ClipboardList className="h-5 w-5" />,
        href: '/dashboard/diagnosis',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'],
      },
      {
        id: 'results',
        label: '診断結果',
        icon: <BarChart3 className="h-5 w-5" />,
        href: '/dashboard/diagnosis/results',
      },
    ],
  },
  {
    title: '採用管理',
    items: [
      {
        id: 'candidates',
        label: '候補者管理',
        icon: <UserCheck className="h-5 w-5" />,
        href: '/dashboard/ats/candidates',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'],
      },
      {
        id: 'interviews',
        label: '面接スケジュール',
        icon: <ClipboardList className="h-5 w-5" />,
        href: '/dashboard/ats/interviews',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'],
      },
    ],
  },
  {
    title: 'レポート',
    items: [
      {
        id: 'reports',
        label: 'レポート',
        icon: <FileText className="h-5 w-5" />,
        href: '/dashboard/reports',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN'],
      },
    ],
  },
  {
    title: '請求',
    items: [
      {
        id: 'billing',
        label: '請求管理',
        icon: <CreditCard className="h-5 w-5" />,
        href: '/dashboard/billing',
        roles: ['SYSTEM_ADMIN', 'COMPANY_ADMIN'],
      },
    ],
  },
];

const bottomMenuItems: MenuItem[] = [
  {
    id: 'settings',
    label: '設定',
    icon: <Settings className="h-5 w-5" />,
    href: '/dashboard/settings',
  },
  {
    id: 'help',
    label: 'ヘルプ',
    icon: <HelpCircle className="h-5 w-5" />,
    href: '/dashboard/help',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasAnyRoles } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const canAccessItem = (item: MenuItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return hasAnyRoles(item.roles);
  };

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter(canAccessItem),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-lg font-bold">P</span>
              </div>
              <span className="text-lg font-semibold">PeopleBooster</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebarCollapsed}
            className={cn(sidebarCollapsed && 'mx-auto')}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-4 px-2">
            {filteredSections.map((section) => (
              <div key={section.title}>
                {!sidebarCollapsed && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive(item.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          sidebarCollapsed && 'justify-center'
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        {item.icon}
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Menu */}
        <div className="border-t p-2">
          <ul className="space-y-1">
            {bottomMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    sidebarCollapsed && 'justify-center'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={() => logout()}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
                title={sidebarCollapsed ? 'ログアウト' : undefined}
              >
                <LogOut className="h-5 w-5" />
                {!sidebarCollapsed && <span>ログアウト</span>}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
