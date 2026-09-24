"""Los Contrarios — vals de las manchas. The battle against Moho, Moratón and Óxido, September 2026 (v2).

A grotesque waltz: the stains are what nobody wanted in the picture, so the
music is a carousel gone sour, not a mirror of «Tres gotas».

  intro  A music box plays their tune in D major, sweetly, and winds down
         out of tune: the pretty carousel rots into the minor.
  bass   A chromatic lament (D C# C B Bb A) under the oom-pah-pah: the old
         sign of mourning, here for the colours nobody kept.
  tune   Opens with three heavy downbeats on one note: the three drops,
         robbed of their bounce. The Prism D-F-E-A is inside it, rotted:
         D, then F, then E sagging to Eb, and the A falls an octave.
  A      Moho (oboe) states it over horn and pizzicato oom-pah-pah.
  A′     Moratón (sax, with scoops) takes it; Moho plays it INVERTED against
         it at the same time: the opposites, literally in counterpoint.
  B      The heroes' hook (D D D F | E. D C) breaks into the waltz as a
         hemiola, three twos across two bars, on Óxido's out-of-tune piano;
         then the three voices chase the tune in canon.
  C      The carousel spins faster in eighths until the three voices close
         on one low D with the choir: together they make black.

Every pitch, duration, velocity and expression gesture is written here.
"""
from compose_score import Score, pitch
from battle_tres_gotas import grid

# Lament bass, one chord per bar: (bass note, pah chord).
LAMENT = [('D2', 'F3 A3 D4'), ('C#2', 'E3 G3 A3'), ('C2', 'F3 A3 D4'), ('B1', 'F3 G#3 D4'),
          ('Bb1', 'F3 A3 D4'), ('A1', 'E3 G3 C#4'), ('A1', 'Eb3 G3 C#4'), ('D2', 'F3 A3 D4')]
LAMENT2 = [('D2', 'F3 A3 D4'), ('C#2', 'E3 G3 A3'), ('C2', 'F3 A3 E4'), ('B1', 'F3 G#3 D4'),
           ('Bb1', 'D3 G3 Bb3'), ('G1', 'Bb2 E3 G3'), ('A1', 'E3 G3 C#4'), ('D2', 'F3 A3 D4')]
# The tune: 16 bars of 3/4. Antecedent ends on A7, consequent climbs and lands on D.
TUNE = ['D5:1 D5:1 D5:1', 'F5:2.5 E5:.5', 'Eb5:1 D5:1 C#5:1', 'A4:3',
        'Bb4:1 A4:1 G#4:1', 'A4:1.5 C#5:.5 E5:1', 'G5:1 F5:1 Bb4:1', 'E5:1 C#5:1 A4:1',
        'D5:1 D5:1 D5:1', 'F5:2.5 E5:.5', 'Eb5:1 D5:1 C#5:1', 'F5:1 G5:1 A5:1',
        'Bb5:2 A5:1', 'G5:1 F5:1 E5:1', 'G5:1.5 F5:.5 E5:.5 C#5:.5', 'D5:3']
MUSIC_BOX = ['D6:1 D6:1 D6:1', 'F#6:2.5 E6:.5', 'E6:1 D6:1 C#6:1', 'A5:3']
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']


def invert(text, axis='D5'):
    """The tune mirrored around D5: each interval turned upside down."""
    a, out = pitch(axis), []
    for tok in text.split():
        p, d = tok.split(':')
        if p == '-': out.append(tok); continue
        q = 2 * a - pitch(p)
        out.append(f'{NAMES[q % 12]}{q // 12 - 1}:{d}')
    return ' '.join(out)


# B: the heroes' hook as a hemiola, three half-bar groups across two bars of 3/4 (2+2+2 against 3+3).
HEMIOLA = [('Bb1', 'D5:.5 D5:.5 D5:.5 F5:.5 E5:.75 D5:.25', 'D3 F3 Bb3'), ('A1', 'C5:2 -:1', 'C#3 E3 A3'),
           ('Bb1', 'F5:.5 F5:.5 F5:.5 A5:.5 G5:.75 F5:.25', 'D3 F3 Bb3'), ('A1', 'E5:2 -:1', 'C#3 G3 A3'),
           ('G1', 'Bb4:.5 Bb4:.5 Bb4:.5 D5:.5 C5:.75 Bb4:.25', 'D3 G3 Bb3'), ('A1', 'A4:2 -:1', 'C#3 E3 G3'),
           ('Eb2', 'G4:.5 G4:.5 G4:.5 Bb4:.5 A4:.75 G4:.25', 'Eb3 G3 Bb3'), ('A1', 'C#5:2 -:1', 'C#3 E3 G3')]
RUNS = ['D5 F5 E5 Eb5 D5 C#5', 'E5 G5 F5 E5 Eb5 D5', 'F5 A5 G5 F5 E5 Eb5', 'G#5 B5 A5 G#5 G5 F5', 'Bb5 A5 G#5 G5 F#5 F5', 'E5 Eb5 D5 C#5 C5 B4']


class Contrarios(Score):
    def __init__(self):
        super().__init__('contrarios', 'Los Contrarios', 176, 3, 4, 56, 'D minor waltz over a chromatic lament; music box in D major')
        self.record_stems = True
        # CT 2011: program, gain, pan, echo send, optional bank.
        self.palette = {
            'oboe': (69, .95, 52, .14), 'sax': (65, .95, 70, .12), 'piano': (0, .78, 88, .10), 'box': (46, .62, 64, .22),
            'horn': (60, .80, 58, .06), 'pizz': (45, .62, 40, .05), 'organ': (17, .36, 76, .08), 'choir': (52, .72, 64, .20),
            'timpani': (47, .60, 60, .06), 'kick': (125, .60, 64, 0), 'hat': (127, .70, 82, 0), 'tom': (116, .40, 46, .06),
            'crash': (123, .55, 50, .10, 1),
        }
        self.echo_taps = {
            'oboe': [(.094, .5, True)], 'sax': [(.094, .6, True), (.188, .3, False)], 'box': [(.17, .6, True), (.34, .3, False)],
            'piano': [(.12, .5, True)], 'choir': [(.188, .5, True)],
        }

    def metadata(self):
        m = super().metadata()
        bar = 3 * 60 / self.bpm
        m.update(edition='contrarios-v2-vals',
            form="intro:4 music box in D major winding down; A:16 oboe tune over lament oom-pah-pah; A′:16 sax tune + oboe inversion; B:16 heroes' hook as hemiola on detuned piano, then canon; C:8 carousel speeds up, unison D with choir",
            motif='Three heavy downbeats on D (the drops robbed of their bounce), then F, E sagging to Eb, A falling: the Prism rotted. Lament bass D-C#-C-B-Bb-A.',
            performance='Written durations and velocities; sax scoops into long notes; the piano is detuned by a constant bend; the music box winds down with a falling bend.',
            listeningMarks=[{'seconds': round(b * bar, 3), 'label': label} for b, label in
                            [(0, 'Caja de música'), (4, 'Moho'), (20, 'Moratón y el tema al revés'), (36, 'Tres gotas a destiempo'),
                             (44, 'Canon'), (52, 'El carrusel se acelera'), (58, 'Negro'), (60, 'Bucle')]],
            automationEvents={v: len(events) for v, events in self.automation.items()})
        return m


def oompah(s, bar, bass, chord, level=0, busy=False):
    t = bar * 3
    s.note('horn', t, .9, bass, 92 + level)
    for beat in (1, 2):
        for j, p in enumerate(chord.split()):
            s.note('pizz', t + beat, .45, p, 70 + level - j * 4)
            s.note('organ', t + beat + .02, .7, p, 52 + level - j * 4)
    grid(s, 'kick', bar, 'x.....' if not busy else 'x...x.', (90 + level, 80 + level), seconds=.15)
    grid(s, 'hat', bar, '..x.x.' if not busy else '.xx.xx', (54, 44), seconds=.06)


def scoop(s, voice, t):
    """Moratón slides into the note from below, like ink seeping into felt."""
    s.control(voice, t, -1, -1400)
    s.curve(voice, -1, [(t, -1400), (t + .2, 0)])


def contrarios():
    s = Contrarios()
    s.control('piano', 0, -1, -700)  # Óxido's piano is out of tune all the way through

    # Intro: the music box in D major, winding down and out of tune on its last note.
    for b in range(4):
        s.phrase('box', b, MUSIC_BOX[b], 70 - b * 3, .95)
        if b < 3: s.note('box', b * 3 + 1, .5, 'A4', 44); s.note('box', b * 3 + 2, .5, 'F#4', 40)
    s.control('box', 9, -1, 0); s.curve('box', -1, [(9, 0), (11.8, -3800)])
    s.control('box', 11.95, -1, 0)
    s.note('timpani', 11, .45, 'A1', 70); s.note('timpani', 11.5, .45, 'A1', 84)

    for k in range(56):
        bar = 4 + k
        t = bar * 3
        if k < 16:
            # A: Moho's oboe over the lament.
            bass, chord = (LAMENT if k < 8 else LAMENT2)[k % 8]
            oompah(s, bar, bass, chord)
            s.phrase('oboe', bar, TUNE[k], 94 if k % 8 else 100, .9)
            if k in (3, 7, 11): s.note('timpani', t, 1.5, 'D2' if k != 7 else 'A1', 80)
        elif k < 32:
            # A′: Moratón's sax takes the tune; Moho answers with the tune upside down.
            j = k - 16
            bass, chord = (LAMENT if j < 8 else LAMENT2)[j % 8]
            oompah(s, bar, bass, chord, 4)
            s.phrase('sax', bar, TUNE[j], 98, .9, -12)
            if float(TUNE[j].split()[0].split(':')[1]) >= 2: scoop(s, 'sax', t)
            s.phrase('oboe', bar, invert(TUNE[j]), 78, .85)
            if j == 0: s.note('crash', t, 1.2, 60, 80)
        elif k < 48:
            j = k - 32
            if j < 8:
                # B: the heroes' hook breaks in as a hemiola on the out-of-tune piano; the kit follows the twos.
                bass, call, chord = HEMIOLA[j]
                s.note('horn', t, 1.8 if j % 2 == 0 else 2.8, bass, 94)
                s.phrase('piano', bar, call, 90, .85)
                for off in ((0, 1, 2) if j % 2 == 0 else (1,)):
                    for n, p in enumerate(chord.split()): s.note('organ', t + off + .02, .8, p, 58 - n * 4)
                grid(s, 'kick', bar, 'x...x.' if j % 2 == 0 else '..x...', (96, 90), seconds=.15)
                grid(s, 'hat', bar, 'x.x.x.', (58, 48), seconds=.06)
                if j % 2 == 1: s.phrase('oboe', bar, '-:2 D5:.33 C#5:.33 C5:.34', 70, .8)
            else:
                # the three chase the tune in canon, one bar apart: oboe, sax, then piano.
                jj = j - 8
                bass, chord = LAMENT[jj]
                oompah(s, bar, bass, chord, 6)
                s.phrase('oboe', bar, TUNE[jj], 92, .88)
                if jj >= 1: s.phrase('sax', bar, TUNE[jj - 1], 88, .88, -12)
                if jj >= 2: s.phrase('piano', bar, TUNE[jj - 2], 84, .85, -12)
                if jj == 0: s.note('crash', t, 1.2, 60, 84)
        else:
            j = k - 48
            if j < 6:
                # C: the carousel speeds up in eighths; the lament presses down.
                bass, chord = LAMENT[j]
                oompah(s, bar, bass, chord, 8, busy=True)
                for n, p in enumerate(RUNS[j].split()):
                    for voice, tr, v in (('oboe', 0, 90), ('sax', -12, 86), ('piano', -12, 80)):
                        s.note(voice, t + n * .5, .42, pitch(p) + tr, v + n * 2)
                s.note('timpani', t, .9, 'A1' if j >= 4 else 'D2', 84 + j * 3)
                if j >= 4:
                    for n in range(6): s.note('tom', t + n * .5, .2, 45 + n * 2, 80 + n * 4)
            elif j == 6:
                # together they make black: one D in three octaves, the choir on D with Eb rubbing against it
                for voice, p, v in (('oboe', 'D5', 104), ('sax', 'D4', 104), ('piano', 'D3', 100), ('horn', 'D2', 104)):
                    s.note(voice, t, 2.8, p, v)
                for n, p in enumerate(['D3', 'A3', 'D4', 'Eb4']): s.note('choir', t + .02, 2.9, p, 92 - n * 4)
                s.curve('choir', 11, [(t, 90), (t + 1.5, 127), (t + 2.9, 100)])
                s.note('crash', t, 2.8, 60, 104); s.note('timpani', t, 2.8, 'D2', 110)
            else:
                # a breath, then the waltz pickup back to the top: A and C# in the bass
                s.note('horn', t + 1, .9, 'A1', 90); s.note('horn', t + 2, .9, 'C#2', 94)
                s.note('pizz', t + 2, .45, 'A3', 70); s.note('timpani', t + 2, .5, 'A1', 90)
    s.repeat()
    return s
