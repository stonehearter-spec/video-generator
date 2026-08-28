import React from 'react';
import { Film, Clapperboard, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-orange-100/80 bg-white/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-300/40 text-white">
            <Clapperboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-orange-600 font-sans">
                STUDIO CLAY
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-100/80 text-orange-700 border border-orange-200">
                <Sparkles className="w-3 h-3 mr-1 text-orange-600" />
                Pixar 3D
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-500 hidden sm:block">
              Full-Stack Animated Cinema Engine • Gemini 3.1 & FFmpeg
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-tight">
              Gemini Omni 1.1
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[10px] font-black uppercase tracking-tight">
              4K Ultra Cinema
            </span>
          </div>
          
          <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-orange-100">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Cinema Engine</p>
              <p className="text-xs font-black text-[#2D2D2D]">Ready to Render</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 p-0.5">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-orange-400 to-rose-500 shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

