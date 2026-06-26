"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
};

export function PendingSubmitButton({
  children,
  pendingText = "Salvataggio...",
  className,
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
