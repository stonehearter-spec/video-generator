import { pcmToWav } from './audio-utils.js';

interface Note {
  freq: number;
  startTime: number;
  duration: number;
  velocity: number;
  instrument: 'celesta' | 'strings' | 'pizzicato' | 'flute' | 'horn';
}

// Frequency helper for standard notes
const noteToFreq = (note: string): number => {
  const noteMap: Record<string, number> = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98,
  };
  return noteMap[note] || 440;
};

/**
 * Generates an authentic Pixar-style orchestral score (warm strings, celesta,
 * pizzicato acoustic bass, playful woodwinds, and noble French horns) in WAV format.
 */
export function generatePixarOrchestralScore(
  durationSec: number = 32,
  sampleRate: number = 44100
): Buffer {
  const totalSamples = Math.ceil(durationSec * sampleRate);
  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  const notes: Note[] = [];

  // Pixar-style Chord Progression & Melody patterns (approx 4 sec per chord bar)
  const barDuration = 4.0;
  const totalBars = Math.ceil(durationSec / barDuration) + 1;

  const chordProgression = [
    // Bar 0: Warm Cmaj7 "Whimsical Opening"
    {
      root: 'C2',
      bass: ['C3', 'G3'],
      pad: ['C4', 'E4', 'G4', 'B4'],
      horn: ['C3', 'G3', 'E4'],
      celestaMotif: ['C5', 'E5', 'G5', 'B5', 'C6', 'G5', 'E5', 'B4'],
      fluteMotif: ['E5', 'G5', 'A5', 'G5'],
    },
    // Bar 1: Am9 "Curiosity & Wonder"
    {
      root: 'A2',
      bass: ['A2', 'E3'],
      pad: ['A3', 'C4', 'E4', 'G4', 'B4'],
      horn: ['A2', 'E3', 'C4'],
      celestaMotif: ['A5', 'C6', 'E6', 'G5', 'A5', 'E5', 'C5', 'A4'],
      fluteMotif: ['A5', 'B5', 'C6', 'B5'],
    },
    // Bar 2: Fmaj9 "Adventure & Discovery"
    {
      root: 'F2',
      bass: ['F2', 'C3'],
      pad: ['F3', 'A3', 'C4', 'E4', 'G4'],
      horn: ['F2', 'C3', 'A3'],
      celestaMotif: ['F5', 'A5', 'C6', 'E6', 'F5', 'C5', 'A4', 'C5'],
      fluteMotif: ['C6', 'D6', 'E6', 'D6'],
    },
    // Bar 3: G7sus4 -> G7 "Rising Anticipation"
    {
      root: 'G2',
      bass: ['G2', 'D3'],
      pad: ['G3', 'D4', 'F4', 'A4', 'B4'],
      horn: ['G2', 'D3', 'B3'],
      celestaMotif: ['G5', 'B5', 'D6', 'F6', 'G6', 'D6', 'B5', 'G5'],
      fluteMotif: ['D6', 'E6', 'F6', 'G6'],
    },
    // Bar 4: Em7 "Tender Emotional Moment"
    {
      root: 'E2',
      bass: ['E2', 'B2'],
      pad: ['E3', 'G3', 'B3', 'D4', 'G4'],
      horn: ['E2', 'B2', 'G3'],
      celestaMotif: ['E5', 'G5', 'B5', 'D6', 'E6', 'B5', 'G5', 'E5'],
      fluteMotif: ['G5', 'A5', 'B5', 'G5'],
    },
    // Bar 5: Dm9 "Courageous Resolve"
    {
      root: 'D2',
      bass: ['D2', 'A2'],
      pad: ['D3', 'F3', 'A3', 'C4', 'E4'],
      horn: ['D2', 'A2', 'F3'],
      celestaMotif: ['D5', 'F5', 'A5', 'C6', 'D6', 'A5', 'F5', 'D5'],
      fluteMotif: ['A5', 'C6', 'D6', 'E6'],
    },
    // Bar 6: F/G -> G13 "Triumphant Crescendo"
    {
      root: 'G2',
      bass: ['G2', 'D3'],
      pad: ['G3', 'F4', 'A4', 'C5', 'E5'],
      horn: ['G2', 'D3', 'F4'],
      celestaMotif: ['F5', 'A5', 'C6', 'E6', 'G6', 'E6', 'C6', 'A5'],
      fluteMotif: ['E6', 'F6', 'G6', 'C6'],
    },
    // Bar 7: Cmaj9 "Heartfelt Resolution"
    {
      root: 'C2',
      bass: ['C2', 'G2'],
      pad: ['C3', 'G3', 'E4', 'B4', 'D5'],
      horn: ['C3', 'G3', 'E4'],
      celestaMotif: ['C5', 'G5', 'E6', 'B5', 'C6', 'G5', 'E5', 'C5'],
      fluteMotif: ['C6', 'B5', 'G5', 'E5'],
    },
  ];

  for (let bar = 0; bar < totalBars; bar++) {
    const barStartTime = bar * barDuration;
    if (barStartTime >= durationSec) break;

    const chord = chordProgression[bar % chordProgression.length];

    // 1. Strings Pad (Sustained whole bar with rich vibrato & warmth)
    chord.pad.forEach((noteStr, idx) => {
      notes.push({
        freq: noteToFreq(noteStr),
        startTime: barStartTime,
        duration: barDuration + 0.5,
        velocity: 0.18 + (idx * 0.02),
        instrument: 'strings',
      });
    });

    // 2. French Horn Harmony
    chord.horn.forEach((noteStr) => {
      notes.push({
        freq: noteToFreq(noteStr),
        startTime: barStartTime + 0.1,
        duration: barDuration * 0.9,
        velocity: 0.14,
        instrument: 'horn',
      });
    });

    // 3. Pizzicato Acoustic Bass (Beat 1 and Beat 3)
    notes.push({
      freq: noteToFreq(chord.root),
      startTime: barStartTime,
      duration: 1.2,
      velocity: 0.35,
      instrument: 'pizzicato',
    });
    notes.push({
      freq: noteToFreq(chord.bass[1] || chord.bass[0]),
      startTime: barStartTime + (barDuration / 2),
      duration: 1.0,
      velocity: 0.28,
      instrument: 'pizzicato',
    });

    // 4. Celesta / Glockenspiel Arpeggios (8th notes across the bar)
    const celestaStep = barDuration / chord.celestaMotif.length;
    chord.celestaMotif.forEach((noteStr, stepIdx) => {
      notes.push({
        freq: noteToFreq(noteStr),
        startTime: barStartTime + (stepIdx * celestaStep),
        duration: 1.8,
        velocity: 0.22 + (stepIdx % 2 === 0 ? 0.06 : 0),
        instrument: 'celesta',
      });
    });

    // 5. Playful Woodwind / Flute Melody
    const fluteStep = barDuration / chord.fluteMotif.length;
    chord.fluteMotif.forEach((noteStr, stepIdx) => {
      notes.push({
        freq: noteToFreq(noteStr),
        startTime: barStartTime + (stepIdx * fluteStep) + 0.05,
        duration: fluteStep * 0.95,
        velocity: 0.20,
        instrument: 'flute',
      });
    });
  }

  // Synthesize each note into left and right channel with acoustic physical modeling
  for (const note of notes) {
    const startSample = Math.floor(note.startTime * sampleRate);
    const numSamples = Math.floor(note.duration * sampleRate);

    // Pan instrument slightly in stereo field
    let pan = 0.5; // Center
    if (note.instrument === 'celesta') pan = 0.65; // Slightly right
    else if (note.instrument === 'strings') pan = 0.45; // Wide left/center
    else if (note.instrument === 'flute') pan = 0.35; // Slightly left
    else if (note.instrument === 'horn') pan = 0.55; // Slightly right
    else if (note.instrument === 'pizzicato') pan = 0.5; // Center bass

    const leftGain = Math.cos(pan * Math.PI * 0.5) * note.velocity;
    const rightGain = Math.sin(pan * Math.PI * 0.5) * note.velocity;

    for (let i = 0; i < numSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;

      const t = i / sampleRate;
      let sample = 0;

      if (note.instrument === 'celesta') {
        // Bell-like pure harmonics with chime sparkle and exponential decay
        const env = Math.exp(-t * 3.6);
        const f = note.freq;
        sample = (
          Math.sin(2 * Math.PI * f * t) * 0.7 +
          Math.sin(2 * Math.PI * f * 2.0 * t) * 0.25 +
          Math.sin(2 * Math.PI * f * 3.8 * t) * 0.12 +
          Math.sin(2 * Math.PI * f * 5.4 * t) * 0.05
        ) * env;
      } else if (note.instrument === 'strings') {
        // Lush string ensemble: detuned saw/sine hybrid with 5.2Hz natural vibrato
        const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * 0.003;
        const f1 = note.freq * (1 + vibrato);
        const f2 = note.freq * (1.003 - vibrato);
        const f3 = note.freq * (0.997 + vibrato);

        // Soft attack and smooth release
        const attack = Math.min(1.0, t / 0.45);
        const release = Math.max(0.0, 1.0 - (t / note.duration));
        const env = attack * Math.pow(release, 0.8);

        const saw1 = (2 * ((f1 * t) % 1)) - 1;
        const saw2 = (2 * ((f2 * t) % 1)) - 1;
        const sine = Math.sin(2 * Math.PI * f3 * t);

        // Filtered warmth
        sample = (saw1 * 0.25 + saw2 * 0.25 + sine * 0.5) * env * 0.65;
      } else if (note.instrument === 'pizzicato') {
        // Acoustic plucked bass: fast percussive transient + warm wooden body
        const env = Math.exp(-t * 4.2);
        const f = note.freq;
        sample = (
          Math.sin(2 * Math.PI * f * t) * 0.8 +
          Math.sin(2 * Math.PI * f * 2.0 * t) * 0.25 +
          Math.sin(2 * Math.PI * f * 3.0 * t) * 0.1
        ) * env;
      } else if (note.instrument === 'flute') {
        // Expressive woodwind tone with slight breath harmonics
        const vibrato = t > 0.3 ? Math.sin(2 * Math.PI * 5.8 * (t - 0.3)) * 0.005 : 0;
        const f = note.freq * (1 + vibrato);
        const attack = Math.min(1.0, t / 0.12);
        const release = Math.max(0.0, 1.0 - (t / note.duration));
        const env = attack * release;

        sample = (
          Math.sin(2 * Math.PI * f * t) * 0.85 +
          Math.sin(2 * Math.PI * f * 2 * t) * 0.12 +
          Math.sin(2 * Math.PI * f * 3 * t) * 0.03
        ) * env;
      } else if (note.instrument === 'horn') {
        // Warm French horn brass tone with noble harmonics
        const attack = Math.min(1.0, t / 0.3);
        const release = Math.max(0.0, 1.0 - (t / note.duration));
        const env = attack * release;
        const f = note.freq;

        sample = (
          Math.sin(2 * Math.PI * f * t) * 0.6 +
          Math.sin(2 * Math.PI * f * 2 * t) * 0.3 +
          Math.sin(2 * Math.PI * f * 3 * t) * 0.1
        ) * env;
      }

      leftChannel[idx] += sample * leftGain;
      rightChannel[idx] += sample * rightGain;
    }
  }

  // Master fade-in (1.5s) and fade-out (2.0s)
  const fadeInSamples = Math.floor(1.5 * sampleRate);
  const fadeOutSamples = Math.floor(2.5 * sampleRate);

  for (let i = 0; i < totalSamples; i++) {
    let masterEnv = 1.0;
    if (i < fadeInSamples) {
      masterEnv = i / fadeInSamples;
    } else if (i > totalSamples - fadeOutSamples) {
      masterEnv = Math.max(0, (totalSamples - i) / fadeOutSamples);
    }

    leftChannel[i] *= masterEnv;
    rightChannel[i] *= masterEnv;
  }

  // Interleave to 16-bit stereo PCM
  const pcmBuffer = Buffer.alloc(totalSamples * 4); // 2 channels * 2 bytes
  for (let i = 0; i < totalSamples; i++) {
    // Soft limiter clipping protection
    const leftVal = Math.max(-1.0, Math.min(1.0, leftChannel[i] * 1.15));
    const rightVal = Math.max(-1.0, Math.min(1.0, rightChannel[i] * 1.15));

    const leftInt = Math.floor(leftVal * 32767);
    const rightInt = Math.floor(rightVal * 32767);

    pcmBuffer.writeInt16LE(leftInt, i * 4);
    pcmBuffer.writeInt16LE(rightInt, i * 4 + 2);
  }

  // Convert stereo PCM to standard WAV
  return pcmToWav(pcmBuffer, sampleRate, 2, 16);
}
