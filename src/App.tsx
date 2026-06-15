import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Auth } from './screens/Auth';
import { Habits } from './screens/Habits';
import { Finance } from './screens/Finance';
import { Reading } from './screens/Reading';
import { Todos } from './screens/Todos';
import { Trips } from './screens/Trips';
import { Poetry } from './screens/Poetry';
import { Notes } from './screens/Notes';

function AppRoutes() {
  const { ready, authed } = useAuth();

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant text-sm uppercase tracking-widest opacity-40">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={authed ? <Navigate to="/habits" replace /> : <Auth />} />
      <Route path="/" element={authed ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="habits" replace />} />
        <Route path="habits" element={<Habits />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reading" element={<Reading />} />
        <Route path="todos" element={<Todos />} />
        <Route path="trips" element={<Trips />} />
        <Route path="poetry" element={<Poetry />} />
        <Route path="notes" element={<Notes />} />
      </Route>
      <Route path="*" element={<Navigate to={authed ? '/habits' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
