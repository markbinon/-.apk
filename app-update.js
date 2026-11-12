/* Проверка обновлений Android-приложения.
   Работает только внутри приложения (Capacitor). На сайте и в PWA ничего не делает.
   Берёт последний релиз из GitHub Releases, сравнивает номер сборки (versionCode) с установленным
   и, если есть новее, показывает окно с кнопкой «Скачать». */
(function () {
  'use strict';

  var REPO = 'markbinon/-.apk';
  var CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // не чаще раза в 6 часов
  var LS_LAST = 'appUpdate.lastCheck';
  var LS_SKIP = 'appUpdate.skip';

  var cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

  function ls(get, key, val) {
    try { return get ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch (e) { return null; }
  }

  function installedBuild() {
    var App = (cap.Plugins && cap.Plugins.App) || (typeof cap.registerPlugin === 'function' && cap.registerPlugin('App'));
    if (!App || typeof App.getInfo !== 'function') return Promise.reject(new Error('App plugin missing'));
    return App.getInfo().then(function (i) { return parseInt(i.build, 10); });
  }

  function latestRelease() {
    return fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function showDialog(release, apkUrl, number) {
    if (document.getElementById('appUpdateDialog')) return;

    var style = document.createElement('style');
    style.textContent =
      '#appUpdateDialog{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgb(0 0 0/.55);padding:1rem;font-family:inherit}' +
      '#appUpdateDialog .box{width:100%;max-width:26rem;border-radius:1.25rem;padding:1.25rem;color:rgb(var(--text,255 255 255));' +
      'background:rgb(var(--surface,30 30 34));border:1px solid rgb(var(--accent,244 114 182)/.4);box-shadow:0 20px 50px -10px rgb(0 0 0/.6)}' +
      '#appUpdateDialog h2{margin:0 0 .35rem;font-size:1.05rem}' +
      '#appUpdateDialog p{margin:0 0 .9rem;font-size:.88rem;opacity:.85;white-space:pre-line}' +
      '#appUpdateDialog .row{display:flex;gap:.6rem}' +
      '#appUpdateDialog button{flex:1;padding:.75rem;border-radius:.8rem;font:inherit;font-weight:700;cursor:pointer;border:1px solid rgb(var(--accent,244 114 182)/.4);' +
      'color:inherit;background:transparent}' +
      '#appUpdateDialog button.go{border:0;color:#fff;background:linear-gradient(135deg,rgb(var(--strong,219 39 119)),rgb(var(--accent2,225 29 72)))}';
    document.head.appendChild(style);

    var notes = (release.body || '').trim();
    var el = document.createElement('div');
    el.id = 'appUpdateDialog';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="box"><h2>Доступно обновление приложения</h2>' +
      '<p>' + (notes ? esc(notes) : 'Вышла новая версия (сборка ' + number + ').') + '</p>' +
      '<p id="appUpdateHint" hidden>Откройте скачанный файл из уведомления и подтвердите установку. Если Android попросит, разрешите установку из этого источника.</p>' +
      '<div class="row"><button type="button" id="appUpdateLater">Позже</button>' +
      '<button type="button" class="go" id="appUpdateGo">Скачать</button></div></div>';
    document.body.appendChild(el);

    function close() { el.remove(); style.remove(); }
    el.querySelector('#appUpdateLater').onclick = function () { ls(false, LS_SKIP, String(number)); close(); };
    el.querySelector('#appUpdateGo').onclick = function () {
      el.querySelector('#appUpdateHint').hidden = false;
      el.querySelector('#appUpdateGo').textContent = 'Скачать ещё раз';
      // Ссылка на другой домен открывается в системном браузере, он и скачает файл.
      window.location.href = apkUrl;
    };
  }

  function check(force) {
    var last = parseInt(ls(true, LS_LAST) || '0', 10);
    if (!force && Date.now() - last < CHECK_EVERY_MS) return;

    Promise.all([installedBuild(), latestRelease()]).then(function (res) {
      ls(false, LS_LAST, String(Date.now()));
      var current = res[0], release = res[1];
      var m = /^v?(\d+)/.exec(release.tag_name || '');
      var number = m ? parseInt(m[1], 10) : 0;
      if (!number || !(number > current)) return;
      if (ls(true, LS_SKIP) === String(number)) return;
      var asset = (release.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
      if (!asset) return;
      showDialog(release, asset.browser_download_url, number);
    }).catch(function () { /* нет сети или лимит GitHub: попробуем позже */ });
  }

  // Для проверки вручную из консоли: appUpdateCheck()
  window.appUpdateCheck = function () { check(true); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { check(false); });
  else check(false);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(false); });
})();
