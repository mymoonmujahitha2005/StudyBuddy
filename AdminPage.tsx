import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Calendar, Mail, Search, ChevronRight, FileText, X, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';
import { getUserMaterials, deleteMaterial } from './dbService';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: any;
  lastLogin: any;
}

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userMaterials, setUserMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const { user } = useAuth();

  // Redirect if not the designated admin
  if (user?.email !== "mymoonmujahitha2005_mca27@mepcoeng.ac.in") {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
        const snapshot = await getDocs(q);
        const userData = snapshot.docs.map(doc => doc.data() as AppUser);
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleViewUser = async (u: AppUser) => {
    setSelectedUser(u);
    setLoadingMaterials(true);
    try {
      const materials = await getUserMaterials(u.uid);
      setUserMaterials(materials || []);
    } catch (error) {
      console.error("Error fetching user materials:", error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this cosmic asset from existence?")) {
      await deleteMaterial(id);
      setUserMaterials(prev => prev.filter(m => m.id !== id));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin <span className="text-indigo-400">Command</span></h1>
          </div>
          <p className="text-slate-400 font-medium">Monitoring the cosmic explorers of MoonBuddy</p>
        </div>

        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search explorers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Explorers</p>
              <h2 className="text-3xl font-black text-white">{users.length}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text">Explorer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Arrival</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={4}>
                      <div className="h-10 bg-slate-800/50 rounded-xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <motion.tr 
                    key={u.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-indigo-500/20 overflow-hidden bg-slate-800 flex items-center justify-center">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-400 font-bold">{u.displayName?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{u.displayName}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">UID: {u.uid.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Mail size={14} className="text-slate-500" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                          <Calendar size={14} className="text-slate-500" />
                          {formatDate(u.lastLogin)}
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1 italic">
                          Joined: {formatDate(u.createdAt).split(',')[0]}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleViewUser(u)}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                        title="View User Data"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No explorers found in this sector</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-indigo-500/30 overflow-hidden">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold">
                        {selectedUser.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedUser.displayName}</h3>
                    <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cosmic Materials</h4>
                  
                  {loadingMaterials ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      <p className="text-slate-500 font-medium">Scanning archives...</p>
                    </div>
                  ) : userMaterials.length > 0 ? (
                    <div className="space-y-3">
                      {userMaterials.map((m) => (
                        <div key={m.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:border-indigo-500/30 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-xl text-indigo-400">
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-white font-medium line-clamp-1">{m.fileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {m.status}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {formatDate(m.createdAt).split(',')[0]}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.originalUrl && (
                              <a 
                                href={m.originalUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                              >
                                <ExternalLink size={18} />
                              </a>
                            )}
                            <button 
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-slate-500">No materials found for this explorer.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
