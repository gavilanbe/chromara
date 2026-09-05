#!/usr/bin/env python3
"""Master all cues once, encode Opus/MP3 and build matching HTTP/file:// manifests.

python tools/pack_music.py --render-dir /tmp/chromara-renders
compose_suite.py supplies all nine WAVs; design_foley.py supplies the effect bank.
Static gain preserves musical dynamics; no per-section loudness flattening.
"""
import argparse
from array import array
import base64
import json
import hashlib
import math
from pathlib import Path
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / 'music'
TARGETS = dict(title=-21, map=-21, battle=-19, boss=-19, victory=-18,
               gameover=-23, atelier=-22, prelude=-24, restored=-20)
TITLES = dict(title='El cuaderno se abre', map='Chromara apagada', battle='Mezcla de colores',
              boss='La Tinta', victory='Una gota más de luz', gameover='Los colores se apagan')


def run(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *map(str,args)],
                          check=True, capture_output=True, text=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--render-dir',type=Path,default=MUSIC)
    parser.add_argument('--kbps',type=int,default=96)
    parser.add_argument('--cues',nargs='+',help='Re-encode only these cues; retain the other published files.')
    args=parser.parse_args()
    meta=json.loads((MUSIC/'meta.json').read_text()); embedded={}; cues={}; report={}
    if args.cues:
        if set(args.cues)-set(meta):raise ValueError('Unknown cue selection')
        report=json.loads((MUSIC/'score/mastering.json').read_text())
    for name,m in meta.items():
        if args.cues and name not in args.cues:
            entry={key:m[key] for key in ['title','loop','loopStart','loopEnd','duration']}
            data=(MUSIC/(name+'.opus.ogg')).read_bytes()
            entry['revision']=hashlib.sha256(data).hexdigest()[:12]
            cues[name]=entry;embedded[name]={**entry,'data':base64.b64encode(data).decode()}
            continue
        source=args.render_dir/(name+'.wav')
        if not source.exists(): source=MUSIC/(name+'.wav')
        if not source.exists(): raise FileNotFoundError(f'Missing master for {name}: run compose_score.py first')
        with wave.open(str(source)) as w:
            duration=w.getnframes()/w.getframerate();sample_rate=w.getframerate()
        if m['loop']:
            # Integer source-frame metadata is authoritative; rounded seconds in
            # older cue sheets can point one sample beyond the WAV (title).
            m['loopStart']=m.get('loopStartSample',round(m['loopStart']*sample_rate))/sample_rate
            m['loopEnd']=min(m.get('loopEndSample',round(m['loopEnd']*sample_rate)),round(duration*sample_rate))/sample_rate
        if m['loop'] and not (0 <= m['loopStart'] < m['loopEnd'] <= duration+.001):
            raise ValueError(f'Invalid loop points: {name}')
        # Remove brittle top end from stretched SNES samples. The liquid SFX retain
        # room above the score; bass remains centred in the original arrangement.
        eq='lowpass=f=7800,equalizer=f=2900:t=o:w=1.4:g=-1.5'
        measured=run('-i',source,'-af',eq+',loudnorm=I=-20:TP=-2:LRA=20:print_format=json','-f','null','-').stderr
        stats=json.JSONDecoder().raw_decode(measured[measured.rfind('{'):])[0]; integrated=float(stats['input_i']); peak=float(stats['input_tp'])
        gain=min(TARGETS[name]-integrated,-2.2-peak)
        with tempfile.TemporaryDirectory(prefix='chromara-master-') as tmp:
            master=Path(tmp)/'master.wav'
            render_source=source
            if m['loop']:
                # Match the final 8 ms to the lead-in of the steady-state loop.
                # Only the published copy changes; the render remains reproducible.
                with wave.open(str(source)) as w:
                    params=w.getparams(); pcm=array('h',w.readframes(w.getnframes()))
                if params.sampwidth != 2: raise ValueError('Loop masters must be PCM16')
                import sys
                if sys.byteorder != 'little': pcm.byteswap()
                channels=params.nchannels; a=round(m['loopStart']*sample_rate); b=round(m['loopEnd']*sample_rate)
                n=min(round(.008*sample_rate),a,b-a)
                for j in range(n):
                    alpha=j/max(1,n-1)
                    for c in range(channels):
                        dest=(b-n+j)*channels+c; origin=(a-n+j)*channels+c
                        pcm[dest]=round(pcm[dest]*(1-alpha)+pcm[origin]*alpha)
                if sys.byteorder != 'little': pcm.byteswap()
                render_source=Path(tmp)/'seam.wav'
                with wave.open(str(render_source),'wb') as w: w.setparams(params); w.writeframes(pcm.tobytes())
            run('-loglevel','error','-i',render_source,'-af',eq+f',volume={gain:.5f}dB', '-ar',48000,'-c:a','pcm_s16le',master)
            run('-loglevel','error','-i',master,'-c:a','libopus','-b:a',f'{args.kbps}k','-vbr','on','-application','audio',MUSIC/(name+'.opus.ogg'))
            run('-loglevel','error','-i',master,'-c:a','libmp3lame','-q:a',4,MUSIC/(name+'.mp3'))
        m.update(title=m.get('title',TITLES.get(name,name)),duration=duration,sampleRate=sample_rate)
        if m['loop']:
            m['loopStartSample']=round(m['loopStart']*sample_rate);m['loopEndSample']=round(m['loopEnd']*sample_rate)
            m['loopStart']=m['loopStartSample']/sample_rate;m['loopEnd']=m['loopEndSample']/sample_rate
        entry={key:m[key] for key in ['title','loop','loopStart','loopEnd','duration']}
        entry['revision']=hashlib.sha256((MUSIC/(name+'.opus.ogg')).read_bytes()).hexdigest()[:12]
        cues[name]=entry
        embedded[name]={**entry,'data':base64.b64encode((MUSIC/(name+'.opus.ogg')).read_bytes()).decode()}
        report[name]={'inputLUFS':integrated,'inputTruePeakDB':peak,'gainDB':round(gain,3),
                      'estimatedOutputLUFS':round(integrated+gain,2),'estimatedTruePeakDB':round(peak+gain,2),
                      'bytes':(MUSIC/(name+'.opus.ogg')).stat().st_size}
        print(f'{name}: {duration:.2f}s, gain {gain:+.2f} dB, {report[name]["bytes"]//1024} KiB',flush=True)
    (ROOT/'music_cues.js').write_text('// Generated by tools/pack_music.py; small HTTP manifest.\nconst MUSIC_CUES = '+json.dumps(cues,ensure_ascii=False,separators=(',',':'))+';\n')
    (ROOT/'music_samples.js').write_text('// Generated by tools/pack_music.py; offline edition only.\nconst MUSIC_SAMPLES = '+json.dumps(embedded,ensure_ascii=False,separators=(',',':'))+';\n')
    (MUSIC/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    (MUSIC/'score/mastering.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
