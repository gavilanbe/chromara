"""MIDI/expression regressions; optional render checks use CHROMARA_TEST_SF2."""
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import mido
import numpy as np
from compose_score import Score, Synth
from battle_tres_gotas import battle
from boss_la_mancha import boss


class PerformanceTests(unittest.TestCase):
    def test_midi_preserves_controls_before_attack_and_through_repeat(self):
        s=Score('test','test',120,4,1,2,'D')
        s.note('flute',4,2,'A4',90)
        s.control('flute',4,-1,0)
        s.curve('flute',-1,[(4,-650),(4.25,0)])
        s.curve('flute',11,[(4,100),(5,120),(5.8,80)])
        s.repeat()
        with tempfile.TemporaryDirectory() as folder, patch('compose_score.MUSIC',Path(folder)):
            s.midi()
            midi=mido.MidiFile(file=io.BytesIO((Path(folder)/'test.mid').read_bytes()))
        tick=0;events=[]
        for msg in midi.tracks[1]:
            tick+=msg.time
            if msg.type in ['pitchwheel','note_on','note_off','control_change']:
                events.append((tick,msg.copy(time=0)))
        attacks=[tick for tick,msg in events if msg.type=='note_on']
        self.assertEqual(attacks,[1920,5760])
        for start in attacks:
            same_time=[msg for tick,msg in events if tick==start]
            bends=[msg.pitch for msg in same_time if msg.type=='pitchwheel']
            self.assertEqual(bends,[0,-650])
            self.assertEqual(same_time[-1].type,'note_on')
        first=[(t-1920,msg) for t,msg in events if 1920<=t<5760]
        second=[(t-5760,msg) for t,msg in events if t>=5760]
        self.assertEqual(first,second)

    def test_battle_events_fit_loop_and_do_not_retrigger_held_pitches(self):
        for make in (battle,boss):self.check_score(make())

    def check_score(self,s):
        end=(s.intro+2*s.bars)*s.meter
        for voice,notes in s.voices.items():
            previous={}
            for t,d,p,v in sorted(notes):
                self.assertGreater(d,0)
                self.assertTrue(0<=t<t+d<=end,(voice,t,d))
                self.assertTrue(1<=v<=127)
                self.assertGreaterEqual(t+1e-7,previous.get(p,0),(voice,p,t))
                previous[p]=t+d
        for voice,events in s.automation.items():
            self.assertTrue(all(0<=t<end for t,_,_ in events),voice)
        if s.name!='battle':return
        # The identity of Tres gotas: three hammered eighths on one pitch open the hook.
        lead=sorted(s.voices['lead'])
        drops=[(a,b,c) for a,b,c in zip(lead,lead[1:],lead[2:])
               if a[2]==b[2]==c[2] and abs(b[0]-a[0]-.5)<1e-6 and abs(c[0]-b[0]-.5)<1e-6]
        self.assertGreaterEqual(len(drops),16)
        self.assertEqual(drops[0][0][:1],[s.intro*s.meter])

    @unittest.skipUnless(os.environ.get('CHROMARA_TEST_SF2'),'set CHROMARA_TEST_SF2 for audio render checks')
    def test_expression_changes_held_note_and_does_not_leak_to_next_stem(self):
        synth=Synth(Path(os.environ['CHROMARA_TEST_SF2']))
        notes=[[0,3,69,90]]
        try:
            baseline=synth.render(notes,56,64,2,.5)
            quiet=synth.render(notes,56,64,2,.5,automation=[[1,11,35],[1,1,38],[1,-1,1800]])
            after=synth.render(notes,56,64,2,.5)
        finally:synth.close()
        region=slice(24000,40000)
        rms=lambda x:float(np.sqrt(np.mean(x[region]**2)))
        self.assertLess(rms(quiet),rms(baseline)*.35)
        # FluidSynth's oscillator phase can differ between renders; compare
        # energy rather than requiring byte equality from separate note starts.
        self.assertAlmostEqual(rms(after)/rms(baseline),1,delta=.02)


if __name__=='__main__':unittest.main()
