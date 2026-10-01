"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const widths = { sm: "md:max-w-md", md: "md:max-w-xl", lg: "md:max-w-3xl" };

/** Modal baseado em <dialog> nativo (foco, ESC e acessibilidade); vira "bottom sheet" no celular. */
export function Modal({ open, onClose, title, children, footer, size = "md" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-slate-900 shadow-xl",
        "md:m-auto md:rounded-2xl",
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
