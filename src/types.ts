export type AspectRatio = '16:9' | '9:16';

export type GenerationStage = 
  | 'idle'
  | 'scripting'
  | 'scene_generation'
  | 'audio_synthesis'
  | 'stitching'
  | 'completed'
  | 'error';

export interface Scene {
  scene_number: number;
  dialogue: string;
  visual_description: string;
  character_emotion?: string;
  camera_angle?: string;
  estimated_duration_sec?: number;
  image_url?: string;
  video_url?: string;
  clip_video_url?: string;
  gif_url?: string;
  audio_url?: string;
  audio_duration_sec?: number;
  status?: 'pending' | 'generating_visual' | 'generating_audio' | 'ready' | 'error';
}

export interface VideoProjectInput {
  story_idea: string;
  character_description: string;
  aspect_ratio: AspectRatio;
  voice_name?: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  scene_count?: number;
}

export interface GenerationProgress {
  stage: GenerationStage;
  percent: number;
  message: string;
  current_scene?: number;
  total_scenes?: number;
  scenes: Scene[];
  final_video_url?: string;
  download_filename?: string;
  error?: string;
}

export interface StoryPreset {
  id: string;
  title: string;
  tagline: string;
  story_idea: string;
  character_description: string;
  aspect_ratio: AspectRatio;
  voice_name: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  thumbnail_color: string;
}
