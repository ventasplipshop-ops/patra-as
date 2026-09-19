import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDiagnostic } from './verify-diagnostic.mjs';

const timeline={frames:705,seconds:23.5,size:[1920,1080]};
const output=()=>({streams:[{index:0,codec_type:'video',codec_name:'h264',pix_fmt:'yuv420p',width:1920,height:1080,avg_frame_rate:'30/1',nb_read_frames:'705'},
  {index:1,codec_type:'audio',codec_name:'aac',sample_rate:'48000',channels:2}],format:{duration:'23.500000'}});
test('verify diagnóstico: valores exactos esperados sin cambiar la aceptación',()=>{
  const result=verifyDiagnostic(output(),timeline);assert.deepEqual(result.failedComparisons,[]);assert.equal(result.comparisons.length,10);
  assert.deepEqual(result.expected,{frames:705,seconds:23.5,width:1920,height:1080});
});
test('verify diagnóstico: 704 cuadros se identifica aunque la duración sea 23.5 s',()=>{
  const raw=output();raw.streams[0].nb_read_frames='704';
  const result=verifyDiagnostic(raw,timeline);
  assert.deepEqual(result.failedComparisons,['Number(video.nb_read_frames)']);
  const c=result.comparisons.find(c=>c.field==='Number(video.nb_read_frames)');assert.equal(c.expected,705);assert.equal(c.actual,704);assert.equal(c.passed,false);
});
test('verify diagnóstico conserva igualdad estricta de FPS y tolerancia original',()=>{
  const raw=output();raw.streams[0].avg_frame_rate='60/2';raw.format.duration='23.535';
  assert.deepEqual(verifyDiagnostic(raw,timeline).failedComparisons,['video.avg_frame_rate','abs(Number(format.duration) - expected.seconds) <= 0.034']);
});
test('verify diagnóstico conserva valores faltantes/N/A de ffprobe',()=>{
  const raw=output();raw.streams[0].nb_read_frames='N/A';
  const result=verifyDiagnostic(raw,timeline);assert.equal(result.actual.nb_read_frames,'N/A');
  assert.equal(result.comparisons.find(c=>c.field==='Number(video.nb_read_frames)').actual,'NaN');
});
