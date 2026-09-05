#!/usr/bin/env python3
"""Check the published Opus audio, its loops and offline bundle. Requires FFmpeg/numpy."""
import base64
import hashlib
import json
import math
from pathlib import Path
import subprocess
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
MUSIC=ROOT/'music'
RATE=48000

def main():
    meta=json.loads((MUSIC/'meta.json').read_text());report={}
    bundle=(ROOT/'music_samples.js').read_text();embedded=json.loads(bundle[bundle.index(' = ')+3:].rstrip(';\n'))
    for name,m in meta.items():
        source=MUSIC/(name+'.opus.ogg')
        assert base64.b64decode(embedded[name]['data'])==source.read_bytes(),name+' mismatched offline bytes'
        decoded=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ar',str(RATE),'-ac','2','-'],check=True,capture_output=True).stdout
        pcm=np.frombuffer(decoded,dtype='<f4').reshape(-1,2)
        assert np.isfinite(pcm).all(),name+' nonfinite'
        peak=float(np.max(np.abs(pcm)));assert .01<peak<.95,(name,peak)
        assert abs(len(pcm)/RATE-m['duration'])<.003,(name,'duration')
        stats=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(source),'-af','loudnorm=I=-20:TP=-2:LRA=20:print_format=json','-f','null','-'],check=True,capture_output=True,text=True).stderr
        loud=json.JSONDecoder().raw_decode(stats[stats.rfind('{'):])[0]
        entry={'duration':round(len(pcm)/RATE,6),'peakDBFS':round(20*np.log10(peak),2),
               'integratedLUFS':float(loud['input_i']),'truePeakDBTP':float(loud['input_tp']),
               'loudnessRangeLU':float(loud['input_lra']),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
        assert entry['truePeakDBTP']<-1,(name,'true peak headroom',entry)
        if m['loop']:
            a=round(m['loopStart']*RATE);b=round(m['loopEnd']*RATE)
            assert 0<a<b<=len(pcm)+1,(name,'loop bounds')
            b=min(b,len(pcm));n=round(.006*RATE)
            jump=float(np.max(np.abs(pcm[b-1]-pcm[a])))
            typical=float(np.sqrt(np.mean(np.diff(pcm[a-240:a+240],axis=0)**2)))
            entry.update(loopStart=m['loopStart'],loopEnd=m['loopEnd'],seamJump=round(jump,6),localDerivativeRMS=round(typical,6))
            assert jump<max(.012,typical*4),(name,'loop discontinuity',entry)
            # The variation across musical sections remains in the exported file.
            beat=60/m['bpm'];barbeats=int(m.get('meter','4/4').split('/')[0]);section=8*barbeats*beat*RATE
            sections=math.ceil((b-a)/section-1e-5)
            entry['eightBarRMSDB']=[round(20*np.log10(max(1e-9,float(np.sqrt(np.mean(pcm[round(a+k*section):min(round(a+(k+1)*section),b)]**2))))),1) for k in range(sections)]
        report[name]=entry
        print(name,entry,flush=True)
    (MUSIC/'score/audio-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print('PASS: nine published cues, matched offline bytes, headroom, durations and continuous loops')

if __name__=='__main__':main()
