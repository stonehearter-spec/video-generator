import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generatePixarScript, generatePixarSceneVisual, generatePixarDialogueAudio } from './server/gemini.js';
import { stitchPixarVideo, renderSceneGif, StitchSceneInput } from './server/ffmpeg.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory cache for stored output files and jobs
const generatedVideos = new Map<string, { buffer: Buffer; mimeType: string; createdAt: number }>();

// Ensure /output directory exists
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Clean old files periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of generatedVideos.entries()) {
    if (now - val.createdAt > 1000 * 60 * 60) {
      generatedVideos.delete(key);
    }
  }
}, 1000 * 60 * 15);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Pixar Video Generator',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Step-by-step orchestrator for video generation
 */
async function orchestrateVideoGeneration(
  storyIdea: string,
  characterDescription: string,
  aspectRatio: '16:9' | '9:16' = '16:9',
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir' = 'Kore',
  sceneCount = 4,
  onProgress?: (stage: string, percent: number, message: string, data?: any) => void
) {
  // Step A: Scripting
  onProgress?.('scripting', 10, 'Step A: Directing Pixar screenplay with Gemini...');
  const scriptScenes = await generatePixarScript(storyIdea, characterDescription, sceneCount);
  
  onProgress?.('scripting', 25, `Generated ${scriptScenes.length} cinematic scenes`, { scenes: scriptScenes });

  // Step B & C: Concurrently generate visuals and audio for each scene
  onProgress?.('scene_generation', 30, 'Step B & C: Generating 3D Pixar visuals & synthesizing character voices...');
  
  const processedScenes: any[] = [];
  const stitchInputs: StitchSceneInput[] = [];

  for (let i = 0; i < scriptScenes.length; i++) {
    const sc = scriptScenes[i];
    const sceneIndex = i + 1;
    const progressBase = 30 + Math.floor((i / scriptScenes.length) * 45);

    onProgress?.(
      'scene_generation',
      progressBase,
      `Rendering Scene ${sceneIndex}/${scriptScenes.length}: "${sc.dialogue.slice(0, 30)}..."`,
      { currentScene: sceneIndex, totalScenes: scriptScenes.length }
    );

    // Parallel visual & audio generation per scene
    const [visualResult, audioResult] = await Promise.all([
      generatePixarSceneVisual(
        `${sc.visual_description}. Emotion: ${sc.character_emotion}. Camera: ${sc.camera_angle}.`,
        aspectRatio,
        sc.scene_number
      ),
      generatePixarDialogueAudio(sc.dialogue, voiceName, sc.character_emotion),
    ]);

    const imageBuffer = Buffer.from(visualResult.base64Data, 'base64');
    
    stitchInputs.push({
      scene_number: sc.scene_number,
      imageBuffer,
      wavBuffer: audioResult.wavBuffer,
      durationSec: audioResult.durationSec,
      dialogue: sc.dialogue,
    });

    processedScenes.push({
      scene_number: sc.scene_number,
      dialogue: sc.dialogue,
      visual_description: sc.visual_description,
      character_emotion: sc.character_emotion,
      camera_angle: sc.camera_angle,
      estimated_duration_sec: audioResult.durationSec + 1.5,
      image_url: visualResult.dataUrl,
      audio_url: audioResult.dataUrl,
      audio_duration_sec: audioResult.durationSec,
      status: 'ready',
    });
  }

  // Step D: Compilation
  onProgress?.('stitching', 80, 'Step D: Compiling clips with Fluent-FFmpeg & synchronizing audio tracks...');

  const stitchResult = await stitchPixarVideo(stitchInputs, aspectRatio);

  const videoId = `pixar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const videoFilename = `${videoId}.mp4`;
  
  // Cache in memory and save to disk
  generatedVideos.set(videoId, {
    buffer: stitchResult.videoBuffer,
    mimeType: 'video/mp4',
    createdAt: Date.now(),
  });

  const diskPath = path.join(outputDir, videoFilename);
  try {
    fs.writeFileSync(diskPath, stitchResult.videoBuffer);
  } catch (e) {
    console.warn('Could not write video to disk:', e);
  }

  // Cache individual scene clips and social GIFs
  if (stitchResult.sceneClips && stitchResult.sceneClips.length > 0) {
    for (const clip of stitchResult.sceneClips) {
      const clipId = `clip_${videoId}_s${clip.scene_number}`;
      const gifId = `gif_${videoId}_s${clip.scene_number}`;

      generatedVideos.set(clipId, {
        buffer: clip.videoBuffer,
        mimeType: 'video/mp4',
        createdAt: Date.now(),
      });

      generatedVideos.set(gifId, {
        buffer: clip.gifBuffer,
        mimeType: 'image/gif',
        createdAt: Date.now(),
      });

      // Save to disk
      try {
        fs.writeFileSync(path.join(outputDir, `${clipId}.mp4`), clip.videoBuffer);
        fs.writeFileSync(path.join(outputDir, `${gifId}.gif`), clip.gifBuffer);
      } catch (e) {
        console.warn('Could not write scene clip to disk:', e);
      }

      const matchingScene = processedScenes.find((s) => s.scene_number === clip.scene_number);
      if (matchingScene) {
        matchingScene.clip_video_url = `/api/video/${clipId}.mp4`;
        matchingScene.gif_url = `/api/video/${gifId}.gif`;
        matchingScene.estimated_duration_sec = clip.durationSec;
      }
    }
  }

  const finalVideoUrl = `/api/video/${videoId}.mp4`;

  onProgress?.('completed', 100, 'Animation compilation complete! Ready for premiere.', {
    final_video_url: finalVideoUrl,
    video_url: finalVideoUrl,
    scenes: processedScenes,
    total_duration_sec: stitchResult.totalDurationSec,
    filename: videoFilename,
  });

  return {
    videoId,
    finalVideoUrl,
    scenes: processedScenes,
    totalDurationSec: stitchResult.totalDurationSec,
    filename: videoFilename,
  };
}

/**
 * Standard Endpoint: /generate-video & /api/generate-video
 */
const handleGenerateVideo = async (req: express.Request, res: express.Response) => {
  const { story_idea, character_description, aspect_ratio = '16:9', voice_name = 'Kore', scene_count = 4 } = req.body;

  if (!story_idea || typeof story_idea !== 'string') {
    return res.status(400).json({ error: 'story_idea is required' });
  }

  try {
    const result = await orchestrateVideoGeneration(
      story_idea,
      character_description || '',
      aspect_ratio === '9:16' ? '9:16' : '16:9',
      voice_name,
      Math.min(6, Math.max(4, Number(scene_count) || 4))
    );

    res.json({
      success: true,
      video_url: result.finalVideoUrl,
      final_video_url: result.finalVideoUrl,
      scenes: result.scenes,
      total_duration_sec: result.totalDurationSec,
      aspect_ratio,
      filename: result.filename,
    });
  } catch (err: any) {
    console.error('Error generating video:', err);
    res.status(500).json({
      error: err?.message || 'Failed to generate Pixar video.',
    });
  }
};

app.post('/generate-video', handleGenerateVideo);
app.post('/api/generate-video', handleGenerateVideo);

/**
 * Real-time SSE Stream Endpoint for live progress stepper updates
 */
const handleGenerateVideoStream = async (req: express.Request, res: express.Response) => {
  const { story_idea, character_description, aspect_ratio = '16:9', voice_name = 'Kore', scene_count = 4 } = req.body;

  if (!story_idea || typeof story_idea !== 'string') {
    return res.status(400).json({ error: 'story_idea is required' });
  }

  // Set up robust SSE headers with no-buffering for Cloud Run / Nginx reverse proxies
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  let isClosed = false;
  const cleanup = () => {
    isClosed = true;
    clearInterval(keepAliveInterval);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);

  // Periodic keepalive comment to keep connection alive across reverse proxies
  const keepAliveInterval = setInterval(() => {
    if (!isClosed) {
      try {
        res.write(': keepalive\n\n');
        if (typeof (res as any).flush === 'function') (res as any).flush();
      } catch {
        cleanup();
      }
    }
  }, 4000);

  const sendEvent = (event: string, payload: any) => {
    if (isClosed) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    } catch (e) {
      console.warn('Error sending SSE event:', e);
    }
  };

  try {
    sendEvent('progress', { stage: 'scripting', percent: 5, message: 'Initiating Pixar studio director...' });

    await orchestrateVideoGeneration(
      story_idea,
      character_description || '',
      aspect_ratio === '9:16' ? '9:16' : '16:9',
      voice_name,
      Math.min(6, Math.max(4, Number(scene_count) || 4)),
      (stage, percent, message, extra) => {
        sendEvent('progress', { stage, percent, message, ...extra });
      }
    );

    sendEvent('done', {});
    res.end();
  } catch (err: any) {
    console.error('SSE Error:', err);
    sendEvent('error', { error: err?.message || 'Video generation failed.' });
    res.end();
  } finally {
    cleanup();
  }
};

app.post('/generate-video-stream', handleGenerateVideoStream);
app.post('/api/generate-video-stream', handleGenerateVideoStream);

/**
 * Serve video and GIF files directly by ID or filename
 */
app.get('/api/video/:id', (req, res) => {
  const fullParam = req.params.id;
  const isGif = fullParam.endsWith('.gif') || fullParam.startsWith('gif_');
  const cleanId = fullParam.replace(/\.(mp4|gif)$/, '');

  const cached = generatedVideos.get(cleanId) || generatedVideos.get(fullParam);

  if (cached) {
    res.setHeader('Content-Type', cached.mimeType);
    const ext = cached.mimeType === 'image/gif' ? 'gif' : 'mp4';
    res.setHeader('Content-Disposition', `inline; filename="${cleanId}.${ext}"`);
    res.setHeader('Content-Length', cached.buffer.length.toString());
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.send(cached.buffer);
  }

  // Check disk
  const diskPath = path.join(outputDir, `${cleanId}.${isGif ? 'gif' : 'mp4'}`);
  if (fs.existsSync(diskPath)) {
    const stat = fs.statSync(diskPath);
    res.setHeader('Content-Type', isGif ? 'image/gif' : 'video/mp4');
    res.setHeader('Content-Length', stat.size.toString());
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
    return res.sendFile(diskPath);
  }

  res.status(404).send('Media file not found.');
});

/**
 * On-demand export endpoint for converting specific scene frames to GIF or MP4
 */
app.post('/api/export-scene', async (req, res) => {
  const { image_url, format = 'gif', aspect_ratio = '16:9', scene_number = 1 } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }

  try {
    let imageBuffer: Buffer;
    if (image_url.startsWith('data:')) {
      const base64Part = image_url.split(',')[1];
      imageBuffer = Buffer.from(base64Part, 'base64');
    } else if (image_url.startsWith('/api/video/')) {
      const id = image_url.replace('/api/video/', '').replace(/\.(mp4|gif)$/, '');
      const cached = generatedVideos.get(id);
      if (cached) {
        imageBuffer = cached.buffer;
      } else {
        return res.status(404).json({ error: 'Cached scene not found' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    if (format === 'gif') {
      const gifBuffer = await renderSceneGif(imageBuffer, aspect_ratio === '9:16' ? '9:16' : '16:9', 4);
      const exportId = `export_scene_${scene_number}_${Date.now()}`;
      
      generatedVideos.set(exportId, {
        buffer: gifBuffer,
        mimeType: 'image/gif',
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        download_url: `/api/video/${exportId}.gif`,
        data_url: `data:image/gif;base64,${gifBuffer.toString('base64')}`,
        filename: `scene_${scene_number}_social.gif`,
        format: 'gif',
      });
    }

    return res.json({ success: true, message: 'Format ready' });
  } catch (err: any) {
    console.error('Error exporting scene:', err);
    res.status(500).json({ error: err?.message || 'Failed to export scene' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Pixar Video Generator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
