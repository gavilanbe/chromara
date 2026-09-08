#!/usr/bin/env python3
"""Shared score, FluidSynth renderer and three scene compositions for CHROMARA.

The full nine-cue authoring entry point is compose_suite.py.
Requires FluidSynth (system library) and tools/audio_requirements.txt.
"""
import argparse
import base64
import ctypes as C
import ctypes.util
import hashlib
import io
import json
import math
import os
from pathlib import Path
import wave

import mido
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MUSIC = ROOT / 'music'
SR = 32000


def pitch(note):
    if isinstance(note, int):
        return note
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    return 12 * (int(note[-1]) + 1) + names[note[0]] + note[1:-1].count('#') - note[1:-1].count('b')


# program, level, pan, echo send. Reeds carry breath; tools carry the pulse.
PALETTE = {
    'flute': (73, .83, 56, .23), 'oboe': (69, .70, 78, .16),
    'harp': (46, .70, 91, .25), 'marimba': (12, .66, 38, .09),
    'pizz': (45, .55, 46, .04), 'strings': (48, .39, 76, .19),
    'bass': (33, .90, 64, 0), 'horn': (60, .58, 48, .13),
    'choir': (52, .27, 88, .28), 'timpani': (47, .40, 58, .06),
}


def voice_settings(score, voice):
    settings = getattr(score, 'palette', {}).get(voice)
    if settings is None: settings = PALETTE[voice]
    return (*settings, 0) if len(settings) == 4 else settings


class Score:
    def __init__(self, name, title, bpm, meter, intro, bars, key):
        self.name, self.title, self.bpm, self.meter = name, title, bpm, meter
        self.intro, self.bars, self.key = intro, bars, key
        self.voices = {}
        # Beat, MIDI controller, value; controller -1 denotes signed pitch bend.
        # Kept separate from notes so older scores and the emergency synth retain
        # their existing note format.
        self.automation = {}

    def control(self, voice, beat, controller, value):
        assert beat >= 0 and -1 <= controller <= 127
        value = round(value)
        assert (-8192 <= value <= 8191) if controller == -1 else (0 <= value <= 127)
        self.automation.setdefault(voice, []).append([beat, controller, value])

    def curve(self, voice, controller, points):
        """Write a deliberate continuous gesture, sampled at 1/32 of a beat."""
        self.control(voice, points[0][0], controller, points[0][1])
        for (start, a), (end, b) in zip(points, points[1:]):
            assert end > start
            steps = max(1, math.ceil((end-start)*32))
            for j in range(1, steps+1):
                self.control(voice, start+(end-start)*j/steps, controller, a+(b-a)*j/steps)

    def note(self, voice, beat, duration, note, velocity=75):
        if note != '-':
            self.voices.setdefault(voice, []).append([beat, duration, pitch(note), velocity])

    def phrase(self, voice, bar, text, velocity=80, gate=.91, transpose=0):
        """Each explicit pitch:beats entry advances the phrase, including rests."""
        beat = bar * self.meter
        for j, token in enumerate(text.split()):
            n, duration = token.split(':'); duration = float(duration)
            # A shaped attack and breath at the end, not random timing/velocity.
            vel = velocity + [0, -5, -2, 4, -3, -7][j % 6]
            self.note(voice, beat, duration * gate, '-' if n == '-' else pitch(n) + transpose, vel)
            beat += duration
        assert beat <= (bar + 1) * self.meter + .001, (bar, text, beat)

    def dynamics(self, regions):
        for notes in self.voices.values():
            for note in notes:
                bar = note[0] / self.meter
                for begin, end, amount in regions:
                    if begin <= bar < end:
                        note[3] = max(1, round(note[3] * amount))

    def repeat(self):
        start, length = self.intro * self.meter, self.bars * self.meter
        for notes in self.voices.values():
            notes.extend([[t + length, d, p, v] for t, d, p, v in list(notes) if t >= start])
        for controls in self.automation.values():
            controls.extend([[t + length, c, v] for t, c, v in list(controls) if t >= start])

    def midi(self):
        mf = mido.MidiFile(ticks_per_beat=480)
        conductor = mido.MidiTrack(); mf.tracks.append(conductor)
        conductor.extend([mido.MetaMessage('track_name', name=self.title),
                          mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm)),
                          mido.MetaMessage('time_signature', numerator=self.meter, denominator=4)])
        for index, (voice, notes) in enumerate(self.voices.items()):
            ch = index if index < 9 else index + 1 # CT drum presets are pitched bank-0 instruments, not GM channel 10
            program, level, pan, send, bank = voice_settings(self, voice)
            track = mido.MidiTrack(); mf.tracks.append(track)
            track.append(mido.MetaMessage('track_name', name=voice))
            track.append(mido.Message('control_change', channel=ch, control=0, value=bank))
            track.append(mido.Message('program_change', channel=ch, program=program))
            for control, value in [(7, round(level * 110)), (10, pan), (91, round(send * 127))]:
                track.append(mido.Message('control_change', channel=ch, control=control, value=value))
            if any(c == -1 for _, c, _ in self.automation.get(voice, [])):
                # Explicit two-semitone bend range, matching the audio renderer.
                for control, value in [(101,0),(100,0),(6,2),(38,0),(101,127),(100,127)]:
                    track.append(mido.Message('control_change', channel=ch, control=control, value=value))
            events = []
            for t, d, p, v in notes:
                events.extend([(round(t * 480), 2, p, v), (round((t+d) * 480), 0, p, 0)])
            for t, c, v in self.automation.get(voice, []):
                events.append((round(t*480), 1, c, v))
            last = 0
            for tick, kind, p, v in sorted(events, key=lambda e: (e[0],e[1])):
                if kind == 1:
                    msg = (mido.Message('pitchwheel', channel=ch, pitch=v, time=tick-last) if p == -1 else
                           mido.Message('control_change', channel=ch, control=p, value=v, time=tick-last))
                else:
                    msg = mido.Message('note_on' if kind == 2 else 'note_off', channel=ch, note=p, velocity=v, time=tick-last)
                track.append(msg)
                last = tick
        mf.save(MUSIC / (self.name + '.mid'))

    def metadata(self):
        beat = 60 / self.bpm
        begin = round((self.intro + self.bars) * self.meter * beat * SR)
        end = round((self.intro + 2*self.bars) * self.meter * beat * SR)
        return dict(title=self.title, bpm=self.bpm, meter=f'{self.meter}/4', key=self.key,
                    intro_s=self.intro*self.meter*beat, loop_s=self.bars*self.meter*beat,
                    loop=True, loopStart=begin/SR, loopEnd=end/SR, duration=end/SR,
                    loopStartSample=begin, loopEndSample=end, sampleRate=SR,
                    form=f'intro({self.intro}) + [A(8) B(8) A′(8)] x2' if self.bars == 24 else f'intro({self.intro}) + [A(8) B(8)] x2',
                    instruments=list(self.voices))


def atelier():
    s = Score('atelier', 'Lo que duerme en el estuche', 108, 3, 2, 24, 'D dorian / F lydian')
    s.phrase('harp', 0, 'D4:1 A4:1 E5:1', 59)
    s.phrase('marimba', 1, 'D5:.5 F5:.5 E5:1 -:1', 64)
    A = ['D5:.5 F5:.5 E5:1 A5:.75 -:.25', 'G5:1 E5:.5 D5:.5 B4:.75 -:.25',
         'C5:.5 E5:.5 A5:1 G5:.75 -:.25', 'E5:1 D5:.5 C5:.5 A4:.5 -:.5',
         'D5:.75 F5:.25 E5:.5 A5:.5 B5:.5 -:.5', 'A5:1 G5:.5 F5:.5 E5:.75 -:.25',
         'D5:.5 E5:.5 F5:.5 A5:.5 G5:.5 E5:.5', 'C#5:1 E5:.5 A4:.5 -:1']
    B = ['F5:.5 A5:.5 G5:1 C6:.75 -:.25', 'B5:1 A5:.5 G5:.5 E5:.75 -:.25',
         'A5:1 G5:.5 F5:.5 E5:.5 -:.5', 'D5:1 F5:.5 A5:.5 -:1',
         'E5:.5 G5:.5 F5:.5 E5:.5 D5:.75 -:.25', 'G5:1 B5:.5 A5:.5 G5:.75 -:.25',
         'F5:.5 E5:.5 D5:1 E5:.75 -:.25', 'C#5:1 A4:1 -:1']
    changes = [('D2','D4 F4 A4 E5'),('G2','B3 D4 G4 A4'),('F2','C4 E4 A4 B4'),('C3','C4 E4 G4 D5'),
               ('D2','D4 F4 A4 E5'),('Bb2','D4 F4 A4 C5'),('G2','B3 D4 G4 A4'),('A2','C#4 E4 A4 B4')]
    bridge = [('F2','C4 F4 A4 B4'),('G2','D4 G4 B4 E5'),('A2','C4 E4 G4 A4'),('D2','D4 F4 A4 E5'),
              ('Bb2','D4 F4 A4 C5'),('G2','B3 D4 G4 A4'),('D2','D4 F4 A4 E5'),('A2','C#4 E4 G4 A4')]
    for i in range(24):
        bar = i+2; chord = (bridge if 8 <= i < 16 else changes)[i % 8]
        root, harmony = chord; h = harmony.split()
        s.phrase('marimba' if i < 8 or i >= 16 else 'oboe', bar, (B if 8 <= i < 16 else A)[i%8], 74 if i<16 else 80)
        s.note('bass', bar*3, 1.4, root, 65)
        for k, ix in enumerate([0,2,1,3]): s.note('harp', bar*3 + .5 + k*.5, .43, h[ix], 56 + (k%2)*4)
        if i % 4 != 3:
            s.note('pizz', bar*3+1, .28, h[1], 58); s.note('pizz', bar*3+2, .24, h[0], 51)
        if 8 <= i < 16 or i >= 20:
            s.note('strings', bar*3, 2.7, pitch(h[0])-12, 52)
        if i >= 16 and i % 4 == 3:
            s.phrase('flute', bar, '-:1 A5:.5 G5:.5 E5:.5 -:.5', 54)
    s.dynamics([(0,2,.8),(18,22,.80)])
    s.repeat(); return s


def prelude():
    s = Score('prelude', 'Debajo del color', 72, 4, 2, 16, 'D minor / phrygian inflection')
    s.phrase('harp', 0, 'D4:2 Eb4:1 A3:1', 58)
    s.note('bass', 0, 7.5, 'D2', 48)
    s.phrase('oboe', 1, 'D4:1 F4:1 E4:1 -:1', 57)
    phrases = [
        'D4:1.5 F4:.5 Eb4:1 A4:.75 -:.25', 'G4:1 F4:.5 Eb4:.5 D4:1 -:1',
        'F4:1 G4:1 A4:1.5 -:.5', 'Bb4:1 A4:.5 G4:.5 F4:1 -:1',
        'Eb4:1.5 F4:.5 G4:1 Bb4:.75 -:.25', 'A4:1 G4:.5 F4:.5 E4:1 -:1',
        'D4:2 Eb4:1 -:1', 'C#4:1 E4:1 A3:1 -:1',
        'D5:1.5 F5:.5 E5:1 A5:.75 -:.25', 'G5:1 E5:.5 D5:.5 B4:1 -:1',
        'F5:1 A5:1 G5:1.5 -:.5', 'E5:1 D5:.5 C5:.5 A4:1 -:1',
        'D5:1 F5:.5 E5:.5 Eb5:1 -:1', 'D5:1 C5:1 Bb4:1 -:1',
        'G4:1 Bb4:1 A4:1 -:1', 'E4:1 C#4:1 A3:1 -:1']
    roots = ['D2','Eb2','Bb1','G2','Eb2','A1','D2','A1','D2','G2','F2','C2','Eb2','Bb1','G2','A1']
    dyads = ['F3 A3','G3 Bb3','D3 F3','Bb3 D4','G3 Bb3','C#3 G3','F3 A3','C#3 G3',
             'F3 A3','B3 D4','A3 C4','E3 G3','G3 Bb3','D3 F3','Bb3 D4','C#3 G3']
    for i, phrase in enumerate(phrases):
        bar = i+2
        s.phrase('oboe' if i<8 else 'harp', bar, phrase, 65 if i<8 else 60, .90)
        s.note('bass',bar*4,3.8,roots[i],51)
        for n in dyads[i].split(): s.note('strings',bar*4+.12,3.5,n,49)
        if i % 2 == 0:
            s.note('pizz',bar*4+2.5,.27,pitch(roots[i])+24,45)
        if i in [3,7,11,15]:
            s.note('harp' if i<8 else 'oboe',bar*4+3,.6,'Eb4' if i==3 else 'E4',48)
    s.dynamics([(0,2,.78),(10,16,.82),(16,18,.93)])
    s.repeat(); return s


def restored():
    s = Score('restored', 'La línea también es color', 100, 4, 4, 24, 'D major / G lydian / borrowed G minor')
    # The three colours arrive separately before they share a full phrase.
    s.phrase('harp',0,'D5:1 F#5:1 E5:1 A5:1',76)
    s.phrase('marimba',1,'D5:1 F#5:.5 E5:.5 A5:1 -:1',72)
    s.phrase('flute',2,'D5:1.5 F#5:.5 E5:1 A5:1',79)
    s.phrase('oboe',3,'B4:1 D5:1 C#5:1 A4:1',71)
    for bar in range(4):
        s.note('bass',bar*4,3.8,'D2',64)
        s.note('strings',bar*4,3.6,'F#3',59); s.note('strings',bar*4,3.6,'A3',54)
    A = ['D5:1.5 F#5:.5 E5:1 A5:.75 -:.25', 'G5:1 F#5:.5 E5:.5 B4:1 -:1',
         'E5:.5 F#5:.5 G5:1 B5:1 A5:.75 -:.25', 'G5:1 E5:1 C#5:1 -:1',
         'F#5:1 A5:.5 B5:.5 A5:1 E5:.75 -:.25', 'D5:1 F#5:1 E5:1 C#5:.5 B4:.5',
         'G5:1.5 F#5:.5 E5:.5 D5:.5 E5:.5 F#5:.5', 'E5:1 C#5:1 A4:1 -:1']
    B = ['G5:1 B5:.5 A5:.5 D6:1 C#6:.75 -:.25', 'B5:1 A5:.5 G5:.5 F#5:1 -:1',
         'E5:1 G5:1 F#5:1 B5:.75 -:.25', 'A5:1 F#5:.5 E5:.5 C#5:1 -:1',
         'D5:1 F5:.5 E5:.5 A5:1 -:1', 'G5:1 Bb5:.5 A5:.5 G5:1 F5:.75 -:.25',
         'F#5:1 A5:.5 G5:.5 E5:1 D5:.5 C#5:.5', 'B4:1 D5:1 E5:1 -:1']
    changes = [('D2','D4 F#4 A4 E5'),('G2','B3 D4 G4 A4'),('E2','B3 E4 G4 F#5'),('A2','C#4 E4 A4 B4'),
               ('D2','D4 F#4 A4 E5'),('B1','D4 F#4 A4 C#5'),('G2','B3 D4 G4 A4'),('A2','C#4 E4 G4 A4')]
    bridge = [('G2','B3 D4 G4 C#5'),('D2','A3 D4 F#4 E5'),('E2','B3 E4 G4 F#5'),('A2','C#4 E4 A4 B4'),
              ('Bb1','D4 F4 A4 E5'),('G2','Bb3 D4 G4 A4'),('D2','D4 F#4 A4 E5'),('A2','C#4 E4 G4 B4')]
    for i in range(24):
        bar=i+4; root,harmony=(bridge if 8<=i<16 else changes)[i%8]; h=harmony.split()
        s.phrase('oboe' if 8<=i<16 else 'flute',bar,(B if 8<=i<16 else A)[i%8],83 if i>=16 else 76)
        s.note('bass',bar*4,1.7,root,76); s.note('bass',bar*4+2,1.6,pitch(root)+12,63)
        for k, ix in enumerate([0,2,1,3,2,1]): s.note('harp',bar*4+.5+k*.5,.43,h[ix],58+[0,-4,3,0,-6,-2][k])
        s.note('strings',bar*4,3.75,pitch(h[1])-12,61 if i>=16 else 54)
        if i%4 !=3 and not 12<=i<16:
            for t,n in [(1,h[0]),(2.5,h[2]),(3.5,h[1])]:s.note('marimba',bar*4+t,.24,n,53)
        if i>=16:
            s.phrase('oboe',bar,['A4:2 B4:1 -:1','D5:2 B4:1 -:1','G4:2 B4:1 -:1','A4:2 G4:1 -:1'][i%4],61)
            if i in [16,20,23]: s.note('horn',bar*4,2.7,pitch(h[0])-12,61)
        elif i%4==3:
            s.note('pizz',bar*4+3,.25,h[1],52)
    s.dynamics([(0,4,.90),(16,20,.69)])
    s.repeat(); return s


class Synth:
    def __init__(self, sf):
        path = os.environ.get('FLUIDSYNTH_LIB') or ctypes.util.find_library('fluidsynth')
        if not path and Path('/opt/homebrew/lib/libfluidsynth.dylib').exists():
            path = '/opt/homebrew/lib/libfluidsynth.dylib'
        if not path: raise RuntimeError('Install FluidSynth or set FLUIDSYNTH_LIB')
        self.lib = C.CDLL(path)
        ptr, integer, string = C.c_void_p, C.c_int, C.c_char_p
        signatures = {
            'new_fluid_settings': (ptr, []), 'new_fluid_synth': (ptr, [ptr]),
            'fluid_settings_setnum': (integer, [ptr, string, C.c_double]),
            'fluid_settings_setint': (integer, [ptr, string, integer]),
            'fluid_synth_sfload': (integer, [ptr,string,integer]),
            'fluid_synth_program_select': (integer,[ptr,integer,integer,integer,integer]),
            'fluid_synth_cc': (integer,[ptr,integer,integer,integer]),
            'fluid_synth_pitch_bend': (integer,[ptr,integer,integer]),
            'fluid_synth_pitch_wheel_sens': (integer,[ptr,integer,integer]),
            'fluid_synth_noteon': (integer,[ptr,integer,integer,integer]),
            'fluid_synth_noteoff': (integer,[ptr,integer,integer]),
            'fluid_synth_all_sounds_off': (integer,[ptr,integer]),
            'fluid_synth_write_float': (integer,[ptr,integer,ptr,integer,integer,ptr,integer,integer]),
            'delete_fluid_synth': (None,[ptr]), 'delete_fluid_settings': (None,[ptr]),
        }
        for name,(rest,args) in signatures.items():
            f=getattr(self.lib,name);f.restype=rest;f.argtypes=args
        self.settings=self.lib.new_fluid_settings()
        self.lib.fluid_settings_setnum(self.settings,b'synth.sample-rate',SR)
        self.lib.fluid_settings_setnum(self.settings,b'synth.gain',.6)
        for key,val in [(b'synth.reverb.active',0),(b'synth.chorus.active',0),(b'synth.polyphony',64)]:
            self.lib.fluid_settings_setint(self.settings,key,val)
        self.synth=self.lib.new_fluid_synth(self.settings)
        self.sf=self.lib.fluid_synth_sfload(self.synth,str(sf).encode(),0)
        if self.sf<0: raise RuntimeError('Could not load soundfont')

    def render(self, notes, program, pan, seconds, beat, bank=0, automation=None):
        lib, synth = self.lib, self.synth
        lib.fluid_synth_all_sounds_off(synth,0)
        if lib.fluid_synth_program_select(synth,0,self.sf,bank,program)<0: raise RuntimeError(f'Missing program {bank}:{program}')
        lib.fluid_synth_cc(synth,0,7,100);lib.fluid_synth_cc(synth,0,10,pan)
        # Every stem reuses channel zero: expressive controls must not leak into
        # the following instrument (or into a subsequent legacy cue).
        lib.fluid_synth_cc(synth,0,11,127);lib.fluid_synth_cc(synth,0,1,0)
        lib.fluid_synth_pitch_wheel_sens(synth,0,2)
        lib.fluid_synth_pitch_bend(synth,0,8192)
        events=[]
        for t,d,p,v in notes:
            events.extend([(round(t*beat*SR),2,p,v),(round((t+d)*beat*SR),0,p,0)])
        for t,c,v in automation or []:
            events.append((round(t*beat*SR),1,c,v))
        out=np.zeros((round(seconds*SR),2),dtype=np.float32)
        cursor=0
        for frame,on,p,v in sorted(events, key=lambda e: (e[0],e[1]))+[(len(out),-1,0,0)]:
            frame=min(frame,len(out))
            if frame>cursor:
                chunk=out[cursor:frame]
                lib.fluid_synth_write_float(synth,len(chunk),chunk.ctypes.data,0,2,chunk.ctypes.data,1,2)
            if on==2:lib.fluid_synth_noteon(synth,0,p,v)
            elif on==1:
                if p == -1:lib.fluid_synth_pitch_bend(synth,0,v+8192)
                else:lib.fluid_synth_cc(synth,0,p,v)
            elif on==0:lib.fluid_synth_noteoff(synth,0,p)
            cursor=frame
        return out

    def close(self):
        self.lib.delete_fluid_synth(self.synth);self.lib.delete_fluid_settings(self.settings)


def wav_bytes(data):
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1 if data.ndim==1 else 2);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
    return b.getvalue()


def render_score(score, synth, output):
    meta=score.metadata(); seconds=meta['duration']; beat=60/score.bpm
    mix=np.zeros((round(seconds*SR),2),dtype=np.float32)
    stems = {}
    for voice,notes in score.voices.items():
        program,level,pan,send,bank=voice_settings(score,voice)
        dry=synth.render(notes,program,pan,seconds,beat,bank,score.automation.get(voice))*level
        if getattr(score, 'record_stems', False):
            rms=np.sqrt(np.mean(dry**2,axis=1));active=rms[rms>.0001]
            stems[voice]={'program':program,'bank':bank,'gain':level,'pan':pan,'echoSend':send,
                          'activeRMSDB':round(float(20*np.log10(np.sqrt(np.mean(active**2)))),2),
                          'peakDB':round(float(20*np.log10(np.max(np.abs(dry)))),2)}
            blocks=[dry[round((score.intro+k)*score.meter*beat*SR):round((score.intro+min(k+8,score.bars))*score.meter*beat*SR)]
                    for k in range(0,score.bars,8)]
            stems[voice]['eightBarRMSDB']=[round(float(20*np.log10(max(1e-9,np.sqrt(np.mean(block**2))))),2) for block in blocks]
        mix+=dry
        taps = getattr(score, 'echo_taps', {}).get(voice,
            [(beat/4*tap, .44**(tap-1), bool(tap%2)) for tap in range(1,5)])
        for seconds_delay, amount, swap in taps:
            delay=round(seconds_delay*SR)
            if 0 < delay < len(dry):
                mix[delay:]+=dry[:-delay, ::-1 if swap else 1]*(send*amount)
    # Gain is a single value for the whole cue: written phrases keep their dynamics.
    peak=float(np.max(np.abs(mix)))
    mix*=.75/max(peak,.0001)
    # Linear 8 ms seam, before encoding; the intro and first loop stay intact.
    if meta['loop']:
        a,b=meta['loopStartSample'],meta['loopEndSample']; n=round(.008*SR)
        ramp=np.linspace(0,1,n,dtype=np.float32)[:,None]
        mix[b-n:b]=mix[b-n:b]*(1-ramp)+mix[a-n:a]*ramp
    else:
        n=round(.20*SR);mix[-n:]*=np.linspace(1,0,n)[:,None]
    mix[:128]*=np.linspace(0,1,128)[:,None]
    output.write_bytes(wav_bytes(mix))
    edges=[]
    for notes in score.voices.values():
        for t,d,p,v in notes:edges.extend([(t,1),(t+d,-1)])
    active=maximum=0
    for t,delta in sorted(edges):active+=delta;maximum=max(maximum,active)
    meta['maxWrittenPolyphony']=maximum
    meta['source']='Chrono Trigger.sf2 (2011), Xouman / William Kage archive'
    if stems:meta['stemBalance']=stems
    return meta


def make_sfx(synth):
    bank={}
    for name,program,note,duration in [('marimba',12,74,.65),('harp',46,74,1.25),('pizz',45,62,.45),('choir',52,62,1.2)]:
        pcm=synth.render([[0,.20 if name!='choir' else .6,note,90]],program,64,duration,1).mean(axis=1)
        peak=float(np.max(np.abs(pcm)));pcm*=.72/max(peak,.0001)
        pcm[:96]*=np.linspace(0,1,96);pcm[-640:]*=np.linspace(1,0,640)
        bank[name]={'root':note,'data':base64.b64encode(wav_bytes(pcm)).decode()}
    (ROOT/'sfx_samples.js').write_text('// Generated by tools/compose_score.py; short pitched CT samples, PCM 32 kHz.\nconst SFX_SAMPLES = '+json.dumps(bank,separators=(',',':'))+';\n')


# Keep the earlier documented command useful without restoring the old masters.
if __name__ == '__main__':
    from compose_suite import main
    main()
