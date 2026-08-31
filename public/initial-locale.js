// Initial locale bootstrap — loaded before the app bundle.
// This file is intentionally minimal. The actual locale is resolved
// inside the React app by LanguageProvider; this script only exists
// so the preload/cache path has a real JS asset at /initial-locale.js.
(function () {
  try {
    var stored = null;
    try {
      stored = localStorage.getItem('wasel-language');
    } catch (e) {
      stored = null;
    }
    window.__wasel_initial_locale = stored || 'en';
  } catch (e) {
    window.__wasel_initial_locale = 'en';
  }
})();
