import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

interface AlertOptions {
  title?: string;
  confirmText?: string;
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
  destructive?: boolean;
}

interface DialogContextValue {
  alert: (message: string, opts?: AlertOptions) => Promise<void>;
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogState =
  | { kind: "alert"; message: string; title: string; confirmText: string }
  | {
      kind: "confirm";
      message: string;
      title: string;
      confirmText: string;
      cancelText: string;
      destructive: boolean;
    };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: unknown) => void) | null>(null);

  const close = useCallback((result: unknown) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const alert = useCallback(
    (message: string, opts?: AlertOptions) =>
      new Promise<void>((resolve) => {
        resolverRef.current = () => resolve();
        setState({
          kind: "alert",
          message,
          title: opts?.title ?? "Pemberitahuan",
          confirmText: opts?.confirmText ?? "OK",
        });
      }),
    [],
  );

  const confirm = useCallback(
    (message: string, opts?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = (v) => resolve(v as boolean);
        setState({
          kind: "confirm",
          message,
          title: opts?.title ?? "Konfirmasi",
          confirmText: opts?.confirmText ?? "Ya",
          cancelText: opts?.cancelText ?? "Batal",
          destructive: opts?.destructive ?? false,
        });
      }),
    [],
  );

  const destructiveCls =
    state?.kind === "confirm" && state.destructive
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600/20 text-white"
      : undefined;

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <AlertDialog
        open={!!state}
        onOpenChange={(open) => {
          if (!open) close(state?.kind === "confirm" ? false : undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state && (
              <AlertDialogDescription className="whitespace-pre-line">
                {state.message}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {state?.kind === "confirm" && (
              <AlertDialogCancel onClick={() => close(false)}>
                {state.cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={() =>
                close(state?.kind === "confirm" ? true : undefined)
              }
              className={destructiveCls}
            >
              {state?.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog harus dipanggil di dalam <DialogProvider>");
  }
  return ctx;
}
