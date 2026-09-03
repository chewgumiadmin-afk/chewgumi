#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
flow-trace.py — 화면이 실제로 부르는 것들을 뽑아 끊긴 연결을 찾습니다.

  1) 화면마다 정의한 함수 / 부르는 함수를 뽑습니다
  2) onclick·onchange 로 부르는데 정의가 없는 함수  → 눌러도 아무 일 없는 단추
  3) /functions/v1/<이름> 중 실제로 배포되지 않은 것 → 404
  4) href="xxx.html" 중 파일이 없는 것              → 죽은 링크
  5) /rest/v1/<표> 중 없는 표                        → 404

사용:  python3 tools/flow-trace.py [화면...]
"""
import io, os, re, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 브라우저·표준 전역 (정의를 찾지 않아도 되는 것들) ──────────────
BUILTIN = set("""
if for while switch catch return typeof function do else try finally new delete void
in of case break continue throw class extends super this let var const await async yield
Math JSON Object Array String Number Boolean Date RegExp Promise Map Set WeakMap Error
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI
setTimeout setInterval clearTimeout clearInterval requestAnimationFrame cancelAnimationFrame
fetch alert confirm prompt console document window location history navigator localStorage
sessionStorage FormData URLSearchParams URL Intl Symbol Proxy Reflect BigInt
addEventListener removeEventListener dispatchEvent querySelector querySelectorAll
getElementById getElementsByClassName getElementsByTagName createElement matchMedia
Image FileReader Blob File Audio Notification IntersectionObserver MutationObserver
ResizeObserver AbortController TextEncoder TextDecoder atob btoa structuredClone
open close focus blur scrollTo scrollIntoView preventDefault stopPropagation
map filter reduce forEach join split slice splice concat push pop shift unshift
indexOf lastIndexOf includes find findIndex sort reverse some every flat flatMap
replace replaceAll match matchAll test exec trim toLowerCase toUpperCase padStart padEnd
startsWith endsWith repeat charAt charCodeAt fromCharCode substring substr
keys values entries assign freeze stringify parse then catch_ finally_ all race
toFixed toString valueOf toLocaleString toLocaleDateString toLocaleTimeString
getTime getFullYear getMonth getDate getHours getMinutes getSeconds getDay
require import export default eval arguments undefined null true false NaN Infinity
""".split())

FN_DEF = [
    re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\('),
    re.compile(r'\bwindow\.([A-Za-z_$][\w$]*)\s*='),
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\()'),
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\s*=>'),
]
HANDLER = re.compile(r'\bon(?:click|change|input|submit|focus|blur|keyup|keydown)\s*=\s*"([^"]*)"')
CALL_IN_HANDLER = re.compile(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(')
EDGE = re.compile(r'/functions/v1/([a-zA-Z0-9_-]+)')
REST = re.compile(r'/rest/v1/(?:rpc/)?([a-zA-Z0-9_]+)')
RPC = re.compile(r'/rest/v1/rpc/([a-zA-Z0-9_]+)')
HREF = re.compile(r'href\s*=\s*"([^"#?]+\.html)')
LOCHREF = re.compile(r"location\.href\s*=\s*['\"]([^'\"#?]+\.html)")
SRC = re.compile(r'<script[^>]+src\s*=\s*"([^"]+\.js)"')


def read(p):
    return io.open(p, encoding='utf-8', errors='ignore').read()


def scan(path):
    s = read(path)
    d = os.path.dirname(path) or '.'

    # 이 화면이 함께 불러오는 assets/*.js 도 정의 목록에 포함
    extra = ''
    for js in SRC.findall(s):
        jp = os.path.normpath(os.path.join(d, js))
        if os.path.isfile(jp):
            extra += '\n' + read(jp)

    body = s + extra
    defined = set()
    for rx in FN_DEF:
        defined |= set(rx.findall(body))

    handlers = {}
    for h in HANDLER.findall(s):
        for fn in CALL_IN_HANDLER.findall(h):
            if fn not in BUILTIN:
                handlers.setdefault(fn, 0)
                handlers[fn] += 1

    return {
        'file': os.path.basename(path),
        'defined': defined,
        'handlers': handlers,
        'edge': sorted(set(EDGE.findall(s))),
        'rpc': sorted(set(RPC.findall(s))),
        'rest': sorted(set(REST.findall(s)) - set(RPC.findall(s))),
        'links': sorted(set(HREF.findall(s)) | set(LOCHREF.findall(s))),
        'scripts': SRC.findall(s),
    }


def main():
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, '*.html')))
    files = [f if os.path.isabs(f) else os.path.join(ROOT, f) for f in files]

    deployed = set()
    fnlist = os.path.join(ROOT, 'tools', 'edge-functions.txt')
    if os.path.isfile(fnlist):
        deployed = {l.strip() for l in open(fnlist) if l.strip()}

    tables = set()
    tlist = os.path.join(ROOT, 'tools', 'db-objects.txt')
    if os.path.isfile(tlist):
        tables = {l.strip() for l in open(tlist) if l.strip()}

    have = {os.path.basename(p) for p in glob.glob(os.path.join(ROOT, '*.html'))}

    reports, bugs = [], 0
    for p in files:
        if not os.path.isfile(p):
            continue
        r = scan(p)
        dead_fn = sorted(f for f in r['handlers'] if f not in r['defined'])
        dead_link = [l for l in r['links'] if os.path.basename(l) not in have]
        dead_edge = [e for e in r['edge'] if deployed and e not in deployed]
        dead_tbl = [t for t in r['rest'] if tables and t not in tables]
        dead_rpc = [t for t in r['rpc'] if tables and t not in tables]

        n = len(dead_fn) + len(dead_link) + len(dead_edge) + len(dead_tbl) + len(dead_rpc)
        bugs += n
        if n:
            reports.append((r['file'], dead_fn, dead_link, dead_edge, dead_tbl, dead_rpc))

    for f, fn, ln, eg, tb, rp in reports:
        print('\n■', f)
        if fn: print('   눌러도 안 되는 단추(정의 없음):', ', '.join(fn))
        if ln: print('   없는 화면으로 가는 링크        :', ', '.join(ln))
        if eg: print('   배포 안 된 서버 함수           :', ', '.join(eg))
        if tb: print('   없는 표                        :', ', '.join(tb))
        if rp: print('   없는 RPC                       :', ', '.join(rp))

    print('\n─────────────────────────────')
    print('검사한 화면 %d개 · 끊긴 곳 %d건' % (len(files), bugs))
    return 1 if bugs else 0


if __name__ == '__main__':
    sys.exit(main())
