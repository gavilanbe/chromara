"""Que no se apague el color — Chromara's normal battle, September 2026.

An eight-bar song over a two-bar bass riff. The three quick pigment notes open
onto a held A; its answer comes down to earth. Trumpet, marimba and flute acquire
their identities separately before sharing the return. Every melodic attack,
release and continuous expression gesture is authored here, without randomness.
"""
from compose_score import Score, pitch


# Beat, pitch, sounding duration, attack. Durations deliberately cross bar lines.
# A four-beat A is the hook's destination; the following descent is its answer.
HOOK = [
    (0,'D5',.40,98), (.5,'F5',.19,84), (.75,'E5',.20,81), (1,'A5',3.88,99),
    (5,'G5',.45,88), (5.5,'F5',.43,82), (6,'E5',.67,78), (6.75,'D5',.48,86),
    (8,'G5',.43,93), (8.5,'B5',.18,86), (8.75,'A5',.19,82), (9,'E5',1.78,91),
    (11,'D5',.43,76), (11.5,'E5',.43,81), (12,'F5',1.39,90),
    (13.5,'E5',.42,77), (14,'D5',1.20,84),
    (16,'D5',.40,98), (16.5,'F5',.19,84), (16.75,'E5',.20,81), (17,'A5',3.20,99),
    (20.5,'B5',.43,91), (21,'A5',.44,85), (21.5,'G5',.43,80), (22,'E5',1.18,83),
    (24,'G5',.42,88), (24.5,'A5',.43,94), (25,'C6',1.37,101),
    (26.5,'B5',.43,87), (27,'A5',.44,81), (27.5,'G5',.43,77),
    (28,'E5',1.38,86), (29.5,'C#5',.43,77), (30,'A4',.94,80),
]

# Blue's broader answer briefly discovers F#. The borrowed Bb on bar seven
# remembers the fragile paper before A7 brings back the minor-key battle hook.
COLOUR = [
    (0,'B5',2.80,86), (3,'A5',.45,77), (3.5,'G5',.43,73),
    (4,'A5',2.40,88), (6.5,'F#5',.45,76), (7,'E5',.70,72),
    (8,'G5',1.40,84), (9.5,'F#5',.43,77), (10,'E5',1.74,79),
    (12,'D5',1.40,76), (13.5,'E5',.42,80), (14,'C#5',1.35,75),
    (16,'F#5',.42,82), (16.5,'A5',.20,78), (16.75,'G5',.19,76), (17,'B5',2.75,92),
    (20,'A5',.42,82), (20.5,'G5',.43,78), (21,'F#5',1.72,83), (23,'E5',.72,73),
    (24,'F5',2.72,81), (27,'E5',.45,74), (27.5,'D5',.42,71),
    (28,'E5',1.36,83), (29.5,'C#5',.42,76), (30,'A4',.76,78),
]

# Root and close-position inner voices. D persists for two bars so the bass riff
# and melody can establish a place before the harmony starts travelling.
D = ('D2', 'F3 A3 E4')
G = ('G2', 'F3 A3 B3')
BB = ('Bb1', 'F3 A3 D4')
AS = ('A1', 'G3 A3 D4')
A = ('A1', 'G3 C#4 E4')
CHANGES = [D, D, G, D, BB, G, AS, A]
LIGHT = [
    ('G2','F#3 A3 B3'), ('F#2','F#3 A3 D4'), ('E2','G3 B3 F#4'), A,
    ('B1','F#3 A3 D4'), ('G2','F#3 B3 D4'), BB, A,
]


class ColourBattle(Score):
    def __init__(self):
        super().__init__('battle', 'Que no se apague el color', 148, 4, 2, 32,
                         'D dorian / minor; D major light; borrowed Bb')
        self.record_stems = True
        # CT 2011: program, gain, pan, echo send, optional bank.
        self.palette = {
            'lead': (56,1.02,60,.12), 'flute': (73,.66,69,.19),
            'marimba': (12,.66,82,.08), 'keys': (4,.46,42,.08),
            'strings': (48,.61,73,.15), 'horn': (60,.50,56,.10),
            'bass': (34,.60,64,0), 'pizz': (45,.50,40,.045),
            'kick': (125,.73,64,0), 'snare': (124,.64,65,.035),
            'hat': (127,.66,83,.008), 'tom': (116,.51,45,.07),
            'crash': (123,.66,53,.10,1),
        }
        # Seconds, relative level, stereo swap. Short room for rhythm; a longer,
        # quieter reflection for breath/strings. The bass remains dry and centred.
        self.echo_taps = {
            'lead': [(.087,.75,True),(.174,.30,False),(.281,.16,True)],
            'flute': [(.121,.70,True),(.263,.36,False),(.397,.18,True)],
            'strings': [(.139,.64,True),(.277,.36,False),(.419,.22,True)],
            'marimba': [(.071,.68,True),(.149,.24,False)],
            'keys': [(.053,.55,True),(.113,.21,False)],
            'snare': [(.047,.65,True),(.093,.27,False)],
        }

    def metadata(self):
        m = super().metadata()
        m.update(edition='colour-battle-v6',
            form='entrance:2; A:8 song; A′:8 coloured answers; B:8 light; A″:8 together',
            performance='Authored note lengths/attacks, CC11 swells, delayed CC1 vibrato, selected 16-cent lead scoops; MIDI and audio share automation.',
            motif='D–F–E (eighth, sixteenth, sixteenth) → held A; descending G–F–E–D answer.',
            listeningMarks=[{'seconds':round(bar*4*60/self.bpm,3),'label':label}
                for bar,label in [(0,'Tres pinceladas'),(2,'Estribillo'),(10,'Los colores contestan'),
                                  (18,'La página se ilumina'),(26,'Juntos'),(34,'Bucle')]],
            automationEvents={v:len(events) for v,events in self.automation.items()})
        return m


def sing(s, voice, bar, notes, lift=0):
    """One breath at a time: the long note grows, then yields to its answer."""
    origin = bar*4
    for off, p, duration, velocity in notes:
        t = origin+off
        s.note(voice,t,duration,p,velocity+lift)
        s.control(voice,t,1,0)
        s.control(voice,t,-1,0)
        if duration >= 1.25:
            s.curve(voice,11,[(t,108),(t+duration*.18,99),
                              (t+duration*.62,120),(t+duration*.97,91)])
            # Vibrato only develops on the latter part of a long, settled note.
            s.curve(voice,1,[(t,0),(t+duration*.43,0),
                             (t+duration*.73,23 if voice=='flute' else 17),
                             (t+duration*.97,8)])
        else:
            s.control(voice,t,11,116 if velocity>=90 else 108)
        if voice=='lead' and off in [1,17]:
            # A small upward settling gesture, not a semitone slide on every note.
            s.curve(voice,-1,[(t,-650),(t+.16,0)])


def hit(s, voice, bar, off, velocity, note=60):
    seconds = {'kick':.15,'snare':.25,'hat':.09,'tom':.29,'crash':1.35}[voice]
    s.note(voice,bar*4+off,seconds*s.bpm/60,note,velocity)


def drums(s, bar, pair, section, ending=False):
    """A stable two-bar pocket: the kick and bass share their syncopation."""
    light = section=='light'
    # The last beat of each eight-bar sentence is a collective breath.
    kick = [(0,104),(1.5,91),(2.75,95)] if pair==0 else [(0,100),(2,92),(3.5,84)]
    if light:kick=[(0,91),(2.5,81)]
    for off,v in kick:
        if not ending or off<3:hit(s,'kick',bar,off,v)
    for off,v in ([(2,94)] if light else [(1,99),(3,103)]):
        if not ending or off<3:hit(s,'snare',bar,off,v)
    for k,v in enumerate([71,43,57,41,67,42,55,39]):
        if ending and k>=5:continue
        if light and k%2:continue
        hit(s,'hat',bar,k*.5,round(v*(.82 if light else 1)))
    if ending:
        # A short punctuation before the rest, instead of a fill across it.
        hit(s,'tom',bar,2.25,74,64)
        hit(s,'tom',bar,2.5,85,57)
    elif section=='return' and pair==1:
        hit(s,'snare',bar,2.75,38,62)


def bass(s, bar, harmony, pair, light=False, ending=False):
    root=pitch(harmony[0])
    if light:
        notes=[(0,0,1.7,89),(2.5,7,.40,73),(3.5,12,.31,77)]
    elif pair==0:
        notes=[(0,0,.68,100),(1.5,0,.28,83),(2,7,.38,87),
               (2.75,12,.42,95),(3.5,7,.29,78)]
    else:
        notes=[(0,0,1.27,94),(1.5,7,.28,82),(2,12,.62,91),(3.5,0,.32,84)]
    for off,interval,dur,v in notes:
        if ending and off>=3:continue
        s.note('bass',bar*4+off,dur,root+interval,v)


def chords(s, bar, harmony, pair, light=False, ending=False):
    # Close inner voices move gently while melody and bass have room to speak.
    rhythm = [(0,3.6,62)] if light else ([(.75,.44,70),(2,.76,62)] if pair==0 else [(1.5,.73,67),(3.5,.31,57)])
    for off,dur,v in rhythm:
        if ending and off>=3:continue
        for n,p in enumerate(harmony[1].split()):
            s.note('keys',bar*4+off,dur,p,v-n*5)


def reply(s, bar, raised=False):
    # A different register, and only inside the lead's written gaps.
    for off,p,d,v in [(3.25,'D5',.16,77),(3.5,'F5',.16,70),(3.75,'E5',.16,66)]:
        s.note('marimba',bar*4+off,d,pitch(p)+(12 if raised else 0),v)


def battle():
    s=ColourBattle()
    # The battle starts with three physical strokes and one shared intake of air.
    for off,p,v in [(0,'D4',94),(.5,'F4',81),(.75,'E4',78),(1,'A4',91)]:
        s.note('marimba',off,.22 if off<1 else .72,p,v)
    s.note('bass',0,1.5,'D2',97)
    hit(s,'kick',0,0,103);hit(s,'snare',0,1,91);hit(s,'hat',0,2,52)
    s.note('horn',2,1.60,'A3',75)
    for p in ['G3','C#4']:s.note('keys',4,1.55,p,69)
    s.note('bass',4,1.7,'A1',92)
    hit(s,'kick',1,0,99);hit(s,'snare',1,1,93)
    for off,p,v in [(2,67,72),(2.5,62,83),(2.75,57,93)]:hit(s,'tom',1,off,v,p)
    # Beat 4 is empty; the hook and full groove arrive together at 0:03.24.
    for section_index in range(4):
        start=2+section_index*8
        light=section_index==2
        final=section_index==3
        section='light' if light else 'return' if final else 'song'
        melody=list(COLOUR if light else HOOK)
        if final:
            # The first seven bars remain identifiable. One higher destination
            # and a tonic ending make the final statement feel earned.
            melody=[(t, 'D6' if t==25 else 'C6' if t==26.5 else p,d,v)
                    for t,p,d,v in melody if t<28]
            melody += [(28,'F5',.43,91),(28.5,'E5',.44,82),(29,'D5',1.72,94)]
        sing(s,'flute' if light else 'lead',start,melody,3 if final else 0)
        for k in range(8):
            bar=start+k;ending=k==7
            h=(LIGHT if light else CHANGES)[k]
            # The final tonic is a landing, then a silent beat before the loop.
            if final and ending:h=D
            bass(s,bar,h,k%2,light,ending)
            chords(s,bar,h,k%2,light,ending)
            drums(s,bar,k%2,section,ending)
            if k==0:hit(s,'crash',bar,0,81 if light else 95 if final else 87)
            if k in [1,3,5] and not light:
                reply(s,bar)
            if section_index==1 and k in [0,4]:
                # Yellow's few dry taps enter under the sustained trumpet,
                # then withdraw before the melodic answer.
                for off,p,v in [(2,'D5',70),(2.75,'A4',59),(3.5,'E5',63)]:
                    s.note('pizz',bar*4+off,.20,p,v)
            if light or (final and k in [0,2,4,6]):
                t=bar*4
                for p in h[1].split()[:2]:s.note('strings',t,3.72,p,67 if final else 61)
                s.curve('strings',11,[(t,70),(t+1.2,91),(t+2.7,111),(t+3.7,78)])
            if final and k in [0,4]:
                # Carmín adds weight only beneath the motif's arrival.
                s.note('horn',bar*4+1,2.62,'D4' if k==0 else 'F4',67)
            if final and k in [1,5]:
                # Añil answers in the gap, joining Ámbar's marimba at the return.
                sing(s,'flute',bar,[(3.25,'A5',.17,64),(3.5,'G5',.17,59),(3.75,'E5',.17,56)])
        if light:
            # A short descending amber answer after the flute's first sentence.
            for off,p,v in [(15.4,'A4',70),(15.65,'F#4',63),(15.85,'E4',58)]:
                s.note('marimba',start*4+off,.13,p,v)
    s.repeat()
    return s
