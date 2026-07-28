// Measures the real Salamander partial amplitude profile so the detector's
// harmonic weights are data-derived, not guessed.
import { readWavMono } from './wav.mjs';
import { decimate4, cqtFrame, N_BINS, MIDI_LO, LONGEST_KERNEL } from './detect.mjs';
import { sampleFileStem, SAMPLE_MIDIS } from './render.mjs';
const OFF=[0,12,19.0196,24,27.8631,31.0196,33.6883,36];
const wavDir=process.env.WAV_DIR;
const acc=OFF.map(()=>[]);
for(const m of SAMPLE_MIDIS){
  if(m<36||m>72) continue;
  const w=readWavMono(`${wavDir}/${sampleFileStem(m)}.wav`);
  const x=decimate4(w.data); const spec=new Float32Array(N_BINS);
  for (const at of [LONGEST_KERNEL+1024, LONGEST_KERNEL+8192, LONGEST_KERNEL+16384]){
    cqtFrame(x, at, spec);
    const b=m-MIDI_LO;
    const vals=OFF.map(o=>{ const i=Math.round(b+o); if(i<0||i+1>=N_BINS) return null; return Math.max(spec[i],spec[i+1]); });
    const mx=Math.max(...vals.filter(v=>v!==null));
    if(mx<=0) continue;
    vals.forEach((v,h)=>{ if(v!==null) acc[h].push(v/mx); });
  }
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const prof=acc.map(a=>a.length?mean(a):0);
console.log('measured partial profile (normalised to strongest partial):');
prof.forEach((v,h)=>console.log(`  h=${h+1} (+${OFF[h].toFixed(2)} st): ${v.toFixed(3)}  n=${acc[h].length}`));
console.log('as weights array:', JSON.stringify(prof.map(v=>+v.toFixed(3))));
