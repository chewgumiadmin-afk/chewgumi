#!/usr/bin/env python3
"""화면의 단추에서 「무엇을 하는 기능인지」를 뽑아냅니다.

왜 만들었나
-----------
비서가 일을 시키려면 「어떤 도구를 어떤 값으로 부를지」를 알아야 합니다.
그 목록을 손으로 적으면, 화면이 바뀔 때마다 따로 고쳐야 하고 금세 어긋납니다.

그런데 그 정보는 이미 화면에 있습니다.

    <button onclick="ship(o.order_no)">발송</button>
      ↓ 단추 글자 = 사람이 부르는 이름
      ↓ 핸들러   = 실제로 하는 일
    function ship(no){ ... fetch(SB+'/functions/v1/ship-mail', {method:'POST',
                               body: JSON.stringify({order_no:no, courier, tracking_no}) }) }
      ↓ 주소·방식·보내는 값 = 도구의 입력

그래서 손으로 등록하는 대신 **읽어서 만듭니다.**

쓰는 법
-------
    python3 scripts/tools_from_buttons.py                 사람이 읽는 표
    python3 scripts/tools_from_buttons.py --json          기계가 읽는 목록
    python3 scripts/tools_from_buttons.py orders.html     한 화면만

한계 — 정직하게
---------------
정규식으로 읽습니다. 자바스크립트를 실행하지 않으므로
  · 주소를 변수로 조립하는 곳은 그대로 보입니다 (`SB+'/rest/v1/'+t`)
  · 보내는 값이 함수 밖에서 만들어지면 못 잡습니다
잡은 것을 그대로 믿지 말고, 도구로 쓰기 전에 그 함수를 한 번 열어 보세요.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 운영자가 쓰는 화면만 봅니다. 손님 화면의 단추는 비서가 대신 누를 일이 없습니다.
ADMIN = """orders.html stock.html members.html posts.html subs-admin.html manage.html
console.html hub.html ops.html products.html keys.html channels.html reports-admin.html
order-detail.html review-import.html sns.html drive.html""".split()

BUTTON = re.compile(
    r"<button\b[^>]*\bonclick\s*=\s*[\"']([A-Za-z_$][\w$]*)\s*\(([^\"']*?)\)[^\"']*[\"'][^>]*>(.*?)</button>",
    re.S | re.I)
FUNC = re.compile(r"(?:async\s+)?function\s+%s\s*\(([^)]*)\)\s*\{")
FETCH = re.compile(
    r"fetch\s*\(\s*([^,)]{1,160}?)\s*(?:,\s*\{(.{0,600}?)\})?\s*\)", re.S)
METHOD = re.compile(r"method\s*:\s*['\"]([A-Z]+)['\"]", re.I)
BODYKEYS = re.compile(r"JSON\.stringify\s*\(\s*\{(.{0,400}?)\}", re.S)
KEY = re.compile(r"([A-Za-z_$][\w$]*)\s*:")


def scripts_of(html):
    return "\n".join(re.findall(r"<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>",
                                html, re.S | re.I))


def body_of(js, name):
    """함수 본문을 중괄호 짝을 세어 잘라냅니다."""
    m = FUNC.pattern
    mm = re.search(m % re.escape(name), js)
    if not mm:
        return "", ""
    i = js.index("{", mm.end() - 1)
    depth, j = 0, i
    while j < len(js):
        if js[j] == "{":
            depth += 1
        elif js[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    return mm.group(1).strip(), js[i:j + 1]


def calls_in(body):
    """본문 안의 fetch 를 (주소, 방식, 보내는 값 이름들) 로."""
    out = []
    for fm in FETCH.finditer(body):
        url = re.sub(r"\s+", " ", fm.group(1)).strip()
        opts = fm.group(2) or ""
        meth = (METHOD.search(opts).group(1).upper() if METHOD.search(opts) else "GET")
        keys = []
        bk = BODYKEYS.search(opts)
        if bk:
            keys = sorted({k for k in KEY.findall(bk.group(1))})
        out.append({"url": url[:120], "method": meth, "sends": keys})
    return out


def scan(name):
    p = ROOT / name
    if not p.exists():
        return []
    html = p.read_text(encoding="utf-8", errors="replace")
    js = scripts_of(html)
    seen, rows = set(), []
    for b in BUTTON.finditer(html):
        fn, args, label = b.group(1), b.group(2).strip(), b.group(3)
        label = re.sub(r"<[^>]+>", "", label)
        label = re.sub(r"\s+", " ", label).strip()
        if not label or fn in ("if", "return"):
            continue
        if (fn, label) in seen:
            continue
        seen.add((fn, label))
        params, body = body_of(js, fn)
        if not body:
            continue
        calls = [c for c in calls_in(body) if "/rest/v1/" in c["url"] or "/functions/v1/" in c["url"]]
        if not calls:
            continue
        rows.append({"screen": name, "label": label, "handler": fn,
                     "params": params, "args": args, "calls": calls})
    return rows


def main():
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or ADMIN
    rows = [r for n in names for r in scan(n)]

    if "--json" in sys.argv:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0

    cur = None
    for r in rows:
        if r["screen"] != cur:
            cur = r["screen"]
            print(f"\n=== {cur} ===")
        print(f"  「{r['label']}」  {r['handler']}({r['params']})")
        for c in r["calls"]:
            send = (" ← " + ", ".join(c["sends"])) if c["sends"] else ""
            print(f"      {c['method']:6} {c['url']}{send}")
    print(f"\n단추에서 뽑은 기능 {len(rows)} 개 · 화면 {len({r['screen'] for r in rows})} 곳")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
