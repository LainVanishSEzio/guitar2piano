/* =========================================================================
 * Tone.js 播放引擎
 * ========================================================================= */
import * as Tone from "tone";

/** MIDI → 频率（赫兹），避免依赖 Tone.Frequency 类型 */
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export interface PlayItem {
  /** 右手音（MIDI） */
  rh: number[];
  /** 左手音（MIDI） */
  lh: number[];
  /** 时值（拍） */
  beats: number;
  velocities?: number[];
}

export interface PlayOptions {
  bpm: number;
  beatsPerBar: number;
  arpeggio: boolean;
  arpSpread: number;
  volume: number;
  loop: boolean;
  metronome: boolean;
  onIndex?: (index: number) => void;
  onEnd?: () => void;
}

class PianoPlayer {
  private synth: Tone.PolySynth<Tone.Synth> | null = null;
  private clicker: Tone.PolySynth<Tone.Synth> | null = null;
  private master: Tone.Volume | null = null;
  private clickGain: Tone.Volume | null = null;
  private ready = false;
  private current: { stop: () => void } | null = null;

  async init(): Promise<void> {
    if (this.ready) return;
    await Tone.start();

    const master = new Tone.Volume(-8).toDestination();
    const verb = new Tone.Freeverb({ roomSize: 0.7, dampening: 4200 }).connect(master);
    verb.wet.value = 0.16;
    const filter = new Tone.Filter({ frequency: 5200, type: "lowpass" }).connect(master);
    filter.connect(verb);

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.55, sustain: 0.22, release: 1.6 },
      volume: -6,
    }).connect(filter);
    synth.maxPolyphony = 24;

    const clickGain = new Tone.Volume(-16).connect(master);
    const clicker = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    }).connect(clickGain);
    clicker.maxPolyphony = 4;

    this.master = master;
    this.synth = synth;
    this.clicker = clicker;
    this.clickGain = clickGain;
    this.ready = true;
  }

  get isReady() {
    return this.ready;
  }

  setVolume(db: number) {
    if (this.master) this.master.volume.value = db;
  }

  /** 试听单个音 */
  async preview(midi: number) {
    await this.init();
    if (!this.synth) return;
    this.synth.triggerAttackRelease(midiToFreq(midi), "4n", undefined, 0.7);
  }

  stop() {
    const t = Tone.getTransport();
    t.stop();
    t.cancel(0);
    t.loop = false;
    if (this.synth) this.synth.releaseAll();
  }

  play(items: PlayItem[], opts: PlayOptions) {
    if (!this.ready || !this.synth) return;
    const t = Tone.getTransport();
    this.stop();

    t.bpm.value = opts.bpm;
    const spb = 60 / opts.bpm;
    this.setVolume(opts.volume);

    let cursor = 0;
    const synth = this.synth;
    const clicker = this.clicker;

    items.forEach((item, idx) => {
      const start = cursor * spb;
      const dur = item.beats * spb;
      const notes = [...item.lh, ...item.rh];
      if (notes.length) {
        const release = Math.max(0.12, dur * 0.92);
        if (opts.arpeggio && item.rh.length > 1) {
          const spread = Math.min(opts.arpSpread, item.beats * spb * 0.8) / item.rh.length;
          item.lh.forEach((m) =>
            synth.triggerAttackRelease(midiToFreq(m), release, start, 0.55),
          );
          item.rh.forEach((m, k) =>
            synth.triggerAttackRelease(midiToFreq(m), release, start + k * spread, 0.62),
          );
        } else {
          synth.triggerAttackRelease(
            notes.map((m) => midiToFreq(m)),
            release,
            start,
            0.62,
          );
        }
      }
      if (opts.onIndex) {
        Tone.Draw.schedule(() => opts.onIndex?.(idx), start + 0.001);
      }
      cursor += item.beats;
    });

    const totalBeats = cursor;
    const totalSeconds = totalBeats * spb + 0.6;

    if (opts.metronome) {
      const bpb = Math.max(1, opts.beatsPerBar);
      for (let b = 0; b * spb < totalBeats * spb; b++) {
        const time = b * spb;
        const accent = b % bpb === 0;
        t.schedule((time2) => {
          clicker?.triggerAttackRelease(accent ? "C6" : "G5", "32n", time2, accent ? 0.6 : 0.32);
        }, time);
      }
    }

    if (opts.loop) {
      t.loop = true;
      t.loopStart = 0;
      t.loopEnd = totalBeats * spb;
    } else {
      t.loop = false;
      t.schedule(() => {
        Tone.Draw.schedule(() => {
          opts.onEnd?.();
        }, Tone.now());
      }, totalSeconds - 0.4);
    }

    t.start();
  }
}

export const player = new PianoPlayer();
