/* ═════════════════════════════════════════════════════════
   츄구미 공용 챗봇 — assets/bot.js   (2026-09-04)

   그동안 페이지마다 챗봇을 따로 복사해 두어서, index 는 음성·지우기가
   있는 최신본이고 about 등은 그것이 없는 예전본이었습니다.
   이 파일 하나만 부르면 모든 페이지가 같은 봇을 씁니다.

   쓰는 법 — </body> 앞에 두 줄:
     <link rel="stylesheet" href="assets/bot.css">
     <script src="assets/bot.js" defer></script>

   담긴 것 — 화면(버튼·창) 자동 생성 / 상담·주문 도우미 /
            음성 통합 버튼(꾹 눌러 말하기 · 짧게 눌러 음성답변) /
            대화 기록 보존(로그인 중엔 계속, 아니면 방문 동안)
   ═════════════════════════════════════════════════════════ */
(function(){
  if(window.__cgbotMounted) return;   /* 한 페이지에 두 번 실려도 하나만 */
  window.__cgbotMounted = true;
  window.cgBotShared = true;   /* 표식 — 이 화면이 공용 봇을 쓰고 있다는 뜻 */

  /* ── 4단계 · 음성 명령 사전을 함께 불러옵니다 ──
     화면마다 <script> 한 줄을 더 넣지 않아도 되도록 이 파일이 자기 위치를 기준으로 찾아옵니다.
     (p/ 아래 상품 페이지처럼 폴더가 다른 화면도 경로가 저절로 맞습니다) */
  (function(){
    try{
      if(window.CG_VOICE) return;
      if(document.querySelector('script[src*="voice-manifest.js"]')) return;
      var me = document.currentScript;
      if(!me){ var ss=document.getElementsByTagName('script');
        for(var i=ss.length-1;i>=0;i--){ if((ss[i].src||'').indexOf('bot.js')>-1){ me=ss[i]; break; } } }
      var src = (me && me.src) ? me.src.replace(/bot\.js(\?.*)?$/, 'voice-manifest.js')
                               : 'assets/voice-manifest.js';
      var t = document.createElement('script'); t.src = src; t.defer = true;
      (document.head || document.documentElement).appendChild(t);
    }catch(e){}
  })();
  var MARKUP = "<button class=\"cgbot-fab\" onclick=\"cgbotToggle()\" aria-label=\"상담 문의\">\n  <svg viewBox=\"0 0 24 24\"><path d=\"M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l2-4.6A8.4 8.4 0 0 1 21 11.5z\"/></svg>\n  <span class=\"dot\"></span>\n</button>\n<div class=\"cgbot-win\" id=\"cgbotWin\">\n  <div class=\"cgbot-hd\">\n    <div><b>츄구미 상담</b><small>상담 · 주문 · 음성으로 이용하세요</small></div>\n    <button class=\"cgbot-clr\" onclick=\"cgbotClear()\" aria-label=\"대화 지우기\" title=\"대화 지우기\">지우기</button>\n    <button onclick=\"cgbotToggle()\" aria-label=\"닫기\">&times;</button>\n  </div>\n  <div class=\"cgbot-body\" id=\"cgbotBody\"></div>\n  <div class=\"cgbot-note\">답변이 정확하지 않을 수 있습니다. 중요한 문의는 카카오톡으로 연결해 주세요.</div>\n  <div class=\"cgbot-ft\">\n    <button id=\"cgVoiceBtn\" class=\"cg-ic\" type=\"button\" title=\"꾹 눌러 말하기 · 짧게 눌러 음성답변\">\n        <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z\"/><path d=\"M18 11a6 6 0 0 1-12 0M12 17v4M9 21h6\"/></svg>\n        <span class=\"cg-spk\" aria-hidden=\"true\"></span>\n      </button>\n      <input id=\"cgbotIn\" placeholder=\"말하거나 입력하세요\" onkeydown=\"if(event.key==='Enter')cgbotSend()\">\n      <button id=\"cgbotBtn\" onclick=\"cgbotSend()\" aria-label=\"보내기\" title=\"보내기\"><img src=\"logo.png\" alt=\"\" class=\"send-logo\" onerror=\"this.onerror=null;this.src='assets/logo-rainbow.png'\"></button>\n  </div>\n</div>\n";
  function mount(){
    if(!document.body) return;
    if(document.getElementById('cgbotWin')) return;  /* 페이지에 이미 박혀 있으면 건드리지 않음 */
    var w = document.createElement('div');
    w.innerHTML = MARKUP;
    while(w.firstChild) document.body.appendChild(w.firstChild);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

/* ── 상담 · 주문 ── */
(function(){
  var SB='https://psynvpuedzjvytsgdhgg.supabase.co';
  var KEY='sb_publishable_Tz7vgJXgYHQ3tyUfm87WTw_vV1Dxfuk';
  var kakaoUrl='', started=false, hist=[];

  /* ── 대화 기록 보존 ──
     로그인 중이면 브라우저에 계속(localStorage), 아니면 이번 방문 동안만(sessionStorage).
     최근 40개까지만 남깁니다. */
  var HMAX=40;
  function who(){ try{ var t=JSON.parse(localStorage.getItem('cg_sb')||'{}');
    return String((t && (t.em || t.u)) || ''); }catch(e){ return ''; } }
  function store(){ return who() ? localStorage : sessionStorage; }
  function hkey(){ var u=who(); return u ? 'cg_bot_hist_'+u : 'cg_bot_hist'; }
  /* 로그아웃하면(=로그인 정보가 없으면) 이 기기에 남아 있던 '로그인용' 대화 기록을 지웁니다.
     로그아웃 코드가 여러 화면에 흩어져 있어 한 곳에서만 정리하도록 했습니다. (issues #32)
     비로그인 기록(sessionStorage)은 탭을 닫으면 저절로 사라지므로 그대로 둡니다. */
  function sweepHist(){ try{ if(who()) return;
    var ks=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i);
      if(k && k.indexOf('cg_bot_hist_')===0) ks.push(k); }
    for(var j=0;j<ks.length;j++) localStorage.removeItem(ks[j]); }catch(e){} }
  sweepHist();
  function saveHist(){ try{ store().setItem(hkey(), JSON.stringify(hist.slice(-HMAX))); }catch(e){} }
  function loadHist(){ try{ var v=JSON.parse(store().getItem(hkey())||'[]');
    return Array.isArray(v) ? v.slice(-HMAX) : []; }catch(e){ return []; } }
  function pushHist(role,text){ hist.push({role:role,text:text});
    if(hist.length>HMAX) hist=hist.slice(-HMAX); saveHist(); }
  var sid=''; try{ sid=localStorage.getItem('cg_chat_sid')||'';
    if(!sid){ sid=Math.random().toString(36).slice(2)+Date.now().toString(36);
      localStorage.setItem('cg_chat_sid',sid);} }catch(e){}

  function el(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function add(role,text){
    var d=document.createElement('div');
    d.className='cgbot-msg '+(role==='me'?'me':'bot');
    d.textContent=text; el('cgbotBody').appendChild(d);
    el('cgbotBody').scrollTop=el('cgbotBody').scrollHeight;
    return d;
  }
  function addKakao(){
    if(!kakaoUrl) return;
    var a=document.createElement('a');
    a.className='cgbot-kakao'; a.href=kakaoUrl; a.target='_blank'; a.rel='noopener';
    a.textContent='카카오톡으로 상담원 연결';
    el('cgbotBody').appendChild(a);
    el('cgbotBody').scrollTop=el('cgbotBody').scrollHeight;
  }
  /* ── 주문 도우미 ── */
  var PRODUCTS=[
    {no:15,name:'트래블잇 1봉',price:3500,line:'travel',key:['1봉','한봉','낱개'],img:'assets/prod/travel-1.jpg'},
    {no:11,name:'트래블잇 3봉',price:9900,line:'travel',key:['3봉','세봉'],img:'assets/prod/travel-3.jpg'},
    {no:12,name:'트래블잇 5봉',price:14900,line:'travel',key:['5봉','다섯봉'],img:'assets/prod/travel-5.jpg'},
    {no:13,name:'트래블잇 10봉',price:27900,line:'travel',key:['10봉','열봉'],img:'assets/prod/travel-10.jpg'},
    {no:14,name:'트래블잇 20봉',price:52500,line:'travel',key:['20봉','스무봉'],img:'assets/prod/travel-20.jpg'},
    {no:16,name:'듀잇 레몬민트',price:19900,line:'doit',key:['레몬','민트'],img:'assets/prod/dew-lemon.jpg'},
    {no:17,name:'듀잇 그레이프',price:19900,line:'doit',key:['그레이프','포도'],img:'assets/prod/dew-grape.jpg'},
    {no:18,name:'듀잇 4개입',price:19900,line:'doit',key:['4개','네개'],img:'assets/prod/dew-4.jpg'},
    {no:19,name:'듀잇 6개입',price:27900,line:'doit',key:['6개','여섯'],img:'assets/prod/dew-6.jpg'},
    {no:20,name:'듀잇 10개입',price:42900,line:'doit',key:['10개','열개'],img:'assets/prod/dew-10.jpg'},
    {no:21,name:'듀잇 20개입',price:81000,line:'doit',key:['20개','스무개'],img:'assets/prod/dew-20.jpg'}
  ];
  var BUY=/사줘|살게|살래|주문|구매|시켜|사고\s*싶|담아|장바구니|결제|주세요/;

  function findProduct(t){
    var s=String(t||'').replace(/\s/g,'');
    var isT=/트래블|travel|여행/i.test(s), isD=/듀잇|dew|자일리톨|캔디/i.test(s);
    var hit=null;
    PRODUCTS.forEach(function(p){
      if(hit) return;
      var lineOk=(p.line==='travel'&&isT)||(p.line==='doit'&&isD)||(!isT&&!isD);
      if(!lineOk) return;
      p.key.forEach(function(k){ if(!hit && s.indexOf(k)>-1) hit=p; });
    });
    if(!hit && isT) hit=PRODUCTS[1];
    if(!hit && isD) hit=PRODUCTS[7];
    return hit;
  }
  function won(v){return Number(v||0).toLocaleString();}
  function addToCart(p,qty){
    var cart=[]; try{cart=JSON.parse(localStorage.getItem('cg_cart')||'[]');}catch(e){}
    var found=null;
    cart.forEach(function(c){ if(c.id===p.no||c.no===p.no) found=c; });
    if(found){ found.qty=(found.qty||1)+qty; }
    else { cart.push({id:p.no,no:p.no,name:p.name,price:p.price,qty:qty,
                      img:(p.img || (window.cgImgByName ? cgImgByName(p.name) : ''))}); }
    try{localStorage.setItem('cg_cart',JSON.stringify(cart));}catch(e){}
    return cart.reduce(function(s,c){return s+(c.price||0)*(c.qty||1);},0);
  }
  function orderCard(p,qty){
    var wrap=document.createElement('div'); wrap.className='cgbot-order';
    var ship=p.price*qty>=50000?0:2500;
    wrap.innerHTML='<div class="o-nm">'+esc(p.name)+' <b>'+qty+'개</b></div>'
      +'<div class="o-pr">상품 '+won(p.price*qty)+'원'
      +(ship?' + 배송비 '+won(ship)+'원':' + 배송비 무료')
      +'<br><b>합계 '+won(p.price*qty+ship)+'원</b></div>'
      +'<div class="o-bt"><button class="ob primary">담고 주문하기</button>'
      +'<button class="ob">담아두기</button></div>';
    var bs=wrap.querySelectorAll('.ob');
    bs[0].onclick=function(){
      addToCart(p,qty);
      add('bot','장바구니에 담았습니다. 주문서로 이동합니다.');
      setTimeout(function(){ location.href='checkout.html'; },700);
    };
    bs[1].onclick=function(){
      var t=addToCart(p,qty);
      add('bot','담아두었습니다. 장바구니 합계 '+won(t)+'원입니다.');
    };
    el('cgbotBody').appendChild(wrap);
    el('cgbotBody').scrollTop=el('cgbotBody').scrollHeight;
  }
  function tryOrder(text){
    if(!BUY.test(String(text||''))) return false;
    var p=findProduct(text);
    if(!p){
      add('bot','어떤 상품을 원하시나요? 아래에서 골라주세요.');
      var w=document.createElement('div'); w.className='cgbot-quick';
      [11,12,18,16].forEach(function(no){
        var pp=null; PRODUCTS.forEach(function(q){if(q.no===no)pp=q;});
        if(!pp) return;
        var b=document.createElement('button'); b.textContent=pp.name;
        b.onclick=function(){ add('me',pp.name+' 주문할게요'); orderCard(pp,1); };
        w.appendChild(b);
      });
      el('cgbotBody').appendChild(w);
      el('cgbotBody').scrollTop=el('cgbotBody').scrollHeight;
      return true;
    }
    var _m=p.name+'으로 준비했습니다. 확인하시고 진행해 주세요.';
    add('bot',_m); if(window.cgbotSpeak) cgbotSpeak(_m);
    orderCard(p,1);
    return true;
  }

  function quick(){
    var qs=['배송 얼마나 걸리나요','배송비 얼마인가요','무통장 계좌 알려주세요','트래블잇이 뭔가요'];
    var w=document.createElement('div'); w.className='cgbot-quick';
    qs.forEach(function(q){
      var b=document.createElement('button'); b.textContent=q;
      b.onclick=function(){ el('cgbotIn').value=q; cgbotSend(); w.remove(); };
      w.appendChild(b);
    });
    el('cgbotBody').appendChild(w);
  }
  window.cgbotClear=function(){
    if(!confirm('지금까지의 대화를 지울까요?')) return;
    hist = [];
    started = false;
    var b=document.getElementById('cgbotBody');
    if(b) b.innerHTML='';
    try{
      sessionStorage.removeItem('cgbot_sid');
      localStorage.removeItem('cgbot_hist');
      sessionStorage.removeItem(hkey());
      localStorage.removeItem(hkey());
    }catch(e){}
    if(b){
      var d=document.createElement('div');
      d.className='cgbot-msg bot';
      d.textContent='대화를 지웠습니다. 무엇을 도와드릴까요?';
      b.appendChild(d);
    }
  };

  window.cgbotToggle=function(){
    var w=el('cgbotWin'); w.classList.toggle('on');
    if(w.classList.contains('on')){
      if(!started){
        started=true;
        var saved=loadHist();
        if(saved.length){
          hist=saved;
          saved.forEach(function(m){ add(m.role==='me'?'me':'bot', m.text); });
        } else
        add('bot','안녕하세요, 츄구미입니다.\n\n이런 것들을 도와드릴 수 있어요.\n\n· 상품·성분·배송·환불 안내\n· "트래블잇 3봉 주문할게요" 하시면 바로 담아드립니다\n· 마이크를 꾹 누른 채 말씀하시면 그대로 보내드립니다\n· 마이크를 짧게 누르면 답변을 읽어드립니다\n\n무엇을 도와드릴까요?');
        quick();
        fetch(SB+'/functions/v1/chat',{method:'POST',
          headers:{'Content-Type':'application/json',apikey:KEY},
          body:JSON.stringify({action:'config'})})
        .then(function(r){return r.json();})
        .then(function(d){ kakaoUrl=d.kakao||''; }).catch(function(){});
      }
      setTimeout(function(){el('cgbotIn').focus();},80);
    }
  };
  /* ═══ 4단계 · 음성 명령 사전 연결 (assets/voice-manifest.js) ═══
     손님 말은 사전에 적힌 목록에서만 찾아 실행합니다. 목록에 없으면 평소대로 상담 답변으로 갑니다.
     말을 코드로 바꿔 그때그때 실행하는 일은 없습니다. (issues #16 · fix_log #18)
     사전이 없는 화면에서는 이 부분이 통째로 건너뛰어져 지금까지와 똑같이 동작합니다.

     순서 — ① 말로 받으면 안 되는 것 → ② 여쭤 본 동작의 대답 → ③ 이 화면 전용 명령
            → ④ 말로 주문 담기 → ⑤ 모든 화면 공통 명령 → ⑥ 상담 답변
     ③ 을 ④ 보다 먼저 두는 이유: 주문서 화면의 "결제해 줘" 같은 말이
     주문 담기로 새어 나가면 안 되기 때문입니다. 반대로 "트래블잇 3봉 주문할게요" 는
     화면 전용 명령이 아니므로 ④ 의 주문 담기가 그대로 받습니다. */
  var cgPending = null;   /* 되돌릴 수 없는 동작을 여쭤 본 뒤 "네" 를 기다리는 중 */
  var CG_YES = /^(네|넵|예|응|어|그래|확인|진행|해줘|해주세요|맞아|맞아요|좋아|좋아요|오케이|ok|yes)$/i;
  function botSay(m){ add('bot', m); pushHist('bot', m); if(window.cgbotSpeak) cgbotSpeak(m); }
  /* 이 화면에서만 되는 명령의 id 목록 — 공통 목록을 빼서 구합니다 */
  function cgOwn(){
    try{
      var seen={}, out={};
      CG_VOICE.menu('__common__.html').forEach(function(m){ seen[m.id]=1; });
      CG_VOICE.menu().forEach(function(m){ if(!seen[m.id]) out[m.id]=1; });
      return out;
    }catch(e){ return {}; }
  }
  /* 사전에서 고른 동작 하나를 실행합니다 */
  function cgDo(hit){
    pushHist('me', hit._said);
    if(hit.confirm){ cgPending = hit.id;
      botSay(hit.label + ' 할까요? "네" 라고 말씀해 주세요.'); return true; }
    var r = CG_VOICE.run(hit.id);
    botSay((r && r.say) || hit.label);
    return true;
  }

  window.cgbotSend=function(){
    var v=el('cgbotIn').value.trim(); if(!v) return;
    el('cgbotIn').value=''; add('me',v);
    if(window.CG_VOICE){
      var _bk = CG_VOICE.blocked(v);                       /* ① 카드번호·비밀번호는 말로 받지 않습니다 */
      if(_bk){ pushHist('me',v); botSay(_bk.say); return; }

      if(cgPending){                                       /* ② 여쭤 본 동작의 대답 */
        var _a = cgPending; cgPending = null; pushHist('me',v);
        if(CG_YES.test(v.replace(/[\s.!?~,]/g,''))){
          var _r1 = CG_VOICE.run(_a, { confirmed: true });
          botSay((_r1 && _r1.say) || '진행했습니다.');
        } else botSay('취소했습니다.');
        return;
      }

      var _hit = CG_VOICE.match(v);                        /* ③ 이 화면 전용 명령이 먼저 */
      if(_hit && _hit.id && cgOwn()[_hit.id]){ _hit._said = v; if(cgDo(_hit)) return; }
    }
    if(tryOrder(v)){ pushHist('me',v); return; }
    if(window.CG_VOICE){                                   /* ⑤ 모든 화면 공통 명령 */
      var _hit2 = CG_VOICE.match(v);
      if(_hit2 && _hit2.id){ _hit2._said = v; if(cgDo(_hit2)) return; }
    }

    pushHist('me',v);
    var t=add('bot','…'); el('cgbotBtn').disabled=true;
    fetch(SB+'/functions/v1/chat',{method:'POST',
      headers:{'Content-Type':'application/json',apikey:KEY},
      body:JSON.stringify({action:'ask',question:v,sessionId:sid,history:hist.slice(0,-1)})})
    .then(function(r){return r.json();})
    .then(function(d){
      el('cgbotBtn').disabled=false;
      t.textContent=d.answer||'답변을 가져오지 못했습니다.';
      pushHist('bot',t.textContent);
      if(window.cgbotSpeak) cgbotSpeak(t.textContent);
      if(d.kakao) kakaoUrl=d.kakao;
      if(d.handoff) addKakao();
    }).catch(function(){
      el('cgbotBtn').disabled=false;
      t.textContent='연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      addKakao();
    });
  };
})();


/* ── 음성 입력 · 출력 ── */
/* ═══ 음성 입력·출력 — cgVoiceBtn 통합 (1단계) ═══
   꾹 누르는 동안 듣기 → 떼면 자동 전송 + 답변 자동 낭독
   짧게 탭 = 음성답변 켜기·끄기 / 누른 채 위로 밀면 취소 / 무음 1.2초면 자동 종료 */
(function(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, listening = false, starting = false, speakOn = false;
  var pressing = false, held = false, cancelled = false, startY = 0;
  var silenceTimer = null, holdTimer = null, speakOnce = false;
  var gotSpeech = false;
  var HOLD_MS = 320, SILENCE_MS = 1200, CANCEL_PX = 60;

  try{ speakOn = localStorage.getItem('cg_tts')==='1'; }catch(e){}

  function el(id){ return document.getElementById(id); }
  function btn(){ return el('cgVoiceBtn'); }
  function ph(t){ var i = el('cgbotIn'); if(i) i.placeholder = t; }
  function resetPh(){ ph('말하거나 입력하세요'); }

  function paint(){
    var b = btn(); if(!b) return;
    b.classList.toggle('on', speakOn && !listening);
    b.classList.toggle('rec', listening && !cancelled);
    b.classList.toggle('cancel', listening && cancelled);
    b.setAttribute('aria-label', listening ? '듣는 중 — 손을 떼면 보냅니다'
      : (speakOn ? '꾹 눌러 말하기 · 짧게 눌러 음성답변 끄기'
                 : '꾹 눌러 말하기 · 짧게 눌러 음성답변 켜기'));
  }

  /* 답변 읽어주기 — 음성으로 물어본 경우에는 한 번만 자동으로 읽습니다 */
  window.cgbotSpeak = function(text){
    var once = speakOnce; speakOnce = false;
    if(!(speakOn || once) || !window.speechSynthesis) return;
    try{
      speechSynthesis.cancel();
      var t = String(text||'').replace(/https?:\/\/\S+/g,'링크').slice(0,300);
      var u = new SpeechSynthesisUtterance(t);
      u.lang='ko-KR'; u.rate=1.05; u.pitch=1.0;
      speechSynthesis.speak(u);
    }catch(e){}
  };

  window.cgbotSpeakToggle = function(){
    speakOn = !speakOn;
    try{ localStorage.setItem('cg_tts', speakOn?'1':'0'); }catch(e){}
    if(!speakOn && window.speechSynthesis){ try{ speechSynthesis.cancel(); }catch(e){} }
    ph(speakOn ? '음성 답변을 켰습니다' : '음성 답변을 껐습니다');
    setTimeout(resetPh, 1600);
    paint();
  };

  function clearSilence(){ if(silenceTimer){ clearTimeout(silenceTimer); silenceTimer = null; } }
  function bumpSilence(){ clearSilence();
    silenceTimer = setTimeout(function(){ stopListen(false); }, SILENCE_MS); }

  function startListen(){
    if(listening || starting) return;
    if(!SR) return;
    /* 2단계(cgVoiceGuard) 연결 지점 — 비밀번호·카드번호 칸에서는 듣지 않습니다 */
    if(typeof window.cgVoiceBlocked === 'function' && window.cgVoiceBlocked()) return;
    cancelled = false; gotSpeech = false; starting = true;
    try{ rec = new SR(); }catch(e){ starting = false; return; }
    rec.lang='ko-KR'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;

    rec.onstart = function(){ starting = false; listening = true; paint(); ph('듣고 있습니다…'); bumpSilence(); };
    rec.onresult = function(e){
      var t = '';
      for(var k=0;k<e.results.length;k++) t += e.results[k][0].transcript;
      gotSpeech = true;
      var i = el('cgbotIn'); if(i && !cancelled) i.value = t;
      bumpSilence();
      if(e.results[e.results.length-1].isFinal) stopListen(false);
    };
    rec.onerror = function(e){
      clearSilence(); starting = false; listening = false; paint(); resetPh();
      if(e && e.error === 'not-allowed')
        alert('마이크 사용이 차단되어 있습니다.\n브라우저 주소창의 자물쇠를 눌러 마이크를 허용해 주세요.');
    };
    rec.onend = function(){
      clearSilence(); starting = false; listening = false; paint();
      var i = el('cgbotIn');
      if(cancelled){ if(i) i.value = ''; ph('취소했습니다'); setTimeout(resetPh, 1200); return; }
      resetPh();
      if(gotSpeech && i && i.value.replace(/\s/g,'')){
        speakOnce = true;
        setTimeout(function(){ speakOnce = false; }, 30000);
        setTimeout(function(){ if(window.cgbotSend) cgbotSend(); }, 200);
      }
    };
    try{ rec.start(); }catch(e){ starting = false; paint(); }
  }

  function stopListen(cancel){
    if(cancel) cancelled = true;
    clearSilence();
    if(rec){ try{ rec.stop(); }catch(e){ try{ rec.abort(); }catch(e2){} } }
    else { listening = false; starting = false; paint(); }
  }
  window.cgVoiceStop = function(){ stopListen(true); };

  function yOf(ev){
    if(ev.touches && ev.touches[0]) return ev.touches[0].clientY;
    if(ev.changedTouches && ev.changedTouches[0]) return ev.changedTouches[0].clientY;
    return ev.clientY || 0;
  }
  function onDown(ev){
    var b = btn(); if(!b) return;
    if(ev.pointerType === 'mouse' && ev.button !== 0) return;
    pressing = true; held = false; cancelled = false; startY = yOf(ev);
    if(holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(function(){
      if(!pressing) return;
      held = true;
      if(!SR){ alert('이 브라우저는 음성 입력을 지원하지 않습니다.\n크롬 또는 삼성 인터넷에서 이용해 주세요.'); return; }
      startListen();
    }, HOLD_MS);
    try{ if(b.setPointerCapture && ev.pointerId != null) b.setPointerCapture(ev.pointerId); }catch(e){}
  }
  function onMove(ev){
    if(!pressing || !held) return;
    var was = cancelled;
    cancelled = (startY - yOf(ev)) > CANCEL_PX;
    if(cancelled !== was){ paint(); ph(cancelled ? '손을 떼면 취소됩니다' : '듣고 있습니다…'); }
  }
  function onUp(){
    if(!pressing) return;
    pressing = false;
    if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    if(held) stopListen(cancelled);
    else window.cgbotSpeakToggle();
    held = false;
  }
  function onAbort(){
    pressing = false;
    if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    if(held) stopListen(true);
    held = false;
  }

  function bind(){
    var b = btn(); if(!b || b.__cgv) return; b.__cgv = 1;
    b.style.touchAction = 'none';
    if(window.PointerEvent){
      b.addEventListener('pointerdown', onDown);
      b.addEventListener('pointermove', onMove);
      b.addEventListener('pointerup', onUp);
      b.addEventListener('pointercancel', onAbort);
    }else{
      b.addEventListener('touchstart', function(e){ e.preventDefault(); onDown(e); }, false);
      b.addEventListener('touchmove', onMove, false);
      b.addEventListener('touchend', onUp, false);
      b.addEventListener('touchcancel', onAbort, false);
      b.addEventListener('mousedown', onDown);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    b.addEventListener('click', function(e){ e.preventDefault(); });
    b.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    /* 키보드 접근성 — 스페이스·엔터를 누르는 동안 듣습니다 */
    b.addEventListener('keydown', function(e){
      if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); if(SR) startListen(); }
    });
    b.addEventListener('keyup', function(e){
      if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault();
        if(listening || starting) stopListen(false); else window.cgbotSpeakToggle(); }
    });
    if(!SR) b.title = '음성 답변 켜기·끄기 (이 브라우저는 음성 입력을 지원하지 않습니다)';
    paint();
  }

  /* 이전 이름 호환 */
  window.cgbotMic = function(){ if(listening) stopListen(false); else startListen(); };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

/* ═══ 안전장치 cgVoiceGuard (2단계) ═══
   비밀번호·카드번호 칸에 커서가 가면 마이크를 강제로 끄고 "여기는 직접 입력해 주세요" 라고 알립니다.
   ⑤ 원칙 — 카드번호·비밀번호는 음성으로 받지 않습니다.
   bot.js 안에 두었으므로 assets/bot.js 를 부르는 모든 화면에 자동으로 걸립니다. */
(function(){
  var MSG = '여기는 직접 입력해 주세요';
  var toast = null, hideTimer = null, lastAt = 0;

  /* 칸 이름·안내문에서 민감한 칸을 알아냅니다 (요소 자신의 속성만 봅니다) */
  var EN = /(^|[^a-z])(cc-number|cc-csc|cc-exp|card|cardno|cardnum|ccnum|cvc|cvv|expiry|passwd|password|pwd|pin|jumin|ssn)/;
  var KO = /(비밀번호|암호|카드\s*번호|카드번호|유효기간|주민등록번호|주민번호|보안코드)/;
  var SAFE_TYPE = /^(email|tel|url|search|date|month|week|time|checkbox|radio|file|range|color|submit|button|hidden)$/;

  function isSensitive(el){
    if(!el || el.nodeType !== 1) return false;
    var tag = (el.tagName || '').toLowerCase();
    if(tag !== 'input' && tag !== 'textarea') return false;
    var t = (el.getAttribute('type') || '').toLowerCase();
    if(t === 'password') return true;

    /* 확실한 신호 — 칸 이름·자동완성 속성 */
    var strong = [el.getAttribute('name'), el.getAttribute('id'),
                  el.getAttribute('autocomplete')].join(' ').toLowerCase();
    if(EN.test(strong) || KO.test(strong)) return true;

    /* 약한 신호 — 안내문구. 이메일·전화 같은 칸에서는 보지 않습니다
       (예: "비밀번호를 재설정할 이메일" 칸까지 막히면 안 되므로) */
    if(SAFE_TYPE.test(t)) return false;
    var weak = [el.getAttribute('placeholder'), el.getAttribute('aria-label')]
               .join(' ').toLowerCase();
    return EN.test(weak) || KO.test(weak);
  }

  function focused(){
    try{ return document.activeElement; }catch(e){ return null; }
  }

  function say(){
    if(Date.now() - lastAt < 1500) return;   /* 너무 자주 뜨지 않게 */
    lastAt = Date.now();

    /* 봇 창이 열려 있으면 입력칸 안내문으로 알립니다 */
    var i = document.getElementById('cgbotIn');
    var win = document.getElementById('cgbotWin');
    if(i && win && win.classList.contains('on')){
      var old = i.placeholder;
      i.placeholder = MSG;
      setTimeout(function(){ try{ if(i.placeholder === MSG) i.placeholder = old || '말하거나 입력하세요'; }catch(e){} }, 2200);
    }

    /* 화면 아래쪽에 짧게 뜨는 알림 (bot.css 를 건드리지 않으려고 인라인으로 씁니다) */
    if(!toast){
      toast = document.createElement('div');
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.style.cssText =
        'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:2147483000;' +
        'max-width:min(88vw,320px);padding:10px 16px;border-radius:999px;' +
        'background:rgba(24,24,27,.92);color:#fff;font-size:14px;line-height:1.4;' +
        'text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.22);' +
        'opacity:0;transition:opacity .18s ease;pointer-events:none;';
      toast.textContent = MSG;
      (document.body || document.documentElement).appendChild(toast);
    }
    toast.textContent = MSG;
    toast.style.opacity = '1';
    if(hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){ if(toast) toast.style.opacity = '0'; }, 2200);
  }

  /* bot.js 의 startListen 이 매번 물어보는 자리 */
  window.cgVoiceBlocked = function(){
    if(!isSensitive(focused())) return false;
    say();
    return true;
  };

  /* 커서가 민감한 칸으로 들어오는 순간 듣던 것을 멈춥니다 */
  function onFocus(e){
    if(!isSensitive(e.target)) return;
    try{ if(typeof window.cgVoiceStop === 'function') window.cgVoiceStop(); }catch(err){}
    try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(err){}
    say();
  }

  document.addEventListener('focusin', onFocus, true);
  /* focusin 을 못 받는 옛 브라우저 대비 */
  document.addEventListener('focus', onFocus, true);
})();
