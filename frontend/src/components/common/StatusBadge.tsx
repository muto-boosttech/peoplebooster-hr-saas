'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  CheckCircle,
  FileText,
  Users,
  UserCheck,
  Trophy,
  Gift,
  XCircle,
  LogOut,
  Pause,
} from 'lucide-react';

// Candidate status types
export type CandidateStatus =
  | 'UNTOUCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DOCUMENT_SCREENING'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD';

// Interview status types
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

// Invoice status types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// User status types
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

// Diagnosis status types
export type DiagnosisStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// Status configuration
interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  icon?: React.ReactNode;
}

// Candidate status configuration
const candidateStatusConfig: Record<CandidateStatus, StatusConfig> = {
  UNTOUCHED: {
    label: '未対応',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    icon: <Clock className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    label: '診断中',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    icon: <Play className="h-3 w-3" />,
  },
  COMPLETED: {
    label: '診断完了',
    variant: 'default',
    className: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  DOCUMENT_SCREENING: {
    label: '書類選考',
    variant: 'default',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    icon: <FileText className="h-3 w-3" />,
  },
  FIRST_INTERVIEW: {
    label: '一次面接',
    variant: 'default',
    className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
    icon: <Users className="h-3 w-3" />,
  },
  SECOND_INTERVIEW: {
    label: '二次面接',
    variant: 'default',
    className: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
    icon: <Users className="h-3 w-3" />,
  },
  FINAL_INTERVIEW: {
    label: '最終面接',
    variant: 'default',
    className: 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100',
    icon: <UserCheck className="h-3 w-3" />,
  },
  OFFER: {
    label: 'オファー',
    variant: 'default',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    icon: <Gift className="h-3 w-3" />,
  },
  HIRED: {
    label: '採用',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
    icon: <Trophy className="h-3 w-3" />,
  },
  REJECTED: {
    label: '不採用',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
    icon: <XCircle className="h-3 w-3" />,
  },
  WITHDRAWN: {
    label: '辞退',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    icon: <LogOut className="h-3 w-3" />,
  },
  ON_HOLD: {
    label: '保留',
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    icon: <Pause className="h-3 w-3" />,
  },
};

// Interview status configuration
const interviewStatusConfig: Record<InterviewStatus, StatusConfig> = {
  SCHEDULED: {
    label: '予定',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    icon: <Clock className="h-3 w-3" />,
  },
  COMPLETED: {
    label: '完了',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'キャンセル',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    icon: <XCircle className="h-3 w-3" />,
  },
  NO_SHOW: {
    label: '欠席',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
    icon: <XCircle className="h-3 w-3" />,
  },
};

// Invoice status configuration
const invoiceStatusConfig: Record<InvoiceStatus, StatusConfig> = {
  DRAFT: {
    label: '下書き',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  SENT: {
    label: '送信済み',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  PAID: {
    label: '支払済み',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  OVERDUE: {
    label: '延滞',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
  CANCELLED: {
    label: 'キャンセル',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
};

// User status configuration
const userStatusConfig: Record<UserStatus, StatusConfig> = {
  ACTIVE: {
    label: 'アクティブ',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  INACTIVE: {
    label: '無効',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  PENDING: {
    label: '保留中',
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  },
};

// Diagnosis status configuration
const diagnosisStatusConfig: Record<DiagnosisStatus, StatusConfig> = {
  NOT_STARTED: {
    label: '未開始',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  IN_PROGRESS: {
    label: '進行中',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  COMPLETED: {
    label: '完了',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
};

// Props types
interface CandidateStatusBadgeProps {
  status: CandidateStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

interface InterviewStatusBadgeProps {
  status: InterviewStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'default';
}

interface UserStatusBadgeProps {
  status: UserStatus;
  size?: 'sm' | 'default';
}

interface DiagnosisStatusBadgeProps {
  status: DiagnosisStatus;
  size?: 'sm' | 'default';
}

// Candidate Status Badge
export function CandidateStatusBadge({
  status,
  showIcon = true,
  size = 'default',
}: CandidateStatusBadgeProps) {
  const config = candidateStatusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        config.className,
        size === 'sm' && 'px-1.5 py-0 text-xs'
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

// Interview Status Badge
export function InterviewStatusBadge({
  status,
  showIcon = true,
  size = 'default',
}: InterviewStatusBadgeProps) {
  const config = interviewStatusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        config.className,
        size === 'sm' && 'px-1.5 py-0 text-xs'
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

// Invoice Status Badge
export function InvoiceStatusBadge({ status, size = 'default' }: InvoiceStatusBadgeProps) {
  const config = invoiceStatusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, size === 'sm' && 'px-1.5 py-0 text-xs')}
    >
      {config.label}
    </Badge>
  );
}

// User Status Badge
export function UserStatusBadge({ status, size = 'default' }: UserStatusBadgeProps) {
  const config = userStatusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, size === 'sm' && 'px-1.5 py-0 text-xs')}
    >
      {config.label}
    </Badge>
  );
}

// Diagnosis Status Badge
export function DiagnosisStatusBadge({ status, size = 'default' }: DiagnosisStatusBadgeProps) {
  const config = diagnosisStatusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, size === 'sm' && 'px-1.5 py-0 text-xs')}
    >
      {config.label}
    </Badge>
  );
}

// Generic Status Badge (for custom statuses)
interface GenericStatusBadgeProps {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'default';
}

export function StatusBadge({
  label,
  variant = 'default',
  className,
  icon,
  size = 'default',
}: GenericStatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn('gap-1', className, size === 'sm' && 'px-1.5 py-0 text-xs')}
    >
      {icon}
      {label}
    </Badge>
  );
}

export default StatusBadge;
