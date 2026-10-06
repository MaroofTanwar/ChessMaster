import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileGameNav from './MobileGameNav';
import { clsx } from 'clsx';

export const AppLayout = ({ children, mobileGame = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        compactMobile={mobileGame}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Main Content Area */}
        <main
          data-mobile-game-layout={mobileGame || undefined}
          className={clsx(
            'flex-1 overflow-y-auto bg-radial-gradient',
            mobileGame ? 'px-0 pt-2 pb-32 sm:p-6 lg:p-8' : 'p-4 sm:p-6 lg:p-8'
          )}
        >
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {mobileGame && <MobileGameNav />}

      {/* Global Toast Overlay */}
      
    </div>
  );
};

export default AppLayout;
