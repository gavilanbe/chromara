#!/usr/bin/env python3
"""CHROMARA: a thematic suite, nine scenes (v4; combat rewrite v5).

The Prism cell is D-F-E-A; colour opens F to F#. Ink folds A-F-Eb-D.
The shared long-short / middle / leap contour matters as much as the pitches.
Render with --soundfont '/path/Chrono Trigger.sf2' --render-dir /tmp/chromara-renders.
"""
import argparse
import hashlib
import json
from pathlib import Path
from compose_score import (ROOT, MUSIC, SR, PALETTE, Score, Synth, pitch,
                           render_score, make_sfx, atelier, prelude, restored, voice_settings)
from combat_score import battle, boss, PERCUSSION

PALETTE.update({
    'piano': (0,.72,60,.13), 'rhodes': (4,.66,86,.20),
    'guitar': (30,.65,57,.09), 'trumpet': (56,.64,61,.13),
    'synthbass': (38,.66,64,0), 'kick': (125,.68,64,0),
    'snare': (124,.48,67,.025), 'hat': (127,.22,83,0),
    'tom': (116,.45,50,.04), 'organ': (17,.35,42,.05),
})
DRUMS=PERCUSSION
# Explicit harmony and registers, shared by grey/colour arrangements.
GREY=[('D2','D4 F4 A4 E5'),('G2','B3 D4 G4 A4'),('E2','B3 D4 G4 F5'),('A2','C#4 E4 G4 B4'),
      ('D2','D4 F4 A4 E5'),('Bb1','D4 F4 A4 C5'),('G2','Bb3 D4 G4 A4'),('A2','C#4 E4 G4 A4')]
LIGHT=[('D2','D4 F#4 A4 E5'),('G2','B3 D4 G4 A4'),('E2','B3 E4 G4 F#5'),('A2','C#4 E4 G4 B4'),
       ('D2','D4 F#4 A4 E5'),('B1','D4 F#4 A4 C#5'),('G2','B3 D4 G4 A4'),('A2','C#4 E4 G4 A4')]
MAP_A=['D5:1.5 F5:.5 E5:1 A5:.75 -:.25','G5:1 F5:.5 E5:.5 B4:1 -:1',
       'E5:.5 F5:.5 G5:1 B5:1 A5:.75 -:.25','G5:1 E5:1 C#5:1 -:1',
       'F5:1 A5:.5 B5:.5 A5:1 E5:.75 -:.25','D5:1 F5:1 E5:1 C5:.5 Bb4:.5',
       'G5:1.5 F5:.5 E5:.5 D5:.5 E5:.5 F5:.5','E5:1 C#5:1 A4:1 -:1']


class Cue(Score):
    def __init__(self,*args,loop=True,tail=1.5,form=None):
        super().__init__(*args);self.loop=loop;self.tail=tail;self.form=form

    def metadata(self):
        m=super().metadata()
        if not self.loop:
            duration=round((self.bars*self.meter*60/self.bpm+self.tail)*SR)/SR
            m.update(loop=False,loopStart=0,loopEnd=0,loopStartSample=0,loopEndSample=0,duration=duration,loop_s=0)
        if self.form:m['form']=self.form
        m.setdefault('edition','suite-v4')
        return m


def bed(s,bar,harmony,level=1,texture='harp',pulse=False,dyad=True):
    root,voicing=harmony;h=voicing.split();t=bar*4
    s.note('bass',t,1.65 if pulse else 3.7,root,round(70*level))
    if pulse:s.note('bass',t+2,1.65,pitch(root)+12,round(58*level))
    s.note('strings',t+.02,3.70,pitch(h[1])-12,round(55*level))
    if dyad:s.note('strings',t+.02,3.70,pitch(h[2])-12,round(47*level))
    pattern=[(0.5,0),(1,2),(1.5,1),(2.5,3),(3,2),(3.5,1)]
    if texture:
        for j,(off,idx) in enumerate(pattern):
            s.note(texture,t+off,.36 if texture=='pizz' else .48,h[idx],round((53+[3,-4,0,4,-3,-7][j])*level))


def title():
    s=Cue('title','Antes de la primera pincelada',84,4,4,24,'D major / borrowed minor',
          form='intro: 4 bars; A:8 (three voices), B:8 (ink memory), C:8 (promise); loop')
    s.phrase('piano',0,'D5:1.5 F5:.5 E5:1 -:1',61)
    s.phrase('pizz',1,'D4:1 -:1 F#4:.5 -:.5 A4:1',63)
    s.phrase('harp',2,'D5:1.5 F#5:.5 E5:1 A5:1',71)
    s.phrase('flute',3,'B4:1 D5:1 C#5:1 A4:.5 -:.5',65)
    s.note('strings',8,7.6,'A3',43);s.note('bass',8,7.7,'D2',51)
    A=['D5:1.5 F#5:.5 E5:1 A5:.75 -:.25','B5:1 A5:.5 F#5:.5 E5:1 -:1',
       'G5:1 E5:.5 F#5:.5 B5:1 A5:.75 -:.25','G5:1 E5:1 C#5:1 -:1',
       'D5:.75 F#5:.25 E5:.5 A5:1.5 G5:.5 F#5:.5','E5:1 F#5:1 A5:1 C#6:.75 -:.25',
       'B5:1 A5:.5 G5:.5 F#5:1 E5:.75 -:.25','C#5:1 E5:1 A4:1 -:1']
    B=['A4:1.5 F4:.5 Eb4:1 D4:.75 -:.25','F4:1 G4:1 A4:1 -:1',
       'Bb4:1 A4:.5 G4:.5 F4:1 E4:1','D4:2 -:1 A4:1',
       'D5:1.5 F5:.5 E5:1 A5:.75 -:.25','G5:1 E5:1 D5:1 -:1',
       'F#5:1 A5:1 G5:.5 E5:.5 D5:.75 -:.25','C#5:1 E5:1 A4:1 -:1']
    bridge=[('D2','D4 F4 A4 E5'),('Eb2','Eb4 G4 Bb4 D5'),('Bb1','D4 F4 A4 C5'),('G2','Bb3 D4 G4 A4'),
            ('D2','D4 F4 A4 E5'),('G2','B3 D4 G4 A4'),('D2','D4 F#4 A4 E5'),LIGHT[7]]
    for i in range(24):
        b=i+4;shadow=8<=i<16; h=(bridge if shadow else LIGHT)[i%8]
        bed(s,b,h,.75 if shadow else .9,'piano' if shadow else 'harp',dyad=i<8)
        voice=('horn' if i<4 else 'marimba') if i<8 else 'oboe' if shadow else 'flute'
        s.phrase(voice,b,(B if shadow else A)[i%8],71 if i<16 else 80,transpose=-12 if i<4 else 0)
        if i>=20:s.phrase('oboe',b,['F#4:2 A4:1 -:1','A4:2 F#4:1 -:1','D5:2 B4:1 -:1','G4:2 C#5:1 -:1'][i%4],58)
        if i in [7,15,23]:s.phrase('pizz',b,'-:2 D5:.5 F#5:.25 E5:.25 A5:.5 -:.5',53)
    s.dynamics([(0,4,.88),(12,16,.82)]);s.repeat();return s


def overworld():
    s=Cue('map','Donde el papel respira',100,4,4,24,'D dorian / F lydian',form='intro:4; A:8 (incomplete colour), B:8 (three voices), C:8 (memory); loop')
    s.phrase('harp',0,'D4:1 F4:.5 E4:.5 -:2',61)
    s.phrase('flute',1,'D5:1.5 F5:.5 E5:1 -:1',62)
    s.phrase('marimba',2,'A4:.5 -:.5 D5:.5 -:.5 E5:.5 -:1.5',50)
    s.phrase('oboe',3,'G4:1 E4:1 C#4:1 -:1',58)
    for b in range(4):s.note('bass',b*4,3.7,'D2',52)
    B=['F5:1.5 A5:.5 G5:1 C6:.75 -:.25','B5:1 G5:.5 E5:.5 D5:1 -:1',
       'A5:1 G5:.5 F5:.5 E5:1 D5:.75 -:.25','G5:1 A5:1 Bb5:1 A5:.75 -:.25',
       'F5:1.5 E5:.5 D5:1 A4:.75 -:.25','D5:.5 E5:.5 F5:1 A5:1 G5:.75 -:.25',
       'E5:1 D5:1 C5:.5 Bb4:.5 A4:.75 -:.25','G4:1 E4:1 C#4:1 -:1']
    chords=[('F2','C4 E4 A4 B4'),('G2','B3 D4 G4 A4'),('A2','C4 E4 G4 B4'),('Bb1','D4 F4 A4 C5'),
            GREY[0],('G2','B3 D4 G4 A4'),('Bb1','D4 F4 A4 E5'),GREY[7]]
    for i in range(24):
        b=i+4; h=(chords if 8<=i<16 else GREY)[i%8]
        sparse=16<=i<20
        bed(s,b,h,.59 if sparse else .86, 'pizz' if 8<=i<12 else 'harp',pulse=8<=i<16,dyad=i<8)
        v='flute' if i<8 else 'horn' if i<12 else 'marimba' if i<16 else 'piano' if sparse else 'flute'
        s.phrase(v,b,(B if 8<=i<16 else MAP_A)[i%8],71 if not sparse else 57,transpose=-12 if v=='horn' else 0)
        if i>=20:s.phrase('oboe',b,['A4:2 G4:1 -:1','F4:2 A4:1 -:1','D5:2 Bb4:1 -:1','G4:2 E4:1 -:1'][i%4],58)
        if i in [3,7,11,15]:s.note('marimba',b*4+3.5,.20,h[1].split()[2],48)
    s.repeat();return s


def victory():
    s=Cue('victory','El color encuentra su sitio',160,4,0,4,'D major, borrowed Bb',loop=False,tail=1.7,form='four-bar resolution of the battle cell')
    melody=['D5:.75 F#5:.25 E5:.5 A5:1.5 -:.5 A5:.5','Bb5:.75 A5:.25 F5:.5 D5:.5 F5:1 -:1',
            'G5:.5 B5:.5 A5:.75 G5:.25 E5:.5 C#5:.5 A4:.5 -:.5','D5:1 F#5:.5 E5:.5 D6:2']
    for b,h in enumerate([LIGHT[0],('Bb1','D4 F4 A4 C5'),LIGHT[7],LIGHT[0]]):
        s.phrase('trumpet',b,melody[b],86,.90)
        bed(s,b,h,.93,'harp',dyad=False)
        if b in [0,3]:s.note('horn',b*4,2.8,'D4',68)
        s.note('timpani',b*4,1.2,'D2' if b!=2 else 'A2',82)
        if b==3:
            for p in ['D4','F#4','A4']:s.note('choir',b*4,3.7,p,60)
    return s


def defeat():
    s=Cue('gameover','Una página sin terminar',76,4,0,3,'D minor → Eb over D',loop=False,tail=1.7,form='Prism loses its leap; the contour remains')
    s.phrase('flute',0,'D5:1.5 F5:.5 E5:1 -:1',63)
    s.phrase('oboe',1,'A4:1 F4:1 Eb4:1 -:1',57)
    s.phrase('piano',2,'D4:2 Eb4:1 -:1',48)
    for b in range(3):
        s.note('bass',b*4,3.7,'D2',53-b*5)
        for p in (['F3','A3'] if b==0 else ['G3','Bb3']):s.note('strings',b*4,3.7,p,47-b*3)
    return s


def export_fallback(score,meta):
    limit=(score.intro+score.bars)*score.meter
    result={'bpm':score.bpm,'stepsPerBeat':4,'length':limit*4,'loop':meta['loop'],
            'loopStart':score.intro*score.meter*4,'tracks':[],'drums':[]}
    for voice,notes in score.voices.items():
        program,level,pan,send,bank=voice_settings(score,voice)
        if voice in DRUMS:
            result['drums'].extend([[t*4,DRUMS[voice],v/127*.60] for t,d,p,v in notes if t<limit]);continue
        result['tracks'].append({'wave':'sine' if voice in ['harp','marimba','piano','rhodes'] else 'tri',
            'vol':round(level*.085,3),'env':[.012,.09,.55,.1],'echo':send,
            'notes':[[t*4,p,d*4,v/127] for t,d,p,v in notes if t<limit]})
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--soundfont',required=True,type=Path)
    parser.add_argument('--render-dir',type=Path,default=MUSIC)
    parser.add_argument('--cues',nargs='+',choices=['title','map','battle','boss','victory','gameover','atelier','prelude','restored'])
    args=parser.parse_args();args.render_dir.mkdir(parents=True,exist_ok=True)
    synth=Synth(args.soundfont);meta={};fallback={}
    if args.cues:
        meta=json.loads((MUSIC/'meta.json').read_text())
        src=(ROOT/'music_fallback.js').read_text();fallback=json.loads(src[src.index(' = ')+3:].rstrip(';\n'))
    pieces=[title(),overworld(),battle(),boss(),victory(),defeat(),atelier(),prelude(),restored()]
    if args.cues:pieces=[s for s in pieces if s.name in args.cues]
    for score in pieces:
        score.midi();m=render_score(score,synth,args.render_dir/(score.name+'.wav'));m.setdefault('edition','suite-v4')
        meta[score.name]=m;fallback[score.name]=export_fallback(score,m)
        print(score.name,m['duration'],'seconds; written voices',m['maxWrittenPolyphony'],flush=True)
    (MUSIC/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'music_fallback.js').write_text('// Generated from the thematic suite, including combat revision v5.\nconst MUSIC_FALLBACK = '+json.dumps(fallback,separators=(',',':'))+';\n')
    if not args.cues:make_sfx(synth)
    synth.close()
    (MUSIC/'score/soundfont.json').write_text(json.dumps({'file':args.soundfont.name,'sha256':hashlib.sha256(args.soundfont.read_bytes()).hexdigest(),
       'source':'https://www.williamkage.com/snes_soundfonts/','author':'Xouman','archive':'chrono_trigger_soundfont.zip'},indent=2)+'\n')

if __name__=='__main__':main()
