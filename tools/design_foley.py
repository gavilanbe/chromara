#!/usr/bin/env python3
"""Original 32 kHz paint/paper/ink sound design, reproducible seeded PCM.
Run after compose_suite.py. The soundfont musical samples are preserved.
These are authored effects, not borrowed game SFX or recordings.
"""
import base64
import hashlib
import json
from pathlib import Path
import numpy as np
from compose_score import ROOT, MUSIC, SR, wav_bytes

rng=np.random.default_rng(3107)

def seconds(n):return np.arange(round(n*SR),dtype=np.float64)/SR

def env(t,attack=.003,decay=.12):return np.minimum(1,t/max(attack,1/SR))*np.exp(-t/decay)

def noise(dur,low=150,high=5000,tilt=.4):
    t=seconds(dur);n=len(t);freq=np.fft.rfftfreq(n,1/SR)
    spectrum=np.fft.rfft(rng.normal(size=n))
    shape=(1/(1+(low/np.maximum(freq,1))**6)) / (1+(freq/high)**8)
    shape*=np.maximum(freq,80)**(-tilt/2);shape[0]=0
    out=np.fft.irfft(spectrum*shape,n=n)
    return out/max(float(np.std(out)),1e-9)*.21

def glide(dur,f0,f1,decay=.12,attack=.001,rough=0):
    t=seconds(dur); f=f0*(f1/f0)**(t/max(dur,1/SR)); phase=np.cumsum(f)*2*np.pi/SR
    return (np.sin(phase+rough*np.sin(phase*1.39))*env(t,attack,decay))

def modal(dur,f,decay=.06):
    t=seconds(dur);return sum(a*np.sin(2*np.pi*f*r*t)*env(t,.0007,decay/(1+i*.7)) for i,(r,a) in enumerate([(1,1),(1.57,.38),(2.43,.20),(3.83,.08)]))

def add(out,sound,at=0,gain=1):
    i=round(at*SR);n=min(len(sound),len(out)-i)
    if n>0:out[i:i+n]+=sound[:n]*gain
    return out

def blank(dur):return np.zeros(round(dur*SR))

def grains(dur,lo,hi,count,decay=.008):
    out=blank(dur)
    for _ in range(count):
        at=rng.uniform(0,dur-.022);length=rng.uniform(.012,.035);t=seconds(length)
        add(out,noise(length,lo,hi,.1)*env(t,.0005,decay),at,rng.uniform(.15,.8))
    return out


def brush(heavy=False):
    dur=.49 if heavy else .29;t=seconds(dur)
    pressure=np.sin(np.pi*np.clip(t/(dur*.82),0,1))**1.3
    # Streaks of bristle contact, a wooden ferrule knock, and a short wet tail.
    drag=noise(dur,170 if heavy else 380,2300 if heavy else 3700,.8)
    drag*=pressure*(.58+.22*np.sin(2*np.pi*31*t)+.15*np.sin(2*np.pi*67*t))
    add(drag,modal(.12,145 if heavy else 430,.028),.015,.22)
    add(drag,grains(.13,600,4200,17),dur-.13,.48)
    if heavy:add(drag,glide(.28,130,53,.075),.02,.35)
    return drag


def pencil(long=False):
    dur=.40 if long else .19;out=blank(dur)
    # Individual changes of direction: two dry cuts and a hard graphite point.
    for at,length,weight in ([(0,.15,.9),(.16,.09,.63),(.27,.12,1)] if long else [(0,.075,.9),(.092,.083,.72)]):
        t=seconds(length);stroke=noise(length,1400,7300,.05)
        stroke*=np.sin(np.pi*t/length)**.65*(.6+.4*np.sin(2*np.pi*(85*t+170*t*t))**2)
        add(out,stroke,at,weight);add(out,modal(.022,1150,.006),at,.09)
    add(out,grains(dur,2300,7800,24 if long else 12,.004),0,.35)
    return out


def paint(size=1,critical=False):
    dur=.18+.16*size;t=seconds(dur);out=blank(dur)
    add(out,glide(dur,190/size,58/size,.026+.036*size,rough=.14),0,.62)
    add(out,noise(dur,160,2400,.9)*env(t,.001,.042+.035*size),0,.95)
    # The heavy drop flattens into an irregular contact patch rather than a bell.
    for at,gain in [(.008,.32),(.032,.21),(.061,.13)]:
        add(out,modal(.09,330/size,.018),at,gain)
    add(out,grains(.11,850,4200,12,.004),.055,.40)
    for at,f in [(.09,900),(.135,1250),(.17,720)]:add(out,glide(.06,f,f*.70,.018),at,.075*size)
    if critical:
        add(out,noise(.10,2400,7800,.0)*env(seconds(.10),.0005,.014),0,.5)
        for f in [1174.66,1761.99]:add(out,modal(.23,f,.06),.025,.1)
    return out


def water():
    dur=.44;t=seconds(dur);out=noise(dur,680,6900,.2)*env(t,.003,.065)
    for i,f in enumerate([1210,740,1860,930,1450]):
        add(out,glide(.095,f*.78,f*1.34,.026,rough=.13),.025+i*.053,.17-i*.013)
    add(out,noise(.22,240,1900,.5)*env(seconds(.22),.02,.075),.03,.4)
    return out


def ink(kind='jet'):
    dur={'jet':.40,'lunge':.43,'dissolve':.81,'tide':.92,'warning':.29,'fall':.40}[kind]
    t=seconds(dur);out=blank(dur)
    # A throat-like, falling cavity; rough FM couples the low and wet components.
    f0=140 if kind!='warning' else 91
    add(out,glide(dur,f0,39 if kind in ['tide','dissolve'] else 63,dur*.27,.008,.95),0,.35)
    rough=noise(dur,85,1200,.9)*(np.sin(2*np.pi*(17*t+12*t*t))**2*.7+.3)*env(t,.018,dur*.24)
    add(out,rough,0,.8)
    for i in range(5 if kind!='warning' else 2):
        at=.02+i*dur/7;add(out,glide(.10,220+i*41,88+i*17,.029,rough=.7),at,.20)
    if kind=='lunge':add(out,noise(.17,700,2600,.5)*np.sin(np.pi*seconds(.17)/.17)**2,.035,.3)
    if kind=='tide':add(out,paint(1.8),.36,.55)
    if kind=='dissolve':
        for i in range(6):add(out,glide(.08,410-i*38,195-i*17,.024),.28+i*.065,.13)
    return out


def paper(close=False):
    dur=.22 if close else .30;out=blank(dur)
    for at,length,gain in [(0,dur*.6,.50),(dur*.35,dur*.55,.85)]:
        t=seconds(length);add(out,noise(length,650,6400,.2)*np.sin(np.pi*t/length)**1.1,at,gain)
    add(out,modal(.09,160 if close else 380,.018),dur*.6,.24 if close else .11)
    add(out,grains(dur,1600,6000,18,.003),0,.22)
    return out


def swoosh(dur=.19,up=True):
    t=seconds(dur);low=noise(dur,240,2400,.6);high=noise(dur,1500,7200,.1)
    u=t/dur;blend=u if up else 1-u
    return ((1-blend)*low+blend*high)*np.sin(np.pi*u)**1.7


def rub():
    dur=.16;t=seconds(dur)
    out=noise(dur,200,1800,1)*np.sin(np.pi*t/dur)**.5*(.4+.6*np.sin(2*np.pi*35*t)**2)
    add(out,modal(.045,560,.009),.055,.075);return out


def flame():
    dur=.62;t=seconds(dur);out=blank(dur)
    add(out,glide(.4,82,41,.095),.015,.33)
    pressure=(1-np.exp(-t/.026))*np.exp(-t/.16)
    out+=noise(dur,110,2500,.9)*pressure*(.65+.35*np.sin(2*np.pi*23*t)**2)
    add(out,swoosh(.32),0,.68);add(out,grains(.45,1700,6500,28,.003),.06,.46)
    return out


def growth():
    dur=.58;t=seconds(dur);out=noise(dur,450,2800,.6)*np.sin(np.pi*t/dur)**2*.18
    for i,f in enumerate([293.66,369.99,440,587.33,739.99]):add(out,modal(.16,f,.035),i*.075,.16)
    add(out,grains(.36,1900,4800,25,.007),.14,.45);return out


def shadow():
    dur=1.02;t=seconds(dur);out=glide(dur,147,36.7,.36,.07,.58)*.31
    out+=noise(dur,60,1500,1.1)*np.sin(np.pi*t/dur)**1.6*.42
    add(out,glide(.72,311.13,77.78,.23,.04,.3),.08,.14);return out


def crystal():
    dur=.55;out=blank(dur)
    for i,f in enumerate([1174.66,1761.99,2349.32,3131,3524]):
        add(out,modal(.32,f,.045),i*.026,.12-i*.013)
    add(out,grains(.15,3700,7600,14,.002),0,.3);return out


def impact():
    dur=.42;out=glide(dur,125,34,.08,rough=.2)*.6
    add(out,modal(.13,176,.025),0,.24);add(out,noise(.18,140,2400,.7)*env(seconds(.18),.001,.031),0,.65)
    return out


def recipe(name):
    if name=='brush_sweep':return brush()
    if name=='brush_big':return brush(True)
    if name=='scratch':return pencil()
    if name=='scratch_long':return pencil(True)
    if name=='splat_small':return paint(.65)
    if name in ['splat','hit']:return paint(1 if name=='splat' else .86)
    if name in ['splat_big','splash']:return paint(1.55 if name=='splat_big' else 2.0)
    if name=='hitweak':return paint(1.04,True)
    if name=='resist':return modal(.19,240,.026)*.6+noise(.19,160,1800,.5)*env(seconds(.19),.001,.017)*.4
    if name=='ink_jet':return ink()
    if name=='ink_hit':
        out=blank(.30);add(out,ink('fall'),0,.65);add(out,modal(.14,110,.024),.002,.55)
        add(out,grains(.15,220,1500,9,.01),.06,.3);return out
    if name=='lunge':return ink('lunge')
    if name=='dissolve':return ink('dissolve')
    if name=='enemy_soon':return ink('warning')
    if name=='ink_tide':return ink('tide')
    if name=='flat_drop':return ink('fall')
    if name=='splash_clean':return water()
    if name=='brush_hiss':return water()[:round(.22*SR)]*.65+brush()[:round(.22*SR)]*.30
    if name=='bubbles':
        out=blank(.52)
        for i in range(6):add(out,glide(.09,310+i*75,650+i*63,.021,rough=.1),i*.069,.22)
        return out
    if name=='plop':return glide(.19,290,104,.035,rough=.19)*.65+modal(.19,520,.014)*.12
    if name=='slow_drip':
        out=blank(.52);add(out,glide(.13,510,180,.035,rough=.3),0,.45);add(out,glide(.13,420,140,.035),.28,.4);return out
    if name in ['fwip','whip','dash','banner']:return swoosh({'fwip':.14,'whip':.19,'dash':.24,'banner':.21}[name],name!='dash')
    if name in ['page','book_open','book_close','cancel']:return paper(name in ['book_close','cancel'])
    if name=='rub':return rub()
    if name=='crumbs':return grains(.18,2200,6500,13,.002)
    if name=='squeeze':return ink('jet')*.38+glide(.40,430,840,.13,.02,.8)*.12
    if name in ['drop_fall','fall']:return swoosh(.36,False)*.65+glide(.36,1350,240,.13,.035,.12)*.1
    if name=='fwoom':return flame()
    if name=='crackle':return grains(.66,1000,6900,36,.003)
    if name=='grow':return growth()
    if name=='leaves':return grains(.32,1100,4900,33,.006)
    if name=='hum_down':return shadow()
    if name=='impact_sub':return impact()
    if name=='glass':return crystal()
    if name=='shimmer':
        out=blank(.96);t=seconds(.96);out+=noise(.96,4200,7500,.0)*np.sin(np.pi*t/.96)**2*.12
        for i,f in enumerate([1174.66,1479.98,1761.99,2349.32]):add(out,modal(.5,f,.09),.07+i*.12,.05)
        return out
    if name=='detect':
        out=blank(.36);add(out,ink('warning'),0,.8);add(out,modal(.13,146.83,.03),.15,.4);return out
    if name=='encounter':return shadow()[:round(.58*SR)]+swoosh(.58)*.45
    if name=='step_grass':return grains(.07,450,2800,9,.003)
    if name=='step_path':return modal(.055,640,.008)*.13+grains(.055,800,3600,5,.002)*.4
    if name=='step_wood':return modal(.085,310,.014)*.45+grains(.085,800,2600,5,.003)*.15
    raise KeyError(name)

NAMES='brush_sweep brush_big scratch scratch_long splat_small splat splat_big splash hit hitweak resist ink_jet ink_hit lunge dissolve enemy_soon ink_tide flat_drop splash_clean brush_hiss bubbles plop slow_drip fwip whip dash banner page book_open book_close cancel rub crumbs squeeze drop_fall fall fwoom crackle grow leaves hum_down impact_sub glass shimmer detect encounter step_grass step_path step_wood'.split()
VARIANTS={'brush_sweep','scratch','hit','splat','splash_clean','ink_jet','step_grass','step_path','step_wood'}


def main():
    path=ROOT/'sfx_samples.js';src=path.read_text();bank=json.loads(src[src.index(' = ')+3:].rstrip(';\n'))
    bank={k:v for k,v in bank.items() if not k.startswith('fx_')};report={}
    for name in NAMES:
        count=2 if name in VARIANTS else 1
        for variant in range(count):
            global rng
            seed=int.from_bytes(hashlib.sha256((name+str(variant)).encode()).digest()[:8],'little');rng=np.random.default_rng(seed)
            pcm=recipe(name)
            # Sample the finished material at 32 kHz, remove DC, round its extreme
            # top end and give both edges a short ramp (no per-play random rebuild).
            pcm-=pcm.mean();spectrum=np.fft.rfft(pcm);freq=np.fft.rfftfreq(len(pcm),1/SR)
            pcm=np.fft.irfft(spectrum/(1+(freq/7600)**8),n=len(pcm))
            pcm*=.70/max(float(np.max(np.abs(pcm))),1e-9)
            n=min(96,len(pcm)//8);pcm[:n]*=np.linspace(0,1,n);pcm[-n:]*=np.linspace(1,0,n)
            key='fx_'+name+('_'+str(variant) if variant else '')
            gain=.26 if name.startswith('step_') else .46 if name in ['page','cancel','crumbs','leaves','shimmer','enemy_soon'] else .66 if name in ['scratch','scratch_long','brush_sweep','brush_hiss','fwip','dash'] else .86
            data=wav_bytes(pcm)
            bank[key]={'kind':'effect','event':name,'variant':variant,'gain':gain,'data':base64.b64encode(data).decode()}
            report[key]={'event':name,'duration':round(len(pcm)/SR,4),'gain':gain,'peak':round(float(np.max(np.abs(pcm))),4),'rms':round(float(np.sqrt(np.mean(pcm**2))),4),'sha256':hashlib.sha256(data).hexdigest()}
    path.write_text('// Generated by compose_suite.py + design_foley.py: CT instruments and original 32 kHz material effects.\nconst SFX_SAMPLES = '+json.dumps(bank,separators=(',',':'))+';\n')
    (MUSIC/'score/sfx-bank.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'{len(NAMES)} redesigned effects, {len(report)} samples including variants, {path.stat().st_size//1024} KiB embedded')

if __name__=='__main__':main()
