/* Liquid Glass lens: төменгі навигациядағы сырғитын шыны линза */
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var btns = [].slice.call(nav.querySelectorAll('button'));
  var lens = document.createElement('i');
  lens.className = 'lens';
  nav.insertBefore(lens, nav.firstChild);
  nav.classList.add('has-lens');

  var ready = false, curBtn = null, mt = 0;
  var dragging = false, moved = false, startX = 0, under = null, suppress = false;

  function active() { return nav.querySelector('button.on'); }
  function hap() {
    try { window.Telegram.WebApp.HapticFeedback.selectionChanged(); } catch (e) {}
  }
  function pulse() {
    nav.classList.add('moving');
    clearTimeout(mt);
    mt = setTimeout(function () { nav.classList.remove('moving'); }, 520);
  }
  function setLens(b, instant) {
    if (instant) lens.style.transition = 'none';
    lens.style.width = b.offsetWidth + 'px';
    lens.style.height = b.offsetHeight + 'px';
    lens.style.top = b.offsetTop + 'px';
    lens.style.setProperty('--lx', b.offsetLeft + 'px');
    if (instant) { void lens.offsetWidth; lens.style.transition = ''; }
  }
  function place() {
    if (nav.classList.contains('hidden')) { ready = false; return; }
    var b = active();
    if (!b) { lens.style.opacity = 0; return; }
    if (!b.offsetWidth) return;
    var first = !ready;
    setLens(b, first);
    lens.style.opacity = 1;
    ready = true;
    if (!first && b !== curBtn) pulse();
    curBtn = b;
  }

  new MutationObserver(function () {
    if (dragging) return;
    requestAnimationFrame(place);
  }).observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true });
  window.addEventListener('resize', function () { ready = false; place(); });
  place();

  function btnAt(x) {
    var best = null, bd = 1e9;
    btns.forEach(function (b) {
      var r = b.getBoundingClientRect();
      var d = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  function setUnder(b) {
    if (b === under) return;
    if (under) under.classList.remove('under');
    under = b;
    if (b) { b.classList.add('under'); hap(); }
  }

  nav.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!e.target.closest('button')) return;
    dragging = true; moved = false; startX = e.clientX;
    nav.classList.add('lift');
  });
  nav.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    if (!moved && Math.abs(e.clientX - startX) < 6) return;
    if (!moved) { moved = true; nav.classList.add('dragging'); lens.classList.add('drag'); }
    var nr = nav.getBoundingClientRect();
    var lw = lens.offsetWidth;
    var minX = btns[0].offsetLeft;
    var last = btns[btns.length - 1];
    var maxX = last.offsetLeft + last.offsetWidth - lw;
    var x = Math.max(minX, Math.min(maxX, e.clientX - nr.left - lw / 2));
    lens.style.setProperty('--lx', x + 'px');
    setUnder(btnAt(e.clientX));
  });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    var target = moved ? btnAt(e.clientX) : null;
    var was = moved;
    moved = false;
    setUnder(null);
    nav.classList.remove('lift', 'dragging');
    lens.classList.remove('drag');
    if (was) {
      suppress = true;
      setTimeout(function () { suppress = false; }, 400);
      if (target && target !== active()) target.click();
    }
    requestAnimationFrame(function () { pulse(); place(); });
  }
  nav.addEventListener('pointerup', end);
  nav.addEventListener('pointercancel', end);
  nav.addEventListener('click', function (e) {
    if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; }
  }, true);
})();
