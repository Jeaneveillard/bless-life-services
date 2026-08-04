(function () {
  'use strict';
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      if (o == null) return undefined;
      if (/^\d+$/.test(k)) return o[Number(k)];
      return o[k];
    }, obj);
  }
  function apply(data) {
    document.querySelectorAll('[data-content]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-content'));
      if (typeof v === 'string' && v !== '') el.textContent = v;
    });
    document.querySelectorAll('[data-pay]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-pay'));
      if (typeof v === 'string' && v.indexOf('https://') === 0) {
        el.setAttribute('href', v);
        el.removeAttribute('aria-disabled');
      }
    });
    document.querySelectorAll('[data-src]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-src'));
      if (typeof v === 'string' && v !== '') {
        el.setAttribute('src', v);
      }
    });
    document.querySelectorAll('[data-alt-name]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-alt-name'));
      if (typeof v === 'string' && v !== '') {
        el.setAttribute('alt', v + ' candle');
      }
    });
  }
  fetch('content/site.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('content'); return r.json(); })
    .then(apply)
    .catch(function () { /* keep HTML fallbacks */ });
})();
