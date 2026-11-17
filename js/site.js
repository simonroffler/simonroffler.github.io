/* simonroffler.com – Bedienung: Kopfzeile, Menü, Einstiegsvideo, Showreel, Fotogalerie. */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function tryPlay(video) {
    var p = video.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  /* Lokale Vorschau per Doppelklick: Sprachlinks brauchen dort index.html */
  if (location.protocol === 'file:') {
    all('a[data-lang]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (/\/$/.test(href)) { a.setAttribute('href', href + 'index.html'); }
    });
  }

  /* ---------- Kopfzeile ---------- */
  var top = doc.querySelector('.top');
  var hero = doc.querySelector('.hero');
  if (top && hero) {
    var ticking = false;
    var setTop = function () {
      ticking = false;
      top.classList.toggle('is-solid', window.pageYOffset > hero.offsetHeight * 0.62);
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(setTop); }
    }, { passive: true });
    setTop();
  }

  var navLinks = all('.top__nav a');
  if (hasIO && navLinks.length) {
    var current = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    all('main section[id]').forEach(function (s) { current.observe(s); });
  }

  /* ---------- Menü (schmale Bildschirme) ---------- */
  var menu = doc.getElementById('menu');
  var menuBtn = doc.querySelector('.top__menu');
  if (menu && menuBtn) {
    var setMenu = function (open) {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
      if (open) { menu.querySelector('.menu__close').focus(); } else { menuBtn.focus(); }
    };
    menuBtn.addEventListener('click', function () { setMenu(true); });
    menu.querySelector('.menu__close').addEventListener('click', function () { setMenu(false); });
    all('nav a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !menu.hidden) { setMenu(false); }
    });
  }

  /* ---------- Einstiegsvideo ---------- */
  var heroVideo = doc.querySelector('.hero__video');
  var heroToggle = doc.querySelector('.hero__toggle');
  if (heroVideo && heroToggle) {
    var userPaused = reduce;
    var setToggle = function () {
      heroToggle.classList.toggle('is-paused', heroVideo.paused);
      heroToggle.setAttribute('aria-label', heroVideo.paused ? heroToggle.getAttribute('data-play') : heroToggle.getAttribute('data-pause'));
    };
    if (reduce) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else {
      tryPlay(heroVideo);
    }
    heroVideo.addEventListener('play', setToggle);
    heroVideo.addEventListener('pause', setToggle);
    setToggle();
    heroToggle.addEventListener('click', function () {
      userPaused = !heroVideo.paused;
      if (heroVideo.paused) { tryPlay(heroVideo); } else { heroVideo.pause(); }
    });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        if (userPaused) { return; }
        if (entries[0].isIntersecting) { tryPlay(heroVideo); } else { heroVideo.pause(); }
      }, { threshold: 0.05 }).observe(heroVideo);
    }
  }

  /* ---------- Showreel ---------- */
  var reel = doc.getElementById('reel-video');
  var reelItems = all('.reel__item');
  if (reel) {
    reelItems.forEach(function (item) {
      item.addEventListener('click', function (ev) {
        ev.preventDefault();
        reelItems.forEach(function (other) {
          other.classList.toggle('is-active', other === item);
          if (other === item) { other.setAttribute('aria-current', 'true'); } else { other.removeAttribute('aria-current'); }
        });
        reel.poster = item.getAttribute('data-poster');
        reel.src = item.getAttribute('href');
        reel.load();
        tryPlay(reel);
      });
    });
  }

  /* ---------- Fotogalerie ---------- */
  var gallery = doc.querySelector('[data-gallery]');
  if (gallery) {
    var layers = all('.gallery__img', gallery);
    var thumbs = all('.gallery__thumb', gallery);
    var stage = gallery.querySelector('.gallery__stage');
    var credit = gallery.querySelector('.gallery__credit');
    var index = 0;
    var active = 0;
    var timer = null;
    var auto = !reduce;
    var visible = false;

    var show = function (i, byUser) {
      index = (i + thumbs.length) % thumbs.length;
      var thumb = thumbs[index];
      var next = layers[1 - active];
      var prev = layers[active];
      var swap = function () {
        next.onload = null;
        prev.classList.remove('is-on');
        prev.alt = '';
        next.classList.add('is-on');
        active = 1 - active;
      };
      next.alt = thumb.getAttribute('data-alt');
      next.style.objectPosition = thumb.getAttribute('data-pos');
      if (next.getAttribute('src') === thumb.getAttribute('data-mid') && next.complete) {
        swap();
      } else {
        next.onload = swap;
        next.src = thumb.getAttribute('data-mid');
      }
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === index); });
      var name = thumb.getAttribute('data-credit');
      credit.textContent = name ? '© ' + name : '';
      var ahead = new Image();
      ahead.src = thumbs[(index + 1) % thumbs.length].getAttribute('data-mid');
      if (byUser) { auto = false; stop(); }
    };
    var start = function () {
      if (auto && visible && !timer) { timer = window.setInterval(function () { show(index + 1); }, 4500); }
    };
    var stop = function () {
      window.clearInterval(timer);
      timer = null;
    };

    gallery.addEventListener('mouseenter', stop);
    gallery.addEventListener('mouseleave', start);
    gallery.addEventListener('focusin', stop);
    gallery.addEventListener('focusout', start);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { start(); } else { stop(); }
      }, { threshold: 0.35 }).observe(gallery);
    }
    thumbs.forEach(function (thumb, k) {
      thumb.addEventListener('click', function (ev) {
        ev.preventDefault();
        show(k, true);
      });
    });

    /* Vollansicht */
    var box = doc.getElementById('lightbox');
    var boxImg = box.querySelector('.lightbox__img');
    var boxCap = box.querySelector('.lightbox__cap');
    var boxIndex = 0;
    var setBox = function (i) {
      boxIndex = (i + thumbs.length) % thumbs.length;
      var thumb = thumbs[boxIndex];
      var name = thumb.getAttribute('data-credit');
      boxImg.src = thumb.getAttribute('href');
      boxImg.alt = thumb.getAttribute('data-alt');
      boxCap.textContent = (boxIndex + 1) + ' / ' + thumbs.length + (name ? '  ·  © ' + name : '');
    };
    stage.addEventListener('click', function () {
      stop();
      setBox(index);
      if (box.showModal) { box.showModal(); } else { box.setAttribute('open', ''); }
    });
    box.querySelector('.lightbox__prev').addEventListener('click', function () { setBox(boxIndex - 1); });
    box.querySelector('.lightbox__next').addEventListener('click', function () { setBox(boxIndex + 1); });
    box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target.classList.contains('lightbox__fig')) { box.close(); }
    });
    box.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { setBox(boxIndex - 1); }
      if (ev.key === 'ArrowRight') { setBox(boxIndex + 1); }
    });
    box.addEventListener('close', function () { show(boxIndex, true); });
    var touchX = null;
    box.addEventListener('touchstart', function (ev) { touchX = ev.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (ev) {
      if (touchX === null) { return; }
      var dx = ev.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) { setBox(boxIndex + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveals = all('.reveal');
  if (hasIO && !reduce) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
