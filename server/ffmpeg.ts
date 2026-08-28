import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generatePixarOrchestralScore } from './orchestral-score.js';

// Configure ffmpeg binary path
if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

export interface StitchSceneInput {
  scene_number: number;
  imageBuffer: Buffer;
  wavBuffer: Buffer;
  durationSec: number;
  dialogue?: string;
}

export interface SceneClipResult {
  scene_number: number;
  videoBuffer: Buffer;
  gifBuffer: Buffer;
  durationSec: number;
}

export interface StitchResult {
  videoBuffer: Buffer;
  mimeType: string;
  filename: string;
  totalDurationSec: number;
  sceneClips: SceneClipResult[];
}

/**
 * Generates an animated social GIF with Ken Burns effect from a scene frame.
 */
export async function renderProceduralPixarFrame(
  sceneNumber: number,
  visualDescription: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<Buffer> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixar-frame-'));
  const outPath = path.join(tempDir, 'frame.png');
  const width = aspectRatio === '9:16' ? 720 : 1280;
  const height = aspectRatio === '9:16' ? 1280 : 720;

  // Warm atmospheric palette colors
  const palettes = [
    { c1: '0x1A1423', c2: '0xE65C00', c3: '0xF9D423' }, // Sunset golden hour
    { c1: '0x0D1B2A', c2: '0x1B263B', c3: '0x415A77' }, // Deep starry night
    { c1: '0x2B1E3A', c2: '0x8B3A62', c3: '0xEE964B' }, // Magical twilight
    { c1: '0x1E3D59', c2: '0x17B890', c3: '0xF5F0E1' }, // Whimsical adventure
  ];
  const p = palettes[(sceneNumber - 1) % palettes.length];

  try {
    // Generate a cinematic volumetric gradient frame with vignette and soft glow
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(`gradients=s=${width}x${height}:c0=${p.c1}:c1=${p.c2}:c2=${p.c3}:type=radial:x0=${width/2}:y0=${height/2}:r0=120:r1=${Math.max(width, height)/1.2}`)
        .inputOptions(['-f lavfi'])
        .outputOptions([
          '-vframes 1',
          '-pix_fmt rgb24',
          '-vf vignette=PI/4'
        ])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err) => {
          // Fallback to solid color with vignette if gradient filter is unsupported
          ffmpeg()
            .input(`color=c=0x1E293B:s=${width}x${height}`)
            .inputOptions(['-f lavfi'])
            .outputOptions(['-vframes 1', '-pix_fmt rgb24'])
            .output(outPath)
            .on('end', () => resolve())
            .on('error', (e) => reject(e))
            .run();
        })
        .run();
    });

    return fs.readFileSync(outPath);
  } catch (err) {
    console.error('Error creating procedural frame:', err);
    // Minimal 1x1 fallback pixel expanded or return transparent buffer
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function renderSceneGif(
  imageBuffer: Buffer,
  aspectRatio: '16:9' | '9:16' = '16:9',
  durationSec: number = 4
): Promise<Buffer> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixar-gif-'));
  const imgPath = path.join(tempDir, 'input.png');
  const gifPath = path.join(tempDir, 'output.gif');
  fs.writeFileSync(imgPath, imageBuffer);

  try {
    const scaleFilter = aspectRatio === '9:16'
      ? `scale=360:640:force_original_aspect_ratio=increase,crop=360:640,zoompan=z='min(zoom+0.0015,1.15)':d=${durationSec * 15}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=360x640:fps=15`
      : `scale=640:360:force_original_aspect_ratio=increase,crop=640:360,zoompan=z='min(zoom+0.0015,1.15)':d=${durationSec * 15}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=640x360:fps=15`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(imgPath)
        .loop(durationSec)
        .outputOptions([
          `-vf ${scaleFilter},split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`,
          `-t ${durationSec}`,
          '-r 15'
        ])
        .output(gifPath)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.warn('GIF palette filter error, fallback to simple gif:', err);
          ffmpeg()
            .input(imgPath)
            .loop(durationSec)
            .outputOptions([
              aspectRatio === '9:16' ? '-vf scale=360:640' : '-vf scale=640:360',
              `-t ${durationSec}`,
              '-r 12'
            ])
            .output(gifPath)
            .on('end', () => resolve())
            .on('error', (e) => reject(e))
            .run();
        })
        .run();
    });

    return fs.readFileSync(gifPath);
  } catch (err) {
    console.error('Error rendering GIF:', err);
    return imageBuffer;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Step D (Compilation): Compiles multi-scene visual frames and synthesized audio into a merged MP4 video.
 * Incorporates an instrumental Pixar-style orchestral background music track mixed with dialogue
 * using FFmpeg audio mixing filters (amix, volume, afade).
 */
export async function stitchPixarVideo(
  scenes: StitchSceneInput[],
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<StitchResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixar-stitch-'));
  const width = aspectRatio === '9:16' ? 720 : 1280;
  const height = aspectRatio === '9:16' ? 1280 : 720;

  try {
    const sceneClipPaths: string[] = [];
    const sceneClips: SceneClipResult[] = [];
    let accumulatedDuration = 0;

    // Calculate total duration
    const sceneDurations = scenes.map((sc) => Math.max(7, Math.ceil(sc.durationSec + 1.5)));
    const totalVideoDuration = sceneDurations.reduce((acc, d) => acc + d, 0);

    // 1. Generate full Pixar-style orchestral background score (celesta, strings, bass, woodwinds, horns)
    const masterBgmBuffer = generatePixarOrchestralScore(totalVideoDuration + 6, 44100);
    const masterBgmPath = path.join(tempDir, 'master_orchestral_bgm.wav');
    fs.writeFileSync(masterBgmPath, masterBgmBuffer);

    let currentBgmOffset = 0;

    // 2. Render each scene clip with Ken Burns motion & mixed audio (Dialogue + Scene Orchestral BGM)
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      const clipDuration = sceneDurations[i];
      accumulatedDuration += clipDuration;

      const imgPath = path.join(tempDir, `scene_${i}.png`);
      const voicePath = path.join(tempDir, `scene_voice_${i}.wav`);
      const sceneBgmPath = path.join(tempDir, `scene_bgm_${i}.wav`);
      const clipPath = path.join(tempDir, `clip_${i}.mp4`);

      fs.writeFileSync(imgPath, sc.imageBuffer);
      fs.writeFileSync(voicePath, sc.wavBuffer);

      // Generate scene-specific orchestral background track for standalone scene clip
      const sceneBgmBuffer = generatePixarOrchestralScore(clipDuration + 3, 44100);
      fs.writeFileSync(sceneBgmPath, sceneBgmBuffer);

      // Zoompan visual filter
      const zoompanFilter = aspectRatio === '9:16'
        ? `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,zoompan=z='min(zoom+0.0012,1.15)':d=${clipDuration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps=25[v]`
        : `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0012,1.15)':d=${clipDuration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=25[v]`;

      // Audio mixing filter: Mix character dialogue (volume 1.0) with orchestral background score (volume 0.22)
      const audioMixFilter = `[1:a]volume=1.0,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice];[2:a]volume=0.22,afade=t=in:st=0:d=1.0,afade=t=out:st=${Math.max(1, clipDuration - 1.5)}:d=1.5,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2:weights=1.0 0.26[a]`;

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(imgPath)
          .loop(clipDuration)
          .input(voicePath)
          .input(sceneBgmPath)
          .complexFilter([zoompanFilter, audioMixFilter])
          .outputOptions([
            '-map [v]',
            '-map [a]',
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 192k',
            '-r 25',
            `-t ${clipDuration}`,
          ])
          .output(clipPath)
          .on('end', () => resolve())
          .on('error', (err) => {
            console.warn(`Complex audio mixing fallback for scene ${i}:`, err.message);
            // Fallback: simple mixing or voice-only with video
            ffmpeg()
              .input(imgPath)
              .loop(clipDuration)
              .input(voicePath)
              .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-c:a aac',
                '-b:a 192k',
                `-s ${width}x${height}`,
                `-t ${clipDuration}`,
              ])
              .output(clipPath)
              .on('end', () => resolve())
              .on('error', (e) => reject(e))
              .run();
          })
          .run();
      });

      currentBgmOffset += clipDuration;
      sceneClipPaths.push(clipPath);

      // Read standalone clip video buffer
      const clipBuffer = fs.readFileSync(clipPath);

      // Generate standalone animated GIF for this scene
      const gifBuffer = await renderSceneGif(sc.imageBuffer, aspectRatio, 4);

      sceneClips.push({
        scene_number: sc.scene_number,
        videoBuffer: clipBuffer,
        gifBuffer,
        durationSec: clipDuration,
      });
    }

    // 3. Concatenate all scene clips into a single master MP4
    const finalMp4Path = path.join(tempDir, 'master_pixar_animation.mp4');
    const concatListPath = path.join(tempDir, 'concat_list.txt');

    const concatContent = sceneClipPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c:v copy',
          '-c:a copy',
          '-movflags +faststart',
        ])
        .output(finalMp4Path)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('Concat copy error, trying re-encoding merge:', err);
          const command = ffmpeg();
          sceneClipPaths.forEach((p) => command.input(p));
          command
            .outputOptions([
              '-c:v libx264',
              '-c:a aac',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
            ])
            .output(finalMp4Path)
            .on('end', () => resolve())
            .on('error', (e) => reject(e))
            .mergeToFile(finalMp4Path, tempDir);
        })
        .run();
    });

    const videoBuffer = fs.readFileSync(finalMp4Path);
    const filename = `pixar_movie_${Date.now()}.mp4`;

    return {
      videoBuffer,
      mimeType: 'video/mp4',
      filename,
      totalDurationSec: accumulatedDuration,
      sceneClips,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up temp stitch dir:', e);
    }
  }
}
