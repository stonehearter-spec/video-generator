import React, { useRef, useState, useMemo, useEffect } from 'react';
import { AspectRatio, Scene } from '../types';
import {
  Download,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Film,
  Share2,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Clapperboard,
  Layers,
  Captions,
  Settings2,
  Type,
  Smile,
  Music,
  Loader2,
  CloudDownload,
  AlertCircle,
  ArrowDownToLine,
} from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  downloadFilename?: string;
  aspectRatio: AspectRatio;
  totalDurationSec?: number;
  scenes?: Scene[];
  storyIdea?: string;
  onReset?: () => void;
}

type DownloadState = 'idle' | 'fetching' | 'downloading' | 'completed' | 'error';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  downloadFilename = 'pixar_animation.mp4',
  aspectRatio,
  totalDurationSec = 30,
  scenes = [],
  storyIdea,
  onReset,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(totalDurationSec || 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportFilter, setExportFilter] = useState<'all' | 'video' | 'gif'>('all');
  const [previewGifScene, setPreviewGifScene] = useState<number | null>(null);
  const [exportingScene, setExportingScene] = useState<number | null>(null);

  // Download Progress States
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Subtitle States
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [subtitleStyle, setSubtitleStyle] = useState<'cinematic' | 'classic' | 'minimal'>('cinematic');
  const [showEmotionTag, setShowEmotionTag] = useState(true);

  // Calculate timeline start and end timestamps for each scene
  const sceneTimings = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    let currentStart = 0;
    return scenes.map((scene, idx) => {
      const sceneDuration = scene.estimated_duration_sec && scene.estimated_duration_sec > 0
        ? scene.estimated_duration_sec
        : Math.max(5, (duration || totalDurationSec || 28) / scenes.length);
      const start = currentStart;
      const end = start + sceneDuration;
      currentStart = end;
      return {
        scene,
        sceneNumber: scene.scene_number || idx + 1,
        dialogue: scene.dialogue,
        emotion: scene.character_emotion,
        visualDescription: scene.visual_description,
        cameraAngle: scene.camera_angle,
        start,
        end,
      };
    });
  }, [scenes, duration, totalDurationSec]);

  // Determine which subtitle is active at currentTime
  const activeSubtitle = useMemo(() => {
    if (!subtitlesEnabled || sceneTimings.length === 0) return null;
    const match = sceneTimings.find(
      (t) => currentTime >= t.start && currentTime < t.end
    );
    if (match) return match;
    // Fallback for near-end duration boundaries
    if (currentTime >= (sceneTimings[sceneTimings.length - 1]?.start || 0) && currentTime <= (duration || totalDurationSec || 999)) {
      return sceneTimings[sceneTimings.length - 1];
    }
    return null;
  }, [subtitlesEnabled, sceneTimings, currentTime, duration, totalDurationSec]);

  // Generate WebVTT caption track
  const vttUrl = useMemo(() => {
    if (!scenes || scenes.length === 0) return '';
    const formatVttTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT\n\n';
    let start = 0;
    scenes.forEach((sc, idx) => {
      const dur = sc.estimated_duration_sec || Math.max(5, (duration || 28) / scenes.length);
      const end = start + dur;
      vtt += `${idx + 1}\n`;
      vtt += `${formatVttTime(start)} --> ${formatVttTime(end)}\n`;
      const prefix = sc.character_emotion ? `[${sc.character_emotion}] ` : '';
      vtt += `${prefix}${sc.dialogue || ''}\n\n`;
      start = end;
    });

    const blob = new Blob([vtt], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  }, [scenes, duration]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const jumpToScene = (startTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyLink = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleOnDemandGifExport = async (scene: Scene, idx: number) => {
    if (scene.gif_url) {
      // Trigger download
      const link = document.createElement('a');
      link.href = scene.gif_url;
      link.download = `scene_${scene.scene_number || idx + 1}_social.gif`;
      link.click();
      return;
    }

    if (!scene.image_url) return;

    try {
      setExportingScene(scene.scene_number || idx + 1);
      const res = await fetch('/api/export-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: scene.image_url,
          format: 'gif',
          aspect_ratio: aspectRatio,
          scene_number: scene.scene_number || idx + 1,
        }),
      });

      const data = await res.json();
      if (data.download_url || data.data_url) {
        const link = document.createElement('a');
        link.href = data.download_url || data.data_url;
        link.download = data.filename || `scene_${scene.scene_number || idx + 1}_social.gif`;
        link.click();
      }
    } catch (e) {
      console.error('Failed to export GIF:', e);
    } finally {
      setExportingScene(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDownloadMasterVideo = async () => {
    if (downloadState === 'downloading' || downloadState === 'fetching') return;

    try {
      setDownloadState('fetching');
      setDownloadProgress(0);
      setDownloadedBytes(0);
      setTotalBytes(0);
      setDownloadSpeed('');
      setDownloadError(null);

      // If it is already a base64 data URL
      if (videoUrl.startsWith('data:')) {
        setDownloadState('downloading');
        setDownloadProgress(75);
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadProgress(100);
        setDownloadState('completed');
        setTimeout(() => setDownloadState('idle'), 3000);
        return;
      }

      const startTime = performance.now();
      const response = await fetch(videoUrl, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Storage server error (${response.status})`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      setTotalBytes(total);
      setDownloadState('downloading');

      if (response.body && window.ReadableStream) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            chunks.push(value);
            received += value.length;
            setDownloadedBytes(received);

            if (total > 0) {
              const pct = Math.min(99, Math.round((received / total) * 100));
              setDownloadProgress(pct);
            } else {
              setDownloadProgress((prev) => Math.min(95, prev + 8));
            }

            const elapsedSec = (performance.now() - startTime) / 1000;
            if (elapsedSec > 0.2) {
              const bytesPerSec = received / elapsedSec;
              setDownloadSpeed(`${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`);
            }
          }
        }

        setDownloadProgress(100);
        setDownloadState('completed');

        const blob = new Blob(chunks, { type: 'video/mp4' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 30000);

        setTimeout(() => {
          setDownloadState('idle');
          setDownloadProgress(0);
          setDownloadedBytes(0);
          setTotalBytes(0);
          setDownloadSpeed('');
        }, 3500);
      } else {
        const blob = await response.blob();
        setDownloadProgress(100);
        setDownloadState('completed');
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          setDownloadState('idle');
        }, 3500);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Download failed');
      setDownloadState('error');

      // Fallback: direct anchor trigger
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = downloadFilename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setDownloadState('idle');
      }, 4000);
    }
  };

  const handleDownloadAllClips = () => {
    scenes.forEach((sc, idx) => {
      const url = sc.clip_video_url || sc.video_url || videoUrl;
      const link = document.createElement('a');
      link.href = url;
      link.download = `scene_${sc.scene_number || idx + 1}_clip.mp4`;
      setTimeout(() => link.click(), idx * 400);
    });
  };

  const handleDownloadAllGifs = () => {
    scenes.forEach((sc, idx) => {
      if (sc.gif_url) {
        const link = document.createElement('a');
        link.href = sc.gif_url;
        link.download = `scene_${sc.scene_number || idx + 1}_social.gif`;
        setTimeout(() => link.click(), idx * 400);
      } else {
        handleOnDemandGifExport(sc, idx);
      }
    });
  };

  const isPortrait = aspectRatio === '9:16';

  return (
    <div className="bg-white rounded-[36px] border border-orange-100/70 shadow-2xl shadow-orange-100/80 p-6 sm:p-8 space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-100/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
              Premiere Ready
            </span>
            <span className="text-xs font-bold text-stone-500">
              {scenes.length} Scenes • ~{Math.round(duration || totalDurationSec)}s Runtime
            </span>
          </div>
          <h2 className="text-xl font-black text-[#2D2D2D] mt-1 tracking-tight">
            Pixar Short Animation
          </h2>
          {storyIdea && (
            <p className="text-xs text-stone-500 line-clamp-1 max-w-xl mt-0.5 font-medium">
              "{storyIdea}"
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {onReset && (
            <button
              type="button"
              id="create-another-btn"
              onClick={onReset}
              className="px-4 py-2.5 text-xs font-bold text-stone-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Film className="w-3.5 h-3.5 text-orange-500" />
              <span>New Story</span>
            </button>
          )}

          {/* Full Video Download Button with Dynamic Fetch Progress Overlay */}
          <button
            type="button"
            id="download-video-btn"
            onClick={handleDownloadMasterVideo}
            disabled={downloadState === 'fetching' || downloadState === 'downloading'}
            title="Download full Pixar animation master MP4"
            className={`relative overflow-hidden group min-w-[210px] sm:min-w-[250px] px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center cursor-pointer border ${
              downloadState === 'completed'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-200'
                : downloadState === 'error'
                ? 'bg-rose-600 border-rose-500 text-white shadow-rose-200'
                : downloadState === 'downloading' || downloadState === 'fetching'
                ? 'bg-stone-900 border-orange-500 text-white shadow-orange-200/50'
                : 'bg-gradient-to-r from-orange-500 to-rose-500 border-transparent hover:scale-[1.02] active:scale-95 text-white shadow-orange-200'
            }`}
          >
            {/* Visual Progress Bar Fill Overlay */}
            {(downloadState === 'fetching' || downloadState === 'downloading' || downloadState === 'completed') && (
              <div
                id="download-progress-fill"
                className={`absolute inset-y-0 left-0 transition-all duration-200 ease-out ${
                  downloadState === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500'
                }`}
                style={{ width: `${downloadState === 'completed' ? 100 : Math.max(10, downloadProgress)}%` }}
              >
                {/* Diagonal animated stripes shimmer */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-pulse" />
              </div>
            )}

            {/* Button Foreground Label & Live Progress Metrics */}
            <div className="relative z-10 flex items-center space-x-2 w-full justify-center">
              {downloadState === 'idle' && (
                <>
                  <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                  <span className="font-black text-white">Download Master MP4</span>
                </>
              )}

              {downloadState === 'fetching' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="font-bold text-white">Connecting to Storage...</span>
                </>
              )}

              {downloadState === 'downloading' && (
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center space-x-1.5">
                    <CloudDownload className="w-4 h-4 animate-bounce text-white" />
                    <span className="font-black text-white">{downloadProgress}%</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-white/90">
                    <span>{formatBytes(downloadedBytes)}</span>
                    {totalBytes > 0 && <span>/ {formatBytes(totalBytes)}</span>}
                    {downloadSpeed && <span className="hidden sm:inline">({downloadSpeed})</span>}
                  </div>
                </div>
              )}

              {downloadState === 'completed' && (
                <>
                  <Check className="w-4 h-4 text-white animate-scale-in" />
                  <span className="font-black text-white">Downloaded!</span>
                </>
              )}

              {downloadState === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-white" />
                  <span className="font-bold text-white">Retry Download</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* HTML5 Video Stage with White Border & Deep Shadow & Live Subtitle Overlay */}
      <div className="flex justify-center bg-[#2D2D2D] rounded-[36px] overflow-hidden p-2 sm:p-4 shadow-2xl border-8 border-white shadow-black/10 relative group">
        <div
          className={`relative overflow-hidden rounded-2xl bg-black flex items-center justify-center ${
            isPortrait ? 'w-full max-w-[360px] aspect-[9/16]' : 'w-full max-w-3xl aspect-[16/9]'
          }`}
        >
          <video
            ref={videoRef}
            id="main-html5-video-player"
            src={videoUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || totalDurationSec)}
            onEnded={() => setIsPlaying(false)}
          >
            {vttUrl && (
              <track
                kind="subtitles"
                src={vttUrl}
                srcLang="en"
                label="English Dialogue"
                default={subtitlesEnabled}
              />
            )}
            Your browser does not support standard HTML5 video playback.
          </video>

          {/* DYNAMIC SCENE DIALOGUE SUBTITLE OVERLAY */}
          {subtitlesEnabled && activeSubtitle && activeSubtitle.dialogue && (
            <div
              id="video-subtitle-overlay"
              className="absolute bottom-6 sm:bottom-8 inset-x-3 sm:inset-x-8 flex justify-center pointer-events-none z-20 transition-all duration-300 select-none"
            >
              <div
                className={`backdrop-blur-md border shadow-2xl rounded-2xl px-4 sm:px-6 py-2.5 max-w-[94%] sm:max-w-xl text-center flex flex-col items-center gap-1 transition-all duration-200 animate-in fade-in zoom-in-95 ${
                  subtitleStyle === 'cinematic'
                    ? 'bg-black/80 border-orange-400/40 shadow-orange-950/50 text-amber-50'
                    : subtitleStyle === 'classic'
                    ? 'bg-black/85 border-white/20 shadow-black/80 text-white'
                    : 'bg-black/60 border-white/10 text-white'
                }`}
              >
                {/* Emotion / Scene Indicator Tag */}
                {showEmotionTag && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                    <span className="text-orange-400 font-extrabold flex items-center gap-1">
                      <Captions className="w-3 h-3 text-orange-400" />
                      Scene {activeSubtitle.sceneNumber}
                    </span>
                    {activeSubtitle.emotion && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-200 border border-orange-400/30 font-bold text-[10px]">
                          {activeSubtitle.emotion}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Spoken Dialogue Text with High Contrast Shadow */}
                <p
                  className={`font-semibold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-snug ${
                    subtitleFontSize === 'sm'
                      ? 'text-xs sm:text-sm'
                      : subtitleFontSize === 'lg'
                      ? 'text-base sm:text-xl font-bold'
                      : 'text-sm sm:text-base font-semibold'
                  } ${
                    subtitleStyle === 'cinematic'
                      ? 'text-amber-100'
                      : subtitleStyle === 'classic'
                      ? 'text-white'
                      : 'text-stone-100'
                  }`}
                >
                  "{activeSubtitle.dialogue}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Playback Bar & Subtitle Toggle Switch */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 px-1 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            id="toggle-play-btn"
            onClick={togglePlay}
            className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 transition cursor-pointer shadow-sm"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            id="restart-video-btn"
            onClick={handleRestart}
            className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 transition cursor-pointer shadow-sm"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="toggle-mute-btn"
            onClick={toggleMute}
            className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 transition cursor-pointer shadow-sm"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <span className="font-mono text-[#2D2D2D] font-bold px-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* SUBTITLE TOGGLE SWITCH & SETTINGS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Subtitles Toggle Switch Button */}
          <div className="flex items-center bg-stone-50 border border-orange-200/80 rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              id="toggle-subtitles-btn"
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subtitlesEnabled
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white text-stone-500 hover:text-stone-800'
              }`}
              title={subtitlesEnabled ? 'Turn Subtitles OFF' : 'Turn Subtitles ON'}
            >
              <Captions className="w-3.5 h-3.5" />
              <span>Subtitles</span>
              {/* Toggle Switch Visual Indicator */}
              <div
                className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                  subtitlesEnabled ? 'bg-white/30 justify-end' : 'bg-stone-300 justify-start'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full shadow-sm transform transition-transform ${
                    subtitlesEnabled ? 'bg-white' : 'bg-white'
                  }`}
                />
              </div>
            </button>

            {/* Subtitle Customization Settings Dropdown Toggle */}
            <button
              type="button"
              id="toggle-subtitle-settings-btn"
              onClick={() => setShowSubtitleSettings(!showSubtitleSettings)}
              className={`p-1.5 rounded-xl transition cursor-pointer ml-1 ${
                showSubtitleSettings
                  ? 'bg-orange-100 text-orange-600'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-orange-50'
              }`}
              title="Subtitle Style & Appearance Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full text-[10px] font-black uppercase tracking-tight hidden sm:flex items-center gap-1">
            <Music className="w-3 h-3 text-amber-600" />
            <span>Orchestral Score</span>
          </span>

          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-tight hidden sm:inline">
            Pixar Style v1.1
          </span>
          
          <button
            type="button"
            id="fullscreen-btn"
            onClick={handleFullscreen}
            className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 transition cursor-pointer shadow-sm"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUBTITLE SETTINGS PANEL (EXPANDABLE) */}
      {showSubtitleSettings && (
        <div
          id="subtitle-settings-panel"
          className="bg-orange-50/40 border-2 border-orange-100 rounded-2xl p-4 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-orange-100 pb-2">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black text-[#2D2D2D] uppercase tracking-wider">
                Subtitle Appearance & Styling
              </span>
            </div>
            <span className="text-[11px] font-semibold text-stone-500">
              Active Dialogue: {activeSubtitle ? `Scene ${activeSubtitle.sceneNumber}` : 'Waiting for dialogue...'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600">Font Size</label>
              <div className="flex bg-white rounded-xl border border-orange-200 p-1 shadow-sm">
                {(['sm', 'base', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    id={`subtitle-size-${size}`}
                    onClick={() => setSubtitleFontSize(size)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subtitleFontSize === size
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {size === 'sm' ? 'Compact' : size === 'base' ? 'Standard' : 'Large'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Theme / Style Preset */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600">Color Theme</label>
              <div className="flex bg-white rounded-xl border border-orange-200 p-1 shadow-sm">
                {(['cinematic', 'classic', 'minimal'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    id={`subtitle-theme-${style}`}
                    onClick={() => setSubtitleStyle(style)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subtitleStyle === style
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {style === 'cinematic' ? 'Pixar Gold' : style === 'classic' ? 'Cinema' : 'Minimal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion Tag Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600">Scene Badges</label>
              <button
                type="button"
                id="toggle-emotion-badge-btn"
                onClick={() => setShowEmotionTag(!showEmotionTag)}
                className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between font-bold transition cursor-pointer shadow-sm ${
                  showEmotionTag
                    ? 'bg-white border-orange-300 text-orange-700'
                    : 'bg-stone-50 border-stone-200 text-stone-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-orange-500" />
                  <span>Emotion Labels</span>
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    showEmotionTag ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {showEmotionTag ? 'SHOWING' : 'HIDDEN'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Scene Subtitle Timeline Jumper */}
          {sceneTimings.length > 0 && (
            <div className="pt-2 border-t border-orange-100 space-y-1.5">
              <p className="text-[11px] font-bold text-stone-500">
                Click any dialogue line to jump video playback:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sceneTimings.map((timing) => {
                  const isActive = activeSubtitle?.sceneNumber === timing.sceneNumber;
                  return (
                    <button
                      key={timing.sceneNumber}
                      type="button"
                      id={`jump-subtitle-scene-${timing.sceneNumber}`}
                      onClick={() => jumpToScene(timing.start)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white border border-orange-200 text-stone-700 hover:bg-orange-50'
                      }`}
                    >
                      <span>Scene {timing.sceneNumber}</span>
                      <span className="text-[10px] opacity-75">({formatTime(timing.start)})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INDIVIDUAL SCENE EXPORT & SOCIAL MEDIA CLIPS SECTION */}
      {scenes && scenes.length > 0 && (
        <div className="pt-6 border-t-2 border-orange-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500 text-white shadow-sm">
                  <Share2 className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-black text-[#2D2D2D] tracking-tight">
                  Export Individual Scenes & Social Clips
                </h3>
              </div>
              <p className="text-xs font-semibold text-stone-500 mt-1">
                Download standalone scene video clips or looping animated GIFs optimized for Discord, X (Twitter), Instagram Reels, TikTok & Reddit.
              </p>
            </div>

            {/* Filter Tabs & Batch Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-orange-50/80 p-1 rounded-xl border border-orange-200/80 text-xs font-bold">
                <button
                  type="button"
                  id="filter-all-clips-btn"
                  onClick={() => setExportFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    exportFilter === 'all'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  All Formats
                </button>
                <button
                  type="button"
                  id="filter-video-clips-btn"
                  onClick={() => setExportFilter('video')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    exportFilter === 'video'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  MP4 Clips
                </button>
                <button
                  type="button"
                  id="filter-gif-clips-btn"
                  onClick={() => setExportFilter('gif')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    exportFilter === 'gif'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  GIFs
                </button>
              </div>

              {/* Batch Actions */}
              <button
                type="button"
                id="download-all-clips-btn"
                onClick={handleDownloadAllClips}
                className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Download all scenes as standalone MP4 clips"
              >
                <Clapperboard className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">All MP4s</span>
              </button>
              <button
                type="button"
                id="download-all-gifs-btn"
                onClick={handleDownloadAllGifs}
                className="px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-100/70 hover:bg-orange-200 border border-orange-200 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Download all scenes as social GIFs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                <span className="hidden sm:inline">All GIFs</span>
              </button>
            </div>
          </div>

          {/* Scene Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene, idx) => {
              const sceneNum = scene.scene_number || idx + 1;
              const clipVideoUrl = scene.clip_video_url || `/api/video/clip_scene_${sceneNum}.mp4`;
              const isShowingGif = previewGifScene === sceneNum;

              return (
                <div
                  key={idx}
                  id={`export-scene-card-${sceneNum}`}
                  className="bg-orange-50/20 border-2 border-orange-100 rounded-3xl p-4 flex flex-col justify-between space-y-3 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100/50 transition-all group"
                >
                  {/* Scene Media Preview */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#2D2D2D] border border-orange-100 shadow-inner">
                    {isShowingGif && (scene.gif_url || scene.image_url) ? (
                      <img
                        src={scene.gif_url || scene.image_url}
                        alt={`Scene ${sceneNum} GIF`}
                        className="w-full h-full object-cover"
                      />
                    ) : scene.image_url ? (
                      <img
                        src={scene.image_url}
                        alt={`Scene ${sceneNum}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 font-bold">
                        Visual Rendering...
                      </div>
                    )}

                    {/* Scene Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                      Scene {sceneNum}
                    </div>

                    {/* Emotion Tag */}
                    {scene.character_emotion && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-orange-500/80 backdrop-blur-md text-white text-[10px] font-bold">
                        {scene.character_emotion}
                      </div>
                    )}

                    {/* GIF Preview Toggle */}
                    <button
                      type="button"
                      id={`toggle-gif-preview-${sceneNum}`}
                      onClick={() => setPreviewGifScene(isShowingGif ? null : sceneNum)}
                      className={`absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition shadow-md cursor-pointer ${
                        isShowingGif
                          ? 'bg-orange-500 text-white ring-2 ring-white'
                          : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>{isShowingGif ? 'Exit GIF' : 'Preview GIF'}</span>
                    </button>
                  </div>

                  {/* Scene Excerpt */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#2D2D2D] line-clamp-1 italic">
                      "{scene.dialogue}"
                    </p>
                    <p className="text-[11px] text-stone-500 line-clamp-1 font-medium">
                      {scene.visual_description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-orange-100 flex flex-wrap items-center gap-2">
                    {(exportFilter === 'all' || exportFilter === 'video') && (
                      <a
                        id={`download-mp4-scene-${sceneNum}`}
                        href={clipVideoUrl}
                        download={`scene_${sceneNum}_pixar_clip.mp4`}
                        className="flex-1 min-w-[100px] py-2 px-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:scale-[1.02] active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Download standalone MP4 with Ken Burns motion & character dialogue"
                      >
                        <Clapperboard className="w-3.5 h-3.5" />
                        <span>Clip MP4</span>
                      </a>
                    )}

                    {(exportFilter === 'all' || exportFilter === 'gif') && (
                      <button
                        type="button"
                        id={`download-gif-scene-${sceneNum}`}
                        disabled={exportingScene === sceneNum}
                        onClick={() => handleOnDemandGifExport(scene, idx)}
                        className="flex-1 min-w-[100px] py-2 px-3 bg-white hover:bg-orange-50 border-2 border-orange-200 text-orange-600 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        title="Download animated GIF loop for social media & Discord"
                      >
                        {exportingScene === sceneNum ? (
                          <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                        )}
                        <span>{exportingScene === sceneNum ? 'Building...' : 'Social GIF'}</span>
                      </button>
                    )}

                    {/* Copy Link button */}
                    <button
                      type="button"
                      id={`copy-clip-url-${sceneNum}`}
                      onClick={() => handleCopyLink(clipVideoUrl, `scene_${sceneNum}`)}
                      className="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-stone-600 hover:text-orange-600 rounded-xl transition cursor-pointer"
                      title="Copy direct clip link to clipboard"
                    >
                      {copiedId === `scene_${sceneNum}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

