"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/input";

/** Wraps a trigger in a confirmation dialog, optionally capturing a comment. */
export function Confirm({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
  withComment,
  commentPlaceholder,
  commentRequired,
  defaultComment = "",
}: {
  children: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  variant?: "default" | "destructive" | "magenta" | "success";
  onConfirm: (comment: string) => void;
  withComment?: boolean;
  commentPlaceholder?: string;
  commentRequired?: boolean;
  defaultComment?: string;
}) {
  const [comment, setComment] = useState(defaultComment);
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setComment(defaultComment);
      }}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {withComment && (
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={commentPlaceholder ?? "Add a comment for the audit trail"} rows={3} />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={variant} disabled={commentRequired && !comment.trim()} onClick={() => onConfirm(comment.trim())}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
