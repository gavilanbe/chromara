"""Tres gotas — CHROMARA's normal battle, September 2026 (v7).

A 32-bar song at 160 bpm in D dorian over a two-bar bass riff. The hook is
three hammered eighths (the three drops) that leap a third and fall back in a
dotted figure; its antecedent stops on A7 and its consequent lands on D.

  A   Carmín alone: trumpet states the song over the riff.
  A′  Ámbar answers with the drops an octave up; Añil joins in thirds.
  B   The same phrase in D major, led by Añil with Ámbar's harp; the borrowed
      G minor bar remembers the paper before A7 pulls the riff back.
  C   Bass and drums alone with the drops as a marimba ostinato, then a
      four-bar climb (D, F, G, A) where all three shout the drops together.

Every pitch, duration, velocity and expression gesture is written here.
"""
from compose_score import Score, pitch


def grid(s, voice, bar, pattern, velocities, note=60, seconds=.12):
    """A drum bar on a text grid: '.' rest, 'x' soft, 'X' accent, 'o' ghost."""
    step = s.meter / len(pattern)
    level = {'X': velocities[0], 'x': velocities[1], 'o': velocities[2] if len(velocities) > 2 else velocities[1] - 30}
    hits = [k for k, c in enumerate(pattern) if c != '.']
    for k, nxt in zip(hits, hits[1:] + [None]):
        # A hit never overlaps the next one on the same drum; the sample cuts instead.
        gap = (nxt - k) * step - .01 if nxt is not None else 99
        s.note(voice, bar * s.meter + k * step, min(seconds * s.bpm / 60, gap), note, level[pattern[k]])


# Two-bar riff on an eighth grid: (pitch, beat offset, duration). Root, root,
# octave on the "and" of two, fifth, then a walk into the next bar.
RIFF = {
    'Dm':   [('D2', 0), ('D2', .5), ('D3', 1.5), ('A2', 2), ('C3', 3), ('B2', 3.5)],
    'Dm2':  [('D2', 0), ('D2', .5), ('D3', 1.5), ('A2', 2), ('G2', 2.5), ('F2', 3), ('E2', 3.5)],
    'F':    [('F2', 0), ('F2', .5), ('F3', 1.5), ('C3', 2), ('A2', 3), ('G2', 3.5)],
    'G':    [('G2', 0), ('G2', .5), ('G3', 1.5), ('D3', 2), ('B2', 3), ('A2', 3.5)],
    'C':    [('C2', 0), ('C2', .5), ('C3', 1.5), ('G2', 2), ('E2', 3), ('D2', 3.5)],
    'A7':   [('A1', 0), ('A1', .5), ('A2', 1.5), ('E2', 2), ('G2', 2.5), ('A2', 3), ('C#2', 3.5)],
    'Cend': [('C2', 0), ('C2', .5), ('C3', 1.5), ('G2', 2), ('A2', 3), ('C#2', 3.5)],
    'Dend': [('D2', 0, .9), ('D2', 1), ('D3', 1.5), ('A2', 2), ('D2', 3, .9)],
}
CHORD = {'Dm': 'D4 F4 A4', 'Dm2': 'D4 F4 A4', 'F': 'C4 F4 A4', 'G': 'D4 G4 B4',
         'C': 'C4 E4 G4', 'A7': 'C#4 E4 G4', 'Cend': 'C4 E4 G4', 'Dend': 'D4 F4 A4'}
SONG = ['Dm', 'Dm2', 'F', 'G', 'Dm', 'Dm2', 'C', 'A7']

# The hook. Antecedent (half cadence on A7) and consequent (tonic).
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
# Añil's thirds for the consequent of A′.
THIRDS = ['F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 E5:1',
          'F5:1.5 C5:.5 E5:.5 F5:.5 G5:.5 A5:.5',
          'C6:.5 C6:.5 C6:.5 E6:.5 D6:.75 C6:.25 B5:.5 C6:.5',
          'A5:.5 G5:.5 F5:2.5 -:.5']

# B: the light. Same drops, same dotted fall, D major; the fifth bar is lydian
# over G, the seventh borrows G minor, the eighth turns back to the riff.
LIGHT = [('D', 'D2', 'D4 F#4 A4'), ('G', 'G2', 'D4 G4 B4'), ('Bm', 'B1', 'D4 F#4 B4'), ('A', 'A1', 'C#4 E4 A4'),
         ('G', 'G2', 'D4 G4 B4'), ('D/F#', 'F#2', 'D4 F#4 A4'), ('Gm', 'G2', 'D4 G4 Bb4'), ('A7', 'A1', 'C#4 E4 G4')]
LIGHT_MELODY = ['A5:.5 A5:.5 A5:.5 D6:.5 C#6:.75 B5:.25 A5:1',
                'B5:1.5 G5:.5 A5:.5 B5:.5 D6:1',
                'F#5:.5 F#5:.5 F#5:.5 A5:.5 G5:.75 F#5:.25 E5:1',
                'E5:1 F#5:.5 G5:.5 A5:2',
                'B5:.5 B5:.5 B5:.5 D6:.5 C#6:.75 B5:.25 A5:1',
                'A5:1.5 F#5:.5 G5:.5 A5:.5 B5:1',
                'Bb5:.5 Bb5:.5 Bb5:.5 D6:.5 C6:.75 Bb5:.25 A5:1',
                'G5:.5 F5:.5 E5:1 C#5:1 -:1']
# Carmín under Añil for the lydian bar and its answer, a third below.
LIGHT_TRUMPET = {4: 'G5:.5 G5:.5 G5:.5 B5:.5 A5:.75 G5:.25 F#5:1',
                 5: 'F#5:1.5 D5:.5 E5:.5 F#5:.5 G5:1'}

# C: the drops as an ostinato in the gaps of the riff, then the climb.
OSTINATO = ['-:2 D5:.25 D5:.25 D5:.25 F5:.25 E5:.5 D5:.5',
            '-:2 A5:.25 A5:.25 A5:.25 C6:.25 B5:.5 A5:.5',
            '-:2 D5:.25 D5:.25 D5:.25 F5:.25 E5:.5 D5:.5',
            '-:2 A5:.25 A5:.25 A5:.25 C6:.25 B5:.25 A5:.25 G5:.25 E5:.25']
CLIMB = [('Dm', 'D5:.5 D5:.5 D5:.5 -:2.5'),
         ('F', 'F5:.5 F5:.5 F5:.5 -:2.5'),
         ('G', 'G5:.5 G5:.5 G5:.5 -:.5 G5:.5 G5:.5 G5:.5 -:.5'),
         ('A7', 'A5:.5 A5:.5 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 E5:.5')]


class TresGotas(Score):
    def __init__(self):
        super().__init__('battle', 'Tres gotas', 160, 4, 2, 32, 'D dorian; D major light; borrowed G minor')
        self.record_stems = True
        # CT 2011: program, gain, pan, echo send, optional bank.
        self.palette = {
            'lead': (56, 1.15, 58, .13), 'flute': (73, .72, 72, .18), 'marimba': (12, .70, 84, .08),
            'harp': (46, .72, 88, .16), 'organ': (17, .34, 44, .08), 'pad': (48, .80, 74, .18, 1),
            'bass': (33, .72, 64, 0),
            'kick': (125, .74, 64, 0), 'snare': (124, .66, 66, .04), 'hat': (127, .85, 82, 0),
            'open_hat': (126, .55, 82, 0), 'tom': (116, .38, 46, .06), 'crash': (123, .62, 50, .10, 1),
        }
        self.echo_taps = {
            'lead': [(.094, .7, True), (.188, .3, False)], 'flute': [(.125, .7, True), (.25, .35, False)],
            'marimba': [(.075, .6, True)], 'harp': [(.094, .5, True)], 'pad': [(.188, .5, True)],
            'snare': [(.047, .6, True)],
        }

    def metadata(self):
        m = super().metadata()
        bar = 4 * 60 / self.bpm
        m.update(edition='tres-gotas-v7',
            form='riff:2; A:8 trumpet song; A′:8 marimba answers, flute thirds; B:8 D major light, borrowed Gm; C:8 riff breakdown + climb',
            motif='Three hammered eighths, a leap of a third, dotted fall (D D D F | E. D C). Bass riff D D d A C B / D D d A G F E.',
            performance='Written attacks and durations; CC11 swells on held flute notes and through the climb; one pitch scoop into each C6 peak; velocities per note.',
            listeningMarks=[{'seconds': round(b * bar, 3), 'label': label} for b, label in
                            [(0, 'Riff'), (2, 'Tres gotas'), (10, 'Contestan'), (18, 'Se ilumina'),
                             (26, 'A pulso'), (30, 'Subida'), (34, 'Bucle')]],
            automationEvents={v: len(events) for v, events in self.automation.items()})
        return m


def riff(s, bar, name, lift=0):
    for entry in RIFF[name]:
        p, off = entry[0], entry[1]
        dur = entry[2] if len(entry) > 2 else .45
        v = 104 if off == 0 else 92 if off in (1.5, 3) else 84
        s.note('bass', bar * 4 + off, dur, p, min(127, v + lift))


def flow(s, bar, root, lift=0):
    """B's bass: a held root and an octave lift instead of the riff."""
    r = pitch(root)
    for off, p, dur, v in [(0, r, 1.4, 100), (1.5, r + 12, .45, 84), (2, r + 7, .45, 88), (2.5, r + 12, .45, 82), (3, r + 7, .9, 90)]:
        s.note('bass', bar * 4 + off, dur, p, v + lift)


def kit(s, bar, fill=False, open_end=True, crash=False, half=False, energy=0):
    if half:
        grid(s, 'kick', bar, 'x.....x.........', (104, 94))
        grid(s, 'snare', bar, '........X.......', (100, 92), seconds=.22)
        grid(s, 'hat', bar, 'x.x.x.x.x.x.x.x.', (64, 48), seconds=.08)
        return
    grid(s, 'kick', bar, 'x.....x...x.....' if not fill else 'x.....x...x...x.', (108 + energy, 100 + energy))
    grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X.xX', (104 + energy, 96 + energy, 60), seconds=.22)
    grid(s, 'hat', bar, 'X.x.X.x.X.x.X.' + ('..' if open_end else 'x.'), (78, 52), seconds=.08)
    if open_end: grid(s, 'open_hat', bar, '..............x.', (70, 70), seconds=.25)
    if fill:
        for off, p, v in [(3, 64, 84), (3.25, 60, 90), (3.5, 55, 98), (3.75, 50, 104)]:
            s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
    if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 92)


def stabs(s, bar, name, late=False, level=0):
    for j, p in enumerate(CHORD[name].split()):
        s.note('organ', bar * 4 + (1.5 if late else .5), 1.2, p, 62 + level - j * 4)


def peak_scoop(s, voice, bar):
    """One upward settling gesture into the C6 that crowns bar seven."""
    t = bar * 4 + 1.5
    s.control(voice, t, -1, -520)
    s.curve(voice, -1, [(t, -520), (t + .12, 0)])


def hook(s, bar, text, lift=0, voice='lead'):
    s.phrase(voice, bar, text, 96 + lift, .86)


def battle():
    s = TresGotas()
    for voice in ('lead', 'flute'):
        s.control(voice, 0, 11, 112)

    # Two riff bars: the hats first, then the kit arrives with a fill and a pickup.
    riff(s, 0, 'Dm'); grid(s, 'hat', 0, 'X.x.X.x.X.x.X.x.', (74, 50), seconds=.08)
    grid(s, 'kick', 0, 'x.....x...x.....', (100, 92))
    riff(s, 1, 'Dm2'); kit(s, 1, fill=True, open_end=False)
    s.phrase('lead', 1, '-:3 A4:.5 C5:.5', 92, .8)

    for k in range(32):
        bar = 2 + k
        if k < 8:
            # A: trumpet alone over the riff.
            name = SONG[k]
            riff(s, bar, name); kit(s, bar, fill=k == 7, crash=k == 0)
            hook(s, bar, HOOK_A[k]); stabs(s, bar, name, late=k % 2 == 1)
            if k == 6: peak_scoop(s, 'lead', bar)
        elif k < 16:
            # A′: Ámbar echoes the drops an octave up; Añil joins in thirds.
            j = k - 8
            name = SONG[j] if j < 6 else ('Cend' if j == 6 else 'Dend')
            riff(s, bar, name, 3); kit(s, bar, fill=j == 3, crash=j == 0)
            hook(s, bar, HOOK_B[j], 3); stabs(s, bar, name, late=j % 2 == 1, level=2)
            if j == 6: peak_scoop(s, 'lead', bar)
            if j in (1, 5):
                s.phrase('marimba', bar, '-:2 D6:.25 D6:.25 D6:.25 F6:.25 E6:.5 -:.5', 84, .7)
            if j == 3:
                s.phrase('marimba', bar, '-:2 A5:.25 A5:.25 A5:.25 C6:.25 B5:.5 A5:.5', 80, .7)
            if j >= 4:
                s.phrase('flute', bar, THIRDS[j - 4], 88, .86)
        elif k < 24:
            # B: the light. Half-time kit, flowing bass, harp and a string pad.
            j = k - 16
            name, root, voicing = LIGHT[j]
            t = bar * 4
            if j < 7:
                flow(s, bar, root)
                kit(s, bar, half=j < 6, fill=j == 6, crash=j == 0)
            else:
                riff(s, bar, 'A7', 2); kit(s, bar, fill=True)
            s.phrase('flute', bar, LIGHT_MELODY[j], 94, .9)
            if j in (0, 2, 4, 6):
                s.phrase('marimba', bar, LIGHT_MELODY[j], 76, .7, transpose=-12)
            if j in LIGHT_TRUMPET:
                s.phrase('lead', bar, LIGHT_TRUMPET[j], 88, .88)
            # Añil's held notes grow, then yield to the next drops.
            if j == 1: s.curve('flute', 11, [(t + 3, 112), (t + 3.6, 124), (t + 3.95, 112)])
            if j == 3: s.curve('flute', 11, [(t + 2, 104), (t + 3.2, 126), (t + 3.95, 110)])
            if j == 5: s.curve('flute', 11, [(t + 3, 112), (t + 3.6, 124), (t + 3.95, 112)])
            if j == 7: s.curve('flute', 11, [(t + 1, 116), (t + 2.4, 100), (t + 2.95, 92), (t + 3.9, 112)])
            # Ámbar's harp: an ascending arpeggio that keeps the light moving.
            tones = [pitch(p) for p in voicing.split()]
            arpeggio = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]]
            if j < 7:
                for n, p in enumerate(arpeggio):
                    s.note('harp', t + .5 + n * .5, .42, p, 64 + [0, -6, -2, 4, -4, -8][n])
            if j < 7:
                for n, p in enumerate(tones):
                    s.note('pad', t + .02, 3.7, p - 12, 70 - n * 4)
            if j in (0, 2, 4):
                s.curve('pad', 11, [(t, 92), (t + 4, 108), (t + 7.9, 90)])
            if j == 6:
                s.curve('pad', 11, [(t, 100), (t + 3.9, 78)])
        else:
            # C: riff and drums alone with the drops as ostinato, then the climb.
            j = k - 24
            t = bar * 4
            if j < 4:
                riff(s, bar, 'Dm' if j % 2 == 0 else 'Dm2', 4)
                kit(s, bar, fill=j == 3, crash=j == 0, energy=2)
                s.phrase('marimba', bar, OSTINATO[j], 86, .7)
                for off, p in [(1.5, 'D4'), (1.5, 'A4'), (3.5, 'D4'), (3.5, 'A4')]:
                    s.note('organ', t + off, .3, p, 66)
            else:
                name, call = CLIMB[j - 4]
                riff(s, bar, name, 6)
                stabs(s, bar, name, level=4)
                for voice, lift, transpose in [('lead', 6, 0), ('flute', 2, 0), ('marimba', -4, 12)]:
                    s.phrase(voice, bar, call, 100 + lift, .8 if voice != 'marimba' else .7, transpose)
                if j == 4:
                    for voice in ('lead', 'flute'):
                        s.curve(voice, 11, [(t, 104), (t + 12, 122), (t + 15.9, 127)])
                if j < 6:
                    kit(s, bar, crash=j == 4, energy=3)
                elif j == 6:
                    grid(s, 'kick', bar, 'x...x...x...x...', (110, 106))
                    grid(s, 'snare', bar, 'X.x.X.x.X.x.X.x.', (100, 86), seconds=.18)
                    grid(s, 'hat', bar, 'X.x.X.x.X.x.X.x.', (78, 54), seconds=.08)
                else:
                    grid(s, 'kick', bar, 'x...x...x...x...', (112, 108))
                    for n in range(16):
                        s.note('snare', t + n / 4, .24, 60, 80 + round(n * 2.6))
                    grid(s, 'hat', bar, 'X.x.X.x.X.x.X.x.', (80, 56), seconds=.08)
                    for off, p, v in [(3, 64, 92), (3.5, 55, 104)]:
                        s.note('tom', t + off, .16 * s.bpm / 60, p, v)
    # The climb's swell must not colour the next loop: back to the baseline.
    for voice in ('lead', 'flute'):
        s.control(voice, 34 * 4 - .01, 11, 112)
    s.repeat()
    return s
