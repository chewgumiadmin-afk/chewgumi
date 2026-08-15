/*! ChewGumi QA Switch · MedIT
 *  ?qa=1 을 한 번 붙이면 그 뒤로는 계속 점검 모드가 유지됩니다.
 *  끄려면 ?qa=0 을 붙이거나 점검판에서 끄시면 됩니다.
 *  모든 페이지 <head> 안, 다른 점검 스크립트보다 먼저 넣습니다.
 */
(function () {
  'use strict';
  var KEY = 'cg_qa_on';
  var p = location.search;

  /* 주소에 지시가 있으면 그대로 따르고 저장 */
  if (/[?&]qa=1/.test(p)) {
    try { sessionStorage.setItem(KEY, '1'); localStorage.setItem(KEY, '1'); } catch (e) {}
    window.__QA = true;
    return;
  }
  if (/[?&]qa=0/.test(p)) {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {}
    window.__QA = false;
    return;
  }

  /* 지시가 없으면 저장된 상태를 따른다 */
  var on = false;
  try { on = sessionStorage.getItem(KEY) === '1' || localStorage.getItem(KEY) === '1'; }
  catch (e) {}
  if (!on) { window.__QA = false; return; }

  window.__QA = true;

  /* 점검 스크립트들이 주소로 판단하므로 주소를 맞춰준다 */
  try {
    var u = new URL(location.href);
    u.searchParams.set('qa', '1');
    history.replaceState(null, '', u.toString());
  } catch (e) {}
})();
