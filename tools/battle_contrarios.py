"""Los Contrarios — the battle against Moho, Moratón and Óxido, September 2026.

The three are the drops' opposites, so the music is «Tres gotas» turned inside
out. Same tempo (160), same 32-bar form, same rhythms, mirrored contours:

  hook     three hammered eighths, a leap DOWN a third, a dotted RISE
           (D D D Bb | C. D Eb) instead of (D D D F | E. D C)
  Prism    the leitmotif D-F-E-A inverted and dirtied: D-Bb-C-G
  mode     D locrian colours: Eb rots our E, Ab (the tritone) rots our A
  voices   sax against Carmín's trumpet, distorted guitar against Ámbar's
           marimba, a square lead against Añil's flute
  riff     root, root, octave DOWN, tritone, then a chromatic crawl upwards

  A   Moho alone: the sax states the mirrored song over the riff.
  A′  Moratón answers the drops an octave down in the gaps; Óxido doubles the
      consequent a fourth below (cold fourths where Añil sang warm thirds).
  B   The dirty mix: they mock the heroes' own hook, tinted locrian, over a
      pedal with the ink's Eb neighbour; the three voices close onto one D:
      together they make black.
  C   Riff and drums with the mirrored drops as ostinato, then a four-bar
      climb DOWN (D, Bb, Ab, A7) where all three shout the drops in unison.

Every pitch, duration, velocity and expression gesture is written here.
"""
from compose_score import Score, pitch
from battle_tres_gotas import grid

RIFF = {
    'Dm':   [('D2', 0), ('D2', .5), ('D1', 1.5), ('Ab1', 2), ('Bb1', 3), ('C2', 3.5)],
    'Dm2':  [('D2', 0), ('D2', .5), ('D1', 1.5), ('Ab1', 2), ('A1', 2.5), ('Bb1', 3), ('B1', 3.5)],
    'Bb':   [('Bb1', 0), ('Bb1', .5), ('Bb2', 1.5), ('E2', 2), ('F2', 3), ('A1', 3.5)],
    'Ab':   [('Ab1', 0), ('Ab1', .5), ('Ab2', 1.5), ('D2', 2), ('Eb2', 3), ('G1', 3.5)],
    'Eb':   [('Eb2', 0), ('Eb2', .5), ('Eb1', 1.5), ('A1', 2), ('Bb1', 3), ('D2', 3.5)],
    'A7':   [('A1', 0), ('A1', .5), ('A2', 1.5), ('Eb2', 2), ('G2', 2.5), ('A2', 3), ('C#2', 3.5)],
    'Dend': [('D2', 0, .9), ('D2', 1), ('D1', 1.5), ('Ab1', 2), ('D2', 3, .9)],
}
CHORD = {'Dm': 'D4 F4 A4', 'Dm2': 'D4 F4 Ab4', 'Bb': 'D4 F4 Bb4', 'Ab': 'C4 Eb4 Ab4', 'Eb': 'Eb4 G4 Bb4',
         'A7': 'C#4 E4 G4', 'Dend': 'D4 F4 Ab4'}
SONG = ['Dm', 'Dm2', 'Bb', 'Ab', 'Dm', 'Dm2', 'Eb', 'A7']

# The mirrored hook: identical rhythms to Tres gotas, every contour reversed.
HOOK_A = ['D5:.5 D5:.5 D5:.5 Bb4:.5 C5:.75 D5:.25 Eb5:1',
          'D5:1.5 Ab4:.5 Bb4:.5 C5:.5 D5:1',
          'Bb4:.5 Bb4:.5 Bb4:.5 G4:.5 A4:.75 Bb4:.25 C5:1',
          'Eb5:1 D5:.5 C5:.5 Ab4:2',
          'D5:.5 D5:.5 D5:.5 Bb4:.5 C5:.75 D5:.25 Eb5:1',
          'D5:1.5 Ab4:.5 Bb4:.5 C5:.5 D5:.5 Eb5:.5',
          'G5:.5 G5:.5 G5:.5 Eb5:.5 F5:.75 G5:.25 Ab5:1',
          'G5:.5 F5:.5 Eb5:1 C#5:1.5 -:.5']
HOOK_B = HOOK_A[:6] + ['G5:.5 G5:.5 G5:.5 Eb5:.5 F5:.75 G5:.25 Ab5:.5 G5:.5',
                       'F5:.5 Eb5:.5 D5:2.5 -:.5']
PRISM_INV = 'D5:1.5 Bb4:.5 C5:1 G4:.75 -:.25'   # the leitmotif turned upside down

# B: the heroes' own hook, stolen and tinted locrian, over a descending bed.
DIRTY = [('Gm', 'G1', 'D4 G4 Bb4'), ('Eb', 'Eb2', 'Eb4 G4 Bb4'), ('Ab', 'Ab1', 'C4 Eb4 Ab4'), ('Bb', 'Bb1', 'D4 F4 Bb4'),
         ('Gm', 'G1', 'D4 G4 Bb4'), ('Eb', 'Eb2', 'Eb4 G4 Bb4'), ('Ab', 'Ab1', 'C4 Eb4 Ab4'), ('D', 'D2', 'D3 D4 D5')]
MOCK = ['D5:.5 D5:.5 D5:.5 F5:.5 Eb5:.75 D5:.25 C5:1',
        'Bb4:1.5 G4:.5 Bb4:.5 C5:.5 D5:1',
        'C5:.5 C5:.5 C5:.5 Eb5:.5 D5:.75 C5:.25 Bb4:1',
        'D5:1 C5:.5 Bb4:.5 Ab4:2',
        'G5:.5 G5:.5 G5:.5 Bb5:.5 Ab5:.75 G5:.25 F5:1',
        'Eb5:1.5 C5:.5 D5:.5 Eb5:.5 F5:1',
        'Ab5:.5 Ab5:.5 Ab5:.5 C6:.5 Bb5:.75 Ab5:.25 G5:1',
        'D5:3.5 -:.5']
# C: the mirrored drops as ostinato, then the climb that goes down.
OSTINATO = ['-:2 D5:.25 D5:.25 D5:.25 Bb4:.25 C5:.5 D5:.5',
            '-:2 Ab5:.25 Ab5:.25 Ab5:.25 F5:.25 G5:.5 Ab5:.5',
            '-:2 D5:.25 D5:.25 D5:.25 Bb4:.25 C5:.5 D5:.5',
            '-:2 Ab5:.25 Ab5:.25 Ab5:.25 F5:.25 G5:.25 Ab5:.25 Bb5:.25 C#6:.25']
DESCENT = [('Dm', 'D5:.5 D5:.5 D5:.5 -:2.5'),
           ('Bb', 'Bb4:.5 Bb4:.5 Bb4:.5 -:2.5'),
           ('Ab', 'Ab4:.5 Ab4:.5 Ab4:.5 -:.5 Ab4:.5 Ab4:.5 Ab4:.5 -:.5'),
           ('A7', 'A4:.5 A4:.5 A4:.5 F4:.5 G4:.5 A4:.5 Bb4:.5 C#5:.5')]


class Contrarios(Score):
    def __init__(self):
        super().__init__('contrarios', 'Los Contrarios', 160, 4, 2, 32, 'D locrian colours over D minor; mirrored Tres gotas')
        self.record_stems = True
        # CT 2011: program, gain, pan, echo send, optional bank. Each Contrario opposes a drop's instrument.
        self.palette = {
            'sax': (65, 1.05, 54, .12), 'guit': (30, .52, 84, .10), 'square': (80, .42, 72, .16),
            'organ': (17, .34, 40, .08), 'choir': (52, .70, 64, .20), 'bass': (38, .66, 64, 0),
            'timpani': (47, .55, 58, .06),
            'kick': (125, .76, 64, 0), 'snare': (124, .68, 66, .04), 'hat': (127, .85, 82, 0),
            'open_hat': (126, .55, 82, 0), 'tom': (116, .40, 46, .06), 'crash': (123, .62, 50, .10, 1),
        }
        self.echo_taps = {
            'sax': [(.094, .6, True), (.188, .3, False)], 'guit': [(.075, .5, True)],
            'square': [(.125, .7, True), (.25, .35, False)], 'choir': [(.188, .5, True)], 'snare': [(.047, .6, True)],
        }

    def metadata(self):
        m = super().metadata()
        bar = 4 * 60 / self.bpm
        m.update(edition='contrarios-v1',
            form='riff:2; A:8 sax song (mirrored hook); A′:8 guitar answers, square in fourths; B:8 the stolen hook, locrian, closing on one D; C:8 riff breakdown + climb down',
            motif='Tres gotas mirrored: three hammered eighths, leap DOWN a third, dotted RISE (D D D Bb | C. D Eb). Prism inverted: D-Bb-C-G.',
            performance='Written attacks and durations; CC11 swells through the unison and the descent; velocities per note.',
            listeningMarks=[{'seconds': round(b * bar, 3), 'label': label} for b, label in
                            [(0, 'Riff invertido'), (2, 'Moho'), (10, 'Moratón y Óxido'), (18, 'La mezcla sucia'),
                             (25, 'Negro'), (26, 'A pulso'), (30, 'Bajada'), (34, 'Bucle')]],
            automationEvents={v: len(events) for v, events in self.automation.items()})
        return m


def riff(s, bar, name, lift=0):
    for entry in RIFF[name]:
        p, off = entry[0], entry[1]
        dur = entry[2] if len(entry) > 2 else .45
        v = 106 if off == 0 else 96 if off in (1.5, 2) else 86
        s.note('bass', bar * 4 + off, dur, p, min(127, v + lift))


def pedal(s, bar, root, lift=0):
    """B's bass: a pedal that keeps slipping to its chromatic upper neighbour (the ink's Eb)."""
    r = pitch(root)
    for off, p, dur, v in [(0, r, 1.4, 100), (1.5, r + 1, .45, 88), (2, r, .9, 94), (3, r + 1, .45, 86), (3.5, r, .45, 90)]:
        s.note('bass', bar * 4 + off, dur, p, v + lift)


def kit(s, bar, fill=False, crash=False, half=False, energy=0):
    # The kit is the drops' kit turned over: the kick pushes the offbeats, the snare stays on two and four.
    if half:
        grid(s, 'kick', bar, 'x.....x...x.....', (104, 94))
        grid(s, 'snare', bar, '........X.......', (100, 92), seconds=.22)
        grid(s, 'hat', bar, 'x...x...x...x...', (64, 48), seconds=.08)
        return
    grid(s, 'kick', bar, 'x..x..x...x..x..' if not fill else 'x..x..x...x.x.x.', (108 + energy, 98 + energy))
    grid(s, 'snare', bar, '....X.......X...' if not fill else '....X.......XxXx', (104 + energy, 94 + energy, 60), seconds=.22)
    grid(s, 'hat', bar, '.xX..xX..xX..xX.', (76, 52), seconds=.08)
    if fill:
        for off, p, v in [(3, 50, 84), (3.25, 55, 90), (3.5, 60, 98), (3.75, 64, 104)]:   # toms climb where ours fell
            s.note('tom', bar * 4 + off, .16 * s.bpm / 60, p, v)
    if crash: s.note('crash', bar * 4, 1.6 * s.bpm / 60, 60, 92)


def stabs(s, bar, name, late=False, level=0):
    for j, p in enumerate(CHORD[name].split()):
        s.note('organ', bar * 4 + (1.5 if late else .5), 1.2, p, 60 + level - j * 4)


def contrarios():
    s = Contrarios()
    for voice in ('sax', 'square'):
        s.control(voice, 0, 11, 112)

    # Two riff bars; the inverted Prism is called by Óxido over them.
    riff(s, 0, 'Dm'); grid(s, 'hat', 0, '.xX..xX..xX..xX.', (72, 50), seconds=.08); grid(s, 'kick', 0, 'x..x..x...x..x..', (100, 92))
    s.phrase('square', 0, PRISM_INV, 80, .9)
    riff(s, 1, 'Dm2'); kit(s, 1, fill=True)
    s.note('timpani', 4 + 3, 1, 'D2', 96); s.note('timpani', 4 + 3.5, .5, 'Ab1', 100)

    for k in range(32):
        bar = 2 + k
        t = bar * 4
        if k < 8:
            # A: Moho alone, the mirrored song on sax.
            name = SONG[k]
            riff(s, bar, name); kit(s, bar, fill=k == 7, crash=k == 0)
            s.phrase('sax', bar, HOOK_A[k], 98, .86); stabs(s, bar, name, late=k % 2 == 1)
        elif k < 16:
            # A′: Moratón answers an octave DOWN in the gaps; Óxido doubles the consequent a fourth below.
            j = k - 8
            name = SONG[j] if j < 7 else 'Dend'
            riff(s, bar, name, 3); kit(s, bar, fill=j == 3, crash=j == 0)
            s.phrase('sax', bar, HOOK_B[j], 100, .86); stabs(s, bar, name, late=j % 2 == 1, level=2)
            if j in (1, 5):
                s.phrase('guit', bar, '-:2 D4:.25 D4:.25 D4:.25 Bb3:.25 C4:.5 -:.5', 86, .7)
            if j == 3:
                s.phrase('guit', bar, '-:2 Ab3:.25 Ab3:.25 Ab3:.25 F3:.25 G3:.5 Ab3:.5', 82, .7)
            if j >= 4:
                s.phrase('square', bar, HOOK_B[j], 80, .86, -5)
        elif k < 24:
            # B: the stolen hook on guitar, sax underneath, the three closing onto one D.
            j = k - 16
            name, root, voicing = DIRTY[j]
            if j < 7:
                pedal(s, bar, root)
                kit(s, bar, half=j < 6, fill=j == 6, crash=j == 0)
            else:
                for off, v in [(0, 110), (1, 96), (2, 104), (3, 100)]:
                    s.note('bass', t + off, .9, 'D2', v)
                s.note('crash', t, 3.9, 60, 100); s.note('timpani', t, 3.5, 'D2', 104)  # rings until the next bar's crash, never over it
            s.phrase('guit', bar, MOCK[j], 94, .88)
            if j in (4, 5, 6):
                s.phrase('sax', bar, MOCK[j], 84, .86, -12)
            if j in (1, 3, 5):
                s.phrase('square', bar, PRISM_INV, 70, .9, -12)
            for n, p in enumerate(voicing.split()):
                s.note('choir', t + .02, 3.7, p, (74 if j < 7 else 96) - n * 4)
            if j == 7:
                # Together they make black: sax, guitar and square land on the same D.
                for voice in ('sax', 'square'):
                    s.phrase(voice, bar, 'D5:3.5 -:.5', 104)
                s.curve('choir', 11, [(t, 90), (t + 2, 127), (t + 3.9, 100)])
                s.curve('sax', 11, [(t, 100), (t + 2.5, 127), (t + 3.9, 112)])
            elif j in (0, 2, 4):
                s.curve('choir', 11, [(t, 88), (t + 4, 104), (t + 7.9, 88)])
        else:
            # C: riff and drums with the mirrored drops as ostinato, then the descent.
            j = k - 24
            if j < 4:
                riff(s, bar, 'Dm' if j % 2 == 0 else 'Dm2', 4)
                kit(s, bar, fill=j == 3, crash=j == 0, energy=2)
                s.phrase('guit', bar, OSTINATO[j], 88, .7)
                for off, p in [(1.5, 'D4'), (1.5, 'Ab4'), (3.5, 'D4'), (3.5, 'Ab4')]:
                    s.note('organ', t + off, .3, p, 66)
            else:
                name, call = DESCENT[j - 4]
                riff(s, bar, name, 6)
                stabs(s, bar, name, level=4)
                for voice, lift, transpose in [('sax', 6, 0), ('square', 2, 0), ('guit', -2, -12)]:
                    s.phrase(voice, bar, call, 100 + lift, .8 if voice != 'guit' else .7, transpose)
                if j == 4:
                    for voice in ('sax', 'square'):
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
                    for off, p, v in [(3, 50, 92), (3.5, 64, 104)]:
                        s.note('tom', t + off, .16 * s.bpm / 60, p, v)
    # The descent's swell must not colour the next loop.
    for voice in ('sax', 'square'):
        s.control(voice, 34 * 4 - .01, 11, 112)
    s.repeat()
    return s
