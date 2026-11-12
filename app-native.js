/* Поведение, нужное только в Android-приложении (Capacitor). На сайте и в PWA не подключается:
   его загружает app-update.js после проверки, что мы внутри приложения.

   Кнопка «Назад» (жест или системная кнопка). Пока на неё есть свой обработчик, Capacitor
   сам ничего не делает, поэтому здесь разобраны все случаи по порядку:
   1) открыто окно обновления -> закрыть («Позже»);
   2) открыты настройки или выбор группы -> закрыть;
   3) есть куда вернуться в истории -> назад;
   4) иначе свернуть приложение, а не убивать его: так оно открывается мгновенно. */
(function () {
  'use strict';

  var cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;

  var App = (cap.Plugins && cap.Plugins.App) || (typeof cap.registerPlugin === 'function' && cap.registerPlugin('App'));
  if (!App || typeof App.addListener !== 'function') return;

  function openOverlay() {
    return document.querySelector('#settings-overlay.open, #group-menu.open');
  }

  function minimize() {
    if (typeof App.minimizeApp === 'function') App.minimizeApp();
    else if (typeof App.exitApp === 'function') App.exitApp();
  }

  function onBack(info) {
    // 1) окно обновления
    var upd = document.getElementById('appUpdateLater');
    if (upd) { upd.click(); return; }

    // 2) окна сайта: Esc обрабатывает сам сайт (настройки закрываются всегда,
    // выбор группы только если группа уже сохранена)
    if (openOverlay()) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Выбор группы при первом запуске закрыть нельзя: тогда сворачиваем, а не зависаем на «Назад».
      if (openOverlay()) minimize();
      return;
    }

    // 3) история
    if (info && info.canGoBack) { history.back(); return; }

    // 4) выход
    minimize();
  }

  App.addListener('backButton', onBack);

  // Для проверки вручную из консоли: appNativeBack()
  window.appNativeBack = function () { onBack({ canGoBack: false }); };
})();
