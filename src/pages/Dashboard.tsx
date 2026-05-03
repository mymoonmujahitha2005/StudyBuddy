import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Youtube, FileText, Video, Loader2, ArrowUpRight, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { processFile } from '../services/geminiService';
import { saveMaterial } from '../services/dbService';
import { motion } from 'motion/react';

import { FileStore } from '../services/fileStore';

const Dashboard: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<'video' | 'pdf' | 'youtube'>('video');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    const file = files[0];
    
    FileStore.setFile(file);
    navigate('/processing', { state: { filename: file.name, type: file.type.includes('pdf') ? 'pdf' : 'video' } });
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    FileStore.setYoutubeUrl(youtubeUrl);
    navigate('/processing', { state: { filename: 'YouTube Video', type: 'youtube' } });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <div className="card overflow-hidden !rounded-3xl">
        <div className="bg-indigo-600/20 backdrop-blur-md p-10 text-center text-white space-y-4 border-b border-indigo-500/20">
          <h1 className="text-4xl font-black tracking-tight">Upload Celestial Content</h1>
          <p className="text-indigo-200 max-w-xl mx-auto opacity-90 font-medium">
            Let the moon process your knowledge. Upload a video, PDF, or paste a YouTube URL to begin.
          </p>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex bg-slate-900/50 p-1 rounded-xl max-w-lg mx-auto border border-white/5 shadow-inner">
            {[
              { id: 'video', label: 'Video', icon: <Video size={18} /> },
              { id: 'pdf', label: 'Document', icon: <FileText size={18} /> },
              { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveUploadTab(tab.id as any);
                  if (tab.id !== 'youtube') setYoutubeUrl('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${activeUploadTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeUploadTab === 'youtube' ? (
            <form 
              onSubmit={handleYoutubeSubmit}
              className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-300
                ${youtubeUrl ? 'border-indigo-400/50 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/10 hover:border-slate-600 hover:bg-slate-800/20'}`}
            >
              <div className="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-red-500 border border-white/5">
                <Youtube size={32} />
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <p className="text-xl font-bold text-white">Process YouTube Video</p>
                  <p className="text-sm text-slate-400">Paste the link below to generate Insights</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-white placeholder:text-slate-600"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    Process
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 transition-all duration-300 cursor-pointer
                ${dragActive ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 bg-slate-800/10 hover:border-indigo-500/30 hover:bg-slate-800/30'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <div className="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-slate-400 border border-white/5">
                <Upload size={32} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Drag & Drop {activeUploadTab === 'video' ? 'Video' : 'PDF'}</p>
                <p className="text-sm text-slate-400 uppercase tracking-widest font-medium mt-1">or click to browse files</p>
              </div>
              <input 
                type="file" className="hidden" id="file-upload" 
                ref={fileInputRef}
                accept={activeUploadTab === 'pdf' ? "application/pdf" : "video/*,audio/*"}
                onChange={(e) => e.target.files && handleFiles(e.target.files)} 
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">
                {activeUploadTab === 'pdf' ? 'Celestial support for PDF documents' : 'Galaxy support for MP4, WebM, MOV and other formats'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
