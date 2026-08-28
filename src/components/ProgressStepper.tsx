import React from 'react';
import { GenerationStage, Scene } from '../types';
import { FileText, Image as ImageIcon, Volume2, Film, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ProgressStepperProps {
  stage: GenerationStage;
  percent: number;
  message: string;
  scenes?: Scene[];
  currentScene?: number;
  totalScenes?: number;
  error?: string;
}

interface StepInfo {
  id: 'scripting' | 'scene_generation' | 'audio_synthesis' | 'stitching';
  stepNum: number;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
  {
    id: 'scripting',
    stepNum: 1,
    name: 'Scripting',
    subtitle: 'Gemini Omni 1.1 screenplay & JSON',
    icon: FileText,
  },
  {
    id: 'scene_generation',
    stepNum: 2,
    name: 'Visuals',
    subtitle: '3D Pixar clay textures & soft lighting',
    icon: ImageIcon,
  },
  {
    id: 'audio_synthesis',
    stepNum: 3,
    name: 'Audio',
    subtitle: 'Gemini TTS warm character voices',
    icon: Volume2,
  },
  {
    id: 'stitching',
    stepNum: 4,
    name: 'Stitch',
    subtitle: 'Fluent-FFmpeg cinema compilation',
    icon: Film,
  },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  stage,
  percent,
  message,
  scenes = [],
  currentScene,
  totalScenes,
  error,
}) => {
  const getStepStatus = (stepId: StepInfo['id']) => {
    if (stage === 'error') {
      return 'error';
    }
    if (stage === 'completed') {
      return 'completed';
    }

    const stageOrder: Record<string, number> = {
      idle: 0,
      scripting: 1,
      scene_generation: 2,
      audio_synthesis: 3,
      stitching: 4,
      completed: 5,
    };

    const currentOrder = stageOrder[stage] || 0;
    const stepOrder = stageOrder[stepId] || 0;

    if (currentOrder > stepOrder) return 'completed';
    if (currentOrder === stepOrder) return 'active';
    return 'upcoming';
  };

  return (
    <div className="bg-white rounded-[36px] border border-orange-100/70 shadow-2xl shadow-orange-100/80 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#2D2D2D] tracking-tight">
              Production Pipeline
            </h2>
            {stage !== 'idle' && stage !== 'completed' && stage !== 'error' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide bg-orange-100 text-orange-600 border border-orange-200 animate-pulse">
                Rendering Magic
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-stone-500 mt-1">
            {message || 'Ready to launch Pixar animation workflow'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-orange-600 font-mono">
            {Math.min(100, Math.max(0, percent))}%
          </span>
        </div>
      </div>

      {/* Main Glowing Progress Bar */}
      <div className="w-full bg-orange-100/60 rounded-full h-3 overflow-hidden p-0.5 border border-orange-200/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            stage === 'error'
              ? 'bg-rose-500'
              : stage === 'completed'
              ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
              : 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>

      {/* Connecting Stepper Nodes */}
      <div className="flex justify-between items-center px-2 sm:px-6 pt-2">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className={`flex flex-col items-center gap-2 transition-all ${status === 'upcoming' ? 'opacity-40' : 'opacity-100'}`}>
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-md ${
                    status === 'completed'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200'
                      : status === 'active'
                      ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-orange-300 ring-4 ring-orange-200/60 animate-pulse'
                      : status === 'error'
                      ? 'bg-rose-500 text-white'
                      : 'bg-orange-100/80 text-stone-500 border border-orange-200'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    step.stepNum
                  )}
                </div>
                <div className="text-center">
                  <span className={`text-[11px] font-black uppercase tracking-wider block ${
                    status === 'active' || status === 'completed' ? 'text-orange-600' : 'text-stone-400'
                  }`}>
                    {step.name}
                  </span>
                  <span className="text-[10px] text-stone-400 hidden sm:block max-w-[100px] leading-tight mt-0.5">
                    {step.subtitle.split('&')[0]}
                  </span>
                </div>
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-all mb-6 ${
                    status === 'completed'
                      ? 'bg-orange-400 shadow-sm'
                      : 'bg-orange-100'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start space-x-3 text-rose-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Production Error:</span> {error}
          </div>
        </div>
      )}

      {/* Real-time Rendered Scene Badges (Live preview while generating) */}
      {scenes && scenes.length > 0 && (
        <div className="pt-3 border-t border-orange-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-500">
              Scenes In Production ({scenes.length} total)
            </span>
            {currentScene && totalScenes && (
              <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                Active: Scene {currentScene} of {totalScenes}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {scenes.map((sc, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border-2 text-xs transition-all ${
                  sc.image_url
                    ? 'bg-[#2D2D2D] text-white border-stone-800 shadow-md'
                    : 'bg-orange-50/50 border-orange-100 text-[#2D2D2D]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-[11px]">Scene {sc.scene_number || idx + 1}</span>
                  {sc.image_url ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  )}
                </div>
                <div className="text-[11px] opacity-80 line-clamp-1 font-medium">
                  {sc.dialogue || sc.visual_description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

