// Mirrors the acceptance conditions used by server.mjs.
export function verifyDiagnostic(verified,timeline) {
  const v=verified.streams?.find(s=>s.codec_type==='video');
  const a=verified.streams?.find(s=>s.codec_type==='audio');
  const frames=Number(v?.nb_read_frames),duration=Number(verified.format?.duration),sampleRate=Number(a?.sample_rate);
  const delta=Math.abs(duration-timeline.seconds);
  const display=value=>value===undefined?null:typeof value==='number'&&!Number.isFinite(value)?String(value):value;
  const comparison=(field,expected,actual,passed)=>({field,expected,actual:display(actual),passed});
  const comparisons=[
    comparison('video.codec_name','h264',v?.codec_name,v?.codec_name==='h264'),
    comparison('video.pix_fmt','yuv420p',v?.pix_fmt,v?.pix_fmt==='yuv420p'),
    comparison('video.width',timeline.size[0],v?.width,v?.width===timeline.size[0]),
    comparison('video.height',timeline.size[1],v?.height,v?.height===timeline.size[1]),
    comparison('video.avg_frame_rate','30/1',v?.avg_frame_rate,v?.avg_frame_rate==='30/1'),
    comparison(
      'abs(Number(video.nb_read_frames) - expected.frames) <= 1',
      '<= 1',
      Math.abs(frames-timeline.frames),
      Math.abs(frames-timeline.frames)<=1
    ),
    comparison('abs(Number(format.duration) - expected.seconds) <= 0.034','<= 0.034',delta,delta<=0.034),
    comparison('audio.codec_name','aac',a?.codec_name,a?.codec_name==='aac'),
    comparison('Number(audio.sample_rate)',48000,sampleRate,sampleRate===48000),
    comparison('audio.channels',2,a?.channels,a?.channels===2),
  ];
  return {
    expected:{frames:timeline.frames,seconds:timeline.seconds,width:timeline.size[0],height:timeline.size[1]},
    actual:{videoStreamIndex:v?.index??null,audioStreamIndex:a?.index??null,
      nb_read_frames:v?.nb_read_frames??null,formatDuration:verified.format?.duration??null,
      sampleRate:a?.sample_rate??null},
    comparisons,failedComparisons:comparisons.filter(c=>!c.passed).map(c=>c.field),
  };
}
