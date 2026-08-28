/* 츄구미 QA 기록 · 배경 · MedIT */

const SB = 'https://psynvpuedzjvytsgdhgg.supabase.co';
const K = 'sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';

/* 아이콘을 누르면 옆 창을 엽니다 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

/* 기록 번호 만들기 */
async function runId() {
  const { run } = await chrome.storage.local.get('run');
  if (run) return run;
  const r = 'QA' + Date.now().toString(36).toUpperCase();
  await chrome.storage.local.set({ run: r });
  return r;
}

/* 서버로 보냅니다 */
async function send(row) {
  try {
    await fetch(SB + '/rest/v1/qa_events', {
      method: 'POST',
      headers: {
        apikey: K,
        Authorization: 'Bearer ' + K,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch (e) { /* 조용히 */ }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'log') {
      const { on } = await chrome.storage.local.get('on');
      if (!on) { reply({ ok: false, off: true }); return; }

      const run = await runId();
      const row = {
        run_id: run,
        page: msg.page || '',
        kind: msg.kind || 'click',
        target: msg.target || '',
        label: msg.label || '',
        value: msg.value || '',
        note: msg.note || '',
        rule: msg.rule || '',
        url: (msg.url || '').slice(0, 300),
        ua: (msg.ua || '').slice(0, 160)
      };

      /* 옆 창에도 알립니다 */
      chrome.runtime.sendMessage({ type: 'new', row }).catch(() => {});

      await send(row);
      reply({ ok: true, run });
      return;
    }

    if (msg.type === 'state') {
      const s = await chrome.storage.local.get(['on', 'run']);
      reply({ on: !!s.on, run: s.run || '' });
      return;
    }

    if (msg.type === 'toggle') {
      const { on } = await chrome.storage.local.get('on');
      const next = !on;
      await chrome.storage.local.set({ on: next });
      if (next) {
        await chrome.storage.local.remove('run');
        await runId();
      }
      /* 열려 있는 탭에 알립니다 */
      const tabs = await chrome.tabs.query({});
      tabs.forEach(t => {
        chrome.tabs.sendMessage(t.id, { type: 'qa', on: next }).catch(() => {});
      });
      const s = await chrome.storage.local.get('run');
      reply({ on: next, run: s.run || '' });
      return;
    }

    if (msg.type === 'newRun') {
      await chrome.storage.local.remove('run');
      const r = await runId();
      reply({ run: r });
      return;
    }
  })();
  return true;
});
