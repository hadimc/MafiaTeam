"use client";

import { useEffect, useRef } from "react";
import { tickHz, timerCue, type TimerCue } from "./timerSound";

let audioCtx: AudioContext | null = null;

function context() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function unlockTimerAudio() {
  const audio = context();
  if (audio.state === "suspended") void audio.resume();
}

function tone(opts: {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
  endFreq?: number;
}) {
  const audio = context();
  const start = audio.currentTime + (opts.delay ?? 0);
  const osc = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.endFreq, 1), start + opts.duration);
  }
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(opts.type === "sawtooth" || opts.type === "square" ? 1400 : 3200, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.03);
}

export function playTimerCue(cue: TimerCue, secondsLeft: number) {
  if (cue === "none") return;
  unlockTimerAudio();
  if (cue === "tick") {
    tone({ freq: tickHz(secondsLeft), duration: 0.06, type: "triangle", gain: 0.1 });
    return;
  }
  if (cue === "urgent") {
    tone({ freq: 1560, duration: 0.045, type: "square", gain: 0.07 });
    tone({ freq: 1040, duration: 0.07, type: "square", gain: 0.06, delay: 0.075 });
    return;
  }
  tone({ freq: 148, duration: 0.48, type: "sawtooth", gain: 0.18, endFreq: 78 });
  tone({ freq: 196, duration: 0.4, type: "square", gain: 0.08 });
  tone({ freq: 64, duration: 0.2, type: "sine", gain: 0.22, delay: 0.02 });
}

export function useTimerSound(left: number, running: boolean) {
  const prev = useRef(left);
  useEffect(() => {
    if (!running && left !== 0) {
      prev.current = left;
      return;
    }
    const cue = timerCue(prev.current, left);
    prev.current = left;
    if (cue !== "none") playTimerCue(cue, left);
  }, [left, running]);
}
