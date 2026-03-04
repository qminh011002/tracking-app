import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  const isDeleteAction = React.useMemo(() => {
    const lowerConfirm = confirmText.trim().toLowerCase();
    const lowerTitle = title.trim().toLowerCase();
    return (
      lowerConfirm.includes("delete") ||
      lowerTitle.includes("delete") ||
      lowerTitle.includes("xóa")
    );
  }, [confirmText, title]);

  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    if (!open || !isDeleteAction) {
      setCountdown(0);
      return;
    }
    setCountdown(3);
  }, [open, isDeleteAction]);

  React.useEffect(() => {
    if (!open || countdown <= 0) return;
    const timer = window.setTimeout(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [open, countdown]);

  const confirmDisabled = loading || countdown > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={confirmDisabled}
            className={countdown > 0 ? "opacity-55" : undefined}
          >
            {loading
              ? "Processing..."
              : countdown > 0
                ? `${confirmText} (${countdown}s)`
                : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
