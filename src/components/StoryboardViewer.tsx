import React, { useState } from 'react';
import { Scene } from '../types';
import { Play, Pause, Volume2, Camera, Smile, Download, Layers, Clapperboard, Image as ImageIcon } from 'lucide-react';

interface StoryboardViewerProps {
  scenes: Scene[];
}

export const StoryboardViewer: React.FC<StoryboardViewerProps> = ({ scenes }) => {
  const [activeAudioIndex, setActiveAudioIndex] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const playSceneAudio = (audioUrl: string, index: number) => {
    if (activeAudioIndex === index && audioElement) {
      audioElement.pause();
      setActiveAudioIndex(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => setActiveAudioIndex(null);
    audio.play();
    setAudioElement(audio);
    setActiveAudioIndex(index);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scenes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pixar_storyboard_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!scenes || scenes.length === 0) return null;

  return (
    <div className="bg-white rounded-[36px] border border-orange-100/70 shadow-2xl shadow-orange-100/80 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-[#2D2D2D] flex items-center gap-2 tracking-tight">
            <Layers className="w-5 h-5 text-orange-500" />
            <span>Scene-by-Scene Storyboard & Audio Stems</span>
          </h3>
          <p className="text-xs font-semibold text-stone-500 mt-1">
            Explore the individual 3D shots, dialogue lines, and synthesized character voices
          </p>
        </div>

        <button
          type="button"
          id="export-storyboard-json-btn"
          onClick={handleExportJson}
          className="px-4 py-2 text-xs font-bold text-stone-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-orange-500" />
          <span>Export Script JSON</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenes.map((scene, idx) => {
          const sceneNum = scene.scene_number || idx + 1;
          const clipUrl = scene.clip_video_url || scene.video_url;
          const gifUrl = scene.gif_url;

          return (
            <div
              key={idx}
              className="rounded-[28px] border-2 border-orange-100/80 bg-orange-50/20 overflow-hidden flex flex-col hover:border-orange-400 hover:shadow-lg hover:shadow-orange-100/60 transition-all duration-200 group"
            >
              {/* Visual Thumbnail */}
              <div className="relative aspect-video bg-[#2D2D2D] overflow-hidden">
                {scene.image_url ? (
                  <img
                    src={scene.image_url}
                    alt={`Scene ${sceneNum}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                    Visual Frame Rendering...
                  </div>
                )}

                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider">
                  Scene {sceneNum}
                </div>

                {scene.audio_url && (
                  <button
                    type="button"
                    id={`play-audio-scene-${idx}`}
                    onClick={() => playSceneAudio(scene.audio_url!, idx)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:scale-[1.02] active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-300/60 flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {activeAudioIndex === idx ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause Voice</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Voice</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Content Details */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2.5 py-0.5 rounded-full border border-orange-200">
                      Dialogue
                    </span>
                    {scene.character_emotion && (
                      <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                        <Smile className="w-3.5 h-3.5 text-orange-400" />
                        {scene.character_emotion}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#2D2D2D] italic">
                    "{scene.dialogue}"
                  </p>
                </div>

                <div className="pt-3 border-t border-orange-100 space-y-3">
                  <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                    <span className="font-bold text-orange-600">Visual:</span> {scene.visual_description}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {scene.camera_angle ? (
                      <div className="flex items-center text-[11px] font-semibold text-stone-400 gap-1">
                        <Camera className="w-3.5 h-3.5 text-stone-400" />
                        <span>{scene.camera_angle}</span>
                      </div>
                    ) : <div />}

                    <div className="flex items-center gap-1.5">
                      {clipUrl && (
                        <a
                          href={clipUrl}
                          download={`scene_${sceneNum}_clip.mp4`}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-orange-100/80 hover:bg-orange-200 text-orange-700 rounded-lg flex items-center gap-1 transition"
                          title="Download Scene MP4"
                        >
                          <Clapperboard className="w-3 h-3" />
                          <span>MP4</span>
                        </a>
                      )}
                      {gifUrl && (
                        <a
                          href={gifUrl}
                          download={`scene_${sceneNum}_social.gif`}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-100/80 hover:bg-rose-200 text-rose-700 rounded-lg flex items-center gap-1 transition"
                          title="Download Social GIF"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>GIF</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

