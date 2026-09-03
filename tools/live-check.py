#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
live-check.py — 브라우저를 띄워 실제로 눌러보는 검사기.

  코드만 읽어서는 못 잡는 것들을 잡습니다.
    1) 콘솔 오류 · 실패한 통신(4xx·5xx)
    2) 같은 주소를 두 번 이상 부르는 것 (중복 호출)
    3) 눌렀는데 아무 일도 안 일어나는 단추
    4) 로그인·로그아웃이 동시에 보이는 것 같은 화면 규칙 위반
    5) 화면 폭별로 같은 메뉴가 여러 개 보이는 것

사용:
  python3 tools/live-check.py                    # 기본 화면 전부
  python3 tools/live-check.py index product      # 특정 화면만
  python3 tools/live-check.py --base http://localhost:8000
"""
import sys, json, re, time

BASE = 'https://shop.chewgumi.com'
PAGES = ['index', 'shop', 'product?no=18', 'cart', 'login', 'join',
         'mypage', 'order-lookup', 'tracking', 'about', 'faq', 'guide',
         'qna', 'review', 'notice', 'terms', 'privacy']

WIDTHS = [(1280, 'PC'), (900, '경계'), (390, '폰')]

# 눌러도 안전한 것만 (결제·삭제·주문은 건드리지 않습니다)
UNSAFE = re.compile(
    r'결제|주문하기|삭제|탈퇴|취소|환불|발송|로그아웃|withdraw|delete|pay|order|submit',
    re.I)


SB = 'https://psynvpuedzjvytsgdhgg.supabase.co'
KEY = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk'


def login(email, pw):
    """검사 계정으로 토큰을 받아 옵니다. 브라우저에 심어 로그인 상태로 검사합니다."""
    import json as _j, urllib.request as _u
    r = _u.Request(SB + '/auth/v1/token?grant_type=password', method='POST',
                   data=_j.dumps({'email': email, 'password': pw}).encode(),
                   headers={'apikey': KEY, 'Content-Type': 'application/json'})
    d = _j.loads(_u.urlopen(r).read())
    if not d.get('access_token'):
        raise RuntimeError('로그인 실패')
    return d


def run(base, pages, auth=None):
    from playwright.sync_api import sync_playwright
    import json as _j

    report = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox', '--ignore-certificate-errors'])

        for path in pages:
            name = path.split('?')[0]
            ctx = browser.new_context(ignore_https_errors=True,
                                      viewport={'width': 1280, 'height': 900})
            if auth:
                # 화면이 열리기 전에 세션을 심습니다 (사이트가 쓰는 것과 같은 모양)
                sess = {'t': auth['access_token'], 'r': auth.get('refresh_token', ''),
                        'e': 0, 'exp': 0, 'u': 'qa-bot', 'em': auth['user']['email']}
                import time as _t
                sess['e'] = int((_t.time() + auth.get('expires_in', 3600)) * 1000)
                sess['exp'] = int(_t.time() + auth.get('expires_in', 3600))
                ctx.add_init_script(
                    "try{localStorage.setItem('cg_sb', %s);"
                    "sessionStorage.setItem('cg_alive','1');}catch(e){}"
                    % _j.dumps(_j.dumps(sess)))
            page = ctx.new_page()

            errors, bad_res, calls = [], [], {}

            page.on('console', lambda m: errors.append(m.text[:160])
                    if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append('예외: ' + str(e)[:160]))

            def on_res(r):
                if r.status >= 400:
                    bad_res.append('%s %s' % (r.status, r.url.split('?')[0][-70:]))

            def on_req(r):
                # 조건(?board=eq.notice)이 다르면 다른 요청입니다.
                # 주소를 통째로 세야 진짜 중복만 잡힙니다.
                u = r.url
                if '/rest/v1/' in u or '/functions/v1/' in u or '/auth/v1/' in u:
                    calls[u] = calls.get(u, 0) + 1

            page.on('response', on_res)
            page.on('request', on_req)

            try:
                page.goto('%s/%s.html' % (base, path) if '?' not in path
                          else '%s/%s' % (base, path.replace('?', '.html?')),
                          wait_until='networkidle', timeout=60000)
            except Exception as e:
                report.append((name, {'열기 실패': [str(e)[:120]]}))
                ctx.close()
                continue

            page.wait_for_timeout(2500)

            found = {}
            if errors:
                found['콘솔 오류'] = sorted(set(errors))[:6]
            if bad_res:
                found['실패한 통신'] = sorted(set(bad_res))[:6]

            def short(u):
                t = u.split('/rest/v1/')[-1].split('/functions/v1/')[-1]
                t = t.split('/auth/v1/')[-1]
                return t[:70]
            dup = ['%s × %d' % (short(u), n) for u, n in calls.items() if n > 1]
            if dup:
                found['같은 주소를 여러 번'] = dup

            # 로그인/로그아웃 동시 노출
            both = page.evaluate("""() => {
              const vis = el => { const r = el.getBoundingClientRect();
                const s = getComputedStyle(el);
                return r.width > 0 && r.height > 0 && s.display !== 'none' &&
                       s.visibility !== 'hidden' && r.top < innerHeight * 3; };
              const txt = el => (el.textContent || '').trim().toUpperCase();
              const inNav = el => !!el.closest(
                'nav,header,footer,.util,.d-auth,.m-nav,.nav,.menu,.drawer,' +
                '.links,.gnb,.lnb,.u-menu,.nav-auth,.ft-auth,.tabs');
              const as = [...document.querySelectorAll('a,button')].filter(e => vis(e) && inNav(e));
              const inn = as.filter(e => /^(LOGIN|로그인)$/.test(txt(e))).length;
              const out = as.filter(e => /^(LOGOUT|로그아웃)$/.test(txt(e))).length;
              const my  = as.filter(e => /^(MY PAGE|MY|마이페이지)$/.test(txt(e))).length;
              return { inn, out, my };
            }""")
            if both['inn'] and both['out']:
                found['로그인·로그아웃 동시 노출'] = ['LOGIN %d개 · LOGOUT %d개'
                                                % (both['inn'], both['out'])]

            # 화면 폭별 메뉴 중복
            wide = []
            for w, label in WIDTHS:
                page.set_viewport_size({'width': w, 'height': 900})
                page.wait_for_timeout(400)
                c = page.evaluate("""() => {
                  const vis = el => { const r = el.getBoundingClientRect();
                    const s = getComputedStyle(el);
                    return r.width > 0 && r.height > 0 && s.display !== 'none' &&
                           s.visibility !== 'hidden'; };
                  /* 문장 속 링크는 메뉴가 아닙니다.
                     머리글·메뉴·서랍·바닥글 안에 있는 것만 셉니다. */
                  const inNav = el => !!el.closest(
                    'nav,header,footer,.util,.d-auth,.m-nav,.nav,.menu,.drawer,' +
                    '.links,.gnb,.lnb,.u-menu,.nav-auth,.ft-auth,.tabs');
                  return [...document.querySelectorAll('a')].filter(e =>
                    vis(e) && inNav(e) &&
                    /^(MY PAGE|MY|마이페이지)$/.test((e.textContent||'').trim().toUpperCase())
                  ).length;
                }""")
                if c > 1:
                    wide.append('%s(%dpx) 에서 %d개' % (label, w, c))
            if wide:
                found['마이페이지 메뉴 중복'] = wide
            page.set_viewport_size({'width': 1280, 'height': 900})

            # 눌러도 아무 일 없는 단추
            dead = []
            btns = page.query_selector_all('button')
            for i, b in enumerate(btns[:24]):
                try:
                    if not b.is_visible():
                        continue
                    t = (b.inner_text() or '').strip()
                    if not t or UNSAFE.search(t):
                        continue
                    # 이미 켜져 있는 탭은 눌러도 안 바뀌는 게 정상입니다
                    cls = (b.get_attribute('class') or '')
                    if 'on' in cls.split() or 'active' in cls.split():
                        continue
                    before = page.evaluate(
                        "() => document.body.innerHTML.length + '|' + location.href")
                    b.click(timeout=1500)
                    page.wait_for_timeout(450)
                    after = page.evaluate(
                        "() => document.body.innerHTML.length + '|' + location.href")
                    if before == after:
                        dead.append(t[:24])
                    if page.url.split('#')[0] != ('%s/%s.html' % (base, name)):
                        page.go_back(timeout=8000)
                        page.wait_for_timeout(600)
                except Exception:
                    pass
            if dead:
                found['눌러도 화면이 안 바뀜'] = sorted(set(dead))[:8]

            if found:
                report.append((name, found))
            ctx.close()
            print('  검사함 %-16s %s' % (name, '문제 %d종' % len(found) if found else 'OK'))

        browser.close()
    return report


def main():
    skip = set()
    for flag, n in (('--base', 1), ('--login', 2)):
        if flag in sys.argv:
            i = sys.argv.index(flag)
            skip.update(range(i, i + n + 1))
    args = [a for j, a in enumerate(sys.argv) if j >= 1 and j not in skip
            and not a.startswith('--')]
    base = BASE
    if '--base' in sys.argv:
        base = sys.argv[sys.argv.index('--base') + 1]
    pages = args or PAGES

    auth = None
    if '--login' in sys.argv:
        i = sys.argv.index('--login')
        email, pw = sys.argv[i + 1], sys.argv[i + 2]
        auth = login(email, pw)
        print('로그인함:', email)

    print('브라우저로 실제 눌러봅니다 —', base)
    print()
    rep = run(base, pages, auth)

    print()
    print('=' * 62)
    if not rep:
        print('문제 없음')
        return 0
    total = 0
    for name, found in rep:
        print()
        print('■', name)
        for k, v in found.items():
            total += len(v)
            print('   %s' % k)
            for x in v:
                print('      -', x)
    print()
    print('─' * 62)
    print('화면 %d개에서 %d건' % (len(rep), total))
    return 1


if __name__ == '__main__':
    sys.exit(main())
