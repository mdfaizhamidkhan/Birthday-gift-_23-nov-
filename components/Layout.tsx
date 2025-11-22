import React from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout, onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => onNavigate('home')}
          >
            <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-slate-900">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 22H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v2M16 2v2M7 10h10M7 14h10M7 18h10" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-amber-500 tracking-tight">Grandmaster<span className="text-white">Chess</span></h1>
          </div>
          
          <nav className="flex items-center gap-4">
            {currentUser ? (
              <>
                <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-700/50 rounded-full border border-slate-600">
                  <UserIcon size={16} className="text-amber-400" />
                  <span className="text-sm font-medium">{currentUser.username}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => onNavigate('login')}
                  className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => onNavigate('register')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold px-4 py-2 rounded-md transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-slate-950 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Grandmaster Chess. Built with React & Tailwind.
        </div>
      </footer>
    </div>
  );
};

export default Layout;