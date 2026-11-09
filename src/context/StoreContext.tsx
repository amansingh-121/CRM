import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Category, Product, User } from '../types/ecommerce.ts';

export type CrmRole = 'superadmin' | 'admin' | 'support' | 'client';

export interface CrmSession {
  user: User;
  token: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StoreContextType {
  session: CrmSession | null;
  booting: boolean;
  currentUser: User;
  products: Product[];
  categories: Category[];
  refreshProducts: () => Promise<void>;
  login: (email: string) => Promise<void>;
  switchUserRole: (role: CrmRole) => void;
  signOut: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SESSION_KEY = 'aureva-crm-session';

// Demo accounts used by the in-app role switcher. Each maps to a real seeded login.
export const DEMO_ACCOUNTS: Record<CrmRole, { email: string; name: string; title: string }> = {
  superadmin: { email: 'superadmin@aureva.com', name: 'Aman Verma', title: 'Super Admin · full platform access' },
  admin: { email: 'admin@aureva.com', name: 'Rohit Sharma', title: 'Operations Admin · assigned projects only' },
  support: { email: 'support@aureva.com', name: 'Kabir Mehta', title: 'Customer Support · orders, returns, reviews' },
  client: { email: 'client@aureva.com', name: 'Aarav Malhotra', title: 'Client · own tenant only' },
};

function readStoredSession(): CrmSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.id || !parsed?.token) return null;
    return parsed as CrmSession;
  } catch {
    return null;
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CrmSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((previous) => [...previous, { id, type, message }]);
    window.setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 3600);
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        fetch('/api/products?limit=100'),
        fetch('/api/categories'),
      ]);
      const productData = await productResponse.json().catch(() => ({}));
      const categoryData = await categoryResponse.json().catch(() => ({}));
      if (Array.isArray(productData.products)) setProducts(productData.products);
      if (Array.isArray(categoryData.categories)) setCategories(categoryData.categories);
    } catch {
      // Catalog refresh is best-effort; mutations surface their own errors.
    }
  }, []);

  const login = useCallback(
    async (email: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to sign in to the CRM.');

      const next: CrmSession = { user: data.user as User, token: String(data.token) };
      setSession(next);
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      await refreshProducts();
    },
    [refreshProducts]
  );

  const switchUserRole = useCallback(
    (role: CrmRole) => {
      login(DEMO_ACCOUNTS[role].email).catch((error: unknown) =>
        showToast(error instanceof Error ? error.message : 'Role switch failed', 'error')
      );
    },
    [login, showToast]
  );

  const signOut = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // Restore a stored session on reload and verify the account still exists.
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      setBooting(false);
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored.token}` } })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) {
          setSession({ user: data.user as User, token: stored.token });
          void refreshProducts();
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => localStorage.removeItem(SESSION_KEY))
      .finally(() => setBooting(false));
  }, [refreshProducts]);

  const currentUser = session?.user ?? ({} as User);

  return (
    <StoreContext.Provider
      value={{
        session,
        booting,
        currentUser,
        products,
        categories,
        refreshProducts,
        login,
        switchUserRole,
        signOut,
        showToast,
      }}
    >
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-full max-w-xs flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-xs font-medium shadow-lg ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'info'
                ? 'bg-slate-900 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
