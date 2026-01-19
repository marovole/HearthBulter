"use client";

import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastPayload) => {
    const message = title ?? description ?? "";
    const detail = title ? description : undefined;

    if (variant === "destructive") {
      sonnerToast.error(message, detail ? { description: detail } : undefined);
      return;
    }

    sonnerToast(message, detail ? { description: detail } : undefined);
  };

  return { toast };
}
