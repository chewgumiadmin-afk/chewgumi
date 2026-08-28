/* 츄구미 QA 기록 · 옆 창 · MedIT */

const $ = id => document.getElementById(id);
let ON = false, RUN = '', BUF = [];
let rec = null, chunks = [], recStart = 0;

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function say(t, k) {
  const m = $('msg');
  m.className = 'msg' + (k ? ' ' + k : '');
  m.textContent = t;
  if (t) setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 4000);
}

function stamp() {
  if (!recStart) return '';
  const s = Math.floor((Date.now() - recStart) / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':'
       + String(s % 60).padStart(2, '0');
}

function paint() {
  $('cnt').textContent = BUF.length;
  const last = BUF.slice(-40).reverse();
  $('list').innerHTML = last.length
    ? last.map(r => {
        const ic = { click: '·', input: '✎', move: '→',
                     bug: '✕', note: '!', check: '✓' }[r.kind] || '·';
        return `<div class="ev ${esc(r.kind)}">
          <i>${ic}</i>
          <span class="t">${esc(r.note || r.label || r.target)}${
            r.value ? ` <b style="opacity:.55;font-weight:500">${esc(r.value)}</b>` : ''}</span>
          ${r.rule ? `<span class="r">${esc(r.rule)}</span>` : ''}
          <span class="p">${esc(String(r.page).replace('.html', ''))}</span>
        </div>`;
      }).join('')
    : '<p class="empty">아직 없습니다</p>';
}

function setState(on, run) {
  ON = on; RUN = run || '';
  $('dot').classList.toggle('on', on);
  $('stTxt').textContent = on ? '기록하는 중입니다' : '꺼져 있습니다';
  $('stRun').textContent = on ? RUN : '';
  const b = $('toggle');
  b.textContent = on ? '기록 끄기' : '기록 시작';
  b.className = 'btn' + (on ? ' off' : '');
  $('check').disabled = !on;
  $('bBug').disabled = !on;
  $('bNote').disabled = !on;
  $('bOk').disabled = !on;
}

/* ── 켜고 끄기 ── */
$('toggle').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ type: 'toggle' });
  setState(r.on, r.run);
  if (r.on) { BUF = []; paint(); say('기록을 시작했습니다.', 'ok'); }
  else say('껐습니다.');
};

$('fresh').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ type: 'newRun' });
  RUN = r.run;
  $('stRun').textContent = ON ? RUN : '';
  BUF = []; paint();
  say('새 기록으로 시작합니다.', 'ok');
};

/* ── 이 화면 검사 ── */
$('check').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    const r = await chrome.tabs.sendMessage(tab.id, { type: 'check' });
    const f = (r && r.found) || [];
    say(f.length ? `${f.length}건 찾았습니다.` : '이 화면은 규칙에 맞습니다.',
        f.length ? 'bad' : 'ok');
  } catch (e) {
    say('이 화면에서는 검사할 수 없습니다.', 'bad');
  }
};

/* ── 메모 ── */
function note(kind) {
  const t = $('memo');
  const v = t.value.trim();
  if (kind !== 'check' && !v) {
    t.focus();
    t.placeholder = '무엇이 이상한지 적어주세요';
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    chrome.runtime.sendMessage({
      type: 'log', kind,
      page: tab ? (new URL(tab.url).pathname.split('/').pop() || '') : '',
      note: (stamp() ? `[${stamp()}] ` : '') + (v || '이 화면은 잘 됩니다'),
      url: tab ? tab.url : '',
      ua: navigator.userAgent
    });
  });
  t.value = '';
  say('적었습니다.', 'ok');
}
$('bBug').onclick = () => note('bug');
$('bNote').onclick = () => note('note');
$('bOk').onclick = () => note('check');

/* ── 녹화 ── */
$('rec').onclick = async () => {
  if (rec) { stopRec(); return; }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 12 }, audio: false
    });
    chunks = [];
    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 900000 });
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      save();
    };
    rec.start(1000);
    recStart = Date.now();
    stream.getVideoTracks()[0].onended = () => stopRec();

    $('rec').textContent = '● 녹화 중';
    $('rec').classList.add('on');
    say('녹화를 시작했습니다.', 'ok');
  } catch (e) {
    if (String(e).indexOf('NotAllowed') < 0) say('녹화를 시작하지 못했습니다.', 'bad');
  }
};

function stopRec() {
  if (!rec || rec.state === 'inactive') return;
  rec.stop();
  rec = null;
  recStart = 0;
  $('rec').textContent = '● 녹화';
  $('rec').classList.remove('on');
}

function save() {
  if (!chunks.length) return;
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (RUN || 'QA') + '_' + Date.now().toString(36) + '.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  say(`영상을 내려받았습니다. (${(blob.size / 1048576).toFixed(1)}MB)`, 'ok');
}

/* ── 글 복사 ── */
$('copy').onclick = () => {
  if (!BUF.length) { say('기록이 없습니다.', 'bad'); return; }

  const bugs = BUF.filter(x => x.kind === 'bug' || x.kind === 'note');
  let t = `[${RUN}] QA 기록\n\n`;
  if (bugs.length) {
    t += '찾은 것\n';
    bugs.forEach(x => {
      t += `  ${x.rule ? '[' + x.rule + '] ' : ''}${x.note}  (${x.page})\n`;
    });
    t += '\n';
  }
  t += '한 일\n';
  BUF.filter(x => x.kind !== 'bug' && x.kind !== 'note').forEach(x => {
    t += `  ${x.kind} · ${x.note || x.label || x.target}`
       + `${x.value ? ' = ' + x.value : ''}  (${x.page})\n`;
  });

  navigator.clipboard.writeText(t)
    .then(() => say('복사했습니다. 붙여넣으시면 됩니다.', 'ok'))
    .catch(() => say('복사하지 못했습니다.', 'bad'));
};

/* ── 새 기록이 오면 ── */
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'new' && msg.row) {
    BUF.push(msg.row);
    paint();
  }
});

/* ── 시작 ── */
chrome.runtime.sendMessage({ type: 'state' }).then(s => {
  setState(!!(s && s.on), s && s.run);
  paint();
});
