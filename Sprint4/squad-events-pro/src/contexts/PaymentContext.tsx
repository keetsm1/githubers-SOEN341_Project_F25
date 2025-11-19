import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type PaymentStatus = 'success' | 'failure';

type PaymentRecord = {
  eventId: string;
  amount: number;
  status: PaymentStatus;
  timestamp: number;
  details?: any;
};

type Confirmation = {
  eventId: string;
  title?: string;
  amount?: number;
  status: PaymentStatus;
  retry?: (() => void) | null;
};

type PaymentContextValue = {
  payments: Record<string, PaymentRecord>;
  markPaid: (eventId: string, amount?: number, details?: any) => void;
  hasPaidLocally: (eventId: string) => boolean;
  showConfirmation: (c: Confirmation) => void;
  clearConfirmation: () => void;
};

const STORAGE_KEY_BASE = 'app_payments_state_v1';

const PaymentContext = createContext<PaymentContextValue | null>(null);

export const usePayment = () => {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayment must be used within PaymentProvider');
  return ctx;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Payments are now scoped per-user in localStorage to avoid cross-account leakage
  const storageKey = `${STORAGE_KEY_BASE}:${user?.id ?? 'anon'}`;

  const [payments, setPayments] = useState<Record<string, PaymentRecord>>({});

  // Hydrate payments for the current user when the provider mounts or when the user changes
  useEffect(() => {
    try {
      // If an old global key exists (`app_payments_state_v1`) it can leak payments across accounts.
      // When a real user is present, back it up and remove the global key so it no longer affects other users.
      const legacyKey = STORAGE_KEY_BASE;
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw && user && user.id) {
        // Back up legacy data in case we need to inspect it later
        try {
          localStorage.setItem(`${legacyKey}__backup_${Date.now()}`, legacyRaw);
        } catch {}
        try { localStorage.removeItem(legacyKey); } catch {}
      }

      // Also handle anon-scoped payments (`app_payments_state_v1:anon`) which may have been
      // left by previous unauthenticated sessions; remove them when a real user signs in so
      // they don't incorrectly mark the event paid for every new account.
      const anonKey = `${STORAGE_KEY_BASE}:anon`;
      const anonRaw = localStorage.getItem(anonKey);
      if (anonRaw && user && user.id) {
        try {
          localStorage.setItem(`${anonKey}__backup_${Date.now()}`, anonRaw);
        } catch {}
        try { localStorage.removeItem(anonKey); } catch {}
      }

      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setPayments({});
        return;
      }
      setPayments(JSON.parse(raw) as Record<string, PaymentRecord>);
    } catch {
      setPayments({});
    }
  }, [storageKey]);

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(payments));
    } catch {}
  }, [payments, storageKey]);

  const markPaid = (eventId: string, amount?: number, details?: any) => {
    const id = String(eventId).trim();
    const amountNum = amount ?? 0;
    const rec: PaymentRecord = { eventId: id, amount: amountNum, status: 'success', timestamp: Date.now(), details };
    setPayments((p) => {
      const next = { ...p, [id]: rec };
      try {
        // Persist immediately to avoid losing state if user navigates away quickly
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const hasPaidLocally = (eventId: string) => {
    const id = String(eventId).trim();
    return !!payments[id] && payments[id].status === 'success';
  };

  const showConfirmation = (c: Confirmation) => setConfirmation(c);
  const clearConfirmation = () => setConfirmation(null);

  return (
    <PaymentContext.Provider value={{ payments, markPaid, hasPaidLocally, showConfirmation, clearConfirmation }}>
      {children}

      {/* Global confirmation modal rendered by the provider */}
      <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.status === 'success' ? 'Payment Successful' : 'Payment Failed'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.status === 'success' ? (
                <div>
                  <p className="font-medium">{confirmation?.title}</p>
                  <p className="text-sm text-muted-foreground">Amount: {confirmation?.amount && confirmation.amount > 0 ? `$${Number(confirmation.amount).toFixed(2)}` : 'Free'}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">{confirmation?.title ?? 'Payment could not be completed.'}</p>
                  <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {confirmation?.status === 'failure' && (
              <>
                <AlertDialogAction asChild>
                  <Button onClick={() => { confirmation?.retry && confirmation.retry(); }}>Retry</Button>
                </AlertDialogAction>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </>
            )}
            {confirmation?.status === 'success' && (
              <AlertDialogAction asChild>
                <Button onClick={() => setConfirmation(null)}>Done</Button>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PaymentContext.Provider>
  );
};

export default PaymentProvider;
