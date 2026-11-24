import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSignal,signal} from '../src/lib/nexo/experiments.js';
import {samplingAssessment} from '../src/lib/nexo/sampling-assessment.js';
test('all 15 parameter combinations generate scenario-specific answers',()=>{
  for(const f of [1000,3000,4000,5000,7000])for(const r of [8000,16000,44100]){
    const expected={nyquist:r/2,classification:f<r/2?'below':f===r/2?'boundary':'above',alias:f>r/2?r-f:f};
    assert.equal(samplingAssessment(f,r,expected).status,'correct');
    assert.equal(samplingAssessment(f,r,{...expected,nyquist:expected.nyquist+1}).status,'incorrect');
    assert.equal(samplingAssessment(f,r,{...expected,alias:expected.alias+1}).status,'incorrect');
    assert.equal(samplingAssessment(f,r,{...expected,classification:expected.classification==='below'?'above':'below'}).status,'incorrect');
  }
});
test('same prediction changes from correct to incorrect when rate changes',()=>{
  const p={nyquist:4000,classification:'above',alias:3000};
  assert.equal(samplingAssessment(5000,8000,p).status,'correct');
  assert.equal(samplingAssessment(5000,16000,p).status,'incorrect');
  assert.deepEqual(samplingAssessment(5000,16000,p).expected,{nyquist:8000,classification:'below',alias:5000});
});
test('alias sine agrees at sampling instants including sign inversion',()=>{
  for(const f of [5000,7000]){const d=sampleSignal(f,8000);assert.ok(d.samples.every(s=>Math.abs(signal(d.signedAlias,s.t)-s.y)<1e-12));}
});
test('exact Nyquist phase-zero signal samples are null, boundary not below',()=>{
  const d=sampleSignal(4000,8000);assert.equal(d.classification,'boundary');assert.ok(d.samples.every(s=>Math.abs(s.y)<1e-12));
});
test('incomplete predictions are not graded',()=>assert.equal(samplingAssessment(5000,8000,{classification:''}).status,'incomplete'));

test('prediction keeps a single live plot mounted; only answer overlays/readouts are gated',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('../src/components/qb/architect/NexoVisualLab.jsx',import.meta.url),'utf8');
  const sampling=source.slice(source.indexOf('function Sampling('),source.indexOf('function Quantization('));
  assert.equal((sampling.match(/data-nexo-live-graph/g)||[]).length,1);
  assert.doesNotMatch(sampling,/hidden\?|O gráfico e os valores calculados serão exibidos/);
  assert.match(sampling,/const reveal=mode==='explore'\|\|Boolean\(feedback\?\.expected\)/);
  assert.match(sampling,/const aliasVisible=reveal&&showAlias&&data\.classification==='above'/);
  assert.match(sampling,/data\.samples\.map/);
  assert.match(sampling,/\{reveal&&<div className="nexo-plot-feedback"/);
  assert.ok(sampling.indexOf('data-nexo-live-graph')<sampling.indexOf('INTERPRETE O CENÁRIO VISUAL'));
});
