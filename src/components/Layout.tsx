import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Clock, Upload, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col selection:bg-indigo-500/30">
      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
            id="logo-container"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_-5px_rgba(79,70,229,1)]">
              <Moon size={24} className="fill-white/10" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Moon<span className="text-indigo-400">Buddy</span>
            </span>
          </div>

          {user && (
            <nav className="flex items-center gap-4 lg:gap-8 text-slate-400 font-medium h-full" id="nav-menu">
              <button 
                onClick={() => navigate('/history')}
                className="flex items-center gap-2 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
                id="btn-history"
                title="Study History"
              >
                <Clock size={20} />
                <span className="hidden sm:inline">History</span>
              </button>
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 transition-all py-2 px-5 rounded-xl font-bold shadow-lg active:scale-95"
                id="btn-upload"
                title="Upload New Content"
              >
                <Upload size={18} />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <div className="h-6 w-[1px] bg-white/10"></div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors py-2 px-3 rounded-lg hover:bg-red-400/5"
                id="btn-logout"
                title="Logout from MoonBuddy"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
