(function manageBootStatus() {
  var documentRoot = document.documentElement;
  var panel = document.getElementById('boot-status');
  if (!panel) return;

  var isArabic = documentRoot.lang.toLowerCase().indexOf('ar') === 0;
  var copy = isArabic
    ? {
        loading: 'جارٍ تحميل واصل…',
        loadingDetail: 'إذا استمرت هذه الرسالة لأكثر من 15 ثانية، فقد يكون التطبيق لم يبدأ بشكل صحيح.',
        loadingHint: 'اسحب للأسفل للتحديث، أو افتح أدوات المطوّر وشارك أول خطأ ظاهر.',
        delayed: 'استغرق التحميل وقتًا أطول من المعتاد',
        delayedDetail: 'غالبًا ما يعني هذا بطء الاتصال أو وجود ذاكرة تخزين مؤقت قديمة.',
        retry: 'إعادة التحميل',
        failed: 'تعذّر بدء التطبيق',
        failedDetail: 'حاول إعادة تحميل التطبيق. إذا استمرت المشكلة، تواصل مع فريق الدعم.',
      }
    : {
        loading: 'Loading Wasel…',
        loadingDetail: 'If this message stays for more than 15 seconds, the app likely failed to start.',
        loadingHint: 'Pull down to refresh, or open DevTools Console and share the first red error line.',
        delayed: 'Taking longer than expected',
        delayedDetail: 'This usually means a slow connection or a stale cache.',
        retry: 'Reload app',
        failed: 'The app could not start',
        failedDetail: 'Try reloading the app. If the problem continues, contact support.',
      };

  function setText(selector, text) {
    var element = panel.querySelector(selector);
    if (element) element.textContent = text;
  }

  function recover() {
    var cleanup = Promise.resolve();
    if ('serviceWorker' in navigator) {
      cleanup = navigator.serviceWorker
        .getRegistrations()
        .then(function (registrations) {
          return Promise.all(registrations.map(function (registration) { return registration.unregister(); }));
        })
        .catch(function () {});
    }
    if ('caches' in window) {
      cleanup = cleanup
        .then(function () {
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) { return caches.delete(key); }));
          });
        })
        .catch(function () {});
    }

    cleanup.finally(function () {
      window.location.replace(window.location.origin + window.location.pathname + '?_r=' + Date.now());
    });
  }

  function showFailure(title, detail, code) {
    panel.setAttribute('data-state', 'error');
    panel.replaceChildren();
    var card = document.createElement('div');
    card.className = 'card';
    var heading = document.createElement('h1');
    heading.textContent = title;
    var description = document.createElement('p');
    description.textContent = detail;
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = copy.retry;
    button.style.cssText = 'margin-top:12px;padding:10px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:#1d4ed8;color:#fff;font-size:15px;';
    button.addEventListener('click', recover);
    var errorCode = document.createElement('code');
    errorCode.style.cssText = 'display:block;margin-top:12px;';
    errorCode.textContent = 'Error: ' + code;
    card.append(heading, description, button, errorCode);
    panel.append(card);
  }

  panel.dir = isArabic ? 'rtl' : 'ltr';
  setText('h1', copy.loading);
  setText('p', copy.loadingDetail);
  setText('code', copy.loadingHint);

  window.waselHardRecover = recover;
  window.addEventListener('error', function () {
    if (documentRoot.dataset.appMounted !== 'true') {
      showFailure(copy.failed, copy.failedDetail, 'app_boot_error');
    }
  }, true);
  window.addEventListener('unhandledrejection', function () {
    if (documentRoot.dataset.appMounted !== 'true') {
      showFailure(copy.failed, copy.failedDetail, 'app_boot_rejection');
    }
  });

  window.setTimeout(function () {
    if (documentRoot.dataset.appMounted !== 'true') {
      showFailure(copy.delayed, copy.delayedDetail, 'app_mount_timeout');
    }
  }, 30000);
})();
