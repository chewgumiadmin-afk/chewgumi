/*! ChewGumi UI · MedIT
 *  브라우저 기본 창(alert · confirm · prompt)을 우리 화면에 맞춘 창으로 바꿉니다.
 *  기존 코드를 고치지 않아도 그대로 동작합니다.
 */
(function () {
  'use strict';
  if (window.cgUI) return;

  var CSS = '\
.cgui{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;\
justify-content:center;padding:18px;background:rgba(20,12,16,.45);\
backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);\
font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",sans-serif;\
animation:cguiIn .18s ease}\
@keyframes cguiIn{from{opacity:0}to{opacity:1}}\
.cgui-in{width:min(100%,400px);background:#fff;border-radius:20px;\
padding:24px 22px calc(20px + env(safe-area-inset-bottom));\
box-shadow:0 20px 50px rgba(0,0,0,.2);animation:cguiUp .22s cubic-bezier(.2,.8,.3,1)}\
@keyframes cguiUp{from{transform:translateY(14px) scale(.98)}to{transform:none}}\
.cgui-t{font-size:15.5px;font-weight:800;letter-spacing:-.03em;color:#17171c;\
margin:0 0 10px;line-height:1.5}\
.cgui-m{font-size:14px;line-height:1.75;color:#4a4a52;white-space:pre-wrap;\
word-break:keep-all;margin:0 0 4px}\
.cgui-in input,.cgui-in textarea{width:100%;padding:12px 14px;border-radius:12px;\
border:1px solid rgba(0,0,0,.12);font-size:16px;font-family:inherit;\
box-sizing:border-box;margin-top:12px;color:#17171c;background:#fff}\
.cgui-in textarea{min-height:96px;line-height:1.7;resize:vertical}\
.cgui-in input:focus,.cgui-in textarea:focus{outline:2px solid #D82558;outline-offset:-1px}\
.cgui-b{display:flex;gap:8px;margin-top:18px}\
.cgui-b button{flex:1;min-height:48px;border:0;border-radius:999px;cursor:pointer;\
font-size:14px;font-weight:700;font-family:inherit;transition:filter .15s}\
.cgui-b button:active{filter:brightness(.95)}\
.cgui-b .no{background:rgba(0,0,0,.055);color:#555}\
.cgui-b .yes{background:linear-gradient(135deg,#E95073,#D82558);color:#fff}\
.cgui-b .warn{background:linear-gradient(135deg,#D4526E,#C0395C);color:#fff}\
@media(min-width:1024px){.cgui-in input,.cgui-in textarea{font-size:14.5px}}\
@media(max-width:400px){.cgui-in{border-radius:17px;padding:20px 18px}}';

  var st = document.createElement('style');
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var open = null;

  function build(opt) {
    return new Promise(function (done) {
      if (open) { try { open.remove(); } catch (e) {} }

      var d = document.createElement('div');
      d.className = 'cgui';

      var input = '';
      if (opt.input) {
        input = opt.long
          ? '<textarea id="cguiV" placeholder="' + esc(opt.hint || '') + '"></textarea>'
          : '<input id="cguiV" value="' + esc(opt.value || '') +
            '" placeholder="' + esc(opt.hint || '') + '" autocomplete="off">';
      }

      var btns = opt.cancel
        ? '<button type="button" class="no" data-r="0">' + esc(opt.no || '취소') + '</button>' +
          '<button type="button" class="' + (opt.danger ? 'warn' : 'yes') + '" data-r="1">' +
          esc(opt.yes || '확인') + '</button>'
        : '<button type="button" class="yes" data-r="1">확인</button>';

      d.innerHTML =
        '<div class="cgui-in" role="dialog" aria-modal="true">' +
          (opt.title ? '<p class="cgui-t">' + esc(opt.title) + '</p>' : '') +
          (opt.text ? '<p class="cgui-m">' + esc(opt.text) + '</p>' : '') +
          input +
          '<div class="cgui-b">' + btns + '</div>' +
        '</div>';

      document.body.appendChild(d);
      open = d;
      var prevOF = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      function close(v) {
        try { d.remove(); } catch (e) {}
        document.body.style.overflow = prevOF;
        open = null;
        document.removeEventListener('keydown', key);
        done(v);
      }

      function key(e) {
        if (e.key === 'Escape') close(opt.input ? null : false);
        else if (e.key === 'Enter' && !opt.long) {
          var v = d.querySelector('#cguiV');
          close(opt.input ? (v ? v.value : '') : true);
        }
      }

      d.addEventListener('click', function (e) {
        if (e.target === d) { close(opt.input ? null : false); return; }
        var b = e.target.closest('button[data-r]');
        if (!b) return;
        if (b.dataset.r === '0') { close(opt.input ? null : false); return; }
        var v = d.querySelector('#cguiV');
        close(opt.input ? (v ? v.value : '') : true);
      });

      document.addEventListener('keydown', key);

      setTimeout(function () {
        var f = d.querySelector('#cguiV') || d.querySelector('.yes');
        if (f) f.focus();
      }, 80);
    });
  }

  /* 제목과 내용을 나눈다 — 첫 줄이 짧으면 제목으로 */
  function split(msg) {
    var s = String(msg == null ? '' : msg);
    var i = s.indexOf('\n');
    if (i > 0 && i < 30) return { title: s.slice(0, i), text: s.slice(i + 1).trim() };
    if (s.length < 40) return { title: s, text: '' };
    return { title: '', text: s };
  }

  window.cgUI = {
    alert: function (msg) {
      var p = split(msg);
      return build({ title: p.title || '알려드립니다', text: p.text });
    },
    confirm: function (msg, opt) {
      var p = split(msg);
      opt = opt || {};
      return build({
        title: p.title || '확인해 주세요', text: p.text,
        cancel: true, yes: opt.yes, no: opt.no, danger: opt.danger
      });
    },
    prompt: function (msg, val, opt) {
      var p = split(msg);
      opt = opt || {};
      return build({
        title: p.title || '입력해 주세요', text: p.text,
        input: true, value: val, hint: opt.hint,
        long: opt.long, cancel: true, yes: opt.yes || '등록'
      });
    },

    form: function (title, fields) {
      /* fields: [{k, n, v, long, hint}] — 여러 칸을 한 창에 */
      return new Promise(function (done) {
        if (open) { try { open.remove(); } catch (e) {} }
        var d = document.createElement('div');
        d.className = 'cgui';
        d.innerHTML =
          '<div class="cgui-in" style="max-height:86svh;overflow-y:auto">' +
          '<p class="cgui-t">' + esc(title) + '</p>' +
          fields.map(function (f) {
            return '<label style="display:block;font-size:12px;font-weight:600;' +
              'color:#666;margin:12px 0 0">' + esc(f.n) + '</label>' +
              (f.long
                ? '<textarea data-k="' + esc(f.k) + '" placeholder="' + esc(f.hint || '') +
                  '" style="min-height:70px">' + esc(f.v || '') + '</textarea>'
                : '<input data-k="' + esc(f.k) + '" value="' + esc(f.v || '') +
                  '" placeholder="' + esc(f.hint || '') + '" autocomplete="off">');
          }).join('') +
          '<div class="cgui-b"><button type="button" class="no" data-r="0">취소</button>' +
          '<button type="button" class="yes" data-r="1">저장</button></div></div>';

        document.body.appendChild(d);
        open = d;
        var prevOF = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function close(v) {
          try { d.remove(); } catch (e) {}
          document.body.style.overflow = prevOF;
          open = null;
          done(v);
        }
        d.addEventListener('click', function (e) {
          if (e.target === d) return close(null);
          var b = e.target.closest('button[data-r]');
          if (!b) return;
          if (b.dataset.r === '0') return close(null);
          var out = {};
          d.querySelectorAll('[data-k]').forEach(function (el) {
            out[el.dataset.k] = el.value;
          });
          close(out);
        });
        document.addEventListener('keydown', function k(e) {
          if (e.key === 'Escape') { document.removeEventListener('keydown', k); close(null); }
        });
        setTimeout(function () {
          var f = d.querySelector('input,textarea');
          if (f) f.focus();
        }, 80);
      });
    },
    pick: function (title, items) {
      /* items: [{v, n, d, c}] */
      return new Promise(function (done) {
        if (open) { try { open.remove(); } catch (e) {} }
        var d = document.createElement('div');
        d.className = 'cgui';
        d.innerHTML =
          '<div class="cgui-in"><p class="cgui-t">' + esc(title) + '</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">' +
          items.map(function (x) {
            return '<button type="button" data-v="' + esc(x.v) + '" style="' +
              'display:flex;align-items:center;gap:10px;width:100%;min-height:52px;' +
              'padding:0 16px;border-radius:13px;cursor:pointer;background:#fff;' +
              'border:1.5px solid rgba(0,0,0,.08);font-size:14px;font-weight:600;' +
              'font-family:inherit;text-align:left;color:#17171c">' +
              (x.c ? '<span style="width:10px;height:10px;border-radius:50%;flex:none;' +
                'background:' + esc(x.c) + '"></span>' : '') +
              esc(x.n) +
              (x.d ? '<span style="margin-left:auto;font-size:11.5px;color:#8a8a92;' +
                'font-weight:500">' + esc(x.d) + '</span>' : '') +
              '</button>';
          }).join('') + '</div>' +
          '<div class="cgui-b"><button type="button" class="no" data-v="">취소</button></div></div>';

        document.body.appendChild(d);
        open = d;
        var prevOF = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function close(v) {
          try { d.remove(); } catch (e) {}
          document.body.style.overflow = prevOF;
          open = null;
          done(v || null);
        }
        d.addEventListener('click', function (e) {
          if (e.target === d) return close(null);
          var b = e.target.closest('button[data-v]');
          if (b) close(b.dataset.v);
        });
        document.addEventListener('keydown', function k(e) {
          if (e.key === 'Escape') { document.removeEventListener('keydown', k); close(null); }
        });
      });
    }
  };


  /* 기존 코드를 거의 안 고치고 바꾸는 방법.
     if(!confirm('...')) return;   →   cgAsk('...', function(){ 이어서 할 일 });  */
  window.cgAsk = function (msg, ok, opt) {
    cgUI.confirm(msg, opt || {}).then(function (yes) { if (yes && ok) ok(); });
  };

  /* 입력받고 이어가기 */
  window.cgGet = function (msg, val, ok, opt) {
    cgUI.prompt(msg, val, opt || {}).then(function (v) {
      if (v !== null && ok) ok(v);
    });
  };

  /* alert 만 안전하게 바꿉니다.
     confirm·prompt 는 값을 즉시 돌려줘야 해서 바꾸지 않고,
     각 화면에서 cgUI.confirm / cgUI.prompt 를 직접 씁니다. */
  window.alert = function (m) { cgUI.alert(m); };
})();
