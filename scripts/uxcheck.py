#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
uxcheck.py — 츄구미 UX-RULES R1~R15 정적 검사 · 지문 중복방지 · 이슈 자동 등록

표준 라이브러리만 씁니다. (설치할 것 없음)

  python3 scripts/uxcheck.py .                      # 검사만, 사람이 읽는 표
  python3 scripts/uxcheck.py . --report md          # 마크다운 보고서
  python3 scripts/uxcheck.py . --json out.json      # 기계가 읽는 결과
  python3 scripts/uxcheck.py . --issues issues.json # 등록할 이슈 초안만 뽑기
  python3 scripts/uxcheck.py . --github --dry-run   # 등록될 이슈를 보기만
  python3 scripts/uxcheck.py . --github             # 실제 등록 (새 지문만)
  python3 scripts/uxcheck.py . --gumi scripts/gumi.py   # 등록을 gumi.py 에 위임

핵심 개념 — 지문(fingerprint)
  발견 하나 = sha256(규칙 + 파일 + 증거키)[:12]
  같은 문제를 매번 새 이슈로 올리지 않기 위한 유일키입니다.
  지문은 두 군데에 남습니다.
    1) .uxcheck-state.json  (로컬 캐시 — 빠름, 지워져도 됨)
    2) 이슈 본문의 <!-- uxcheck:fp=xxxxxxxxxxxx --> (진짜 기준 — 저장소에 남음)
  로컬 캐시가 없어도 GitHub 검색으로 복구되므로, 예약 작업이 다른 기계에서
  돌아도 중복 등록되지 않습니다.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

VERSION = "1.2"
STATE_FILE = ".uxcheck-state.json"
API = "https://api.github.com"

# ─────────────────────────────────────────────────────────────
# 규칙 표 (docs/UX-RULES.md 와 1:1)
# ─────────────────────────────────────────────────────────────
RULES = {
    "R1":  ("값이 있으면 보여주기",     "warn"),
    "R2":  ("주소는 찾기로만",          "bug"),
    "R3":  ("버튼은 반드시 일해야",     "bug"),
    "R4":  ("같은 id 는 하나만",        "bug"),
    "R5":  ("무엇이 잘못됐는지 알려주기", "warn"),
    "R6":  ("돈이 바뀌면 미리 보여주기", "warn"),
    "R7":  ("되돌릴 수 없으면 두 번 묻기", "bug"),
    "R8":  ("로그인 상태를 한 곳에서",  "bug"),
    "R9":  ("상태에 맞는 메뉴",         "bug"),
    "R10": ("고칠 행을 지정하기",       "bug"),
    "R11": ("기다리는 동안 알려주기",   "warn"),
    "R12": ("개인정보는 가려서",        "warn"),
    "R13": ("못 하는 일은 미리 막기",   "warn"),
    "R14": ("링크가 살아 있어야",       "bug"),
    "R15": ("좁은 화면에서도",          "warn"),
}

# P0 정의 = "손님이 살 수 없다" (W2 규약 R-10)
BUY_PATH = {"index.html", "products.html", "product.html", "cart.html",
            "checkout.html", "login.html", "join.html"}

AREA_BY_FILE = {
    "checkout.html": "area:주문", "cart.html": "area:주문", "orders.html": "area:주문",
    "product.html": "area:상품", "products.html": "area:상품", "index.html": "area:상품",
    "login.html": "area:회원", "join.html": "area:회원", "mypage.html": "area:회원",
    "console.html": "area:관리", "reports.html": "area:관리", "dev.html": "area:관리",
}

SKIP_FILES = {"qa-tool.html", "dev.html"}   # QA 도구 자신은 검사 대상이 아님


# ─────────────────────────────────────────────────────────────
# 아주 작은 HTML 헬퍼 (파서 없이 정규식 — 정적 파일이라 충분)
# ─────────────────────────────────────────────────────────────
def strip_comments(s):
    return re.sub(r"<!--.*?-->", "", s, flags=re.S)


def scripts_of(html):
    """인라인 <script> 본문을 모두 이어붙여 돌려줍니다."""
    return "\n".join(re.findall(r"<script\b[^>]*>(.*?)</script>", html, re.S | re.I))


def script_srcs(html):
    return re.findall(r"<script\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"']", html, re.I)


def styles_of(html):
    return "\n".join(re.findall(r"<style\b[^>]*>(.*?)</style>", html, re.S | re.I))


def tags(html, name):
    """<name ...> 열림태그의 속성문자열 목록 (줄번호와 함께)."""
    out = []
    for m in re.finditer(r"<%s\b([^>]*)>" % name, html, re.I):
        out.append((html.count("\n", 0, m.start()) + 1, m.group(1), m.group(0)))
    return out


def attr(attrs, name):
    m = re.search(r"\b%s\s*=\s*[\"']([^\"']*)[\"']" % name, attrs, re.I)
    if m:
        return m.group(1)
    m = re.search(r"\b%s\s*=\s*([^\s>]+)" % name, attrs, re.I)
    return m.group(1) if m else None


def has_attr(attrs, name):
    return re.search(r"\b%s\b" % name, attrs, re.I) is not None


def lineno(text, idx):
    return text.count("\n", 0, idx) + 1


# ─────────────────────────────────────────────────────────────
# 발견 한 건
# ─────────────────────────────────────────────────────────────
class Finding:
    def __init__(self, rule, path, line, evidence, detail, severity=None, key=None):
        self.rule = rule
        self.path = path
        self.line = line
        self.evidence = evidence.strip()[:300]
        self.detail = detail
        self.severity = severity or RULES[rule][1]
        # 증거키: 줄번호는 넣지 않습니다. 줄이 밀려도 같은 문제로 봐야 하니까요.
        self.key = key if key is not None else self.evidence
        self.fp = hashlib.sha256(
            ("%s|%s|%s" % (self.rule, self.path, self.key)).encode("utf-8")
        ).hexdigest()[:12]

    @property
    def prio(self):
        base = os.path.basename(self.path)
        if self.severity == "bug" and base in BUY_PATH:
            return "prio:P0"
        if self.severity == "bug":
            return "prio:P1"
        return "prio:P2"

    @property
    def area(self):
        return AREA_BY_FILE.get(os.path.basename(self.path), "area:공통")

    @property
    def title(self):
        # W2 규약: [역할][이름] 제목 규칙
        return "[QA][자동] %s %s · %s" % (self.rule, RULES[self.rule][0], os.path.basename(self.path))

    @property
    def labels(self):
        return ["type:버그" if self.severity == "bug" else "type:개선",
                self.prio, "state:접수", "src:자동QA", self.area]

    def body(self):
        mark = "✕ 버그" if self.severity == "bug" else "! 주의"
        return "\n".join([
            "<!-- uxcheck:fp=%s -->" % self.fp,
            "**규칙** %s · %s (`docs/UX-RULES.md`)" % (self.rule, RULES[self.rule][0]),
            "**등급** %s" % mark,
            "**파일** `%s`%s" % (self.path, (" : %d 줄" % self.line) if self.line else ""),
            "",
            "### 무엇이 문제인가",
            self.detail,
            "",
            "### 증거",
            "```html",
            self.evidence or "(해당 없음)",
            "```",
            "",
            "### 지문",
            "`%s` — 같은 지문의 이슈가 이미 있으면 새로 만들지 않습니다." % self.fp,
            "",
            "---",
            "*uxcheck.py v%s 가 자동으로 올렸습니다. 사람이 확인하고 닫아 주세요.*" % VERSION,
        ])

    def as_dict(self):
        return {"fp": self.fp, "rule": self.rule, "rule_name": RULES[self.rule][0],
                "severity": self.severity, "path": self.path, "line": self.line,
                "evidence": self.evidence, "detail": self.detail,
                "title": self.title, "labels": self.labels}


# ─────────────────────────────────────────────────────────────
# 규칙별 검사
# ─────────────────────────────────────────────────────────────
def check_R1(ctx):
    """값이 있으면 읽는 모습으로. 정적으로는 '저장 뒤 화면이 그대로인가'만 잡습니다."""
    out = []
    js = ctx["js"]
    if not re.search(r"(PATCH|'PATCH'|\"PATCH\")", js):
        return out
    # 저장(PATCH) 을 하는데 화면을 다시 그리는 흔적이 없다
    redraw = re.search(r"(location\.reload|render\w*\(|draw\w*\(|refresh\w*\(|loadProfile|리로드)", js)
    if not redraw:
        out.append(Finding("R1", ctx["rel"], 0,
                           "PATCH 호출은 있으나 화면을 다시 그리는 코드가 없음",
                           "저장(PATCH)은 하는데 저장 뒤 화면을 다시 그리는 코드가 보이지 않습니다. "
                           "저장해도 입력칸이 그대로 남아 있을 수 있습니다. "
                           "저장 성공 뒤 읽는 모습으로 바꾸거나 다시 불러오세요.",
                           key="patch-without-redraw"))
    return out


def check_R2(ctx):
    """우편번호·주소는 readonly + 주소찾기 + daum.Postcode."""
    out = []
    html, rel = ctx["html"], ctx["rel"]
    page = html + ctx["js"]
    has_daum = "daum.Postcode" in page or "postcode.v2.daum.net" in page
    found_addr = False
    for line, attrs, raw in tags(html, "input"):
        ident = " ".join(filter(None, [attr(attrs, "id") or "", attr(attrs, "name") or ""])).lower()
        if not ident:
            continue
        is_zip = re.search(r"(zip|zonecode|post(al)?code|우편)", ident)
        is_a1 = re.search(r"(addr1|address1|roadaddr|기본주소)", ident) or \
                (re.search(r"(addr|address)", ident) and not re.search(r"(2|detail|상세)", ident))
        if not (is_zip or is_a1):
            continue
        found_addr = True
        if not has_attr(attrs, "readonly") and not has_attr(attrs, "disabled"):
            out.append(Finding("R2", rel, line, raw,
                               "우편번호·기본주소 칸을 직접 칠 수 있습니다. 오타로 배송이 잘못 갑니다. "
                               "`readonly` 를 걸고 **주소 찾기** 단추로만 채우게 하세요.",
                               key="editable:" + (ident.strip())))
    if found_addr and not has_daum:
        out.append(Finding("R2", rel, 0, "daum.Postcode 호출 없음",
                           "주소 입력칸은 있는데 주소 찾기(daum.Postcode)를 부르는 코드가 없습니다.",
                           key="no-postcode"))
    if found_addr and not re.search(r"(주소\s*찾기|우편번호\s*찾기|findAddr|searchAddr|openPostcode)", page):
        out.append(Finding("R2", rel, 0, "주소 찾기 단추 없음",
                           "주소 입력칸 옆에 **주소 찾기** 단추가 보이지 않습니다.",
                           key="no-find-button"))
    return out


def check_R3(ctx):
    """onclick 이 부르는 함수가 실제로 있나 (외부 js 포함)."""
    out = []
    html, rel = ctx["html"], ctx["rel"]
    allcode = ctx["js"] + "\n" + ctx["extjs"]
    defined = set(re.findall(r"function\s+([A-Za-z_$][\w$]*)", allcode))
    defined |= set(re.findall(r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()", allcode))
    defined |= set(re.findall(r"window\.([A-Za-z_$][\w$]*)\s*=", allcode))
    defined |= set(re.findall(r"([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?function", allcode))
    builtin = {"alert", "confirm", "history", "location", "window", "document", "console",
               "print", "open", "close", "this", "event", "return", "if", "void",
               "setTimeout", "encodeURIComponent", "decodeURIComponent", "parseInt",
               "parseFloat", "JSON", "Number", "String", "Boolean", "Array", "Object",
               "Math", "Date", "fetch", "localStorage", "sessionStorage", "navigator"}
    for evname in ("onclick", "onchange", "onsubmit", "oninput", "onkeyup", "onblur"):
        for m in re.finditer(r"\b%s\s*=\s*[\"']([^\"']+)[\"']" % evname, html, re.I):
            expr = m.group(1)
            for call in re.finditer(r"([A-Za-z_$][\w$]*)\s*\(", expr):
                fn = call.group(1)
                if fn in builtin or fn in defined:
                    continue
                # a.b() 형태(메서드 호출)는 건너뜀
                if re.search(r"[\w$\]\)]\s*\.\s*%s\s*\(" % re.escape(fn), expr):
                    continue
                out.append(Finding("R3", rel, lineno(html, m.start()), m.group(0),
                                   "`%s(...)` 를 부르는데 그런 함수가 어디에도 정의돼 있지 않습니다. "
                                   "단추를 눌러도 아무 일도 일어나지 않습니다." % fn,
                                   key="undef:" + fn))
    return out


def check_R4(ctx):
    """한 화면에 같은 id 가 둘 이상."""
    out = []
    html, rel = ctx["html"], ctx["rel"]
    seen = {}
    for m in re.finditer(r"<[a-zA-Z][^>]*\bid\s*=\s*[\"']([^\"']+)[\"']", html):
        seen.setdefault(m.group(1), []).append(lineno(html, m.start()))
    for ident, lines in sorted(seen.items()):
        if len(lines) > 1:
            out.append(Finding("R4", rel, lines[0], 'id="%s"' % ident,
                               "id `%s` 가 %d 번 나옵니다 (줄 %s). 코드는 맨 앞엣것만 찾아서 "
                               "뒤엣것은 죽습니다." % (ident, len(lines), ", ".join(map(str, lines))),
                               key="dup-id:" + ident))
    return out


def check_R5(ctx):
    """「실패했습니다」로 끝내지 않기."""
    out = []
    rel = ctx["rel"]
    js = ctx["js"]
    pat = re.compile(r"(alert|toast|showError|msg|setMsg)\s*\(\s*([\"'])((?:(?!\2).)*)\2\s*\)")
    for m in pat.finditer(js):
        text = m.group(3)
        if not re.search(r"(실패|오류|에러|error)", text, re.I):
            continue
        # 이유가 붙어 있으면 통과
        if len(text) > 22 or re.search(r"(다시|주세요|확인|남은|부족|만료|없습니다)", text):
            continue
        out.append(Finding("R5", rel, 0, m.group(0),
                           "오류 문구가 «%s» 하나로 끝납니다. 손님이 무엇을 해야 할지 모릅니다. "
                           "서버가 준 이유(`e.message` 등)를 같이 보여주세요." % text,
                           key="bare-error:" + text))
    return out


def check_R6(ctx):
    """수량·옵션을 바꾸는 화면에 금액이 즉시 다시 세지나."""
    out = []
    rel, js, html = ctx["rel"], ctx["js"], ctx["html"]
    if not re.search(r"<(input|select)[^>]*\b(id|name|class)\s*=\s*[\"'][^\"']*(qty|quantity|amount|수량)",
                     html, re.I):
        return out
    if not re.search(r"(calc|total|sum|합계|금액|재계산|recalc)", js, re.I):
        out.append(Finding("R6", rel, 0, "수량 입력은 있으나 금액 재계산 코드 없음",
                           "수량·옵션을 바꾸는 화면인데 금액을 다시 세는 코드가 없습니다. "
                           "바뀐 결제 금액을 저장 전에 보여주세요.",
                           key="no-recalc"))
    return out


def check_R7(ctx):
    """지우기·취소·탈퇴는 두 번 확인."""
    out = []
    rel, js = ctx["rel"], ctx["js"]
    for m in re.finditer(r"(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{", js):
        name = m.group(1)
        if not re.search(r"(delete|remove|cancel|withdraw|탈퇴|취소|삭제)", name, re.I):
            continue
        body = js[m.end():m.end() + 1200]
        if re.search(r"\bconfirm\s*\(|showConfirm|확인하시겠", body):
            continue
        if not re.search(r"(fetch|DELETE|supabase|\.rpc\()", body):
            continue    # 실제로 지우는 함수만 본다
        out.append(Finding("R7", rel, lineno(js, m.start()), m.group(0),
                           "`%s()` 가 되돌릴 수 없는 일을 하는데 확인 절차가 없습니다. "
                           "무엇이 지워지는지 알려주고 한 번 더 묻게 하세요." % name,
                           key="no-confirm:" + name))
    return out


def check_R8(ctx):
    """로그인 상태는 cgSession()/cgTok()/cgRole() 한 곳에서."""
    out = []
    rel, js = ctx["rel"], ctx["js"]
    for m in re.finditer(r"localStorage\.(?:getItem\(\s*['\"]cg_sb['\"]\s*\)|cg_sb)", js):
        out.append(Finding("R8", rel, lineno(js, m.start()), m.group(0),
                           "`cg_sb` 를 직접 읽습니다. 화면마다 따로 판단하면 로그인 상태가 어긋납니다. "
                           "`cgSession()` · `cgTok()` · `cgRole()` 을 쓰세요.",
                           key="direct-cg_sb"))
        break
    if re.search(r"\.\s*exp\b", js) and not re.search(r"\.\s*e\b(?!xp)", js):
        out.append(Finding("R8", rel, 0, "s.exp 만 보고 s.e 를 안 봄",
                           "만료를 `exp` 로만 판단합니다. `e` 도 함께 확인해야 합니다.",
                           key="exp-without-e"))
    return out


def check_R9(ctx):
    """로그인 여부에 따라 메뉴가 바뀌어야."""
    out = []
    rel, html = ctx["rel"], ctx["html"]
    page = html + ctx["js"]
    guest = re.search(r"href\s*=\s*[\"'][^\"']*(login|join)\.html", html, re.I)
    member = re.search(r"href\s*=\s*[\"'][^\"']*mypage\.html", html, re.I) or \
             re.search(r"(LOGOUT|로그아웃)", html)
    if guest and member and not re.search(r"navauth\.js|navAuth|renderNav", page):
        out.append(Finding("R9", rel, lineno(html, guest.start()), guest.group(0),
                           "LOGIN/JOIN 과 MY PAGE/LOGOUT 링크가 한 화면에 함께 있는데 "
                           "`navauth.js` 를 부르지 않습니다. 로그인해도 LOGIN 이 그대로 보입니다.",
                           key="nav-both-no-navauth"))
    return out


def check_R10(ctx):
    """PATCH·DELETE 주소에 ?…=eq. 조건이 있나."""
    out = []
    rel, js = ctx["rel"], ctx["js"]
    for m in re.finditer(r"fetch\s*\(\s*([`\"'])((?:(?!\1).)*)\1", js):
        url = m.group(2)
        if "/rest/v1/" not in url:
            continue
        tail = js[m.end():m.end() + 400]
        meth = re.search(r"method\s*:\s*[\"'](PATCH|DELETE|PUT)[\"']", tail, re.I)
        if not meth:
            continue
        if re.search(r"=eq\.|=in\.|=is\.", url):
            continue
        out.append(Finding("R10", rel, lineno(js, m.start()), url[:200],
                           "%s 인데 주소에 `?…=eq.` 조건이 없습니다. PostgREST 가 400 으로 막습니다. "
                           "고칠 행을 지정하세요." % meth.group(1).upper(),
                           key="no-filter:" + meth.group(1).upper() + ":" + re.sub(r"\$\{[^}]*\}", "*", url)[:80]))
    return out


def check_R11(ctx):
    """기다리는 동안 알려주고 단추를 잠그기."""
    out = []
    rel, js = ctx["rel"], ctx["js"]
    n_fetch = len(re.findall(r"\bfetch\s*\(", js))
    if n_fetch < 2:
        return out
    n_guard = len(re.findall(r"disabled\s*=\s*(?:true|!0)|\.disabled\b|aria-busy|저장하는 중|처리 중|불러오는 중", js))
    if n_guard == 0:
        out.append(Finding("R11", rel, 0, "fetch %d 곳 · 단추 잠금/안내 0 곳" % n_fetch,
                           "서버를 %d 번 부르는데 기다리는 동안 안내도, 단추 잠금도 없습니다. "
                           "두 번 눌리면 주문이 두 번 들어갑니다." % n_fetch,
                           key="no-loading-guard"))
    return out


def check_R12(ctx):
    """주문번호만 알면 보는 곳에서는 개인정보 가리기."""
    out = []
    rel, js = ctx["rel"], ctx["js"]
    if not re.search(r"guest_\w+|guestLookup|nonmember_", js):
        return out
    if not re.search(r"(mask|\*\*\*\*|가리|replace\s*\(\s*/.*\d)", js):
        out.append(Finding("R12", rel, 0, "비회원 조회 · 마스킹 코드 없음",
                           "비회원 조회 경로인데 전화번호·메일을 가리는 코드가 없습니다. "
                           "`010-****-9634` 처럼 가려서 보여주세요.",
                           key="guest-no-mask"))
    return out


def check_R13(ctx):
    """할 수 없는 상태면 단추를 아예 안 보여주기."""
    out = []
    rel, js, html = ctx["rel"], ctx["js"], ctx["html"]
    if not re.search(r"(status|state)\s*===?\s*[\"'](shipped|delivering|paid|배송중|결제완료)"
                     r"|order\.status|o\.status|\bstatusOf\b", js):
        return out
    if not re.search(r"(style\.display\s*=\s*['\"]none|hidden|\.hide\(|classList\.(add|toggle)\s*\(\s*['\"]hide)", js):
        out.append(Finding("R13", rel, 0, "상태별 단추 숨김 코드 없음",
                           "주문 상태가 있는 화면인데 상태에 따라 단추를 감추는 코드가 없습니다. "
                           "눌렀다가 「안 됩니다」보다 처음부터 없는 게 낫습니다.",
                           key="no-state-hide"))
    return out


def check_R14(ctx):
    """링크가 살아 있어야."""
    out = []
    rel, html = ctx["rel"], ctx["html"]
    known = ctx["known_files"]
    for m in re.finditer(r"href\s*=\s*[\"']([^\"'#][^\"']*)[\"']", html):
        href = m.group(1).strip()
        line = lineno(html, m.start())
        if href.startswith("http://"):
            out.append(Finding("R14", rel, line, href[:160],
                               "`http://` 링크입니다. 브라우저가 안전하지 않다고 막거나 경고합니다. "
                               "`https://` 로 바꾸세요.", severity="warn",
                               key="http:" + href[:120]))
            continue
        if re.match(r"^(https://|mailto:|tel:|javascript:|data:|//)", href):
            continue
        target = href.split("?")[0].split("#")[0]
        if not target.endswith(".html"):
            continue
        base = os.path.basename(target)
        if base not in known:
            out.append(Finding("R14", rel, line, href[:160],
                               "`%s` 로 보내는데 그런 화면이 저장소에 없습니다. 손님이 404 를 봅니다." % base,
                               key="dead:" + base))
    return out


def check_R15(ctx):
    """좁은 화면에서도 — 정적 분석으로는 판단하지 않습니다.

    2026-09-18 실측으로 배운 것
      이 자리에 CSS 를 정규식으로 읽어 'font-size 가 16px 미만'을 찾는 검사가
      있었습니다. 50건을 보고했는데, 실제 브라우저로 69장을 재 보니 **2건**이었습니다.
      48건이 거짓 경고였습니다.

      이유는 셋입니다.
        · 중첩된 @media 블록을 정규식이 제대로 못 읽습니다.
        · 같은 선택자를 나중에 덮어쓰는 규칙(캐스케이드)을 따라갈 수 없습니다.
        · 실제로 그 칸이 화면에 보이는지, 체크박스인지 알 수 없습니다.

      거짓 경고 하나가 규칙 전체의 신뢰를 깎습니다. 48건이면 아무도 안 봅니다.
      그래서 이 검사는 여기서 빼고 `scripts/uxcheck_live.py` 로 옮겼습니다.
      그쪽은 진짜 브라우저에서 계산된 값을 재므로 틀릴 여지가 없습니다.

          python3 scripts/uxcheck_live.py .        # 폰 크기로 전체 재기

    교훈 — 렌더링해야 알 수 있는 것은 렌더링해서 보고, 파일만 보고 알 수 있는 것만
    정적으로 봅니다. 규칙을 억지로 정적 검사에 끼워 넣지 않습니다.
    """
    return []


CHECKS = [check_R1, check_R2, check_R3, check_R4, check_R5, check_R6, check_R7,
          check_R8, check_R9, check_R10, check_R11, check_R12, check_R13,
          check_R14, check_R15]


# ─────────────────────────────────────────────────────────────
# 스캔
# ─────────────────────────────────────────────────────────────
def scan(root, only=None, skip_rules=()):
    html_files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in
                       (".git", "node_modules", ".github", "scripts", "docs", ".uxcheck")]
        for fn in sorted(filenames):
            if fn.endswith(".html"):
                html_files.append(os.path.join(dirpath, fn))
    known = {os.path.basename(p) for p in html_files}

    findings = []
    scanned = []
    for path in html_files:
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        base = os.path.basename(path)
        if base in SKIP_FILES:
            continue
        if only and base not in only:
            continue
        try:
            raw = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        html = strip_comments(raw)
        extjs = ""
        for src in script_srcs(html):
            if re.match(r"^(https?:)?//", src):
                continue
            cand = os.path.normpath(os.path.join(os.path.dirname(path), src.split("?")[0]))
            if os.path.isfile(cand):
                try:
                    extjs += "\n" + open(cand, encoding="utf-8", errors="replace").read()
                except OSError:
                    pass
        ctx = {"html": html, "rel": rel, "js": scripts_of(html), "extjs": extjs,
               "css": styles_of(html), "known_files": known, "root": root}
        scanned.append(rel)
        for check in CHECKS:
            rule = check.__name__.split("_")[1]
            if rule in skip_rules:
                continue
            try:
                findings.extend(check(ctx))
            except Exception as exc:              # 규칙 하나가 터져도 나머지는 돈다
                print("  ! %s %s 검사 중 오류: %s" % (rel, rule, exc), file=sys.stderr)

    # 부분 체크아웃 보호막 — 없는 화면이 너무 많으면 R14 를 '주의' 로 낮춘다.
    # (git clone 전체가 아니라 몇 장만 복사해 놓고 돌린 경우)
    dead = [f for f in findings if f.rule == "R14" and f.key.startswith("dead:")]
    if dead and len({f.key for f in dead}) > max(2, len(known) * 0.10):
        for f in dead:
            f.severity = "warn"
            f.detail += ("\n\n> ⚠︎ 없는 화면이 %d 종류나 됩니다. 저장소 전체(`git clone`)가 아니라 "
                         "일부만 놓고 돌린 것 같습니다. 그럴 때는 죽은 링크가 아닐 수 있어 "
                         "**주의**로 낮췄습니다." % len({x.key for x in dead}))

    # 지문 중복 제거 (같은 지문은 한 번만)
    uniq, seen = [], set()
    for f in findings:
        if f.fp in seen:
            continue
        seen.add(f.fp)
        uniq.append(f)
    order = {"bug": 0, "warn": 1}
    uniq.sort(key=lambda f: (order[f.severity], f.path, f.rule))
    return scanned, uniq


# ─────────────────────────────────────────────────────────────
# 보고서
# ─────────────────────────────────────────────────────────────
def report_text(scanned, findings):
    lines = ["", "츄구미 UX-RULES 검사 · uxcheck v%s" % VERSION,
             "화면 %d 개 · 발견 %d 건" % (len(scanned), len(findings)), "-" * 64]
    if not findings:
        lines.append("  ✓ 걸린 것이 없습니다.")
    cur = None
    for f in findings:
        if f.path != cur:
            cur = f.path
            lines.append("")
            lines.append("  %s" % cur)
        mark = "✕" if f.severity == "bug" else "!"
        lines.append("    %s %-4s %-12s %s" % (mark, f.rule, f.fp, f.detail.split(".")[0][:70]))
    bugs = sum(1 for f in findings if f.severity == "bug")
    lines += ["", "-" * 64, "  ✕ 버그 %d · ! 주의 %d" % (bugs, len(findings) - bugs), ""]
    return "\n".join(lines)


def report_md(scanned, findings):
    bugs = [f for f in findings if f.severity == "bug"]
    warns = [f for f in findings if f.severity == "warn"]
    out = ["# 츄구미 UX-RULES 검사 결과", "",
           "- 검사한 화면 **%d 개**" % len(scanned),
           "- ✕ 버그 **%d 건** · ! 주의 **%d 건**" % (len(bugs), len(warns)),
           "- 도구 `scripts/uxcheck.py` v%s · 규칙 `docs/UX-RULES.md`" % VERSION, ""]
    by_rule = {}
    for f in findings:
        by_rule.setdefault(f.rule, []).append(f)
    out += ["## 규칙별 요약", "", "| 규칙 | 이름 | 건수 |", "|---|---|---|"]
    for r in sorted(by_rule, key=lambda x: int(x[1:])):
        out.append("| %s | %s | %d |" % (r, RULES[r][0], len(by_rule[r])))
    out.append("")
    for title, group in (("✕ 버그 — 고쳐야 합니다", bugs), ("! 주의 — 보는 게 좋습니다", warns)):
        if not group:
            continue
        out += ["## %s" % title, ""]
        for f in group:
            out += ["### `%s` · %s %s" % (f.path, f.rule, RULES[f.rule][0]),
                    "",
                    "%s" % f.detail, "",
                    "```", f.evidence or "(해당 없음)", "```",
                    "", "지문 `%s` · 라벨 `%s`" % (f.fp, "` `".join(f.labels)), ""]
    return "\n".join(out)


# ─────────────────────────────────────────────────────────────
# 지문 캐시
# ─────────────────────────────────────────────────────────────
def load_state(root):
    p = os.path.join(root, STATE_FILE)
    if os.path.isfile(p):
        try:
            return json.load(open(p, encoding="utf-8"))
        except Exception:
            pass
    return {"version": 1, "fingerprints": {}}


def save_state(root, state):
    p = os.path.join(root, STATE_FILE)
    state["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2, sort_keys=True)


# ─────────────────────────────────────────────────────────────
# GitHub
# ─────────────────────────────────────────────────────────────
def gh(method, path, token, payload=None, params=None):
    url = API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "chewgumi-uxcheck/" + VERSION)
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body) if body.strip() else {}


def fp_seen_on_github(repo, token, fp):
    """이슈 본문에 지문이 있는지 검색 (열린 것·닫힌 것 모두)."""
    q = 'repo:%s "uxcheck:fp=%s" in:body' % (repo, fp)
    try:
        res = gh("GET", "/search/issues", token, params={"q": q, "per_page": 1})
        return res.get("total_count", 0) > 0
    except urllib.error.HTTPError as e:
        print("  ! 검색 실패(%s) — 로컬 캐시만으로 판단합니다" % e.code, file=sys.stderr)
        return False


def create_issue(repo, token, f):
    return gh("POST", "/repos/%s/issues" % repo, token,
              {"title": f.title, "body": f.body(), "labels": f.labels})


def create_via_gumi(gumi_path, f):
    cmd = [sys.executable, gumi_path, "issue-new",
           "--title", f.title, "--body", f.body()]
    for lb in f.labels:
        cmd += ["--label", lb]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode == 0, (p.stdout + p.stderr).strip()


# ─────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="츄구미 UX-RULES R1~R15 검사 · 이슈 자동 등록")
    ap.add_argument("root", nargs="?", default=".", help="저장소 폴더 (기본: 지금 폴더)")
    ap.add_argument("--report", choices=["text", "md", "none"], default="text")
    ap.add_argument("--json", metavar="FILE", help="결과를 JSON 으로 저장")
    ap.add_argument("--out", metavar="FILE", help="보고서를 파일로 저장")
    ap.add_argument("--issues", metavar="FILE", help="등록할 이슈 초안을 JSON 으로 저장")
    ap.add_argument("--only", metavar="FILE", action="append", help="이 화면만 검사 (여러 번 가능)")
    ap.add_argument("--skip-rule", metavar="R#", action="append", default=[], help="건너뛸 규칙")
    ap.add_argument("--severity", choices=["bug", "all"], default="all", help="등록 대상 등급")
    ap.add_argument("--github", action="store_true", help="GitHub 에 이슈 등록")
    ap.add_argument("--gumi", metavar="PATH", help="등록을 gumi.py 에 위임")
    ap.add_argument("--repo", default=os.environ.get("CHEWGUMI_REPO", "chewgumiadmin-afk/chewgumi"))
    ap.add_argument("--token", default=os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN"))
    ap.add_argument("--max-issues", type=int, default=10, help="한 번에 올릴 최대 개수 (기본 10)")
    ap.add_argument("--dry-run", action="store_true", help="올리지 않고 무엇이 올라갈지만 보기")
    ap.add_argument("--reset-state", action="store_true", help="지문 캐시를 비우고 시작")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    only = set(args.only) if args.only else None
    scanned, findings = scan(root, only, set(args.skip_rule))

    if args.report == "text":
        txt = report_text(scanned, findings)
        print(txt)
    elif args.report == "md":
        txt = report_md(scanned, findings)
        print(txt)
    else:
        txt = ""
    if args.out and txt:
        open(args.out, "w", encoding="utf-8").write(txt)
        print("  → 보고서 %s" % args.out)

    if args.json:
        json.dump({"version": VERSION, "scanned": scanned,
                   "findings": [f.as_dict() for f in findings]},
                  open(args.json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("  → 결과 %s" % args.json)

    state = {"version": 1, "fingerprints": {}} if args.reset_state else load_state(root)
    known = state.get("fingerprints", {})

    targets = [f for f in findings if args.severity == "all" or f.severity == "bug"]
    fresh = [f for f in targets if f.fp not in known]

    if args.issues:
        json.dump([{"title": f.title, "labels": f.labels, "body": f.body(), "fp": f.fp,
                    "new": f.fp not in known} for f in targets],
                  open(args.issues, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("  → 이슈 초안 %s (전체 %d · 새것 %d)" % (args.issues, len(targets), len(fresh)))

    if not (args.github or args.gumi):
        if fresh:
            print("  · 새 지문 %d 건 (--github 또는 --gumi 로 등록)" % len(fresh))
        return 1 if any(f.severity == "bug" for f in findings) else 0

    if args.github and not args.token:
        print("  ! GITHUB_TOKEN 이 없습니다. 등록을 건너뜁니다.", file=sys.stderr)
        return 2

    made = 0
    for f in fresh:
        if made >= args.max_issues:
            print("  · 한 번에 %d 건까지만 올립니다. 나머지는 다음 번에." % args.max_issues)
            break
        if args.github and not args.dry_run and fp_seen_on_github(args.repo, args.token, f.fp):
            known[f.fp] = {"issue": None, "note": "이미 저장소에 있음",
                           "at": time.strftime("%Y-%m-%d")}
            print("  = %s %s — 이미 등록돼 있음" % (f.fp, f.rule))
            continue
        if args.dry_run:
            print("  + [올릴 것] %s  %s" % (f.fp, f.title))
            made += 1
            continue
        try:
            if args.gumi:
                ok, msg = create_via_gumi(args.gumi, f)
                if not ok:
                    print("  ! gumi.py 등록 실패: %s" % msg, file=sys.stderr)
                    continue
                num = msg.strip().splitlines()[-1] if msg.strip() else "?"
            else:
                issue = create_issue(args.repo, args.token, f)
                num = "#%s" % issue.get("number")
            known[f.fp] = {"issue": num, "at": time.strftime("%Y-%m-%d"),
                           "rule": f.rule, "path": f.path}
            print("  + %s %s → %s" % (f.fp, f.rule, num))
            made += 1
            time.sleep(1.2)     # 속도 제한 배려
        except urllib.error.HTTPError as e:
            print("  ! 등록 실패 %s: %s" % (e.code, e.read().decode("utf-8")[:200]), file=sys.stderr)
        except Exception as e:
            print("  ! 등록 실패: %s" % e, file=sys.stderr)

    if not args.dry_run:
        state["fingerprints"] = known
        save_state(root, state)
        print("  → 지문 캐시 %s (%d 건)" % (STATE_FILE, len(known)))
    print("  · 올린 이슈 %d 건" % made)
    return 0


if __name__ == "__main__":
    sys.exit(main())
