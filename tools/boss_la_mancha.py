"""La mancha — La Tinta's battle, CHROMARA boss v6, September 2026.

150 bpm, D phrygian over a pedal. The bass hammers the three drops on a low D
(La Tinta stamps in the drops' own rhythm) with chromatic neighbours in 3+3+2.
Her motif is a heavy tread, A–F–Eb–D. The drops answer in their language,
D D D F | E. D C, and the E natural fights the Eb.

  A   Horn and strings tread the motif over the pedal; choir and organ hold.
  A′  The trumpet fights back with the drops in the gaps.
  B   The ink spreads: the riff leaves the pedal and climbs Eb, F, Gm, Bb, A7,
      the motif transposed with it; the drops only manage two replies.
  C   The contour alone: piano plays the line over a whispered riff, then the
      marimba answers with the drops, small and clear.
  D   Line and colour together: the trumpet's song and the horn's tread as
      counterpoint at full weight.
  E   Two chromatic ascents, a high Gm sigh, and a snare roll under all three
      voices shouting the drops on A7 back into the loop.

Every pitch, duration, velocity and expression gesture is written here.
"""
from compose_score import Score, pitch
from battle_tres_gotas import grid

INK = ['A4:1.5 F4:.5 Eb4:1 D4:1', '-:1 D4:.5 Eb4:.5 F4:.5 G4:.5 Ab4:1',
       'A4:1.5 F4:.5 Eb4:1 D4:1', 'Bb4:1.5 A4:.5 G4:.5 F4:.5 E4:1',
       'A4:1 Bb4:.5 A4:.5 F4:1 Eb4:1', 'D4:.5 Eb4:.5 F4:.5 G4:.5 Ab4:.5 A4:.5 Bb4:.5 C5:.5',
       'D5:1.5 C5:.5 Bb4:1 A4:1', 'G4:1 F4:.5 E4:.5 C#4:2']
ROOTS = ['D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'Bb1', 'A1']
CHOIR = ['D3 A3 D4', 'D3 Ab3 D4', 'D3 A3 D4', 'D3 Bb3 F4', 'D3 A3 F4', 'D3 Ab3 Eb4', 'Bb2 F3 D4', 'A2 E3 C#4']
FIGHT = {1: 'D5:.5 D5:.5 D5:.5 F5:.5 E5:1 -:1', 3: 'F5:.5 F5:.5 F5:.5 A5:.5 G5:1 -:1',
         5: 'D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 6: 'D5:1.5 A4:.5 C5:.5 D5:.5 F5:1',
         7: 'E5:.5 E5:.5 E5:.5 G5:.5 F5:.5 E5:.5 C#5:1'}

# B: the ink spreads. Roots climb; the motif keeps its phrygian shape on each.
SPREAD_ROOTS = ['Eb2', 'Eb2', 'F2', 'F2', 'G2', 'G2', 'Bb1', 'A1']
SPREAD = ['Bb4:1.5 Gb4:.5 E4:1 Eb4:1', '-:1 Eb4:.5 E4:.5 Gb4:.5 Ab4:.5 A4:1',
          'C5:1.5 Ab4:.5 Gb4:1 F4:1', '-:1 F4:.5 Gb4:.5 Ab4:.5 Bb4:.5 B4:1',
          'D5:1.5 Bb4:.5 Ab4:1 G4:1', 'D5:1 Eb5:.5 D5:.5 Bb4:1 Ab4:1',
          'F5:1.5 D5:.5 C5:1 Bb4:1', 'E5:1 C#5:.5 Bb4:.5 A4:2']
SPREAD_CHOIR = ['Eb3 Bb3 Eb4', 'Eb3 A3 Eb4', 'F3 C4 F4', 'F3 B3 F4', 'G3 D4 Bb4', 'G3 Eb4 Bb4', 'Bb2 F3 D4', 'A2 E3 C#4']
SPREAD_FIGHT = {6: 'D5:.5 D5:.5 D5:.5 F5:.5 E5:1 -:1', 7: 'E5:.5 E5:.5 E5:.5 G5:.5 F5:.5 E5:.5 C#5:1'}

# C: the contour alone, then the drops.
DROPS_SOFT = ['D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:1',
              'F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 E5:1', 'D5:1 C5:.5 B4:.5 A4:2']

# D: line and colour together. The trumpet sings the whole song against the tread.
SONG = ['D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:1',
        'F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25 E5:1', 'D5:1 C5:.5 B4:.5 A4:2',
        'D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25 C5:1', 'D5:1.5 A4:.5 C5:.5 D5:.5 E5:.5 F5:.5',
        'A5:.5 A5:.5 A5:.5 C6:.5 Bb5:.75 A5:.25 G5:1', 'F5:.5 E5:.5 D5:1 C#5:1.5 -:.5']

# E: the page goes back to the sketch. Ascents, a high sigh, the roll.
RISE_ROOTS = ['D2', 'D2', 'Bb1', 'Bb1', 'G2', 'G2', 'A1', 'A1']
RISE = ['D4:.5 Eb4:.5 F4:.5 G4:.5 Ab4:.5 A4:.5 Bb4:.5 C5:.5', 'D5:1.5 C5:.5 Bb4:1 A4:1',
        'F5:1.5 D5:.5 C5:1 Bb4:1', 'D5:.5 Eb5:.5 F5:.5 G5:.5 Ab5:.5 A5:.5 Bb5:.5 C6:.5',
        'D6:1.5 Bb5:.5 Ab5:1 G5:1', 'D5:1 Eb5:.5 D5:.5 Bb4:1 Ab4:1',
        'E5:1.5 C#5:.5 Bb4:1 A4:1', 'A4:1 Bb4:1 B4:1 C#5:1']
RISE_CHOIR = ['D3 A3 D4', 'D3 Ab3 D4', 'Bb2 F3 D4', 'Bb2 F3 D4', 'G3 D4 Bb4', 'G3 D4 Bb4', 'A2 E3 C#4', 'A2 E3 C#4']
RISE_FIGHT = {6: 'E5:.5 E5:.5 E5:.5 G5:.5 F5:.5 E5:.5 C#5:1', 7: 'A5:.5 A5:.5 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 E5:.5'}


class LaMancha(Score):
    def __init__(self):
        super().__init__('boss', 'La mancha', 150, 4, 4, 48, 'D phrygian over a pedal; Eb, F, Gm, Bb, A7')
        self.record_stems = True
        self.palette = {
            'horn': (60, .92, 54, .14), 'strlead': (48, .80, 72, .18, 1), 'lead': (56, 1.12, 60, .13),
            'choir': (52, 1.0, 80, .22), 'organ': (17, .42, 42, .10), 'piano': (0, .70, 50, .10),
            'marimba': (12, .80, 84, .08), 'bass': (38, .62, 64, 0), 'timpani': (47, .62, 58, .06),
            'kick': (125, .76, 64, 0), 'snare': (124, .70, 66, .05), 'hat': (127, .85, 82, 0),
            'tom': (116, .42, 46, .06), 'crash': (123, .66, 50, .10, 1),
        }
        self.echo_taps = {
            'horn': [(.1, .6, True), (.2, .3, False)], 'strlead': [(.15, .6, True), (.3, .3, False)],
            'lead': [(.1, .7, True), (.2, .3, False)], 'choir': [(.2, .5, True)], 'piano': [(.15, .5, True)],
            'marimba': [(.08, .5, True)], 'snare': [(.05, .6, True)],
        }

    def metadata(self):
        m = super().metadata()
        bar = 4 * 60 / self.bpm
        m.update(edition='la-mancha-v6',
            form='summons:4; A:8 tread; A′:8 drops fight; B:8 ink spreads; C:8 contour alone, drops answer; D:8 line and colour; E:8 ascents and roll',
            motif='Ink tread A–F–Eb–D (long, short, long, long); bass hammers the three drops on the pedal with chromatic neighbours.',
            performance='Written durations and velocities; choir CC11 swells per section; piano alone for the contour; CC11 crescendo through E, reset before the loop.',
            listeningMarks=[{'seconds': round(b * bar, 3), 'label': label} for b, label in
                            [(0, 'Llamada'), (4, 'Pisada'), (12, 'Las gotas contestan'), (20, 'La tinta se extiende'),
                             (28, 'El contorno a solas'), (36, 'Línea y color'), (44, 'Ascenso'), (52, 'Bucle')]],
            automationEvents={v: len(events) for v, events in self.automation.items()})
        return m


def riff(s, bar, root, second=False, lift=0, piano=True):
    r = pitch(root)
    shape = ([(0, 0, .4), (.5, 0, .4), (1, 0, .4), (1.5, 3, .9), (2.5, 1, .4), (3, 0, .4), (3.5, -5, .4)] if second
             else [(0, 0, .4), (.5, 0, .4), (1, 0, .4), (1.5, 1, .9), (2.5, 0, .4), (3, -1, .4), (3.5, 0, .4)])
    for off, iv, dur in shape:
        v = max(1, min(127, (106 if off in (0, 1.5, 3) else 88) + lift))
        s.note('bass', bar * 4 + off, dur, r + iv, v)
        if piano and off in (0, 1.5, 3):
            s.note('piano', bar * 4 + off, dur, r + iv + 12, max(1, v - 18))
            s.note('piano', bar * 4 + off, dur, r + iv, max(1, v - 22))


def kit(s, bar, fill=False, crash=False, energy=0, toms=True):
    grid(s, 'kick', bar, 'x.....x.....x...' if not fill else 'x.....x.....x.x.', (110 + energy, 102 + energy))
    grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......X.xX', (106 + energy, 98 + energy, 62), seconds=.22)
    grid(s, 'hat', bar, 'X.x.x.X.x.x.X.x.', (80, 54), seconds=.08)
    if toms:
        grid(s, 'tom', bar, '......x.....x...' if not fill else '......x...x.x.x.', (86, 80), note=55, seconds=.16)
    if fill:
        for off, p, v in [(3.25, 64, 90), (3.75, 50, 108)]:
            s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
    if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 96)


def hold(s, bar, voicing, level=66, swell=None):
    t = bar * 4
    for n, p in enumerate(voicing.split()):
        s.note('choir', t + .02, 3.7, p, level - n * 4)
    if swell: s.curve('choir', 11, [(t + a, v) for a, v in swell])


def stabs(s, bar, voicing, level=70):
    for off in (1.5, 3):
        for n, p in enumerate(voicing.split()[1:]):
            s.note('organ', bar * 4 + off, .35, pitch(p) + 12, level - n * 6)


def tread(s, bar, text, level=98, octave=True):
    s.phrase('horn', bar, text, level, .92)
    if octave: s.phrase('strlead', bar, text, level - 8, .95, transpose=12)


def boss():
    s = LaMancha()
    s.control('choir', 0, 11, 100); s.control('lead', 0, 11, 112); s.control('horn', 0, 11, 112); s.control('strlead', 0, 11, 112)

    # Summons: two cluster swells over timpani rolls, then the riff alone with toms.
    for b, top in [(0, 'Ab3'), (1, 'A3')]:
        for n in range(8):
            s.note('timpani', b * 4 + n * .5, .4, 'D2', 66 + n * 7)
        for p in ['D3', top, 'D4']:
            s.note('choir', b * 4, 3.8, p, 76)
        s.curve('choir', 11, [(b * 4, 64), (b * 4 + 3.5, 127), (b * 4 + 3.9, 84)])
        s.note('piano', b * 4, 3.5, 'D2', 96); s.note('piano', b * 4, 3.5, 'D1', 90)
    for b in (2, 3):
        riff(s, b, 'D2', b == 3)
        grid(s, 'tom', b, 'x..x..x.x..x..x.', (96, 84), note=55, seconds=.16)
        grid(s, 'hat', b, 'X.x.x.X.x.x.X.x.', (76 if b == 2 else 82, 52), seconds=.08)
        if b == 3:
            grid(s, 'kick', b, 'x.....x.....x.x.', (104, 98))
            for off, p, v in [(3.25, 64, 90), (3.75, 50, 108)]:
                s.note('tom', b * 4 + off, .16 * s.bpm / 60, p, v)
    s.note('crash', 8, 1.6 * s.bpm / 60, 60, 88)

    for k in range(48):
        bar = 4 + k; j = k % 8; t = bar * 4
        if k < 16:
            # A and A′: the tread over the pedal; the trumpet fights in A′.
            second = k >= 8
            riff(s, bar, ROOTS[j], j % 2 == 1, 4 if second else 0)
            kit(s, bar, fill=j == 7, crash=j == 0)
            tread(s, bar, INK[j], 102 if second else 98)
            hold(s, bar, CHOIR[j], swell=[(0, 96), (2, 112), (3.9, 96)] if j in (0, 4) else None)
            stabs(s, bar, CHOIR[j])
            if second and j in FIGHT:
                s.phrase('lead', bar, FIGHT[j], 104, .86)
        elif k < 24:
            # B: the ink spreads. The riff climbs, the motif with it.
            riff(s, bar, SPREAD_ROOTS[j], j % 2 == 1, 6)
            kit(s, bar, fill=j in (3, 7), crash=j == 0, energy=2)
            tread(s, bar, SPREAD[j], 104)
            hold(s, bar, SPREAD_CHOIR[j], 70, swell=[(0, 100), (3, 120), (3.9, 104)] if j % 2 == 0 else None)
            stabs(s, bar, SPREAD_CHOIR[j], 74)
            if j in SPREAD_FIGHT:
                s.phrase('lead', bar, SPREAD_FIGHT[j], 100, .86)
        elif k < 32:
            # C: the contour alone. A whispered riff, the line on piano; then the drops.
            riff(s, bar, ROOTS[j], j % 2 == 1, -24, piano=False)
            grid(s, 'hat', bar, 'x.x.x.x.x.x.x.x.', (58, 42), seconds=.08)
            grid(s, 'tom', bar, '......x.....x...', (62, 56), note=55, seconds=.16)
            if j >= 6:
                grid(s, 'kick', bar, 'x.....x.....x...', (96, 88))
                grid(s, 'snare', bar, '....x.......x...' if j == 6 else '....x.......X.xX', (90, 84, 60), seconds=.22)
            if j == 7:
                for off, p, v in [(3.25, 64, 90), (3.75, 50, 108)]:
                    s.note('tom', t + off, .16 * s.bpm / 60, p, v)
            s.phrase('piano', bar, INK[j], 84, .95)
            s.phrase('piano', bar, INK[j], 70, .95, transpose=-12)
            hold(s, bar, CHOIR[j], 52, swell=[(0, 80), (4, 96), (7.9, 82)] if j % 2 == 0 else None)
            if j >= 4:
                s.phrase('marimba', bar, DROPS_SOFT[j - 4], 82, .7)
                if j == 7: s.phrase('marimba', bar, DROPS_SOFT[3], 70, .7, transpose=12)
        elif k < 40:
            # D: line and colour together, at full weight.
            riff(s, bar, ROOTS[j], j % 2 == 1, 8)
            kit(s, bar, fill=j == 7, crash=j == 0, energy=4)
            tread(s, bar, INK[j], 104)
            s.phrase('lead', bar, SONG[j], 108, .86)
            hold(s, bar, CHOIR[j], 72, swell=[(0, 104), (2, 118), (3.9, 104)] if j in (0, 4) else None)
            stabs(s, bar, CHOIR[j], 76)
            if j == 6:
                # The peak of the song gets its one upward settling gesture.
                s.control('lead', t + 1.5, -1, -520); s.curve('lead', -1, [(t + 1.5, -520), (t + 1.62, 0)])
        else:
            # E: ascents, the high sigh, and the roll back into the loop.
            riff(s, bar, RISE_ROOTS[j], j % 2 == 1, 8)
            if j < 6:
                kit(s, bar, fill=j == 3, crash=j in (0, 4), energy=4, toms=j < 4)
            elif j == 6:
                grid(s, 'kick', bar, 'x...x...x...x...', (112, 108))
                grid(s, 'snare', bar, 'X.x.X.x.X.x.X.x.', (102, 88), seconds=.18)
                grid(s, 'hat', bar, 'X.x.X.x.X.x.X.x.', (80, 56), seconds=.08)
            else:
                grid(s, 'kick', bar, 'x...x...x...x...', (114, 110))
                for n in range(16):
                    s.note('snare', t + n / 4, .24, 60, 82 + round(n * 2.5))
                grid(s, 'hat', bar, 'X.x.X.x.X.x.X.x.', (82, 58), seconds=.08)
                for off, p, v in [(3, 64, 94), (3.5, 50, 106)]:
                    s.note('tom', t + off, .16 * s.bpm / 60, p, v)
            if j == 4:
                s.phrase('strlead', bar, RISE[j], 100, .95)
                s.phrase('horn', bar, RISE[j], 100, .92, transpose=-12)
            else:
                tread(s, bar, RISE[j], 104)
            hold(s, bar, RISE_CHOIR[j], 74, swell=[(0, 104), (4, 120), (7.9, 110)] if j in (0, 2, 4) else
                 ([(0, 112), (3.9, 127)] if j == 6 else None))
            stabs(s, bar, RISE_CHOIR[j], 78)
            if j in RISE_FIGHT:
                s.phrase('lead', bar, RISE_FIGHT[j], 110, .84)
                s.phrase('marimba', bar, RISE_FIGHT[j], 90, .7, transpose=12)
            if j == 0:
                for voice in ('horn', 'strlead', 'lead'):
                    s.curve(voice, 11, [(t, 108), (t + 24, 118), (t + 31.9, 127)])
    end = (s.intro + s.bars) * s.meter
    for voice in ('horn', 'strlead', 'lead'):
        s.control(voice, end - .01, 11, 112)
    s.control('choir', end - .01, 11, 100)
    s.repeat()
    return s
