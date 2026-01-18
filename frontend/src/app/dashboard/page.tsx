'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { SystemAdminDashboard } from '@/components/dashboard/SystemAdminDashboard';
import { CompanyAdminDashboard } from '@/components/dashboard/CompanyAdminDashboard';
import { CompanyUserDashboard } from '@/components/dashboard/CompanyUserDashboard';
import { GeneralUserDashboard } from '@/components/dashboard/GeneralUserDashboard';
import { PageLoading } from '@/components/common/LoadingSpinner';

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <PageLoading text="読み込み中..." />;
  }

  if (!user) {
    return null;
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'SYSTEM_ADMIN':
      return <SystemAdminDashboard />;
    case 'COMPANY_ADMIN':
      return <CompanyAdminDashboard />;
    case 'COMPANY_USER':
      return <CompanyUserDashboard />;
    case 'GENERAL_USER':
    default:
      return <GeneralUserDashboard />;
  }
}
