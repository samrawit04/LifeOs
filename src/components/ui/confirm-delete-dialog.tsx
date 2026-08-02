import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/**
 * A reusable, app-wide confirmation dialog for destructive delete actions.
 * Uses AlertDialog under the hood so it's fully accessible.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Delete this item?",
  description = "This action is permanent and cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border border-border bg-card text-card-foreground shadow-2xl rounded-2xl sm:max-w-sm p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-destructive/15 text-destructive shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </span>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs font-medium text-foreground/80 leading-relaxed pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="h-9 rounded-xl border border-border bg-background text-foreground hover:bg-muted/70 text-xs font-semibold">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-9 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-sm px-4"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
