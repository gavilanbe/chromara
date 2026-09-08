#!/usr/bin/env python3
"""Three short, deliberately different sketches for CHROMARA's normal battle.

Each one is judged on its hook, its bass and its rhythm before anything is
developed. Nothing here is generated at random: every pitch and duration is
written out.

    python tools/battle_sketches.py --soundfont '/path/Chrono Trigger.sf2'

Renders WAV/MP3/MIDI into music/sketches/.
"""
import argparse
import json
from pathlib import Path
import subprocess

import compose_score
from compose_score import Score, SR, Synth, pitch, render_score

OUT = compose_score.MUSIC / 'sketches'


class Sketch(Score):
    """Plays once (intro + bars); no loop, short fade, stems recorded."""

    def __init__(self, name, title, bpm, meter, intro, bars, key, palette, taps=None, note=''):
        super().__init__(name, title, bpm, meter, intro, bars, key)
        self.palette = palette
        self.echo_taps = taps or {}
        self.record_stems = True
        self.note_text = note

    def metadata(self):
        m = super().metadata()
        beat = 60 / self.bpm
        end = round((self.intro + self.bars) * self.meter * beat * SR) + round(1.2 * SR)
        m.update(loop=False, loopStart=0, loopEnd=0, loopStartSample=0, loopEndSample=0,
                 duration=end / SR, form=self.note_text)
        return m


def grid(s, voice, bar, pattern, velocities, note=60, seconds=.12):
    """A drum bar on a text grid: '.' rest, 'x' soft, 'X' accent, 'o' ghost."""
    step = s.meter / len(pattern)
    level = {'X': velocities[0], 'x': velocities[1], 'o': velocities[2] if len(velocities) > 2 else velocities[1] - 30}
    for k, c in enumerate(pattern):
        if c != '.':
            s.note(voice, bar * s.meter + k * step, seconds * s.bpm / 60, note, level[c])


def melody(s, voice, bar, text, velocity, gate=.92, transpose=0):
    s.phrase(voice, bar, text, velocity, gate, transpose)


# ---------------------------------------------------------------------------
# Sketch 1 · «Tres gotas» · 160 bpm · D dorian · 4/4 rock drive
# Hook: three hammered notes (the three drops) that leap a third and fall
# back in a dotted figure. The bass riff owns the bar with a dorian B natural.
# ---------------------------------------------------------------------------
def tres_gotas():
    s = Sketch('sketch1', 'Tres gotas', 160, 4, 2, 16, 'D dorian',
        palette={'lead': (56, 1.15, 58, .13), 'flute': (73, .70, 72, .18), 'marimba': (12, .70, 84, .08),
                 'organ': (17, .30, 44, .08), 'bass': (33, .72, 64, 0),
                 'kick': (125, .74, 64, 0), 'snare': (124, .66, 66, .04), 'hat': (127, .58, 82, 0),
                 'ohat': (126, .40, 82, 0), 'tom': (116, .38, 46, .06), 'crash': (123, .62, 50, .10, 1)},
        taps={'lead': [(.094, .7, True), (.188, .3, False)], 'flute': [(.125, .7, True), (.25, .35, False)],
              'marimba': [(.075, .6, True)], 'snare': [(.047, .6, True)]},
        note='intro 2 · A 8 (trompeta) · A′ 8 (marimba contesta, flauta se suma)')

    # Bass riff: two bars, eighth grid; the riff is the second identity of the piece.
    RIFF = {
        'Dm':  [('D2', 0, .45), ('D2', .5, .45), ('D3', 1.5, .45), ('A2', 2, .45), ('C3', 3, .45), ('B2', 3.5, .45)],
        'Dm2': [('D2', 0, .45), ('D2', .5, .45), ('D3', 1.5, .45), ('A2', 2, .45), ('G2', 2.5, .45), ('F2', 3, .45), ('E2', 3.5, .45)],
        'F':   [('F2', 0, .45), ('F2', .5, .45), ('F3', 1.5, .45), ('C3', 2, .45), ('A2', 3, .45), ('G2', 3.5, .45)],
        'G':   [('G2', 0, .45), ('G2', .5, .45), ('G3', 1.5, .45), ('D3', 2, .45), ('B2', 3, .45), ('A2', 3.5, .45)],
        'C':   [('C2', 0, .45), ('C2', .5, .45), ('C3', 1.5, .45), ('G2', 2, .45), ('E2', 3, .45), ('D2', 3.5, .45)],
        'A7':  [('A1', 0, .45), ('A1', .5, .45), ('A2', 1.5, .45), ('E2', 2, .45), ('G2', 2.5, .45), ('A2', 3, .45), ('C#2', 3.5, .45)],
        'Cend': [('C2', 0, .45), ('C2', .5, .45), ('C3', 1.5, .45), ('G2', 2, .45), ('A2', 3, .45), ('C#2', 3.5, .45)],
        'Dend': [('D2', 0, .9), ('D2', 1, .45), ('D3', 1.5, .45), ('A2', 2, .45), ('D2', 3, .9)],
    }
    CHANGES = ['Dm', 'Dm2', 'F', 'G', 'Dm', 'Dm2', 'C', 'A7']
    CHORD = {'Dm': 'D4 F4 A4', 'Dm2': 'D4 F4 A4', 'F': 'C4 F4 A4', 'G': 'D4 G4 B4',
             'C': 'C4 E4 G4', 'A7': 'C#4 E4 G4', 'Cend': 'C4 E4 G4', 'Dend': 'D4 F4 A4'}

    def bass(bar, name, lift=0):
        for p, off, dur in RIFF[name]:
            v = 104 if off == 0 else 92 if off in (1.5, 3) else 84
            s.note('bass', bar * 4 + off, dur, p, v + lift)

    def kit(bar, fill=False, open_end=True, crash=False):
        grid(s, 'kick', bar, 'x.....x...x.....' if not fill else 'x.....x...x...x.', (108, 100))
        grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X.xX', (104, 96, 60), seconds=.22)
        grid(s, 'hat', bar, 'X.x.X.x.X.x.X.' + ('..' if open_end else 'x.'), (78, 52), seconds=.08)
        if open_end: grid(s, 'ohat', bar, '..............x.', (70, 70), seconds=.25)
        if fill:
            for off, p, v in [(3, 64, 84), (3.25, 60, 90), (3.5, 55, 98), (3.75, 50, 104)]:
                s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 92)

    # Antecedent (half cadence on A7) and consequent (tonic).
    HOOK_A = ['D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1',
              'D5:1.5 A4:.5 C5:.5 D5:.5 E5:1',
              'F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 E5:1',
              'D5:1 C5:.5 B4:.5 A4:2',
              'D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1',
              'D5:1.5 A4:.5 C5:.5 D5:.5 E5:.5 F5:.5',
              'A5:.5 A5:.5 A5:.5 C6:.5 B5:.75 A5:.25 G5:1',
              'F5:.5 E5:.5 D5:1 C#5:1.5 -:.5']
    HOOK_B = HOOK_A[:6] + ['A5:.5 A5:.5 A5:.5 C6:.5 B5:.75 A5:.25 G5:.5 A5:.5',
                           'F5:.5 E5:.5 D5:2.5 -:.5']
    def hook(bar, text, lift=0, voice='lead'):
        s.phrase(voice, bar, text, 96 + lift, .86)

    # Intro: riff alone, then the kit arrives with a fill.
    bass(0, 'Dm'); grid(s, 'hat', 0, 'X.x.X.x.X.x.X.x.', (74, 50), seconds=.08)
    grid(s, 'kick', 0, 'x.....x...x.....', (100, 92))
    bass(1, 'Dm2'); kit(1, fill=True, open_end=False)
    # Pickup into the hook: A4 C5 on the last two eighths of bar 1.
    s.phrase('lead', 1, '-:3 A4:.5 C5:.5', 92, .8)

    for k in range(8):
        bar = 2 + k
        name = CHANGES[k]
        bass(bar, name); kit(bar, fill=k == 7, crash=k == 0)
        hook(bar, HOOK_A[k])
        # Quiet organ pad on chord thirds keeps the harmony readable without a wall.
        for j, p in enumerate(CHORD[name].split()):
            s.note('organ', bar * 4 + (.5 if k % 2 == 0 else 1.5), 1.2, p, 62 - j * 4)

    # A′: marimba answers in the hook's gaps; flute joins in thirds for the second sentence.
    FLUTE = ['F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 E5:1',
             'F5:1.5 C5:.5 E5:.5 F5:.5 G5:.5 A5:.5',
             'C6:.5 C6:.5 C6:.5 E6:.5 D6:.75 C6:.25 B5:.5 C6:.5',
             'A5:.5 G5:.5 F5:2.5 -:.5']
    for k in range(8):
        bar = 10 + k
        name = CHANGES[k] if k < 6 else ('Cend' if k == 6 else 'Dend')
        bass(bar, name, 3); kit(bar, fill=k == 3, crash=k == 0)
        hook(bar, HOOK_B[k], 3)
        for j, p in enumerate(CHORD[name].split()):
            s.note('organ', bar * 4 + (.5 if k % 2 == 0 else 1.5), 1.2, p, 64 - j * 4)
        if k in (1, 5):
            # Ámbar: the three drops echoed an octave up in the gap after the long D.
            s.phrase('marimba', bar, '-:2 D6:.25 D6:.25 D6:.25 F6:.25 E6:.5 -:.5', 84, .7)
        if k == 3:
            s.phrase('marimba', bar, '-:2 A5:.25 A5:.25 A5:.25 C6:.25 B5:.5 A5:.5', 80, .7)
        if k >= 4:
            s.phrase('flute', bar, FLUTE[k - 4], 88, .86)
    # Final chord.
    s.note('crash', 18 * 4, 1.6 * s.bpm / 60, 60, 88)
    return s


# ---------------------------------------------------------------------------
# Sketch 2 · «Salpicaduras» · 12/8 (four beats of three) · dotted-quarter 132 · E minor
# Hook: a skipping long–short figure that dips and climbs, then breaks into a
# hemiola (three groups of four) that pulls against the bounce of the bass.
# ---------------------------------------------------------------------------
def salpicaduras():
    T = 1 / 3
    s = Sketch('sketch2', 'Salpicaduras', 132, 4, 2, 16, 'E minor / dorian',
        palette={'lead': (73, .80, 60, .16), 'oboe': (69, .62, 44, .12), 'marimba': (12, .74, 80, .07),
                 'lead2': (56, .82, 62, .12), 'harp': (46, .46, 88, .16), 'bass': (34, .84, 64, 0),
                 'kick': (125, .70, 64, 0), 'snare': (124, .60, 66, .04), 'hat': (127, .50, 80, 0),
                 'tamb': (119, .55, 34, .03), 'tom': (116, .36, 46, .06), 'crash': (123, .58, 50, .10, 1)},
        taps={'lead': [(.152, .7, True), (.303, .3, False)], 'lead2': [(.114, .7, True), (.227, .3, False)],
              'marimba': [(.076, .6, True)], 'snare': [(.05, .6, True)]},
        note='intro 2 · A 8 (flauta) · A′ 8 (marimba dobla, trompeta contesta)')

    def tok(items):
        return ' '.join(f'{p}:{d:.4f}' for p, d in items)

    # Bounce bass: skip, skip, three walking eighths, long root + pickup.
    def bass(bar, root, walk, top, pick, lift=0):
        r = pitch(root)
        notes = [(0, r, .58), (2 * T, r + 7, .28), (1, r, .58), (5 * T, r + 7, .28),
                 (2, pitch(walk[0]), .3), (7 * T, pitch(walk[1]), .3), (8 * T, pitch(walk[2]), .3),
                 (3, pitch(top), .58), (11 * T, pitch(pick), .28)]
        for j, (off, p, dur) in enumerate(notes):
            s.note('bass', bar * 4 + off, dur, p, (100 if off in (0, 2, 3) else 86) + lift)

    BASS = {'Em': ('E2', ('G2', 'A2', 'B2'), 'E3', 'D3'), 'G': ('G2', ('G2', 'A2', 'B2'), 'G3', 'F#3'),
            'C': ('C2', ('C3', 'B2', 'A2'), 'G2', 'A2'), 'B7': ('B1', ('B2', 'A2', 'F#2'), 'B2', 'D#3'),
            'Am': ('A1', ('A2', 'B2', 'C3'), 'E3', 'D3'), 'D': ('D2', ('D3', 'C3', 'A2'), 'D3', 'B2'),
            'Emend': ('E2', ('E3', 'B2', 'G2'), 'E2', 'E2')}
    CHANGES = ['Em', 'Em', 'C', 'B7', 'Em', 'Am', 'C', 'B7']
    CHANGES2 = ['Em', 'G', 'C', 'B7', 'Em', 'Am', 'D', 'Emend']
    CHORD = {'Em': 'E4 G4 B4', 'G': 'D4 G4 B4', 'C': 'E4 G4 C5', 'B7': 'D#4 F#4 A4',
             'Am': 'E4 A4 C5', 'D': 'D4 F#4 A4', 'Emend': 'E4 G4 B4'}

    def kit(bar, fill=False, crash=False):
        grid(s, 'kick', bar, 'x.....x.x...' if not fill else 'x.....x.x.x.', (106, 96))
        grid(s, 'snare', bar, '...X.....X..' if not fill else '...X.....X.x', (100, 92, 64), seconds=.22)
        grid(s, 'hat', bar, 'X.xX.xX.xX.x', (74, 46), seconds=.08)
        grid(s, 'tamb', bar, '..x..x..x..x', (68, 68), seconds=.08)
        if fill:
            for off, p, v in [(3, 64, 86), (3 + T, 60, 92), (3 + 2 * T, 55, 100)]:
                s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 90)

    L, S1, B, H = 2 * T, T, 1, 4 * T  # long, short, beat, hemiola unit
    HOOK_A = [
        tok([('E5', L), ('G5', S1), ('F#5', L), ('E5', S1), ('B4', B), ('D5', L), ('E5', S1)]),
        tok([('F#5', L), ('A5', S1), ('G5', L), ('F#5', S1), ('E5', B), ('-', S1), ('E5', S1), ('F#5', S1)]),
        tok([('G5', H), ('A5', H), ('B5', H)]),
        tok([('A5', B), ('F#5', L), ('G5', S1), ('F#5', B), ('D#5', B)]),
        tok([('E5', L), ('G5', S1), ('F#5', L), ('E5', S1), ('B4', B), ('D5', L), ('E5', S1)]),
        tok([('A5', L), ('C6', S1), ('B5', L), ('A5', S1), ('G5', B), ('F#5', L), ('E5', S1)]),
        tok([('G5', H), ('B5', H), ('D6', H)]),
        tok([('C6', L), ('B5', S1), ('A5', L), ('G5', S1), ('F#5', B), ('D#5', L), ('-', S1)]),
    ]
    HOOK_B = HOOK_A[:6] + [tok([('F#5', H), ('A5', H), ('D6', H)]),
                           tok([('C6', L), ('B5', S1), ('A5', L), ('G5', S1), ('F#5', L), ('E5', S1), ('E5', 3 * T)])]

    # Intro: bass bounce with tambourine, then the kit.
    bass(0, *BASS['Em']); grid(s, 'tamb', 0, '..x..x..x..x', (68, 68), seconds=.08)
    grid(s, 'hat', 0, 'X.xX.xX.xX.x', (70, 44), seconds=.08)
    bass(1, *BASS['Em']); kit(1, fill=True)
    s.phrase('lead', 1, tok([('-', 3), ('B4', S1), ('D5', S1), ('E5', S1)]), 90, .8)
    for k in range(8):
        bar = 2 + k; name = CHANGES[k]
        bass(bar, *BASS[name]); kit(bar, fill=k == 7, crash=k == 0)
        s.phrase('lead', bar, HOOK_A[k], 96, .88)
        # Harp shows the chord on beats 2 and 4, only two notes at a time.
        for j, p in enumerate(CHORD[name].split()[:2]):
            s.note('harp', bar * 4 + 1 + 2 * (j % 2), .8, p, 66 - j * 6)
    for k in range(8):
        bar = 10 + k; name = CHANGES2[k]
        bass(bar, *BASS[name], 3); kit(bar, fill=k == 3, crash=k == 0)
        s.phrase('lead', bar, HOOK_B[k], 99, .88)
        s.phrase('marimba', bar, HOOK_B[k], 86, .7, transpose=-12)
        for j, p in enumerate(CHORD[name].split()[:2]):
            s.note('harp', bar * 4 + 1 + 2 * (j % 2), .8, p, 68 - j * 6)
        if k in (2, 6):
            # Carmín holds a plain long note against the hemiola.
            s.phrase('lead2', bar, tok([('-', 1), ('E5', L), ('G5', S1), ('C6', 2)]) if k == 2
                     else tok([('-', 1), ('D5', L), ('F#5', S1), ('A5', 2)]), 90, .8)
    s.note('crash', 18 * 4, 1.6 * s.bpm / 60, 60, 86)
    return s


# ---------------------------------------------------------------------------
# Sketch 3 · «Tinta y brasa» · 126 bpm · D minor · sixteenth-note bass
# Hook: two characters of one phrase. Añil sighs (a long A that falls by step);
# Carmín answers with a leap. In A′ they overlap, which is the mix.
# ---------------------------------------------------------------------------
def tinta_y_brasa():
    s = Sketch('sketch3', 'Tinta y brasa', 126, 4, 2, 16, 'D minor / harmonic cadences',
        palette={'lead': (56, 1.15, 60, .14), 'flute': (73, 1.0, 66, .20), 'oboe': (69, .66, 40, .14),
                 'rhodes': (4, .50, 44, .10), 'strings': (48, .52, 76, .16), 'bass': (38, .70, 64, 0),
                 'kick': (125, .76, 64, 0), 'snare': (124, .68, 66, .05), 'hat': (127, .54, 82, 0),
                 'ohat': (126, .42, 82, 0), 'tom': (116, .38, 46, .06), 'crash': (123, .60, 50, .10, 1)},
        taps={'lead': [(.119, .7, True), (.238, .3, False)], 'flute': [(.179, .7, True), (.357, .35, False)],
              'strings': [(.238, .6, True)], 'snare': [(.06, .6, True)]},
        note='intro 2 · A 8 (flauta pregunta, trompeta responde) · A′ 8 (se superponen)')

    # Sixteenth-note bass (16 steps per bar). Chromatic approaches into each change.
    BASS = {
        'Dm':  [(0, 'D2', .22), (3, 'D2', .16), (6, 'D3', .16), (8, 'C3', .16), (10, 'A2', .16), (12, 'F2', .16), (14, 'E2', .16)],
        'Dm2': [(0, 'D2', .22), (3, 'D2', .16), (6, 'D3', .16), (8, 'C3', .16), (10, 'A2', .16), (11, 'Bb2', .12), (12, 'A2', .16), (14, 'F#2', .16)],
        'Gm':  [(0, 'G2', .22), (3, 'G2', .16), (6, 'G3', .16), (8, 'F3', .16), (10, 'D3', .16), (12, 'Bb2', .16), (14, 'A2', .16)],
        'Bb':  [(0, 'Bb1', .22), (3, 'Bb1', .16), (6, 'Bb2', .16), (8, 'A2', .16), (10, 'F2', .16), (12, 'D2', .16), (14, 'C#2', .16)],
        'A7':  [(0, 'A1', .22), (3, 'A1', .16), (6, 'A2', .16), (8, 'G2', .16), (10, 'E2', .16), (12, 'C#2', .16), (14, 'C#2', .12), (15, 'C#2', .12)],
        'C':   [(0, 'C2', .22), (3, 'C2', .16), (6, 'C3', .16), (8, 'Bb2', .16), (10, 'G2', .16), (12, 'E2', .16), (14, 'C#2', .16)],
        'Dend': [(0, 'D2', .6), (4, 'D2', .22), (6, 'D3', .16), (8, 'A2', .5), (12, 'D2', .9)],
    }
    CHANGES = ['Dm', 'Dm2', 'Gm', 'A7', 'Dm', 'Gm', 'Bb', 'A7']
    CHANGES2 = ['Dm', 'Dm2', 'Gm', 'A7', 'Dm', 'Gm', 'C', 'Dend']
    CHORD = {'Dm': 'F3 A3 D4', 'Dm2': 'F3 A3 D4', 'Gm': 'G3 Bb3 D4', 'A7': 'G3 C#4 E4',
             'Bb': 'F3 Bb3 D4', 'C': 'E3 G3 C4', 'Dend': 'F3 A3 D4'}

    def bass(bar, name, lift=0):
        for step, p, dur in BASS[name]:
            v = 106 if step == 0 else 90 if step in (6, 8) else 82
            s.note('bass', bar * 4 + step / 4, dur, p, v + lift)

    def kit(bar, fill=False, crash=False, sparse=False):
        grid(s, 'kick', bar, 'x.....x...x.....' if not fill else 'x.....x...x..x..', (108, 98))
        grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X..X', (104, 96, 58), seconds=.22)
        grid(s, 'hat', bar, 'X.x.X.x.X.x.X.x.' if sparse else 'XoxoXoxoXoxoXox.', (76, 52, 34), seconds=.07)
        grid(s, 'ohat', bar, '...............x', (64, 64), seconds=.22)
        if fill:
            for off, p, v in [(3.25, 64, 86), (3.5, 60, 92), (3.75, 55, 100)]:
                s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
        if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 90)

    SIGH = ['A5:2.5 G5:.5 F5:.5 E5:.5', 'D5:1.5 Bb4:.5 D5:.5 G5:1.5',
            'A5:2.5 G5:.5 F5:.5 E5:.5', 'D5:1 E5:.5 F5:.5 G5:1 A5:1']
    LEAP = ['D5:.5 F5:.5 A5:.5 D6:1.5 C6:.5 A5:.5', 'Bb5:.5 A5:.5 G5:.5 F5:.5 E5:2',
            'D6:1.5 C6:.5 Bb5:.5 A5:.5 G5:1', 'F5:.5 E5:.5 D5:1 C#5:1.5 -:.5']
    LEAP_END = ['D6:1.5 C6:.5 Bb5:.5 A5:.5 G5:.5 A5:.5', 'F5:.5 E5:.5 D5:3']

    def pad(bar, name, v=58):
        for j, p in enumerate(CHORD[name].split()):
            s.note('strings', bar * 4 + .05, 3.7, p, v - j * 3)

    def keys(bar, name):
        for off in (1.5, 3.5):
            for j, p in enumerate(CHORD[name].split()):
                s.note('rhodes', bar * 4 + off, .4, pitch(p) + 12, 66 - j * 5)

    # Intro: the bass alone, the kit joins with the hats, then a fill.
    bass(0, 'Dm'); grid(s, 'hat', 0, 'XoxoXoxoXoxoXoxo', (72, 50, 34), seconds=.07)
    grid(s, 'kick', 0, 'x.....x...x.....', (100, 90))
    bass(1, 'Dm2'); kit(1, fill=True)
    for k in range(8):
        bar = 2 + k; name = CHANGES[k]
        bass(bar, name); kit(bar, fill=k == 7, crash=k == 0); keys(bar, name)
        if k % 4 < 2:
            s.phrase('flute', bar, SIGH[(k // 4) * 2 + k % 4], 92, .95)
            # Añil's sigh: the long A swells, then gives way to the fall.
            t = bar * 4
            if k % 4 == 0:
                s.curve('flute', 11, [(t, 96), (t + 1.6, 122), (t + 2.5, 104), (t + 3.9, 96)])
        else:
            s.phrase('lead', bar, LEAP[(k // 4) * 2 + k % 4 - 2], 100, .88)
            pad(bar, name, 54)
    for k in range(8):
        bar = 10 + k; name = CHANGES2[k]
        bass(bar, name, 3); kit(bar, fill=k == 3, crash=k == 0); keys(bar, name); pad(bar, name, 60)
        if k % 4 < 2:
            s.phrase('flute', bar, SIGH[(k // 4) * 2 + k % 4], 96, .95)
            t = bar * 4
            if k % 4 == 0:
                s.curve('flute', 11, [(t, 96), (t + 1.6, 124), (t + 2.5, 106), (t + 3.9, 98)])
            # The mix: Carmín's leap now lands inside Añil's sigh, a bar early.
            if k % 4 == 1:
                s.phrase('lead', bar, '-:2 D5:.5 F5:.5 A5:.5 D6:.5', 92, .86)
        else:
            phrase = (LEAP if k < 4 else LEAP_END)[k % 4 - 2]
            s.phrase('lead', bar, phrase, 103, .88)
            # Añil harmonises the answer a third below, so the leap has two colours.
            third = {'D5:.5 F5:.5 A5:.5 D6:1.5 C6:.5 A5:.5': 'Bb4:.5 D5:.5 F5:.5 A5:1.5 A5:.5 F5:.5',
                     'Bb5:.5 A5:.5 G5:.5 F5:.5 E5:2': 'G5:.5 F5:.5 E5:.5 D5:.5 C#5:2',
                     'D6:1.5 C6:.5 Bb5:.5 A5:.5 G5:1': 'F5:1.5 E5:.5 D5:.5 F5:.5 E5:1',
                     'D6:1.5 C6:.5 Bb5:.5 A5:.5 G5:.5 A5:.5': 'F5:1.5 E5:.5 D5:.5 F5:.5 E5:.5 F5:.5',
                     'F5:.5 E5:.5 D5:1 C#5:1.5 -:.5': 'A4:.5 G4:.5 F4:1 E4:1.5 -:.5',
                     'F5:.5 E5:.5 D5:3': 'D5:.5 C#5:.5 D5:3'}[phrase]
            s.phrase('flute', bar, third, 84, .9)
    s.note('crash', 18 * 4, 1.6 * s.bpm / 60, 60, 86)
    return s


SKETCHES = [tres_gotas, salpicaduras, tinta_y_brasa]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--soundfont', required=True, type=Path)
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    compose_score.MUSIC = OUT  # MIDI files land next to the renders
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
    (OUT / 'sketches.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
