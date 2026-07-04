#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function loadClassicWorker(relativePath) {
  const code = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const sandbox = { console, Float32Array, Float64Array, Int16Array, Uint8Array, ArrayBuffer, DataView, Math, Number, String, Boolean, Array, Object, Map, Set, JSON, Date, isFinite, parseFloat, parseInt, self: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: relativePath });
  return payload => {
    let posted = null;
    sandbox.self.postMessage = msg => { posted = msg; };
    sandbox.self.onmessage({ data: payload });
    if (!posted) throw new Error(`${relativePath} did not post a response`);
    return posted;
  };
}

const analyzeWorker = loadClassicWorker('src/workers/analysis.worker.js');
const finalizerWorker = loadClassicWorker('src/workers/master-finalizer.worker.js');
const sampleRate = 44100;
const duration = 1.2;
const length = Math.floor(sampleRate * duration);
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function makeCase(type) {
  const l = new Float32Array(length);
  const r = new Float32Array(length);
  const add = (freq, amp, side = 0, phase = 0) => {
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      const env = Math.min(1, t * 12, (duration - t) * 12);
      const v = Math.sin(2 * Math.PI * freq * t + phase) * amp * Math.max(0, env);
      l[i] += v * (1 + side);
      r[i] += v * (1 - side);
    }
  };
  if (type === 'acousticNatural') { add(130, .14); add(310, .09); add(1700,.045); add(5200,.018); }
  if (type === 'sibilantVocal') { add(190,.12); add(2600,.08); add(6100,.11); add(8200,.07); }
  if (type === 'bassHeavyMobile') { add(72,.25); add(210,.22); add(360,.18); add(3300,.06); }
  if (type === 'wideElectronic') { add(95,.18,.75); add(700,.07,.35); add(4400,.05,.65); add(11000,.025,.55); }
  for (let i=0;i<length;i+=1) { l[i]=clamp(l[i],-1,1); r[i]=clamp(r[i],-1,1); }
  return [l,r];
}
const cases = [
  { name:'acousticNatural', expect:'conservative' },
  { name:'sibilantVocal', expect:'deesser' },
  { name:'bassHeavyMobile', expect:'mobile' },
  { name:'wideElectronic', expect:'spatial-safe' }
];
const rows=[];
for (const c of cases) {
  const input = makeCase(c.name);
  const analysisResult = analyzeWorker({ sampleRate, duration, channels:2, length, channelBuffers: input.map(b=>b.buffer) });
  if (!analysisResult.ok) throw new Error(`${c.name} analysis failed: ${analysisResult.error}`);
  const analysis = analysisResult.analysis || {};
  if (!Array.isArray(analysis.spectrumProfile) || analysis.spectrumProfile.length !== 24) throw new Error(`${c.name} missing 24-band profile`);
  const fresh = makeCase(c.name);
  const finalResult = finalizerWorker({ sampleRate, channels:2, length, targetLufs:-14, ceilingDb:-1.0, qualityMode:'balanced', truePeak:true, analysis, channelBuffers:fresh.map(b=>b.buffer) });
  if (!finalResult.ok) throw new Error(`${c.name} finalizer failed: ${finalResult.error}`);
  const info = finalResult.info || {};
  if (!(Number.isFinite(info.loudnessAfter) && Number.isFinite(info.peakAfter))) throw new Error(`${c.name} non-finite final metrics`);
  if (info.peakAfter > Math.pow(10, -1/20) * 1.012) throw new Error(`${c.name} exceeds true peak ceiling`);
  if (c.expect === 'deesser' && !(Number(info.dynamicDeEsserRisk || 0) > 0.1)) throw new Error('sibilantVocal should trigger de-esser risk');
  if (c.expect === 'mobile' && !(Number(info.mobileSpeakerRisk || analysis.mobileSpeakerRisk || 0) > 0.2)) throw new Error('bassHeavyMobile should trigger mobile risk');
  rows.push(`${c.name}: LUFS ${Number(info.loudnessAfter).toFixed(2)}, peak ${Number(20*Math.log10(Math.max(1e-12, info.peakAfter))).toFixed(2)} dBTP`);
}
console.log('PASS golden audio QA pack:', rows.join(' | '));
