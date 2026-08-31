#!/usr/bin/env python3
"""상품 이미지 짝맞춤 검사 — 계열이 다른 이미지가 붙어 있으면 잡아냅니다.

  python3 tools/img-check.py            저장소만 검사
  python3 tools/img-check.py db.json    DB 내려받은 목록까지 함께 검사
     (db.json = products 테이블의 id,name,line,image,detail_images 배열)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
bad, warn = [], []

LINE_OF_FILE = [
    (re.compile(r'(^|/)travel'),        'travel'),
    (re.compile(r'(^|/)dew|(^|/)doit'), 'doit'),
]
def line_of_file(path):
    base = os.path.basename(path)
    for rx, ln in LINE_OF_FILE:
        if rx.search(base): return ln
    return None

def line_of_name(name):
    s = name or ''
    if '트래블' in s or 'travel' in s.lower(): return 'travel'
    if '듀잇' in s or 'dew' in s.lower():      return 'doit'
    return None

# ── 1. HTML 안의 상품표(P) 검사 ──
for page in ('cart.html', 'product.html'):
    if not os.path.exists(page): continue
    h = open(page, encoding='utf-8').read()
    m = re.search(r'const P\s*=\s*\{(.*?)\n\};', h, re.S)
    if not m:
        warn.append(f'{page}: 상품표(P)를 찾지 못했습니다'); continue
    for row in re.finditer(r"(\d+):\{n:'([^']*)'.*?img:'([^']*)'", m.group(1), re.S):
        no, nm, img = row.group(1), row.group(2), row.group(3)
        if not img:
            warn.append(f'{page} {no} {nm}: 이미지가 비어 있습니다'); continue
        if not os.path.exists(img):
            bad.append(f'{page} {no} {nm}: 파일 없음 {img}'); continue
        ln, lf = line_of_name(nm), line_of_file(img)
        if ln and lf and ln != lf:
            bad.append(f'{page} {no} {nm}: 계열이 다릅니다 — 상품={ln} 이미지={img}({lf})')

# ── 2. 상세 이미지 파일 존재 검사 ──
for page in ('product.html',):
    if not os.path.exists(page): continue
    h = open(page, encoding='utf-8').read()
    for img in dict.fromkeys(re.findall(r"'(assets/detail/[^']+)'", h)):
        if not os.path.exists(img):
            bad.append(f'{page}: 상세 이미지 파일 없음 {img}')

# ── 3. hover(두 번째) 이미지 계열 검사 ──
h = open('index.html', encoding='utf-8').read() if os.path.exists('index.html') else ''
for card in re.finditer(r'<a class="card"[^>]*data-no="(\d+)"(.*?)</a>', h, re.S):
    no, body = card.group(1), card.group(2)
    imgs = re.findall(r'src="(assets/[^"]+)"', body)
    nm = re.search(r'class="name kr"[^>]*>([^<]*)<', body)
    ln = line_of_name(nm.group(1) if nm else '')
    for img in imgs:
        lf = line_of_file(img)
        if ln and lf and ln != lf:
            bad.append(f'index.html 카드 {no} ({(nm.group(1) if nm else "")[:20]}): 계열이 다른 이미지 {img}({lf})')

# ── 4. 장바구니에 담을 때 이미지를 함께 저장하는지 (2026-08-31 추가) ──
for page, marks in (('product.html', ["img: imgUrl(p.img)", "img: imgUrl(P[no].img)"]),
                    ('index.html',   ["function cgImgByNo(no)", "function cgCardName(card)",
                                      "cgImgByName(p.name)",
                                      "const img = cgImgByNo(id) || cgCardImg(card)",
                                      "id:id, name:name, price:dPrice, qty:dQty, img:img"])):
    if not os.path.exists(page): continue
    h = open(page, encoding='utf-8').read()
    for mk in marks:
        if mk not in h:
            bad.append(f'{page}: 장바구니에 담을 때 이미지를 저장하지 않습니다 ({mk})')

# ── 5. DB 목록까지 검사(선택) ──
if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
    rows = json.load(open(sys.argv[1], encoding='utf-8'))
    for r in rows:
        ln = r.get('line') or line_of_name(r.get('name'))
        img = r.get('image') or ''
        if img and not os.path.exists(img):
            bad.append(f"DB {r['id']} {r['name']}: 대표 이미지 파일 없음 {img}")
        if img and ln and line_of_file(img) and line_of_file(img) != ln:
            bad.append(f"DB {r['id']} {r['name']}: 대표 이미지 계열 불일치 {img}")
        det = r.get('detail_images') or []
        miss = [d for d in det if not os.path.exists(d)]
        if miss:
            bad.append(f"DB {r['id']} {r['name']}: 상세 이미지 {len(miss)}장 파일 없음 (예: {miss[0]})")
        fam = {}
        for d in det:
            k = re.sub(r'-\d+\.\w+$', '', os.path.basename(d))
            fam[k] = fam.get(k, 0) + 1
        # 듀잇 개입 상품(4·6·10·20개입)은 두 맛을 함께 담는 구성이라 두 계열이 섞이는 게 정상입니다.
        mixed_ok = bool(re.search(r'\d+\s*개입', r.get('name') or ''))
        if len(fam) > 1 and not mixed_ok:
            bad.append(f"DB {r['id']} {r['name']}: 상세 이미지에 두 가지 계열이 섞였습니다 {fam}")

for b in bad:  print('✕', b)
for w in warn: print('!', w)
print(f'\n버그 {len(bad)}건 · 주의 {len(warn)}건')
sys.exit(1 if bad else 0)
