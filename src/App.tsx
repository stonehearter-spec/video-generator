import React, { useState } from 'react';
import { Header } from './components/Header';
import { StoryForm } from './components/StoryForm';
import { ProgressStepper } from './components/ProgressStepper';
import { VideoPlayer } from './components/VideoPlayer';
import { StoryboardViewer } from './components/StoryboardViewer';
import { VideoProjectInput, GenerationProgress, Scene } from './types';

const INITIAL_INPUT: VideoProjectInput = {
  story_idea: 'BEEP-0, a gentle vintage lighthouse keeper automaton with glowing amber eyes, finds a tiny fallen star washed up on the rocky tide pool. Together they climb the winding spiral tower to return the star back to the night sky.',
  character_description: 'BEEP-0: A squat, warm brass-and-copper vintage robot with round glass eyes and an oversized wool scarf. Sparky: A playful miniature glowing golden star that bounces like a puppy.',
  aspect_ratio: '16:9',
  voice_name: 'Kore',
  scene_count: 4,
};

export default function App() {
  const [input, setInput] = useState<VideoProjectInput>(INITIAL_INPUT);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    percent: 0,
    message: 'Ready to generate 3D Pixar animation',
    scenes: [],
  });

  const isGenerating =
    progress.stage === 'scripting' ||
    progress.stage === 'scene_generation' ||
    progress.stage === 'audio_synthesis' ||
    progress.stage === 'stitching';

  const handleGenerate = async () => {
    if (!input.story_idea.trim() || isGenerating) return;

    setProgress({
      stage: 'scripting',
      percent: 5,
      message: 'Step A: Initiating Pixar story engine with Gemini...',
      scenes: [],
      error: undefined,
    });

    let streamSucceeded = false;

    // 1. Try real-time SSE stream endpoint first
    try {
      const response = await fetch('/api/generate-video-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip keepalive ping comments or empty lines
            if (line.startsWith(':') || !line) continue;

            if (line.startsWith('data:')) {
              const jsonStr = line.slice(5).trim();
              if (jsonStr && jsonStr !== '{}') {
                try {
                  const payload = JSON.parse(jsonStr);
                  if (payload.error) {
                    setProgress((prev) => ({
                      ...prev,
                      stage: 'error',
                      error: payload.error,
                      message: payload.error,
                    }));
                  } else if (payload.stage) {
                    streamSucceeded = true;
                    setProgress((prev) => ({
                      ...prev,
                      stage: payload.stage,
                      percent: payload.percent ?? prev.percent,
                      message: payload.message ?? prev.message,
                      current_scene: payload.currentScene ?? prev.current_scene,
                      total_scenes: payload.totalScenes ?? prev.total_scenes,
                      scenes: payload.scenes ?? prev.scenes,
                      final_video_url: payload.final_video_url || payload.video_url || payload.video_data_url || prev.final_video_url,
                      download_filename: payload.filename || prev.download_filename || 'pixar_animation.mp4',
                    }));
                  }
                } catch (e) {
                  console.warn('Error parsing SSE event data:', e);
                }
              }
            }
          }
        }

        if (streamSucceeded) {
          return;
        }
      }
    } catch (streamErr) {
      console.warn('SSE stream encountered network issue, falling back to standard REST API endpoint:', streamErr);
    }

    // 2. Fallback to standard REST endpoint
    try {
      setProgress((prev) => ({
        ...prev,
        stage: 'scene_generation',
        percent: 35,
        message: 'Rendering 3D Pixar scenes & synthesizing character voices...',
      }));

      const standardRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await standardRes.json();
      if (!standardRes.ok) {
        throw new Error(data.error || 'Video generation failed.');
      }

      setProgress({
        stage: 'completed',
        percent: 100,
        message: 'Pixar animation compiled successfully! Ready for premiere.',
        final_video_url: data.final_video_url || data.video_url || data.video_data_url,
        download_filename: data.filename || 'pixar_movie.mp4',
        scenes: data.scenes || [],
      });
    } catch (err: any) {
      console.error('Generation Error:', err);
      setProgress((prev) => ({
        ...prev,
        stage: 'error',
        error: err?.message || 'An unexpected error occurred during video generation.',
        message: 'Generation encountered an error. Please try again.',
      }));
    }
  };

  const handleReset = () => {
    setProgress({
      stage: 'idle',
      percent: 0,
      message: 'Ready to generate 3D Pixar animation',
      scenes: [],
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-[#2D2D2D] flex flex-col font-sans selection:bg-orange-500/20">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Step 1: Generator Settings Form */}
        <StoryForm
          input={input}
          onChange={setInput}
          onSubmit={handleGenerate}
          isGenerating={isGenerating}
        />

        {/* Step 2: Production Pipeline Stepper */}
        {progress.stage !== 'idle' && (
          <ProgressStepper
            stage={progress.stage}
            percent={progress.percent}
            message={progress.message}
            scenes={progress.scenes}
            currentScene={progress.current_scene}
            totalScenes={progress.total_scenes}
            error={progress.error}
          />
        )}

        {/* Step 3: Video Player Stage with Premiere & Download */}
        {progress.final_video_url && (
          <VideoPlayer
            videoUrl={progress.final_video_url}
            downloadFilename={progress.download_filename || 'pixar_animation.mp4'}
            aspectRatio={input.aspect_ratio}
            totalDurationSec={32}
            scenes={progress.scenes}
            storyIdea={input.story_idea}
            onReset={handleReset}
          />
        )}

        {/* Step 4: Storyboard Viewer */}
        {progress.scenes && progress.scenes.length > 0 && (
          <StoryboardViewer scenes={progress.scenes} />
        )}
      </main>

      <footer className="border-t border-orange-100 py-6 text-center text-xs font-semibold text-stone-500 bg-white/50 backdrop-blur-sm">
        <p>STUDIO CLAY • Pixar-Style 3D Video Generator • Powered by Gemini Omni 1.1 & FFmpeg</p>
      </footer>
    </div>
  );
}
