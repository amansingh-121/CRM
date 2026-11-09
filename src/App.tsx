import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { CrmDashboard } from './pages/CrmDashboard.tsx';

const Gate: React.FC = () => {
  const { session, booting } = useStore();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <p className="mt-3 text-xs text-slate-500">Restoring secure session…</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  return <CrmDashboard />;
};

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
