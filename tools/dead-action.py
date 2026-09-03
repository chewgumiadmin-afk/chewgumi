#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dead-action.py — 눌러도 아무 일 없는 단추·링크를 찾습니다.

  onclick 도 없고, id 도 없고,
  그 class 를 JS 에서 붙잡는 곳(querySelector·addEventListener)도 없으면
  진짜로 아무 동작이 없는 것입니다.

사용:  python3 tools/dead-action.py
"""
import io, re, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = set("""index product shop cart checkout pay-return order-lookup mypage login join
reset wish subscribe tracking review-write about faq guide qna review notice
terms privacy help reports grievance""".split())

A = re.compile(r'<a\b([^>]*)>(.*?)</a>', re.S)
B = re.compile(r'<button\b([^>]*)>(.*?)</button>', re.S)
CLS = re.compile(r'class\s*=\s*"([^"]*)"')
HREF = re.compile(r'href\s*=\s*"([^"]*)"')


def wired(attrs, page):
    """이 요소가 어떤 식으로든 연결돼 있는가"""
    if any(k in attrs for k in ('onclick', 'onchange', 'onsubmit', 'id=',
                                'data-', 'type="submit"', 'download')):
        return True
    m = CLS.search(attrs)
    if m:
        for c in m.group(1).split():
            if not c:
                continue
            # JS 가 이 class 를 붙잡는지
            if re.search(r'''querySelector(?:All)?\(\s*['"][^'"]*\.''' + re.escape(c), page):
                return True
            if re.search(r'''closest\(\s*['"]\.''' + re.escape(c), page):
                return True
            if re.search(r'''getElementsByClassName\(\s*['"]''' + re.escape(c), page):
                return True
            if re.search(r'''matches\(\s*['"]\.''' + re.escape(c), page):
                return True
            # 위임 처리 — e.target.classList.contains('x')
            if re.search(r'''classList\.contains\(\s*['"]''' + re.escape(c), page):
                return True
    # 태그로 통째로 붙잡는 경우 — d.querySelector('button')
    if re.search(r'''querySelector\(\s*['"]button['"]''', page):
        return True
    return False


def txt_of(inner):
    t = re.sub(r'<[^>]+>', '', inner)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def scan(path):
    page = io.open(path, encoding='utf-8', errors='ignore').read()
    out = []

    for m in B.finditer(page):
        attrs, inner = m.group(1), m.group(2)
        if wired(attrs, page):
            continue
        t = txt_of(inner)
        if not t or len(t) > 30 or "'" in t or '+' in t:
            continue
        out.append(('단추', t))

    for m in A.finditer(page):
        attrs, inner = m.group(1), m.group(2)
        h = HREF.search(attrs)
        href = h.group(1) if h else ''
        if href not in ('', '#', 'javascript:void(0)'):
            continue
        if wired(attrs, page):
            continue
        t = txt_of(inner)
        if not t or len(t) > 30 or "'" in t or '+' in t:
            continue
        out.append(('링크', t))

    seen, uniq = set(), []
    for k, t in out:
        if (k, t) in seen:
            continue
        seen.add((k, t))
        uniq.append((k, t))
    return uniq


def main():
    total = 0
    for p in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        n = os.path.basename(p)[:-5]
        if n not in SHOP:
            continue
        d = scan(p)
        if not d:
            continue
        total += len(d)
        print('■', n)
        for k, t in d:
            print('   %s  %s' % (k, t))
    print()
    print('─' * 46)
    print('아무 동작 없는 곳 %d 곳' % total)
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
