/* Бас мәзір: бір тіл батырмасы + тіл таңдау парағы */
(function () {
  var btn = document.getElementById('langBtn');
  var sheet = document.getElementById('langSheet');
  var code = document.getElementById('langCode');
  if (!btn || !sheet) return;
  var CODES = { kk: 'ҚАЗ', uz: 'UZ', ru: 'РУС' };

  function hap() { try { window.Telegram.WebApp.HapticFeedback.selectionChanged(); } catch (e) {} }
  function label() {
    var l = (document.documentElement.lang || 'kk').slice(0, 2);
    if (code) code.textContent = CODES[l] || 'ҚАЗ';
  }
  function open() { sheet.classList.remove('hidden'); hap(); }
  function close() { sheet.classList.add('hidden'); }

  btn.addEventListener('click', open);
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) close();
  });
  sheet.querySelectorAll('button[data-lang]').forEach(function (b) {
    // app.js өз onclick-імен тілді ауыстырады, біз тек парақты жабамыз
    b.addEventListener('click', function () { hap(); setTimeout(close, 120); });
  });

  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  label();
})();
