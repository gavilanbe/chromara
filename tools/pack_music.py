#!/usr/bin/env python3
"""Empaqueta ~/chromara/music/*.wav → Ogg/Opus base64 en music_samples.js (con loop points de meta.json)."""
import base64, json, os, subprocess, sys, wave
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUS = os.path.join(ROOT, 'music'); OUT = os.path.join(ROOT, 'music_samples.js')
meta_path = os.path.join(MUS, 'meta.json')
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
pieces = ['map', 'battle', 'boss', 'victory', 'gameover', 'title']
kbps = sys.argv[1] if len(sys.argv) > 1 else '112'
out = {}
for name in pieces:
    wav = os.path.join(MUS, name + '.wav')
    if not os.path.exists(wav): print('falta', wav); continue
    with wave.open(wav) as w: dur = w.getnframes() / w.getframerate()
    m = meta.get(name, {})
    loop = m.get('loop', name not in ('victory', 'gameover'))
    ogg = os.path.join(MUS, name + '.opus.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', kbps + 'k', '-vbr', 'on', '-application', 'audio', ogg], check=True)
    data = base64.b64encode(open(ogg, 'rb').read()).decode()
    out[name] = { 'loop': loop, 'loopStart': float(m.get('loopStart', 0)), 'loopEnd': float(m.get('loopEnd', dur)), 'duration': round(dur, 4), 'data': data }
    print(f'{name}: {dur:.1f}s loop={loop} [{out[name]["loopStart"]:.3f}, {out[name]["loopEnd"]:.3f}] {len(data)//1024} KB b64')
with open(OUT, 'w') as f:
    f.write('// Generado por tools/pack_music.py — audio Ogg/Opus embebido (base64) con loop points.\n')
    f.write("'use strict';\nconst MUSIC_SAMPLES = {\n")
    for k, v in out.items():
        f.write(f"  {k}: {{ loop: {'true' if v['loop'] else 'false'}, loopStart: {v['loopStart']}, loopEnd: {v['loopEnd']}, duration: {v['duration']}, data: '{v['data']}' }},\n")
    f.write('};\n')
print('escrito', OUT, os.path.getsize(OUT) // 1024, 'KB')
