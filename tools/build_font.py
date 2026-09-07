#!/usr/bin/env python3
"""Exports the notebook's bitmap letters (font.js) as real TrueType files, so the
HTML around the canvas (mobile buttons, the hint line, the rotate screen) can use
the same letters as the game. No dependencies: the tables are written by hand.

  python3 tools/build_font.py   ->  chromara-cuaderno.ttf, chromara-rotulo.ttf

Metrics: 16 units per em and one unit per pixel, so font-size 16px draws the
bitmap at native size and 32px at exactly double. Each pixel run becomes a
rectangle contour; overlapping runs fill with the non-zero rule.
"""
import re, struct, time, zlib, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(ROOT, 'font.js'), encoding='utf-8').read()

def parse_glyph_set(name):
    block = re.search(r'const %s = \{(.*?)\n\};' % name, SRC, re.S).group(1)
    glyphs = {}
    for m in re.finditer(r"""(?:'((?:[^'\\]|\\.)+)'|"([^"]+)"|([A-Za-zÀ-ÿ0-9]+)):'([^']+)'""", block):
        key = (m.group(1) or m.group(2) or m.group(3)).replace("\\'", "'")
        top, rows = (m.group(4).split('|') + [None])[:2] if '|' in m.group(4) else ('0', m.group(4))
        glyphs[key] = (int(top), rows.split('/'))
    return glyphs

def runs(rows, top, cap):
    """Rectangles (x0, y0, x1, y1) in font units, baseline y=0, y up."""
    out = []
    for yy, row in enumerate(rows):
        r = top + yy
        y_top, y_bottom = cap - r, cap - r - 1
        x = 0
        while x < len(row):
            if row[x] == '1':
                x0 = x
                while x < len(row) and row[x] == '1': x += 1
                out.append((x0, y_bottom, x, y_top))
            else:
                x += 1
    return out

def glyf_entry(rects):
    if not rects: return b''
    xs = [v for r in rects for v in (r[0], r[2])]; ys = [v for r in rects for v in (r[1], r[3])]
    n = len(rects)
    ends = [i * 4 + 3 for i in range(n)]
    pts = []
    for x0, y0, x1, y1 in rects: pts += [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]  # clockwise with y up
    data = struct.pack('>hhhhh', n, min(xs), min(ys), max(xs), max(ys))
    data += b''.join(struct.pack('>H', e) for e in ends) + struct.pack('>H', 0)
    data += bytes([0x01] * len(pts))
    px = py = 0
    xb = b''; yb = b''
    for x, y in pts: xb += struct.pack('>h', x - px); yb += struct.pack('>h', y - py); px, py = x, y
    data += xb + yb
    if len(data) % 2: data += b'\0'
    return data, (min(xs), min(ys), max(xs), max(ys))

def checksum(data):
    data += b'\0' * ((4 - len(data) % 4) % 4)
    return sum(struct.unpack('>%dI' % (len(data) // 4), data)) & 0xFFFFFFFF

def build(name, family, glyphs, cap, space_advance, spacing, ascent, descent, xheight):
    chars = sorted(glyphs.keys(), key=ord)
    if ' ' not in chars: chars = [' '] + chars
    order = ['.notdef'] + chars
    glyf = b''; loca = [0]; hmtx = b''; bboxes = []; max_pts = 0; max_contours = 0
    for gname in order:
        if gname == '.notdef':
            rects = [(0, 0, 1, cap), (0, cap - 1, 4, cap), (3, 0, 4, cap), (0, 0, 4, 1)]; adv = 5
        elif gname == ' ':
            rects = []; adv = space_advance
        else:
            top, rows = glyphs[gname]; rects = runs(rows, top, cap); adv = len(rows[0]) + spacing
        entry = glyf_entry(rects)
        if entry == b'':
            data, bbox, lsb = b'', None, 0
        else:
            data, bbox = entry; lsb = bbox[0]
        glyf += data; loca.append(len(glyf)); bboxes.append(bbox)
        if bbox: max_pts = max(max_pts, len(rects) * 4); max_contours = max(max_contours, len(rects))
        hmtx += struct.pack('>Hh', adv, lsb)
    valid = [b for b in bboxes if b]
    xmin, ymin, xmax, ymax = min(b[0] for b in valid), min(b[1] for b in valid), max(b[2] for b in valid), max(b[3] for b in valid)
    n = len(order)
    # cmap format 4: consecutive codepoints that map to consecutive glyph ids share a segment
    segs = []
    for gid, ch in enumerate(chars, start=1):
        c = ord(ch)
        if segs and segs[-1][1] == c - 1 and segs[-1][3] == gid - 1: segs[-1][1] = c; segs[-1][3] = gid
        else: segs.append([c, c, gid, gid])
    segs.append([0xFFFF, 0xFFFF, 0, 0])
    seg_count = len(segs)
    entry_sel = max(0, (seg_count.bit_length() - 1)); search = 2 * (2 ** entry_sel)
    sub = struct.pack('>HHHH', seg_count * 2, search, entry_sel, seg_count * 2 - search)
    sub += b''.join(struct.pack('>H', s[1]) for s in segs) + struct.pack('>H', 0)
    sub += b''.join(struct.pack('>H', s[0]) for s in segs)
    sub += b''.join(struct.pack('>H', (s[2] - s[0]) % 65536) for s in segs)
    sub += b''.join(struct.pack('>H', 0) for _ in segs)
    sub = struct.pack('>HHH', 4, len(sub) + 6, 0) + sub
    cmap = struct.pack('>HH', 0, 2) + struct.pack('>HHI', 0, 3, 20) + struct.pack('>HHI', 3, 1, 20) + sub
    now = int(time.time()) + 2082844800
    head = struct.pack('>IIIIHHqqhhhhHHhhh', 0x00010000, 0x00010000, 0, 0x5F0F3CF5, 0x000B, 16, now, now, xmin, ymin, xmax, ymax, 0, 8, 2, 0, 0)
    hhea = struct.pack('>IhhhHhhhhhhhhhhhH', 0x00010000, ascent, -descent, 16 - ascent - descent, max(struct.unpack('>H', hmtx[i:i+2])[0] for i in range(0, len(hmtx), 4)), 0, 0, xmax, 1, 0, 0, 0, 0, 0, 0, 0, n)
    maxp = struct.pack('>IHHHHHHHHHHHHHH', 0x00010000, n, max_pts, max_contours, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)
    os2 = struct.pack('>HhHHHhhhhhhhhhhh', 4, 5, 400, 5, 0, 8, 8, 0, 0, 8, 8, 0, 4, 1, 3, 0)
    os2 += bytes([2, 0, 5, 9, 0, 0, 0, 0, 0, 0]) + struct.pack('>IIII', 0x8000000F, 0, 0, 0) + b'CHRO'
    os2 += struct.pack('>HHHhhhHHII', 0x00C0, ord(chars[0]), min(0xFFFF, ord(chars[-1])), ascent, -descent, 16 - ascent - descent, ascent, descent, 1, 0)
    os2 += struct.pack('>hhHHH', xheight, cap, 0, 32, 0)
    post = struct.pack('>IihhIIIII', 0x00030000, 0, -1, 1, 0, 0, 0, 0, 0)
    def name_table(records):
        strings = b''; recs = b''
        entries = []
        for nid, text in records:
            for plat, enc, lang, encoded in ((1, 0, 0, text.encode('mac_roman', 'replace')), (3, 1, 0x409, text.encode('utf-16-be'))):
                entries.append((plat, enc, lang, nid, encoded))
        entries.sort()
        for plat, enc, lang, nid, encoded in entries:
            recs += struct.pack('>HHHHHH', plat, enc, lang, nid, len(encoded), len(strings)); strings += encoded
        return struct.pack('>HHH', 0, len(entries), 6 + 12 * len(entries)) + recs + strings
    nm = name_table([(1, family), (2, 'Regular'), (3, family + ' 1.0'), (4, family), (5, 'Version 1.0'), (6, family.replace(' ', '') + '-Regular')])
    loca_b = b''.join(struct.pack('>H', o // 2) for o in loca)
    tables = {b'OS/2': os2, b'cmap': cmap, b'glyf': glyf, b'head': head, b'hhea': hhea, b'hmtx': hmtx, b'loca': loca_b, b'maxp': maxp, b'name': nm, b'post': post}
    tags = sorted(tables)
    num = len(tags); es = num.bit_length() - 1; sr = 16 * (2 ** es)
    out = struct.pack('>IHHHH', 0x00010000, num, sr, es, num * 16 - sr)
    offset = 12 + 16 * num; body = b''; dir_ = b''
    for tag in tags:
        data = tables[tag]; padded = data + b'\0' * ((4 - len(data) % 4) % 4)
        dir_ += struct.pack('>4sIII', tag, checksum(data), offset + len(body), len(data)); body += padded
    font = bytearray(out + dir_ + body)
    adjust = (0xB1B0AFBA - checksum(bytes(font))) & 0xFFFFFFFF
    head_off = 12 + 16 * tags.index(b'head')
    head_pos = struct.unpack('>I', font[head_off + 8:head_off + 12])[0]
    font[head_pos + 8:head_pos + 12] = struct.pack('>I', adjust)
    path = os.path.join(ROOT, name)
    open(path, 'wb').write(font)
    print('%s: %d glyphs, %d bytes' % (name, n, len(font)))

if __name__ == '__main__':
    cuaderno = parse_glyph_set('CUADERNO_SRC')
    build('chromara-cuaderno.ttf', 'Chromara Cuaderno', cuaderno, cap=7, space_advance=3, spacing=1, ascent=9, descent=2, xheight=5)
    rotulo = parse_glyph_set('ROTULO_SRC')
    rotulo.pop(' ', None)
    # The brush face has capitals only; in HTML, lowercase text falls back to the same capitals.
    for ch in list(rotulo):
        if ch.isalpha() and ch.upper() == ch and ch.lower() != ch: rotulo.setdefault(ch.lower(), rotulo[ch])
    build('chromara-rotulo.ttf', 'Chromara Rotulo', rotulo, cap=9, space_advance=4, spacing=1, ascent=11, descent=1, xheight=9)
