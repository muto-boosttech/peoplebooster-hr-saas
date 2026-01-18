'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Info, CheckCircle, Loader2 } from 'lucide-react';

type DialogVariant = 'default' | 'danger' | 'warning' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: DialogVariant;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const variantConfig: Record<
  DialogVariant,
  {
    icon: React.ReactNode;
    iconClassName: string;
    confirmButtonVariant: 'default' | 'destructive' | 'outline' | 'secondary';
  }
> = {
  default: {
    icon: <Info className="h-6 w-6" />,
    iconClassName: 'bg-blue-100 text-blue-600',
    confirmButtonVariant: 'default',
  },
  danger: {
    icon: <Trash2 className="h-6 w-6" />,
    iconClassName: 'bg-red-100 text-red-600',
    confirmButtonVariant: 'destructive',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    iconClassName: 'bg-amber-100 text-amber-600',
    confirmButtonVariant: 'default',
  },
  success: {
    icon: <CheckCircle className="h-6 w-6" />,
    iconClassName: 'bg-green-100 text-green-600',
    confirmButtonVariant: 'default',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
  variant = 'default',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                config.iconClassName
              )}
            >
              {config.icon}
            </div>
            <div className="space-y-2">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        {children && <div className="py-4">{children}</div>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete confirmation dialog preset
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="削除の確認"
      description={
        itemName
          ? `「${itemName}」を削除してもよろしいですか？この操作は取り消せません。`
          : 'この項目を削除してもよろしいですか？この操作は取り消せません。'
      }
      confirmLabel="削除"
      variant="danger"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

// Logout confirmation dialog preset
interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function LogoutDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: LogoutDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ログアウト"
      description="ログアウトしてもよろしいですか？"
      confirmLabel="ログアウト"
      variant="warning"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

// Status change confirmation dialog preset
interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  newStatus: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  currentStatus,
  newStatus,
  onConfirm,
  isLoading,
}: StatusChangeDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ステータス変更の確認"
      description={`ステータスを「${currentStatus}」から「${newStatus}」に変更してもよろしいですか？`}
      confirmLabel="変更"
      variant="default"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

export default ConfirmDialog;
