(function setInitialLocale() {
  try {
    var stored = window.localStorage.getItem('wasel-language');
    var language = stored || navigator.language || 'en';
    if (language.toLowerCase().indexOf('ar') === 0) {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
    }
  } catch (_error) {
    // Storage can be unavailable in privacy-restricted browsers. The page
    // remains usable with its document default until the app initializes.
  }
})();
