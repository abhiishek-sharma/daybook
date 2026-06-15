import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar, BottomNav, Sidebar } from './Navigation';
import { motion, AnimatePresence } from 'motion/react';

export function Layout() {
  return (
    <div className="min-h-screen bg-surface selection:bg-tertiary/30">
      <TopBar />
      <Sidebar />
      <main className="pt-24 pb-32 lg:pl-24 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
