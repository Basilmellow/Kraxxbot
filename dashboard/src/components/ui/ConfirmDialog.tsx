'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

const ConfirmationContext = createContext<((message: string) => Promise<boolean>) | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  const confirm = useCallback((nextMessage: string) => new Promise<boolean>((answer) => {
    resolve.current?.(false);
    resolve.current = answer;
    setMessage(nextMessage);
  }), []);
  function finish(answer: boolean) {
    resolve.current?.(answer);
    resolve.current = null;
    setMessage(null);
  }
  return <ConfirmationContext.Provider value={confirm}>{children}
    <Modal isOpen={message !== null} onClose={() => finish(false)} title="Confirm action" maxWidth="sm">
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><Button autoFocus variant="secondary" onClick={() => finish(false)}>Cancel</Button><Button variant="danger" onClick={() => finish(true)}>Confirm</Button></div>
    </Modal>
  </ConfirmationContext.Provider>;
}

export function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('ConfirmationProvider is required');
  return confirm;
}
