#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
page-audit.py — 손님이 보는 화면을 한 벌로 훑습니다.

  1) 디자인 — 메인(index)과 같은 색·글꼴을 쓰는가
  2) 세션   — 로그인이 유지되는가 (tok.js · auth.js)
  3) 메뉴   — 로그인 표시가 메인과 같은가 (navauth.js)
  4) 동작   — 눌러도 아무 일 없는 단추 · 없는 화면으로 가는 링크

사용:  python3 tools/page-audit.py
"""
import io, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 손님이 보는 화면
SHOP = """index product shop cart checkout pay-return order-lookup mypage login join
reset wish subscribe tracking review-write about faq guide qna review notice
terms privacy help reports grievance""".split()

# 메인이 쓰는 브랜드 색 (이게 없으면 다른 디자인)
BRAND = ['#D82558', '#E95073']
# 다른 디자인 표시 (애플 회색 계열)
FOREIGN = ['#1d1d1f', '#86868b', '#0071e3', '#f5f5f7']

NEED = {
    'tok.js':     'assets/tok.js',      # 세션 읽기·저장
    'auth.js':    'assets/auth.js',     # 자동 연장
    'navauth.js': 'assets/navauth.js',  # 로그인 메뉴 표시
}

BUILTIN = set("""if for while switch catch return typeof function do else try new delete
this let var const Math JSON Object Array String Number Date Promise fetch alert confirm
prompt console document window location setTimeout setInterval clearTimeout parseInt
parseFloat encodeURIComponent decodeURIComponent URLSearchParams FormData localStorage
sessionStorage history navigator Image event""".split())

HANDLER = re.compile(r'\bon(?:click|change|input|submit|keydown|keyup)\s*=\s*"([^"]*)"')
CALL = re.compile(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(')
FN_DEF = [
    re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\('),
    re.compile(r'\bwindow\.([A-Za-z_$][\w$]*)\s*='),
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\()'),
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\s*=>'),
]
SRC = re.compile(r'<script[^>]+src\s*=\s*"([^"]+\.js)"')
HREF = re.compile(r'href\s*=\s*"([^"#?]+\.html)')


def read(p):
    return io.open(p, encoding='utf-8', errors='ignore').read()


def audit(name):
    p = os.path.join(ROOT, name + '.html')
    if not os.path.isfile(p):
        return None
    s = read(p)

    # 함께 불러오는 js 도 정의 목록에 포함
    body = s
    for js in SRC.findall(s):
        jp = os.path.join(ROOT, js)
        if os.path.isfile(jp):
            body += '\n' + read(jp)

    defined = set()
    for rx in FN_DEF:
        defined |= set(rx.findall(body))

    called = set()
    for h in HANDLER.findall(s):
        for fn in CALL.findall(h):
            if fn not in BUILTIN:
                called.add(fn)
    dead_fn = sorted(called - defined)

    have = {os.path.basename(x) for x in glob.glob(os.path.join(ROOT, '*.html'))}
    dead_link = sorted({l for l in HREF.findall(s)
                        if '{' not in l and '+' not in l
                        and os.path.basename(l) not in have})

    brand = any(c in s for c in BRAND)
    foreign = sorted({c for c in FOREIGN if c in s})
    scripts = {k: (v in s) for k, v in NEED.items()}

    return dict(name=name, brand=brand, foreign=foreign,
                scripts=scripts, dead_fn=dead_fn, dead_link=dead_link)


def main():
    rows = [r for r in (audit(n) for n in SHOP) if r]

    print('■ 디자인 — 메인과 같은 색을 쓰는가')
    print('%-16s %-8s %s' % ('화면', '브랜드색', '다른 디자인 색'))
    print('-' * 62)
    for r in rows:
        if r['brand'] and not r['foreign']:
            continue
        print('%-16s %-8s %s' % (r['name'],
              '있음' if r['brand'] else '❌없음',
              ', '.join(r['foreign']) or '-'))

    print()
    print('■ 세션 — 로그인이 유지되는가')
    print('%-16s %-8s %-8s %s' % ('화면', 'tok.js', 'auth.js', 'navauth.js'))
    print('-' * 62)
    for r in rows:
        sc = r['scripts']
        if all(sc.values()):
            continue
        print('%-16s %-8s %-8s %s' % (r['name'],
              'O' if sc['tok.js'] else '❌',
              'O' if sc['auth.js'] else '❌',
              'O' if sc['navauth.js'] else '❌'))

    print()
    print('■ 동작 — 눌러도 안 되는 단추 · 없는 화면 링크')
    print('-' * 62)
    bad = 0
    for r in rows:
        if not r['dead_fn'] and not r['dead_link']:
            continue
        bad += len(r['dead_fn']) + len(r['dead_link'])
        print(r['name'])
        if r['dead_fn']:
            print('   정의 없는 함수 :', ', '.join(r['dead_fn']))
        if r['dead_link']:
            print('   없는 화면 링크 :', ', '.join(r['dead_link']))
    if not bad:
        print('   (없음)')

    print()
    print('─' * 62)
    nd = sum(1 for r in rows if not r['brand'] or r['foreign'])
    ns = sum(1 for r in rows if not all(r['scripts'].values()))
    print('화면 %d개 · 디자인 어긋남 %d · 세션 빠짐 %d · 동작 문제 %d'
          % (len(rows), nd, ns, bad))
    return 1 if (nd or ns or bad) else 0


if __name__ == '__main__':
    sys.exit(main())
