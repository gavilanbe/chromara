#!/usr/bin/env python3
"""Three deliberately different sketches for La Tinta, CHROMARA's boss.

La Tinta is the outline: she drew every line before anyone painted, and nobody
looks at the contour any more. Her motif is a heavy tread, A–F–Eb–D, and the
three drops answer her in their own language (D D D F, E. D C). Each sketch
sets that conflict with a different metre, tempo, bass and rhythm.

    python tools/boss_sketches.py --soundfont '/path/Chrono Trigger.sf2'

Renders WAV/MP3/MIDI into music/sketches/ as boss1..boss3.
"""
import argparse
import json
from pathlib import Path
import subprocess

import compose_score
from compose_score import SR, Synth, pitch, render_score
from battle_sketches import Sketch
from battle_tres_gotas import grid

OUT = compose_score.MUSIC / 'sketches'

DRUMS = {'kick': (125, .76, 64, 0), 'snare': (124, .70, 66, .05), 'hat': (127, .85, 82, 0),
         'open_hat': (126, .5, 82, 0), 'tom': (116, .42, 46, .06), 'crash': (123, .66, 50, .10, 1),
         'timpani': (47, .62, 58, .06)}
DROPS = ['D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:1']


# ---------------------------------------------------------------------------
# Boss 1 · «La mancha» · 150 bpm · 4/4 · D pedal, phrygian
# The bass hammers the three drops on a low D (the Ink stamps in the drops'
# rhythm), with chromatic neighbours in 3+3+2. Horn and strings tread the Ink
# motif over the pedal; in the second pass the trumpet fights back with the
# drops, E natural against Eb.
# ---------------------------------------------------------------------------
def la_mancha():
    s = Sketch('boss1', 'La mancha', 150, 4, 2, 16, 'D phrygian over a pedal; Bb, A7 at the cadence',
        palette={'horn': (60, .92, 54, .14), 'strlead': (48, .80, 72, .18, 1), 'lead': (56, 1.12, 60, .13),
                 'choir': (52, 1.0, 80, .22), 'organ': (17, .42, 42, .10), 'piano': (0, .62, 50, .08),
                 'bass': (38, .62, 64, 0), **DRUMS},
        taps={'horn': [(.1, .6, True), (.2, .3, False)], 'strlead': [(.15, .6, True), (.3, .3, False)],
              'lead': [(.1, .7, True), (.2, .3, False)], 'choir': [(.2, .5, True)], 'snare': [(.05, .6, True)]},
        note='intro 2 · A 8 (trompa y cuerda: pisada de la Tinta) · A′ 8 (la trompeta contesta con las gotas)')

    def riff(bar, root, second=False, lift=0):
        r = pitch(root)
        shape = ([(0, 0, .4), (.5, 0, .4), (1, 0, .4), (1.5, 3, .9), (2.5, 1, .4), (3, 0, .4), (3.5, -5, .4)] if second
                 else [(0, 0, .4), (.5, 0, .4), (1, 0, .4), (1.5, 1, .9), (2.5, 0, .4), (3, -1, .4), (3.5, 0, .4)])
        for off, iv, dur in shape:
            v = (106 if off in (0, 1.5, 3) else 88) + lift
            s.note('bass', bar * 4 + off, dur, r + iv, v)
            if off in (0, 1.5, 3):
                s.note('piano', bar * 4 + off, dur, r + iv + 12, v - 18)
                s.note('piano', bar * 4 + off, dur, r + iv, v - 22)

    def kit(bar, fill=False, crash=False):
        grid(s, 'kick', bar, 'x.....x.....x...' if not fill else 'x.....x.....x.x.', (110, 102))
        grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X.xX', (106, 98, 62), seconds=.22)
        grid(s, 'hat', bar, 'X.x.x.X.x.x.X.x.', (80, 54), seconds=.08)
        grid(s, 'tom', bar, '......x.....x...' if not fill else '......x...x.x.x.', (86, 80), note=55, seconds=.16)
        if fill:
            for off, p, v in [(3, 64, 90), (3.5, 50, 108)]:
                s.note('tom', bar * 4 + off + .25, .16 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 96)

    INK = ['A4:1.5 F4:.5 Eb4:1 D4:1', '-:1 D4:.5 Eb4:.5 F4:.5 G4:.5 Ab4:1',
           'A4:1.5 F4:.5 Eb4:1 D4:1', 'Bb4:1.5 A4:.5 G4:.5 F4:.5 E4:1',
           'A4:1 Bb4:.5 A4:.5 F4:1 Eb4:1', 'D4:.5 Eb4:.5 F4:.5 G4:.5 Ab4:.5 A4:.5 Bb4:.5 C5:.5',
           'D5:1.5 C5:.5 Bb4:1 A4:1', 'G4:1 F4:.5 E4:.5 C#4:2']
    ROOTS = ['D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'Bb1', 'A1']
    CHOIR = ['D3 A3 D4', 'D3 Ab3 D4', 'D3 A3 D4', 'D3 Bb3 F4', 'D3 A3 F4', 'D3 Ab3 Eb4', 'Bb2 F3 D4', 'A2 E3 C#4']
    FIGHT = {1: 'D5:.5 D5:.5 D5:.5 F5:.5 E5:1 -:1', 3: 'F5:.5 F5:.5 F5:.5 A5:.5 G5:1 -:1',
             5: 'D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 6: 'D5:1.5 A4:.5 C5:.5 D5:.5 F5:1',
             7: 'E5:.5 E5:.5 E5:.5 G5:.5 F5:.5 E5:.5 C#5:1'}

    # Intro: a timpani roll and a choir cluster, then the riff alone with toms.
    for n in range(8):
        s.note('timpani', n * .5, .4, 'D2', 70 + n * 6)
    for p in ['D3', 'Ab3', 'D4']:
        s.note('choir', 0, 3.8, p, 74)
    s.curve('choir', 11, [(0, 70), (3.5, 127), (3.9, 90)])
    s.note('piano', 0, 3.5, 'D2', 96); s.note('piano', 0, 3.5, 'D1', 90)
    riff(1, 'D2'); grid(s, 'tom', 1, 'x..x..x.x..x..x.', (96, 84), note=55, seconds=.16)
    grid(s, 'hat', 1, 'X.x.x.X.x.x.X.x.', (76, 52), seconds=.08)
    s.note('crash', 4, 1.6 * s.bpm / 60, 60, 90)
    for k in range(16):
        bar = 2 + k; j = k % 8; second = k >= 8
        riff(bar, ROOTS[j], j % 2 == 1, 4 if second else 0)
        kit(bar, fill=j == 7, crash=j == 0)
        s.phrase('horn', bar, INK[j], 98 if not second else 102, .92)
        s.phrase('strlead', bar, INK[j], 90, .95, transpose=12)
        for n, p in enumerate(CHOIR[j].split()):
            s.note('choir', bar * 4 + .02, 3.7, p, 66 - n * 4)
        for off in (1.5, 3):
            for n, p in enumerate(CHOIR[j].split()[1:]):
                s.note('organ', bar * 4 + off, .35, pitch(p) + 12, 70 - n * 6)
        if second and j in FIGHT:
            s.phrase('lead', bar, FIGHT[j], 104, .86)
    s.note('crash', 18 * 4, 1.6 * s.bpm / 60, 60, 92)
    return s


# ---------------------------------------------------------------------------
# Boss 2 · «Contorno roto» · 7/8 (2+2+3), eighth = 372 · D minor
# Written with the eighth as the beat (meter 7). The page will not lie flat:
# a bouncing octave bass in 2+2+3, organ stabs on the accents, the Ink motif
# stretched across the odd bar. The drops arrive crushed into eighths.
# ---------------------------------------------------------------------------
def contorno_roto():
    s = Sketch('boss2', 'Contorno roto', 372, 7, 2, 16, 'D minor / phrygian, 7/8 (2+2+3)',
        palette={'strlead': (48, .88, 66, .18, 1), 'organ': (17, .52, 42, .10), 'lead': (56, 1.10, 62, .13),
                 'choir': (52, 1.0, 80, .22), 'horn': (60, .84, 54, .14), 'bass': (38, .62, 64, 0), **DRUMS},
        taps={'strlead': [(.16, .6, True), (.32, .3, False)], 'lead': [(.16, .7, True), (.32, .3, False)],
              'choir': [(.24, .5, True)], 'snare': [(.05, .6, True)]},
        note='intro 2 · A 8 (cuerda y órgano en 7/8) · A′ 8 (gotas apretadas en corcheas, trompa a la octava)')
    E = 1  # one eighth

    def bass(bar, root, colour, lift=0):
        r = pitch(root)
        for off, p, dur, v in [(0, r, .9, 108), (1, r + 12, .4, 86), (2, r, .9, 100), (3, r + 12, .4, 86),
                               (4, pitch(colour), 1.4, 106), (5.5, pitch(colour) + 12, .4, 84), (6, r + 7, .8, 94)]:
            s.note('bass', bar * 7 + off, dur, p, v + lift)

    def kit(bar, fill=False, crash=False):
        grid(s, 'kick', bar, 'x.x.x..' if not fill else 'x.x.x.x', (110, 100), seconds=.12)
        grid(s, 'snare', bar, '..x...x' if not fill else '..x.x.x', (104, 96), seconds=.2)
        grid(s, 'hat', bar, 'XxXxXxx', (80, 52), seconds=.07)
        if fill:
            for off, p, v in [(5, 64, 90), (6, 50, 108)]:
                s.note('tom', bar * 7 + off, .15 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 7, 1.6 * s.bpm / 60, 60, 96)

    INK = ['A4:2 F4:1 Eb4:2 D4:2', '-:2 D4:1 Eb4:1 F4:1 Ab4:2',
           'A4:2 F4:1 Eb4:2 D4:2', 'Bb4:2 A4:1 G4:1 F4:1 E4:2',
           'A4:2 Bb4:1 A4:2 F4:2', 'Eb4:1 F4:1 G4:1 Ab4:1 A4:1 Bb4:1 C5:1',
           'D5:2 C5:1 Bb4:2 A4:2', 'G4:2 F4:1 E4:2 C#4:2']
    HARMONY = [('D2', 'Eb2', 'D3 A3 D4'), ('D2', 'F2', 'D3 Ab3 D4'), ('D2', 'Eb2', 'D3 A3 D4'), ('D2', 'F2', 'D3 Bb3 F4'),
               ('D2', 'Eb2', 'D3 A3 F4'), ('D2', 'F2', 'D3 Ab3 Eb4'), ('Bb1', 'C2', 'Bb2 F3 D4'), ('A1', 'Bb1', 'A2 E3 C#4')]
    FIGHT = {1: 'D5:1 D5:1 D5:1 F5:1 E5:2 -:1', 3: 'F5:1 F5:1 F5:1 A5:1 G5:2 -:1',
             5: 'D5:1 D5:1 D5:1 F5:1 E5:1.5 D5:.5 C5:1', 6: 'D5:2 A4:1 C5:1 D5:1 F5:2',
             7: 'E5:1 E5:1 E5:1 G5:1 F5:1 E5:1 C#5:1'}

    for n in range(7):
        s.note('timpani', n, .9, 'D2', 66 + n * 8)
    for p in ['D3', 'Ab3', 'D4']:
        s.note('choir', 0, 6.8, p, 74)
    s.curve('choir', 11, [(0, 70), (6.4, 127), (6.9, 90)])
    bass(1, 'D2', 'Eb2'); kit(1, fill=True)
    for k in range(16):
        bar = 2 + k; j = k % 8; second = k >= 8
        root, colour, voicing = HARMONY[j]
        bass(bar, root, colour, 4 if second else 0)
        kit(bar, fill=j == 7, crash=j == 0)
        s.phrase('strlead', bar, INK[j], 100, .95)
        if second: s.phrase('horn', bar, INK[j], 96, .92, transpose=-12)
        for off in (0, 2, 4):
            for n, p in enumerate(voicing.split()[1:]):
                s.note('organ', bar * 7 + off, .7 if off < 4 else 1.4, pitch(p) + 12, 74 - n * 6)
        for n, p in enumerate(voicing.split()):
            s.note('choir', bar * 7 + .02, 6.7, p, 62 - n * 4)
        if second and j in FIGHT:
            s.phrase('lead', bar, FIGHT[j], 104, .86)
    s.note('crash', 18 * 7, 1.6 * s.bpm / 60, 60, 92)
    return s


# ---------------------------------------------------------------------------
# Boss 3 · «Trazo y sombra» · 100 bpm · 4/4 half-time · D minor chorale
# The Ink as a slow chorale in organ, choir and horn over timpani, while the
# drops run underneath as a marimba sixteenth-note ostinato (small and
# unstoppable). In the second pass the trumpet sings the drops in full and the
# kit doubles its rate.
# ---------------------------------------------------------------------------
def trazo_y_sombra():
    s = Sketch('boss3', 'Trazo y sombra', 100, 4, 2, 16, 'D minor; Bb, Gm, Eb; A7',
        palette={'horn': (60, .90, 52, .14), 'choir': (52, .70, 78, .24), 'organ': (17, .55, 40, .10),
                 'marimba': (12, .95, 84, .07), 'lead': (56, 1.12, 60, .14), 'strings': (48, .95, 72, .18),
                 'bass': (38, .62, 64, 0), **DRUMS},
        taps={'horn': [(.15, .6, True), (.3, .3, False)], 'lead': [(.15, .7, True), (.3, .3, False)],
              'marimba': [(.075, .5, True)], 'choir': [(.3, .5, True)], 'snare': [(.06, .6, True)]},
        note='intro 2 · A 8 (coral de la Tinta, gotas corriendo en marimba) · A′ 8 (la trompeta canta las gotas, batería a tiempo)')

    CHORDS = ['Dm', 'Dm', 'Bb', 'Gm', 'Eb', 'Dm', 'Bb', 'A7']
    ROOT = {'Dm': 'D2', 'Bb': 'Bb1', 'Gm': 'G1', 'Eb': 'Eb2', 'A7': 'A1'}
    VOICING = {'Dm': 'D3 A3 F4', 'Bb': 'Bb2 F3 D4', 'Gm': 'G2 D3 Bb3', 'Eb': 'Eb3 Bb3 G4', 'A7': 'A2 E3 C#4 G4'}
    RUN = {'Dm': 'D5 D5 D5 F5 E5 D5 C5 D5 A4 A4 A4 C5 Bb4 A4 G4 A4',
           'Bb': 'D5 D5 D5 F5 Eb5 D5 C5 D5 Bb4 Bb4 Bb4 D5 C5 Bb4 A4 Bb4',
           'Gm': 'G5 G5 G5 Bb5 A5 G5 F5 G5 D5 D5 D5 F5 Eb5 D5 C5 D5',
           'Eb': 'Eb5 Eb5 Eb5 G5 F5 Eb5 D5 Eb5 Bb4 Bb4 Bb4 D5 C5 Bb4 Ab4 Bb4',
           'A7': 'C#5 C#5 C#5 E5 D5 C#5 Bb4 C#5 A4 A4 A4 C5 Bb4 A4 G4 A4'}
    CHORALE = ['A4:2 F4:1 Eb4:1', 'D4:3 -:1', 'A4:2 Bb4:1 A4:1', 'F4:2 Eb4:1 D4:1',
               'G4:2 Ab4:1 G4:1', 'F4:2 Eb4:1 D4:1', 'Bb4:2 A4:1 G4:1', 'F4:2 E4:1 C#4:1']
    SONG = ['D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:1',
            'F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 Eb5:1', 'D5:1 C5:.5 Bb4:.5 A4:2',
            'Eb5:.5 Eb5:.5 Eb5:.5 G5:.5 F5:.75 Eb5:.25 D5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:.5 F5:.5',
            'A5:.5 A5:.5 A5:.5 C6:.5 Bb5:.75 A5:.25 G5:1', 'F5:.5 E5:.5 D5:1 C#5:1.5 -:.5']

    def run(bar, chord, level=80):
        for n, p in enumerate(RUN[chord].split()):
            s.note('marimba', bar * 4 + n * .25, .2, p, level + [4, -6, -2, 6, 0, -4, -8, 2][n % 8])

    def kit(bar, full=False, fill=False, crash=False):
        if full:
            grid(s, 'kick', bar, 'x.....x...x.....', (112, 104))
            grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X.xX', (108, 100, 64), seconds=.24)
            grid(s, 'hat', bar, 'XoxoXoxoXoxoXoxo', (78, 54, 36), seconds=.07)
        else:
            grid(s, 'kick', bar, 'x.....x.........', (112, 100))
            grid(s, 'snare', bar, '........X.......' if not fill else '........X.....xX', (108, 100, 64), seconds=.24)
            grid(s, 'hat', bar, 'x.x.x.x.x.x.x.x.', (66, 48), seconds=.07)
        s.note('timpani', bar * 4, .5, 'D2' if bar % 2 == 0 else 'A1', 92)
        s.note('timpani', bar * 4 + 2.5, .35, 'D2', 74)
        if fill:
            for off, p, v in [(3.25, 64, 88), (3.5, 60, 96), (3.75, 55, 106)]:
                s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 96)

    # Intro: a timpani roll under an organ cluster, then the run starts alone.
    for n in range(16):
        s.note('timpani', n * .25, .22, 'D2', 60 + n * 4)
    for p in ['D2', 'A2', 'Eb3']:
        s.note('organ', 0, 3.8, p, 84)
    s.curve('organ', 11, [(0, 80), (3.6, 127), (3.95, 100)])
    run(1, 'Dm', 74); s.note('bass', 4, 3.8, 'D2', 100); grid(s, 'hat', 1, 'x.x.x.x.x.x.x.x.', (60, 44), seconds=.07)
    for k in range(16):
        bar = 2 + k; j = k % 8; second = k >= 8; chord = CHORDS[j]
        r = pitch(ROOT[chord])
        s.note('bass', bar * 4, 3.4, r, 104); s.note('bass', bar * 4 + 3.5, .4, r + 12, 84)
        kit(bar, full=second, fill=j == 7, crash=j == 0)
        run(bar, chord, 84 if second else 78)
        for n, p in enumerate(VOICING[chord].split()):
            s.note('organ', bar * 4 + .02, 3.8, p, 80 - n * 4)
            s.note('choir', bar * 4 + .05, 3.8, pitch(p) + 12, 64 - n * 4)
        s.phrase('horn', bar, CHORALE[j], 100, .95)
        if j in (1, 5):
            s.curve('horn', 11, [(bar * 4, 100), (bar * 4 + 1.5, 124), (bar * 4 + 2.9, 96)])
        if second:
            s.phrase('lead', bar, SONG[j], 104, .86)
            for n, p in enumerate(VOICING[chord].split()[1:]):
                s.note('strings', bar * 4 + .05, 3.8, pitch(p) + 12, 60 - n * 4)
    s.note('crash', 18 * 4, 1.6 * s.bpm / 60, 60, 92)
    return s


SKETCHES = [la_mancha, contorno_roto, trazo_y_sombra]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--soundfont', required=True, type=Path)
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    compose_score.MUSIC = OUT
    synth = Synth(args.soundfont)
    report = {}
    for make in SKETCHES:
        score = make()
        if args.only and score.name not in args.only: continue
        score.midi()
        wav = OUT / (score.name + '.wav')
        meta = render_score(score, synth, wav)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                        '-af', 'lowpass=f=7800', '-c:a', 'libmp3lame', '-q:a', '3', str(OUT / (score.name + '.mp3'))], check=True)
        report[score.name] = {k: meta[k] for k in ['title', 'bpm', 'key', 'duration', 'form', 'maxWrittenPolyphony']}
        report[score.name]['stemBalance'] = meta.get('stemBalance')
        print(score.name, score.title, f"{meta['duration']:.1f}s", flush=True)
    synth.close()
    (OUT / 'boss-sketches.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
