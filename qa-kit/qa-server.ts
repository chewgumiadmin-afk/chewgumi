/*! QA Kit — 서버 (Supabase Edge Function 또는 Deno Deploy)
 *
 *  준비
 *   1) 아래 SQL 로 표를 만듭니다
 *   2) 환경변수를 넣습니다
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (저장용)
 *      ANTHROPIC_API_KEY                        (안내·값채우기 — 없으면 기본값)
 *      GITHUB_TOKEN, GITHUB_REPO                (캡처 저장·코드 읽기 — 선택)
 *      QA_EMAIL, QA_PHONE                       (테스트로 받을 곳)
 *   3) 배포한 주소를 qa-kit.js 의 data-endpoint 에 넣습니다
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AI = Deno.env.get('ANTHROPIC_API_KEY') || '';
const GH = Deno.env.get('GITHUB_TOKEN') || '';
const REPO = Deno.env.get('GITHUB_REPO') || '';
const QA_EMAIL = Deno.env.get('QA_EMAIL') || 'qa@example.com';
const QA_PHONE = Deno.env.get('QA_PHONE') || '010-0000-0000';
const MODEL = Deno.env.get('AI_MODEL') || 'claude-sonnet-5';

const unb64 = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob((s || '').replace(/\n/g, '')), c => c.charCodeAt(0)));

async function askAI(prompt: string, maxTokens = 1200) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': AI, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'ai');
  let t = (d.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
  return t.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

async function readCode(page: string) {
  if (!GH || !REPO) return '';
  const file = page.split('?')[0].split('#')[0];
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}?ref=main`,
    { headers: { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github+json' } });
  if (!r.ok) return '';
  const d = await r.json();
  const full = unb64(d.content || '');
  const rx = /(function\s+\w*(?:submit|save|join|order|send|valid|check|apply|pay|login)\w*[\s\S]{0,700}?\n\s*\})|(<input[^>]*>)|(<button[^>]*>[^<]{0,30})|(functions\/v1\/\w+)|(rest\/v1\/\w+)/gi;
  const out: string[] = []; let m; let n = 0;
  while ((m = rx.exec(full)) && n < 60) { out.push(m[0]); n++; }
  return out.join('\n').slice(0, 6000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const project = String(body.project || 'default');

  /* ── 신고 접수 ── */
  if (body.action === 'report') {
    const r = body.report || {};
    let shotPath = '';
    if (r.shot && GH && REPO) {
      const b64 = String(r.shot).split(',')[1] || '';
      if (b64) {
        const name = `qa/${String(r.page || 'p').replace(/[^\w.-]/g, '_')}_${Date.now()}.jpg`;
        const up = await fetch(`https://api.github.com/repos/${REPO}/contents/${name}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${GH}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `qa: ${r.page} capture`, content: b64, branch: 'main' })
        });
        if (up.ok) shotPath = name;
      }
    }
    const { data, error } = await db.from('qa_reports').insert({
      project, page: r.page || '', kind: r.kind || '', note: r.note || '',
      device: String(r.device || '').slice(0, 120), viewport: r.viewport || '',
      status: 'open', shot_url: shotPath
    }).select('id').single();
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, id: data?.id });
  }

  /* ── 목록 · 처리 ── */
  if (body.action === 'list') {
    const { data } = await db.from('qa_reports').select('*')
      .eq('project', project).eq('status', 'open')
      .order('created_at', { ascending: false }).limit(30);
    return json({ ok: true, items: data || [] });
  }
  if (body.action === 'done') {
    const ids = Array.isArray(body.ids) ? body.ids : [body.id];
    await db.from('qa_reports').delete().in('id', ids);
    return json({ ok: true });
  }

  /* ── 값 채우기 ── */
  if (body.action === 'autofill') {
    const fields = body.fields || [];
    const stamp = Date.now().toString(36).slice(-4);
    const base: Record<string, string> = {
      name: 'QA' + stamp, phone: QA_PHONE, email: QA_EMAIL,
      zip: '04309', addr1: '서울 용산구 청파로47길 46', addr2: '205호',
      memo: '[테스트] 확인 후 정리해 주세요', pw: 'QAtest!2026',
      title: '[테스트] 점검용', body: '[테스트] 점검 중 작성된 글입니다.'
    };
    if (!AI) {
      const v: Record<string, string> = {};
      fields.forEach((f: any) => { v[f.key] = base[f.guess] || 'QA'; });
      return json({ ok: true, values: v, notes: [] });
    }
    const code = await readCode(body.page || '');
    try {
      const t = await askAI(
`웹사이트 화면을 점검하며 입력칸을 채우려 합니다.
아래 코드를 읽고 각 칸에 넣을 값과 주의할 점을 정해 주세요.

[화면] ${body.page}
[제목] ${body.title || ''}
[글자] ${String(body.context || '').slice(0, 400)}

[코드]
${code || '(읽지 못함)'}

[입력칸]
${fields.map((f: any, i: number) => `${i+1}. key=${f.key} | 안내=${f.label} | 힌트=${f.guess} | 형식=${f.type}`).join('\n')}

[기준]
· 코드에 메일 발송·인증이 있으면 실제 받는 주소 ${QA_EMAIL} 을 씁니다.
· 문자·인증번호 발송이 있으면 ${QA_PHONE} 을 씁니다.
· 비밀번호 규칙이 보이면 그 규칙을 만족시킵니다.
· 글자 수 제한이 보이면 그 안에서 씁니다.
· 글을 쓰는 칸은 화면 성격에 맞추고 앞에 [테스트] 를 붙입니다.

오직 JSON 만 출력합니다.
{"values":{"key":"값"},"notes":["실제로 전송되는 것만 한 줄씩"]}`);
      const p = JSON.parse(t);
      const v = p.values || p;
      fields.forEach((f: any) => { if (!v[f.key]) v[f.key] = base[f.guess] || 'QA'; });
      return json({ ok: true, values: v, notes: p.notes || [] });
    } catch {
      const v: Record<string, string> = {};
      fields.forEach((f: any) => { v[f.key] = base[f.guess] || 'QA'; });
      return json({ ok: true, values: v, notes: [] });
    }
  }

  /* ── 화면 안내 ── */
  if (body.action === 'guide') {
    const page = String(body.page || '');
    const { data: c } = await db.from('qa_guides')
      .select('guide,updated_at').eq('project', project).eq('page', page).maybeSingle();
    if (c && Date.now() - new Date(c.updated_at).getTime() < 86400000)
      return json({ ok: true, guide: c.guide, cached: true });
    if (!AI) return json({ ok: true, guide: null });

    const code = await readCode(page);
    try {
      const t = await askAI(
`웹사이트를 점검하려 합니다. 아래 코드를 읽고 이 화면을 어떻게 점검하면 되는지 알려주세요.

[화면] ${page}
[코드]
${code || '(읽지 못함)'}

[점검자가 쓸 값] 이메일 ${QA_EMAIL} · 연락처 ${QA_PHONE}

[규칙]
1. 개발자가 아닌 사람도 알아듣게 씁니다.
2. 각 항목 한 줄, 짧게.
3. 소비자가 쓰면서 헷갈릴 만한 곳을 check 에 넣습니다.
4. 오직 JSON 만 출력합니다.
{"what":"이 화면이 하는 일 한 줄",
 "send":["실제로 전송되는 것. 없으면 빈 배열"],
 "steps":["점검 순서 3~5단계"],
 "check":["쓰는 사람 입장에서 확인할 것 3~4개"],
 "watch":["주의할 점. 없으면 빈 배열"]}`);
      const guide = JSON.parse(t);
      await db.from('qa_guides').upsert(
        { project, page, guide, updated_at: new Date().toISOString() },
        { onConflict: 'project,page' });
      return json({ ok: true, guide });
    } catch { return json({ ok: true, guide: null }); }
  }

  return json({ error: 'unknown action' }, 400);
});
