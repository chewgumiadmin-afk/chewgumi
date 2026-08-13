#!/usr/bin/env python3
"""ChewGumi 사이트 검증 — 문법 · 접근성 · UX 일관성 · 성능 · 구조"""
import re, os, json, glob, subprocess, sys
from collections import defaultdict

REPO = json.load(open('/tmp/repo.json'))
PAGES = sorted(glob.glob('lint/*.html'))
issues = defaultdict(list)   # level -> [(page, rule, detail)]

def add(level, page, rule, detail):
    issues[level].append((page, rule, detail))

# 미디어쿼리 블록을 제거한 기본 CSS 추출
def base_css(css):
    out, i = [], 0
    while i < len(css):
        if css.startswith('@media', i) or css.startswith('@supports', i):
            j = css.find('{', i); d = 1; k = j + 1
            while k < len(css) and d > 0:
                if css[k] == '{': d += 1
                elif css[k] == '}': d -= 1
                k += 1
            i = k; continue
        out.append(css[i]); i += 1
    return ''.join(out)

for path in PAGES:
    name = os.path.basename(path)
    h = open(path, encoding='utf-8').read()
    is_admin = 'noindex' in h
    styles = re.findall(r'<style[^>]*>(.*?)</style>', h, re.S)
    scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', h, re.S)
    css_all = ''.join(styles)

    # ── 1. 문법 ──
    for i, c in enumerate(styles):
        if c.count('{') != c.count('}'):
            add('ERROR', name, 'CSS 중괄호', f'블록 #{i} 불일치')
    for i, js in enumerate(scripts):
        open('/tmp/_t.js', 'w').write(js)
        r = subprocess.run(['node', '--check', '/tmp/_t.js'], capture_output=True, text=True)
        if r.returncode != 0:
            add('ERROR', name, 'JS 문법', f'블록 #{i}: {r.stderr.splitlines()[0][:70]}')
    if not re.search(r'</html>\s*$', h.strip()):
        add('ERROR', name, 'HTML 완결', '</html>로 끝나지 않음')

    # ── 2. 링크 ──
    ids = set(re.findall(r'id="([^"]+)"', h))
    # 스크립트 안의 동적 문자열은 제외하고 마크업만 검사
    markup = re.sub(r'<script[^>]*>.*?</script>', '', h, flags=re.S)
    for m in re.finditer(r'(?:href|src)="([^"]+)"', markup):
        u = m.group(1)
        if u.startswith(('http', '//', 'mailto:', 'tel:', 'data:', 'javascript:')): continue
        if any(c in u for c in ['+', '$', '{', "'", '`']): continue
        if u.startswith('#'):
            a = u[1:]
            if a and a not in ids: add('ERROR', name, '깨진 앵커', u)
            continue
        p = u.split('?')[0].split('#')[0]
        if p and p not in REPO:
            add('ERROR', name, '없는 파일', p)

    # ── 3. 접근성 ──
    for m in re.finditer(r'<img(?![^>]*\balt=)[^>]*>', h):
        add('WARN', name, 'alt 없음', m.group(0)[:60])
    for m in re.finditer(r'<(?:button|a)[^>]*>\s*<svg[^>]*>.*?</svg>\s*</(?:button|a)>', h, re.S):
        t = m.group(0)
        if 'aria-label' not in t and 'title' not in t:
            add('WARN', name, '아이콘 버튼 이름 없음', t[:60].replace('\n', ' '))
    inputs = [i for i in re.findall(r'<input[^>]*id="([^"]+)"[^>]*>', markup)
              if not any(c in i for c in ['+', '$', '{', "'"])]
    labeled = set(re.findall(r'<label[^>]*for="([^"]+)"', h))
    for iid in inputs:
        pos = markup.find(f'id="{iid}"')
        if pos < 0: continue
        s2 = markup.rfind('<input', 0, pos)
        tag = markup[s2: markup.find('>', pos) + 1]
        before = markup[max(0, s2 - 260): s2]
        if (iid in labeled or 'aria-label' in tag or 'placeholder' in tag
            or 'title=' in tag or '<label' in before[-90:]):
            continue
        add('WARN', name, '입력 라벨 없음', iid)
    if not re.search(r'<html[^>]*\blang=', h):
        add('ERROR', name, 'lang 없음', '<html lang="ko"> 필요')
    if len(re.findall(r'<h1\b', h)) == 0 and not is_admin:
        add('WARN', name, 'h1 없음', '페이지 주제목 필요')
    if len(re.findall(r'<h1\b', h)) > 1:
        add('WARN', name, 'h1 중복', f'{len(re.findall(r"<h1\\b", h))}개')

    # ── 4. 모바일·UX ──
    if 'width=device-width' not in h:
        add('ERROR', name, 'viewport 없음', '모바일 대응 불가')
    if 'user-scalable=no' in h or 'maximum-scale=1' in h:
        add('WARN', name, '확대 차단', '접근성 위반')
    b = base_css(css_all)
    for m in re.finditer(r'([^{};]+)\{[^}]*?\bwidth\s*:\s*(\d{3,})px', b):
        w = int(m.group(2))
        if w >= 420 and 'max-width' not in m.group(0):
            sel = m.group(1).strip().split('\n')[-1][:34]
            add('WARN', name, '고정 폭', f'{sel} → {w}px')
    for m in re.finditer(r'font-size\s*:\s*(\d+(?:\.\d+)?)px', css_all):
        if float(m.group(1)) < 10:
            add('WARN', name, '너무 작은 글자', m.group(1) + 'px')

    # ── 5. 보안·성능 ──
    for m in re.finditer(r'target="_blank"', h):
        seg = h[max(0, m.start() - 220): m.start() + 60]
        if 'rel=' not in seg:
            add('WARN', name, 'rel=noopener 없음', seg[-60:].replace('\n', ' '))
    if 'http://' in h.replace('http://www.w3.org', ''):
        add('WARN', name, 'http 링크', '보안 연결 아님')
    for bad in ['eval(', 'innerHTML +=']:
        if bad in h: add('WARN', name, '위험 패턴', bad)
    if 'document.write(' in h and name != 'dev.html':
        add('WARN', name, '위험 패턴', 'document.write(')
    imgs = re.findall(r'<img[^>]+src="(assets/[^"]+)"', h)
    for src in imgs:
        sz = REPO.get(src, 0)
        if sz > 500_000:
            add('WARN', name, '큰 이미지', f'{src} {round(sz/1024)}KB')
    lazy = len(re.findall(r'<img[^>]*loading="lazy"', h))
    total = len(re.findall(r'<img\b', h))
    if total >= 6 and lazy < total * 0.5:
        add('INFO', name, 'lazy 부족', f'{lazy}/{total}')

    # ── 6. 공통 자원 ──
    if not is_admin:
        for need, why in [('assets/lite.js', '경량 모드'), ('assets/glass.css', '글래스')]:
            if need not in h: add('INFO', name, '공통 자원 누락', f'{need} ({why})')
        if 'og:image' not in h: add('INFO', name, 'OG 이미지 없음', 'SNS 공유 미리보기')
        if not re.search(r'<meta[^>]*name="description"', h):
            add('INFO', name, 'description 없음', '검색 노출')

    # ── 7. 하드코딩 키 노출 ──
    if re.search(r'sk-ant-|github_pat_|re_[A-Za-z0-9]{20,}|SUPABASE_SERVICE', h):
        add('ERROR', name, '비밀키 노출', '클라이언트 코드에 키가 있음')

# ── 출력 ──
print('=' * 62)
print(f'ChewGumi 사이트 검증 — {len(PAGES)}개 페이지')
print('=' * 62)
for lv, mark in [('ERROR', '✕'), ('WARN', '△'), ('INFO', '·')]:
    arr = issues[lv]
    print(f'\n{mark} {lv} — {len(arr)}건')
    if not arr:
        print('   없음')
        continue
    grouped = defaultdict(list)
    for page, rule, detail in arr:
        grouped[rule].append((page, detail))
    for rule in sorted(grouped, key=lambda r: -len(grouped[r])):
        rows = grouped[rule]
        print(f'   [{rule}] {len(rows)}건')
        seen = set()
        for page, detail in rows[:6]:
            k = (page, detail)
            if k in seen: continue
            seen.add(k)
            print(f'      {page:20s} {detail[:60]}')
        if len(rows) > 6: print(f'      … 외 {len(rows)-6}건')

tot = sum(len(v) for v in issues.values())
print('\n' + '=' * 62)
print(f'합계 {tot}건 — 오류 {len(issues["ERROR"])} / 경고 {len(issues["WARN"])} / 정보 {len(issues["INFO"])}')
sys.exit(1 if issues['ERROR'] else 0)
