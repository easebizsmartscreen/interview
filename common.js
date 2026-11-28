/* EaseBiz SmartScreen — shared helpers for all pages. */
(function () {
  'use strict';
  var C = window.SMARTSCREEN || {};

  var S = {};

  S.$ = function (id) { return document.getElementById(id); };

  S.show = function (id, on) {
    var el = typeof id === 'string' ? S.$(id) : id;
    if (el) el.classList.toggle('hidden', on === false);
  };

  /** Shows one screen (an element with class "screen") and hides the others. */
  S.screen = function (id) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) {
      s.classList.toggle('hidden', s.id !== id);
    });
    window.scrollTo(0, 0);
  };

  S.esc = function (t) {
    return String(t === undefined || t === null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  S.fmtDate = function (iso, withTime) {
    if (!iso) return '';
    var d = new Date(iso);
    var opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime !== false) { opts.hour = 'numeric'; opts.minute = '2-digit'; }
    return d.toLocaleString('en-IN', opts);
  };

  S.configured = function () {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(String(C.BACKEND_URL || ''));
  };

  /** Calls the SmartScreen engine. Resolves with the reply; rejects with an Error whose .code is set when known. */
  S.api = function (action, data, timeoutMs) {
    if (!S.configured()) return Promise.reject(new Error('Setup not finished: the Web app URL is missing in config.js.'));
    var body = { action: action };
    Object.keys(data || {}).forEach(function (k) { body[k] = data[k]; });
    var req = fetch(C.BACKEND_URL, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
      .then(function (res) {
        if (!res.ok) throw new Error('The server replied with status ' + res.status + '.');
        return res.json();
      })
      .then(function (j) {
        if (j && j.ok === false && !j.code && !j.duplicate) {
          var err = new Error(j.error || 'Something went wrong.');
          err.code = /^[A-Z_]+$/.test(j.error || '') ? j.error : '';
          err.reply = j;
          throw err;
        }
        return j;
      });
    var ms = timeoutMs || 60000;
    return Promise.race([req, new Promise(function (_, rej) {
      setTimeout(function () { rej(new Error('The connection is slow. Please check your internet and try again.')); }, ms);
    })]);
  };

  S.blobToBase64 = function (blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { reject(fr.error || new Error('Could not read the file.')); };
      fr.readAsDataURL(blob);
    });
  };

  S.base64ToBlob = function (b64, mime) {
    var bin = atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  };

  S.errText = function (e) {
    if (!e) return 'Unknown error';
    return e.message || String(e);
  };

  S.toast = function (msg, kind) {
    var t = S.$('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast ' + (kind || '');
    clearTimeout(S._toastTimer);
    S._toastTimer = setTimeout(function () { t.className = 'toast hidden'; }, 4500);
  };

  S.param = function (name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  };

  /** Applies the brand name, logo and colours from config.js to the page header. */
  S.brand = function (subtitle) {
    var root = document.documentElement;
    if (C.BRAND_COLOR) root.style.setProperty('--brand', C.BRAND_COLOR);
    if (C.HEADER_COLOR) root.style.setProperty('--header', C.HEADER_COLOR);
    var h = S.$('brandHeader');
    if (!h) return;
    var logo = C.LOGO_URL ? '<img src="' + S.esc(C.LOGO_URL) + '" alt="" class="logo">' : '';
    h.innerHTML = '<div class="brandbar">' + logo + '<div><div class="brandname">' + S.esc(C.BRAND_NAME || 'EaseBiz') +
      ' <span class="product">' + S.esc(C.PRODUCT_NAME || 'SmartScreen') + '</span></div>' +
      (subtitle ? '<div class="brandsub">' + S.esc(subtitle) + '</div>' : '') + '</div></div>';
  };

  window.SS = S;
})();
