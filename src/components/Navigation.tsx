import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, BookOpen, CheckCircle, Map, Scroll, FileText, LogOut, Telescope } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Habits', path: '/habits' },
  { icon: Wallet, label: 'Finance', path: '/finance' },
  { icon: BookOpen, label: 'Reading', path: '/reading' },
  { icon: CheckCircle, label: 'Todos', path: '/todos' },
  { icon: Map, label: 'Trips', path: '/trips' },
  { icon: Scroll, label: 'Poetry', path: '/poetry' },
  { icon: FileText, label: 'Notes', path: '/notes' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-6 left-0 right-0 mx-auto w-fit flex gap-1 px-4 py-2 z-50 bg-surface-container-low/20 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "p-3 rounded-full transition-all duration-300 relative",
              isActive ? "bg-tertiary/10 text-tertiary shadow-[0_0_15px_rgba(233,195,73,0.2)]" : "text-on-surface-variant/60 hover:text-tertiary"
            )
          }
        >
          <item.icon size={20} />
          {/* Active dot/glow managed by NavLink isActive */}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 hover:w-64 bg-surface-container-low/95 backdrop-blur-3xl border-r border-white/5 transition-all duration-500 ease-out z-[60] overflow-hidden group flex-col items-start p-6">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-tertiary/20 flex items-center justify-center text-tertiary">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Telescope size={24} />
          </motion.div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <p className="font-display text-tertiary text-lg font-bold">Dashboard</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-2 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 p-3 rounded-full transition-all duration-300 w-full overflow-hidden whitespace-nowrap",
                isActive 
                  ? "bg-tertiary/10 text-tertiary shadow-[0_0_15px_rgba(233,195,73,0.2)]" 
                  : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
              )
            }
          >
            <item.icon size={22} className="flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto opacity-20 group-hover:opacity-40 text-[10px] uppercase tracking-widest text-on-surface-variant transition-opacity">
        v1.0
      </div>
    </aside>
  );
}

export function TopBar() {
  const location = useLocation();
  const { username, logout } = useAuth();
  const pageTitle = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <header className="fixed top-0 w-full bg-surface/10 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(233,195,73,0.05)] flex justify-between items-center px-6 md:px-12 h-16 z-50">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl md:text-3xl text-primary tracking-tight">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        {username && <span className="hidden md:inline text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">@{username}</span>}
        <button onClick={logout} title="Sign out" className="text-on-surface-variant hover:text-error transition-colors">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
