import React from 'react';
import { VideoProjectInput, AspectRatio, StoryPreset } from '../types';
import { STORY_PRESETS } from '../data/presets';
import { Sparkles, Wand2, Monitor, Smartphone, Volume2, Film, Layers } from 'lucide-react';

interface StoryFormProps {
  input: VideoProjectInput;
  onChange: (input: VideoProjectInput) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

export const StoryForm: React.FC<StoryFormProps> = ({
  input,
  onChange,
  onSubmit,
  isGenerating,
}) => {
  const handlePresetSelect = (preset: StoryPreset) => {
    onChange({
      ...input,
      story_idea: preset.story_idea,
      character_description: preset.character_description,
      aspect_ratio: preset.aspect_ratio,
      voice_name: preset.voice_name,
    });
  };

  return (
    <div className="bg-white rounded-[36px] border border-orange-100/70 shadow-2xl shadow-orange-100/80 p-6 sm:p-8 space-y-6">
      {/* Header Info */}
      <div className="border-b border-orange-100/60 pb-4">
        <h2 className="text-xl font-black text-[#2D2D2D] tracking-tight">Generator Settings</h2>
        <p className="text-stone-500 text-sm mt-0.5">Turn your imagination into Pixar-style magic.</p>
      </div>

      {/* Preset Inspiration Pills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 ml-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Quick Inspiration Presets
          </label>
          <span className="text-[11px] font-semibold text-stone-400">Click to load</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {STORY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              id={`preset-btn-${preset.id}`}
              onClick={() => handlePresetSelect(preset)}
              disabled={isGenerating}
              className="text-left p-3.5 rounded-2xl border-2 border-orange-100 hover:border-orange-400 bg-orange-50/30 hover:bg-orange-50/80 transition-all duration-150 group cursor-pointer disabled:opacity-50"
            >
              <div className="font-bold text-xs text-[#2D2D2D] group-hover:text-orange-600 line-clamp-1">
                {preset.title}
              </div>
              <div className="text-[11px] text-stone-500 group-hover:text-stone-700 line-clamp-2 mt-0.5 font-medium">
                {preset.tagline}
              </div>
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isGenerating && input.story_idea.trim()) {
            onSubmit();
          }
        }}
        className="space-y-6"
      >
        {/* Story Idea Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="story-idea-input" className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 ml-1">
              <Film className="w-3.5 h-3.5 text-orange-500" />
              Story Prompt
            </label>
            <span className="text-[11px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
              4-6 scene screenplay
            </span>
          </div>
          <textarea
            id="story-idea-input"
            rows={4}
            value={input.story_idea}
            onChange={(e) => onChange({ ...input, story_idea: e.target.value })}
            placeholder="e.g. A tiny brave robot discovers a glowing flower in a mechanical wasteland..."
            disabled={isGenerating}
            required
            className="w-full px-4 py-3.5 text-sm text-[#2D2D2D] font-medium bg-orange-50/40 border-2 border-orange-100 rounded-2xl focus:outline-none focus:border-orange-400 focus:bg-white transition-colors resize-y placeholder:text-stone-400 outline-none"
          />
        </div>

        {/* Character Description Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="character-description-input" className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 ml-1">
              <Wand2 className="w-3.5 h-3.5 text-orange-500" />
              Character Description
            </label>
            <span className="text-[11px] text-stone-400 font-medium">3D Clay & Visual Traits</span>
          </div>
          <input
            id="character-description-input"
            type="text"
            value={input.character_description}
            onChange={(e) => onChange({ ...input, character_description: e.target.value })}
            placeholder="e.g. Rusty copper finish, large circular teal eyes, wool scarf"
            disabled={isGenerating}
            className="w-full px-4 py-3 text-sm text-[#2D2D2D] font-medium bg-orange-50/40 border-2 border-orange-100 rounded-2xl focus:outline-none focus:border-orange-400 focus:bg-white transition-colors placeholder:text-stone-400 outline-none"
          />
        </div>

        {/* Configuration Row: Aspect Ratio & Voice Model & Scene Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Aspect Ratio Toggle */}
          <div className="flex flex-col justify-between bg-orange-50/40 p-3.5 rounded-2xl border-2 border-orange-100">
            <span className="text-xs font-bold text-stone-600 mb-2 flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-orange-500" />
              Aspect Ratio
            </span>
            <div className="flex bg-white p-1 rounded-xl border border-orange-100">
              <button
                type="button"
                id="aspect-16-9-toggle"
                onClick={() => onChange({ ...input, aspect_ratio: '16:9' })}
                disabled={isGenerating}
                className={`flex-1 py-1.5 px-3 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  input.aspect_ratio === '16:9'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                16:9 Cinema
              </button>
              <button
                type="button"
                id="aspect-9-16-toggle"
                onClick={() => onChange({ ...input, aspect_ratio: '9:16' })}
                disabled={isGenerating}
                className={`flex-1 py-1.5 px-3 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  input.aspect_ratio === '9:16'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                9:16 Shorts
              </button>
            </div>
          </div>

          {/* Voice Model Selector */}
          <div className="flex flex-col justify-between bg-orange-50/40 p-3.5 rounded-2xl border-2 border-orange-100">
            <label htmlFor="voice-select" className="text-xs font-bold text-stone-600 mb-2 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-orange-500" />
              Story Voice
            </label>
            <select
              id="voice-select"
              value={input.voice_name || 'Kore'}
              onChange={(e) => onChange({ ...input, voice_name: e.target.value as any })}
              disabled={isGenerating}
              className="w-full px-3 py-2 text-xs font-bold text-[#2D2D2D] bg-white border border-orange-100 rounded-xl focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              <option value="Kore">Kore (Warm Storyteller)</option>
              <option value="Zephyr">Zephyr (Bright & Whimsical)</option>
              <option value="Puck">Puck (Playful Character)</option>
              <option value="Fenrir">Fenrir (Deep Hero)</option>
              <option value="Charon">Charon (Gentle Elder)</option>
            </select>
          </div>

          {/* Scene Count */}
          <div className="flex flex-col justify-between bg-orange-50/40 p-3.5 rounded-2xl border-2 border-orange-100">
            <label htmlFor="scene-count-select" className="text-xs font-bold text-stone-600 mb-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              Scene Count
            </label>
            <select
              id="scene-count-select"
              value={input.scene_count || 4}
              onChange={(e) => onChange({ ...input, scene_count: Number(e.target.value) })}
              disabled={isGenerating}
              className="w-full px-3 py-2 text-xs font-bold text-[#2D2D2D] bg-white border border-orange-100 rounded-xl focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              <option value={4}>4 Scenes (~30-35s)</option>
              <option value={5}>5 Scenes (~38-42s)</option>
              <option value={6}>6 Scenes (~45-50s)</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            type="submit"
            id="generate-video-btn"
            disabled={isGenerating || !input.story_idea.trim()}
            className="w-full py-4 bg-gradient-to-r from-orange-500 via-orange-500 to-rose-500 text-white font-black rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300/60 hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Rendering Studio Clay Magic...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

