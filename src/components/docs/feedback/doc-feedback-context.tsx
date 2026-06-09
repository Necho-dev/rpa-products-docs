'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DocFeedbackDialog } from '@/components/docs/feedback/doc-feedback-dialog';
import { DocFeedbackToast } from '@/components/docs/feedback/doc-feedback-toast';
import type { DocFeedbackOpenPayload } from '@/lib/docs/feedback/types';

type DocFeedbackContextValue = {
  enabled: boolean;
  open: boolean;
  openFeedback: (payload: DocFeedbackOpenPayload) => void;
};

const DocFeedbackContext = createContext<DocFeedbackContextValue | null>(null);

export function useDocFeedbackOptional(): DocFeedbackContextValue | null {
  return useContext(DocFeedbackContext);
}

export function useDocFeedback(): DocFeedbackContextValue {
  const ctx = useContext(DocFeedbackContext);
  if (!ctx) {
    return {
      enabled: false,
      open: false,
      openFeedback: () => {},
    };
  }
  return ctx;
}

export function DocFeedbackProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<DocFeedbackOpenPayload | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openFeedback = useCallback(
    (next: DocFeedbackOpenPayload) => {
      if (!enabled) return;
      setPayload(next);
      setOpen(true);
    },
    [enabled],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  const handleSubmitted = useCallback(() => {
    setSuccessMessage('反馈已提交，感谢！');
    window.setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const value = useMemo<DocFeedbackContextValue>(
    () => ({
      enabled,
      open,
      openFeedback,
    }),
    [enabled, open, openFeedback],
  );

  return (
    <DocFeedbackContext.Provider value={value}>
      {children}
      {enabled ? (
        <>
          <DocFeedbackDialog
            open={open}
            onClose={handleClose}
            payload={payload}
            onSubmitted={handleSubmitted}
          />
          {successMessage ? (
            <DocFeedbackToast
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          ) : null}
        </>
      ) : null}
    </DocFeedbackContext.Provider>
  );
}
