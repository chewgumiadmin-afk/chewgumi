#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
uxcheck_live.py — 진짜 브라우저로 재는 검사 (uxcheck.py 의 짝)

왜 둘로 나눴나
  `uxcheck.py` 는 파일만 보고 판단합니다. 빠르고, 설치할 것이 없고,
  '이 함수가 정의돼 있나' 같은 것은 그것으로 충분합니다.

  그런데 **화면이 실제로 어떻게 그려지는가**는 파일만 봐서는 알 수 없습니다.
  2026-09-18 에 그것을 비싸게 배웠습니다 — 정적 검사가 R15(좁은 화면)를
  50건 보고했는데, 브라우저로 69장을 재 보니 실제 문제는 2건이었습니다.
  중첩 미디어쿼리, 캐스케이드, 숨은 요소를 정규식으로는 따라갈 수 없습니다.

  그래서 렌더링해야 아는 것은 여기서 봅니다. 여기 결과는 틀릴 여지가 없습니다.
  브라우저가 계산한 값을 그대로 읽기 때문입니다.

무엇을 보나
  L1  입력칸 글자 16px 미만        아이폰이 탭할 때 화면을 확대합니다
  L2  가로 스크롤                  폰에서 화면이 옆으로 밀립니다
  L3  누르는 것이 44px 미만         손가락으로 누르기 어렵습니다
  L4  화면을 열 때 나는 오류        콘솔 오류·페이지 오류

  체크박스·라디오·숨은 칸은 세지 않습니다 — 확대를 일으키지 않습니다.

쓰는 법
  pip install playwright --break-system-packages && playwright install chromium

  python3 scripts/uxcheck_live.py .                 # 폴더의 모든 화면
  python3 scripts/uxcheck_live.py . --only checkout.html cart.html
  python3 scripts/uxcheck_live.py https://shop.chewgumi.com --pages index.html cart.html
  python3 scripts/uxcheck_live.py . --json live.json --width 390

돌아가는 값
  0  문제 없음     1  문제 있음     2  브라우저를 못 띄움
"""
import argparse
import asyncio
import hashlib
import json
import os
import sys

PHONE = 390
DESKTOP = 1280

# 브라우저 안에서 도는 검사. 계산된 값을 그대로 읽습니다.
PROBE = r"""() => {
  const out = { small: [], tap: [], covered: [], counts: {} };

  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.display !== 'none' &&
           s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05;
  };
  const name = (e) =>
    e.id || e.getAttribute('name') ||
    (e.className || '').toString().trim().split(/\s+/)[0] ||
    e.tagName.toLowerCase();

  /* L1 — 입력칸 글자 크기. 확대를 일으키지 않는 형은 뺍니다. */
  const NOZOOM = ['checkbox','radio','range','color','file','submit','button','image','reset'];
  const fields = [...document.querySelectorAll('input, select, textarea')]
    .filter(e => visible(e) && !NOZOOM.includes(e.type));
  out.counts.fields = fields.length;
  for (const e of fields) {
    const px = parseFloat(getComputedStyle(e).fontSize);
    if (px < 16) out.small.push({ what: name(e), px });
  }

  /* L3 — 누르는 것의 크기. 줄 안에 섞인 글자 링크는 뺍니다. */
  const tappable = [...document.querySelectorAll('button, [role=button], input[type=submit], a')]
    .filter(visible);
  out.counts.tappable = tappable.length;
  for (const e of tappable) {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    /* 줄 속 글자 링크는 뺍니다 — 44px 규칙은 '단추'에 대한 것입니다. */
    if (e.tagName === 'A') {
      const looksButton = s.borderRadius !== '0px' || s.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                          /block|flex|inline-flex|inline-block/.test(s.display);
      if (!looksButton) continue;
      if (s.display === 'inline-block' && r.height < 30) continue;  /* 작은 꼬리표 링크 */
    }
    /* 머리말·꼬리말 안의 것은 뺍니다 — 본문 동작이 아닙니다. */
    if (e.closest('header, footer, nav, .foot, .top, .gnb')) continue;
    if (r.height < 44 && r.width >= 40) {
      out.tap.push({ what: name(e), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  /* L5 는 뺐습니다 — 2026-09-18.
     ?qa=1 로 켜지는 QA 오버레이가 시험 중에 화면을 덮어서
     '못 누른다'는 거짓 경고가 쏟아졌습니다. 손님 화면에는 뜨지 않는 것이라
     검사 결과를 믿을 수 없었습니다. 겹침 검사는 실제 손님 조건을 만든 뒤에 넣습니다. */

  out.scrollW = document.documentElement.scrollWidth;
  out.clientW = document.documentElement.clientWidth;
  return out;
}"""


def fp(rule, page, key):
    return hashlib.sha256(("%s|%s|%s" % (rule, page, key)).encode()).hexdigest()[:12]


async def probe(page, url, width, settle):
    errs = []
    page.on("console", lambda m: errs.append(m.text[:120]) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)[:120]))
    await page.set_viewport_size({"width": width, "height": 880})
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(settle)
    except Exception as e:
        return None, [str(e)[:120]]
    return await page.evaluate(PROBE), errs


async def run(args):
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("  ! playwright 가 없습니다.\n"
              "    pip install playwright --break-system-packages && playwright install chromium",
              file=sys.stderr)
        return 2

    src = args.root
    remote = src.startswith("http")
    if remote:
        pages = args.pages or ["index.html"]
        urls = [(p, src.rstrip("/") + "/" + p) for p in pages]
    else:
        root = os.path.abspath(src)
        names = args.only or sorted(
            f for f in os.listdir(root)
            if f.endswith(".html") and f not in ("qa-tool.html", "dev.html"))
        urls = [(p, "file://" + os.path.join(root, p)) for p in names]

    findings = []
    taps = {}   # (이름,너비,높이) -> 나온 화면들. 공통 요소는 한 건으로 묶습니다.
    async with async_playwright() as pw:
        try:
            br = await pw.chromium.launch(args=["--no-sandbox"])
        except Exception as e:
            print("  ! 브라우저를 못 띄웠습니다: %s" % e, file=sys.stderr)
            return 2
        pg = await br.new_page()
        for name, url in urls:
            r, errs = await probe(pg, url, args.width, args.settle)
            if r is None:
                findings.append({"rule": "L4", "page": name, "what": "화면을 열지 못했습니다",
                                 "detail": errs[0] if errs else "", "sev": "bug",
                                 "fp": fp("L4", name, "open-fail")})
                continue
            for s in r["small"]:
                findings.append({"rule": "L1", "page": name,
                                 "what": "%s · %gpx" % (s["what"], s["px"]),
                                 "detail": "입력칸 글자가 %gpx 입니다. 아이폰이 탭할 때 화면을 "
                                           "확대해서 손님이 매번 손으로 되돌려야 합니다." % s["px"],
                                 "sev": "bug", "fp": fp("L1", name, s["what"])})
            ov = r["scrollW"] - r["clientW"]
            if ov > 0:
                findings.append({"rule": "L2", "page": name, "what": "가로로 %dpx 넘침" % ov,
                                 "detail": "폰에서 화면이 옆으로 밀립니다.",
                                 "sev": "bug", "fp": fp("L2", name, "overflow")})
            for t in r["tap"][:5]:
                taps.setdefault((t["what"], t["w"], t["h"]), []).append(name)
            for e in errs[:3]:
                if remote or not e.startswith("Failed to load resource"):
                    findings.append({"rule": "L4", "page": name, "what": e[:70],
                                     "detail": "화면을 열 때 오류가 났습니다.",
                                     "sev": "warn", "fp": fp("L4", name, e[:40])})
        await br.close()

    # L3 는 화면마다 내지 않고 요소별로 묶습니다.
    # 머리말의 뒤로 단추 하나가 40장에 나오면 그건 40건이 아니라 1건입니다.
    for (what, w, h), pages in sorted(taps.items(), key=lambda kv: -len(kv[1])):
        where = pages[0] if len(pages) == 1 else "%d개 화면 공통" % len(pages)
        findings.append({"rule": "L3", "page": where,
                         "what": "%s · %d×%d" % (what, w, h),
                         "detail": "누르는 것이 %dpx 높이입니다. 44px 이상이 좋습니다. "
                                   "나온 곳: %s" % (h, ", ".join(pages[:6])),
                         "sev": "warn", "fp": fp("L3", "*", what)})

    bugs = [f for f in findings if f["sev"] == "bug"]
    print("\n브라우저 검사 · 폭 %dpx · 화면 %d 장" % (args.width, len(urls)))
    print("─" * 74)
    cur = None
    for f in findings:
        if f["page"] != cur:
            cur = f["page"]
            print("\n  %s" % cur)
        print("    %s %-4s %s" % ("✕" if f["sev"] == "bug" else "!", f["rule"], f["what"]))
    if not findings:
        print("  ✓ 걸린 것이 없습니다.")
    print("\n" + "─" * 74)
    print("  ✕ 버그 %d · ! 주의 %d" % (len(bugs), len(findings) - len(bugs)))

    if args.json:
        json.dump({"width": args.width, "pages": [u[0] for u in urls], "findings": findings},
                  open(args.json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("  → %s" % args.json)
    return 1 if bugs else 0


def main():
    ap = argparse.ArgumentParser(description="브라우저로 재는 UX 검사")
    ap.add_argument("root", help="저장소 폴더 또는 https 주소")
    ap.add_argument("--only", nargs="*", help="이 화면만 (폴더일 때)")
    ap.add_argument("--pages", nargs="*", help="이 경로들 (주소일 때)")
    ap.add_argument("--width", type=int, default=PHONE, help="화면 폭 (기본 390)")
    ap.add_argument("--settle", type=int, default=600, help="그려질 때까지 기다릴 ms")
    ap.add_argument("--json", help="결과를 JSON 으로")
    return asyncio.run(run(ap.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
