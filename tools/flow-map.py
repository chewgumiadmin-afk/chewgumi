#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
flow-map.py — 실제 코드에서 '무엇이 무엇을 부르는지'를 뽑아
             구매·배송 플로우가 어디서 끊기는지 찾습니다.

확률이 아니라 실제 호출 흔적을 봅니다.
  · 각 화면이 어느 화면으로 가는가 (href / location.href)
  · 각 화면이 어떤 함수를 정의하고 부르는가 (window.X / function X / onclick)
  · 각 화면이 어떤 서버를 부르는가 (Edge Function / REST 테이블)

그리고 FLOW 에 적어 둔 '있어야 할 단계'가 실제로 있는지 대조합니다.
"""
import re, os, json, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 있어야 할 플로우 (사람이 적는 유일한 부분) ────────────────────
FLOWS = {
    "구매자 · 주문": [
        ("상품 보기",      {"page": "index.html|shop.html"}),
        ("상품 상세",      {"page": "product.html"}),
        ("장바구니 담기",  {"fn": "addToCart|cgAddCart", "in": "product.html"}),
        ("장바구니",       {"page": "cart.html"}),
        ("주문서로",       {"fn": "checkout\.html",   "in": "cart.html"}),
        ("주문서",         {"page": "checkout.html"}),
        ("주문 생성",      {"api": "functions/v1/order\b", "in": "checkout.html"}),
        ("결제 요청",      {"api": "easypay|EasyPay|pay-request", "in": "checkout.html"}),
        ("결제 복귀",      {"page": "pay-return.html"}),
        ("완료 후 이동",   {"fn": "mypage\.html|order-lookup\.html|orders\.html", "in": "pay-return.html"}),
    ],
    "구매자 · 주문조회 · 취소 · 환불": [
        ("주문 조회(회원)",   {"page": "mypage.html"}),
        ("주문 조회(비회원)", {"page": "order-lookup.html"}),
        ("주문 상세 보기",    {"fn": "openOrder|orderDetail|viewOrder|order-detail", "in": "mypage.html|order-lookup.html"}),
        ("취소 요청(회원)",   {"fn": "cancel", "in": "mypage.html"}),
        ("취소 요청(비회원)", {"fn": "cancel", "in": "order-lookup.html"}),
        ("취소 API 호출",     {"api": "order-edit|action.{0,12}cancel", "in": "mypage.html|order-lookup.html"}),
        ("환불 요청",         {"fn": "refund|환불", "in": "mypage.html|order-lookup.html"}),
        ("배송 조회 연결",    {"fn": "tracking\.html|doTrack", "in": "mypage.html|order-lookup.html"}),
    ],
    "관리자 · 주문 → 배송": [
        ("주문 목록",       {"page": "orders.html"}),
        ("목록 → 상세 링크", {"fn": "order-detail\.html", "in": "orders.html"}),
        ("주문 상세",       {"page": "order-detail.html"}),
        ("택배사 선택",     {"fn": "COURIERS|courier", "in": "order-detail.html"}),
        ("송장 등록",       {"fn": "doShip|saveShip", "in": "order-detail.html"}),
        ("발송 API",        {"api": "action.{0,8}ship", "in": "order-detail.html"}),
        ("고객 알림",       {"api": "order-notify|order-bot", "in": "order-detail.html|orders.html"}),
        ("배송 추적",       {"fn": "doTrack", "in": "order-detail.html"}),
        ("배송완료 처리",   {"fn": "delivered", "in": "order-detail.html"}),
    ],
    "관리자 · 취소 · 환불": [
        ("주문 상세",     {"page": "order-detail.html"}),
        ("취소 처리",     {"fn": "doCancel", "in": "order-detail.html"}),
        ("환불 가능조회", {"api": "functions/v1/refund", "in": "order-detail.html"}),
        ("환불 실행",     {"fn": "doRefund", "in": "order-detail.html"}),
        ("현금영수증",    {"fn": "doCash|cashReceipt", "in": "order-detail.html"}),
        ("처리 이력",     {"fn": "loadLogs|showLogs", "in": "order-detail.html"}),
    ],
}

PAGES = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.html")))

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8", errors="ignore") as f:
        return f.read()

def scan():
    info = {}
    for p in PAGES:
        s = read(p)
        info[p] = {
            # 문자열 안에서 만들어지는 링크까지 모두 (JS 로 조립하는 경우 포함)
            "links": sorted(set(
                x for x in re.findall(r'([a-z0-9\-]+\.html)', s) if x != p
            )),
            "defines": sorted(set(
                re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=\s*function', s) +
                re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', s)
            )),
            "onclick": sorted(set(re.findall(r'onclick="([A-Za-z_$][\w$]*)\s*\(', s))),
            "fns": sorted(set(re.findall(r'functions/v1/([a-z0-9\-]+)', s))),
            "tables": sorted(set(re.findall(r'rest/v1/([a-z0-9_]+)', s))),
            "size": len(s),
        }
    return info

def has(step, info):
    """이 단계가 '지정한 화면 안에' 실제로 있는지.
       화면을 못박지 않으면 엉뚱한 곳에서 걸려 다 있는 것처럼 보입니다."""
    scope = step.get("in")
    cands = [p for p in PAGES if re.search(r'^(%s)$' % scope, p)] if scope else list(PAGES)
    hit = []
    for p in cands:
        if "page" in step:
            if re.search(r'^(%s)$' % step["page"], p):
                hit.append(p)
            continue
        body = read(p)
        pat = step.get("fn") or step.get("api")
        if pat and re.search(pat, body):
            hit.append(p)
    return hit

def main():
    info = scan()

    print("=" * 68)
    print("  화면 연결 지도 — 실제 코드에서 뽑음")
    print("=" * 68)

    # 아무도 링크하지 않는 화면 (고아)
    linked = set()
    for p, d in info.items():
        for l in d["links"]:
            if l != p:
                linked.add(l)
    orphans = [p for p in PAGES if p not in linked]
    print("\n[고아 화면] 어느 화면에서도 링크되지 않음 — %d개" % len(orphans))
    for p in orphans:
        print("   ·", p)

    # 존재하지 않는 화면으로 가는 링크 (깨진 링크)
    print("\n[깨진 링크] 없는 화면으로 가는 링크")
    broken = 0
    for p, d in info.items():
        for l in d["links"]:
            if l not in PAGES:
                print("   %-22s → %s  (없음)" % (p, l)); broken += 1
    if not broken:
        print("   없음")

    # onclick 은 있는데 정의가 없는 함수
    print("\n[정의 없는 핸들러] 눌러도 아무 일이 없거나 오류")
    miss = 0
    for p, d in info.items():
        body = read(p)
        for fn in d["onclick"]:
            if fn in d["defines"]:
                continue
            if re.search(r'window\.%s\s*=' % re.escape(fn), body):
                continue
            if re.search(r'\b%s\s*=\s*(function|\()' % re.escape(fn), body):
                continue
            # 외부 스크립트에 있을 수 있으니 assets 도 확인
            found = False
            for js in glob.glob(os.path.join(ROOT, "assets", "*.js")):
                with open(js, encoding="utf-8", errors="ignore") as f:
                    if re.search(r'(window\.%s\s*=|function\s+%s\s*\()' % (re.escape(fn), re.escape(fn)), f.read()):
                        found = True; break
            if not found:
                print("   %-22s %s()" % (p, fn)); miss += 1
    if not miss:
        print("   없음")

    # 플로우 대조
    print("\n" + "=" * 68)
    print("  플로우 대조 — 있어야 할 단계가 실제로 있는가")
    print("=" * 68)
    report = {}
    for name, steps in FLOWS.items():
        print("\n■ %s" % name)
        ok = 0
        rows = []
        for label, step in steps:
            hit = has(step, info)
            mark = "O" if hit else "X"
            if hit: ok += 1
            where = ", ".join(hit[:3]) + (" …" if len(hit) > 3 else "")
            print("   [%s] %-16s %s" % (mark, label, where if hit else "  ← 없음"))
            rows.append({"step": label, "ok": bool(hit), "where": hit})
        pct = round(100 * ok / len(steps))
        print("   ── 완성도 %d/%d (%d%%)" % (ok, len(steps), pct))
        report[name] = {"ok": ok, "total": len(steps), "pct": pct, "rows": rows}

    with open(os.path.join(ROOT, "tools", "flow-map.json"), "w", encoding="utf-8") as f:
        json.dump({"pages": info, "flows": report}, f, ensure_ascii=False, indent=1)
    print("\n결과: tools/flow-map.json")

if __name__ == "__main__":
    main()
