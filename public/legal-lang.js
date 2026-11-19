// Shows the privacy / support page in the site's language only (same "locale" cookie as the app).
(function () {
  var q = new URLSearchParams(location.search).get('lang');
  var m = document.cookie.match(/(?:^|;\s*)locale=(ar|en)/);
  var lang = q === 'en' || q === 'ar' ? q : m ? m[1] : 'ar';
  var root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  var title = root.getAttribute('data-title-' + lang);
  if (title) document.title = title;
  window.learnooSetLang = function (to) {
    document.cookie = 'locale=' + to + '; path=/; max-age=31536000; samesite=lax';
    location.href = location.pathname;
  };
})();
