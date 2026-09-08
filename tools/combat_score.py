"""CHROMARA boss score (v5); the normal battle is authored in battle_tres_gotas.py (v7).

All pitches and rhythms are written here. No random note/chord generation.
The colour cell D–F–E–A and Ink's A–F–Eb–D remain in the melodic foreground.
"""
from compose_score import Score, pitch
from battle_tres_gotas import battle

# CT 2011. Levels account for the very different recorded preset levels.
# A fifth field selects an SF2 bank; bank 1's crashfd1 has a real decay.
COMBAT_PALETTE = {
    'lead': (56, .98, 62, .17), 'flute': (73, .65, 61, .21),
    'guitar': (30, .96, 82, .10), 'keys': (4, .55, 39, .12),
    'strings': (48, .57, 77, .18), 'bass': (34, .75, 64, 0),
    'marimba': (12, .43, 36, .07), 'horn': (60, .60, 60, .17),
    'string_lead': (48, .84, 65, .19, 1), 'piano': (0, .65, 59, .17),
    'organ': (17, .35, 39, .11), 'choir': (52, .41, 80, .23),
    'kick': (125, .76, 64, 0), 'snare': (124, .70, 65, .055),
    'hat': (127, .75, 81, .015), 'open_hat': (126, .46, 81, .025),
    'tom': (116, .50, 51, .09), 'crash': (123, .91, 47, .08, 1),
}
PERCUSSION = {'kick':'k','snare':'s','hat':'h','open_hat':'o','tom':'s','crash':'o'}


class CombatScore(Score):
    def __init__(self, name, title, bpm, intro, bars, key, form):
        super().__init__(name, title, bpm, 4, intro, bars, key)
        self.palette = dict(COMBAT_PALETTE)
        self.form = form
        self.record_stems = True

    def metadata(self):
        result = super().metadata()
        result.update(edition='combat-v5',form=self.form,
                      drumTiming='Durations in seconds preserve the recorded drum decay.',
                      mixIntent='Melody leads; bass supports; chord thirds/sevenths define the harmony.')
        return result


def line(s, voice, bar, text, velocity=90, gate=.94, transpose=0):
    s.phrase(voice,bar,text,velocity,gate,transpose)


def drum(s, voice, bar, off, velocity=95, note=60):
    duration={'kick':.14,'snare':.28,'hat':.11,'open_hat':.30,'tom':.28,'crash':1.45}[voice]
    s.note(voice,bar*4+off,duration*s.bpm/60,note,velocity)


def groove(s, bar, variation=0, energy=1, fill=False, half=False, crash=False):
    """Two related grooves; fills replace the final hats, never cover the hook."""
    kicks = ([0,2.5] if half else
             [[0,1.5,2.75],[0,.75,2,3.5],[0,1.5,2,2.75],[0,1.75,2.5]][variation%4])
    for k,off in enumerate(kicks):drum(s,'kick',bar,off,round((104 if k==0 else 93)*energy))
    for off in ([2] if half else [1,3]):drum(s,'snare',bar,off,round(103*energy))
    if not half and variation%4 in [1,3] and not fill:
        drum(s,'snare',bar,2.75 if variation%4==1 else .75,round(44*energy),62)
    for k in range(8):
        if fill and k>=6:continue
        if k==7 and variation%4 in [1,3]:
            drum(s,'open_hat',bar,k*.5,round(71*energy));continue
        drum(s,'hat',bar,k*.5,round(([80,58,70,55,77,58,68,56][k])*energy))
    if fill:
        # Answer the phrase with two snare pickups and descending toms.
        drum(s,'snare',bar,2.75,round(57*energy),62)
        if half:drum(s,'snare',bar,3,round(88*energy))
        for off,p,vel in [(3.25,64,80),(3.5,60,87),(3.75,55,97)]:
            drum(s,'tom',bar,off,round(vel*energy),p)
    if crash:drum(s,'crash',bar,0,round(100*energy))


# root, third/seventh voicing, available fifth/colour, approach into next bar.
# The bass and comping parts share these changes; they do not fight the melody.
DM=('D2','F3 C4','A3 E4')
BB=('Bb1','D3 A3','F3 C4')
GM=('G1','Bb3 F4','D4 A4')
G9=('G1','B3 F4','D4 A4')
A7=('A1','G3 C#4','E4 Bb4')
FM=('F2','A3 E4','C4 G4')
CM=('C2','E3 Bb3','G3 D4')


def comp(s,bar,harmony,variant=0,level=1,voice='keys',sustained=False):
    _,shell,colour=harmony
    # Anticipated chord on 4&, then a gap before the next downbeat.
    rhythms=[[(.5,.48),(2,.70),(3.5,.34)],[(.75,.40),(1.5,.75),(3,.46)],
             [(0,.80),(1.75,.45),(3,.68)],[(.5,.55),(2.5,.47),(3.5,.35)]]
    if sustained:rhythms=[[(0,3.7)]]*4
    for j,(off,dur) in enumerate(rhythms[variant%4]):
        pitches = shell.split() if j!=1 or sustained else colour.split()
        for k,p in enumerate(pitches):s.note(voice,bar*4+off,dur,p,round((77-k*8-j*3)*level))


def bassline(s,bar,harmony,next_harmony,variant=0,lyric=False,level=1):
    root=pitch(harmony[0]);nextroot=pitch(next_harmony[0])
    third=pitch(harmony[1].split()[0])
    while third>=root+12:third-=12
    while third<root:third+=12
    approach=nextroot-1
    if approach<28:approach+=12
    patterns=[[(0,root,.65),(.75,root,.20),(1.5,root+7,.34),(2.25,root+12,.40),(3,root+7,.32),(3.5,approach,.35)],
              [(0,root,.82),(1,root+12,.31),(1.5,root+7,.31),(2.5,third,.42),(3.25,root,.20),(3.5,approach,.35)],
              [(0,root,.58),(.75,root+12,.24),(1.5,root+7,.33),(2,root,.40),(2.75,third,.30),(3.5,approach,.35)],
              [(0,root,1.1),(1.5,root+7,.38),(2.25,root+12,.40),(3,third,.34),(3.5,approach,.35)]]
    if lyric:patterns=[[(0,root,1.3),(1.5,root+7,.4),(2.5,root+12,.55),(3.5,approach,.35)]]*4
    for j,(off,p,dur) in enumerate(patterns[variant%4]):
        s.note('bass',bar*4+off,dur,p,round((97 if j==0 else 86+j%2*5)*level))


INK_HOOK=[
 'A4:.75 F4:.25 Eb4:.5 D4:1.5 -:.5 D4:.5',
 'F4:.75 Eb4:.25 D4:.5 C#4:.5 D4:1 -:1',
 'G4:.75 Bb4:.25 A4:.5 D5:1.5 C5:.5 Bb4:.5',
 'A4:1 G4:.5 E4:.5 C#4:1 -:.5 E4:.5',
 'A4:.75 F4:.25 Eb4:.5 D4:1.5 -:.5 A4:.5',
 'Bb4:1 D5:.5 C5:.5 Bb4:1 A4:.5 F4:.5',
 'G4:.75 Bb4:.25 A4:.5 G4:.5 F4:1 Eb4:.5 D4:.5',
 'C#4:.5 E4:.5 A4:1 -:.5 G4:.5 E4:.5 C#4:.5',
]
EB=('Eb2','G3 D4','Bb3 F4')
INK_CHANGES=[DM,EB,GM,A7,DM,BB,GM,A7]


def ink_motion(s,bar,chord,variant=0,energy=1):
    # A 3+3+2 displacement, harmonized to the current chord instead of a fixed
    # chromatic shape played over every unrelated bass note.
    root=pitch(chord[0])+24
    shell=[pitch(p) for p in chord[1].split()]
    values=[root,shell[0],root+7,shell[1],root+12,root+7]
    for j,off in enumerate([0,.75,1.5,2.25,3,3.5]):
        s.note('organ',bar*4+off,.23,values[(j+variant%2)%6],round((75-j%2*10)*energy))


def boss():
    s=CombatScore('boss','La página se resiste',152,4,48,'D minor / phrygian; C minor sequence',
        'summons:4; A:8 Ink; A′:8 pursuit; B:8 rising tide; C:8 memory in motion; D:8 duel; A″:8 reckoning')
    s.palette['bass']=(38,.32,64,0)
    s.palette['snare']=(124,.75,65,.075)
    # The battle begins with a declaration, not the reflective dialogue cue.
    for b in range(4):
        line(s,'horn',b,INK_HOOK[b],92,.94)
        root='D2' if b<3 else 'A1'
        s.note('bass',b*4,1.25,root,104)
        s.note('bass',b*4+2.5,.65,pitch(root)+12,92)
        for p in ['D4','A4'] if b<2 else ['G4','C#5']:s.note('choir',b*4,3.65,p,73)
        groove(s,b,b,energy=.96,half=b<2,fill=b==3,crash=b==0)
    tide=[
      'G5:.75 Eb5:.25 D5:.5 C5:1 G5:1 -:.5',
      'Ab5:1 G5:.5 Eb5:.5 C5:1 -:1',
      'C6:.75 Ab5:.25 G5:.5 F5:1 C6:1 -:.5',
      'B5:1 G5:.5 F5:.5 D5:1 -:.5 G5:.5',
      'Bb5:1 G5:.5 F5:.5 Eb5:1 D5:.5 Eb5:.5',
      'C6:1 Bb5:.5 Ab5:.5 G5:1 F5:.5 Eb5:.5',
      'F5:.5 Ab5:.5 B5:.5 D6:.5 C6:1 B5:.5 A5:.5',
      'G5:.75 E5:.25 C#5:.5 E5:.5 A5:1 -:1',
    ]
    tide_changes=[('C2','Eb3 Bb3','G3 D4'),('Ab1','C4 G4','Eb4 Bb4'),
                  ('F2','Ab3 Eb4','C4 G4'),('G1','F3 B3','D4 Ab4'),
                  ('Eb2','G3 D4','Bb3 F4'),('Ab1','C4 G4','Eb4 Bb4'),
                  ('B1','D4 Ab4','F4 B4'),A7]
    # A new sentence using the world motif, still inside the battle's pulse.
    memory=[
      'D5:1.5 F5:.5 E5:1 A5:1',
      'G5:1 F5:.5 E5:.5 D5:1 -:1',
      'F5:1 A5:1 C6:1 Bb5:.5 A5:.5',
      'G5:1 E5:.5 F5:.5 E5:1 -:1',
      'D5:1.5 F5:.5 Eb5:1 A5:1',
      'Bb5:1 A5:.5 G5:.5 F5:1 Eb5:.5 D5:.5',
      'Eb5:1 G5:1 Bb5:1 A5:.5 G5:.5',
      'E5:1 C#5:.5 E5:.5 A5:1 -:1',
    ]
    memory_changes=[DM,('G1','B3 F4','D4 A4'),BB,CM,DM,GM,EB,A7]
    colour_duel=[
      'D5:.75 F5:.25 E5:.5 A5:1.5 -:1',
      '-:1.5 A4:.5 F4:.5 Eb4:.5 D4:1',
      'G5:.75 Bb5:.25 A5:.5 D6:1 -:.5 C6:.5 Bb5:.5',
      '-:1 A4:.5 G4:.5 E4:.5 C#4:.5 D4:.5 E4:.5',
      'D5:.75 F5:.25 E5:.5 A5:1 -:.5 F5:.5 E5:.5',
      '-:1 Bb4:.75 A4:.25 F4:.5 Eb4:.5 D4:1',
      'G5:.5 A5:.5 Bb5:1 A5:.5 G5:.5 F5:.5 E5:.5',
      'C#5:.5 E5:.5 G5:.5 Bb5:.5 A5:1 -:1',
    ]
    for i in range(48):
        b=i+4;k=i%8;memory_section=24<=i<32;duel=32<=i<40;final=i>=40
        changes=tide_changes if 16<=i<24 else memory_changes if memory_section else INK_CHANGES
        h=changes[k];nxt=changes[(k+1)%8]
        bassline(s,b,h,nxt,i,lyric=memory_section,level=.89 if memory_section else 1.03)
        groove(s,b,i,energy=.67 if memory_section else 1.04 if final else .95,
               half=i<8 or memory_section,fill=k==7 or (final and k==3),crash=k==0)
        if memory_section:
            line(s,'piano',b,memory[k],90,.97)
            for p in h[1].split():s.note('strings',b*4,3.75,pitch(p)+12,63)
            if k in [1,5]:line(s,'horn',b,'-:2 A3:.75 F3:.25 Eb3:.5 D3:.5',64,.94)
        else:
            ink_motion(s,b,h,i,.79 if duel else 1)
            if 16<=i<24:
                line(s,'lead',b,tide[k],100,.94)
                for p in h[1].split():s.note('strings',b*4,3.7,p,62)
            elif duel:
                line(s,'lead' if k%2==0 else 'horn',b,colour_duel[k],98,.94)
                comp(s,b,h,i,.83,voice='piano')
            else:
                phrase=INK_HOOK[k]
                if i==47:phrase='D4:1 -:.5 D4:.5 E4:.5 F4:.5 G4:.5 A4:.5'
                line(s,'string_lead' if 8<=i<16 else 'horn',b,phrase,
                     103 if final else 96,.96,12 if 8<=i<16 else 0)
                # Chords answer on beat 3 rather than holding a permanent wall.
                for p in h[1].split():s.note('piano',b*4+2,.8,p,74)
                if final:
                    # Octave reinforcement only on the signature opening, not
                    # through the entire line: the return has a distinct weight.
                    if k in [0,4]:line(s,'string_lead',b,'A5:.75 F5:.25 Eb5:.5 D5:1.5 -:1',77,.96)
                    elif k in [1,5]:line(s,'lead',b,'-:2 D5:.5 F5:.5 A5:.75 -:.25',78)
                if k in [0,4]:s.note('choir',b*4,3.4,'A3' if k==0 else 'D4',67)
    s.repeat();return s
