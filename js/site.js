/* simonroffler.com – Bedienung: Kopfzeile, Menü, Einstiegsvideo, Fotostreifen, Showreel, Szenen. */
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

  /* ---------- Showreel: «Showreel ansehen» holt den Player in die Bildmitte und startet ihn ---------- */
  var reel = doc.getElementById('reel-video');
  if (reel) {
    all('.hero .btn[href="#showreel"]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        reel.preload = 'auto';
        reel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        tryPlay(reel);
      });
    });
  }

  /* ---------- Produktionen: Plakat oder Standbild; beim Darüberfahren läuft die Szene (Handy: sobald sie im Bild ist) ---------- */
  var tiles = all('.scene--video');
  if (tiles.length && !reduce) {
    var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var sceneOn = function (tile) {
      var v = tile.querySelector('.scene__video');
      tile.classList.add('is-on');
      if (v.preload !== 'auto') { v.preload = 'auto'; }
      tryPlay(v);
    };
    var sceneOff = function (tile) {
      var v = tile.querySelector('.scene__video');
      tile.classList.remove('is-on');
      tile.classList.remove('is-playing');
      window.setTimeout(function () { if (!tile.classList.contains('is-on')) { v.pause(); } }, 520);
    };
    tiles.forEach(function (tile) {
      var v = tile.querySelector('.scene__video');
      v.addEventListener('playing', function () {
        if (tile.classList.contains('is-on')) { tile.classList.add('is-playing'); }
      });
      if (canHover) {
        tile.addEventListener('mouseenter', function () { sceneOn(tile); });
        tile.addEventListener('mouseleave', function () { sceneOff(tile); });
      }
    });
    if (!canHover && hasIO) {
      var sceneWatch = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var tile = entry.target;
          window.clearTimeout(tile._wait);
          if (entry.intersectionRatio >= 0.6) {
            tile._wait = window.setTimeout(function () { sceneOn(tile); }, 700);
          } else {
            sceneOff(tile);
          }
        });
      }, { threshold: [0, 0.6] });
      tiles.forEach(function (tile) { sceneWatch.observe(tile); });
    }
  }

  /* ---------- Vollansicht der Fotos ---------- */
  var box = doc.getElementById('lightbox');
  var lightbox = null;
  if (box) {
    var boxImg = box.querySelector('.lightbox__img');
    var boxCap = box.querySelector('.lightbox__cap');
    var boxItems = [];
    var boxIndex = 0;
    var boxClosed = null;
    var setBox = function (i) {
      boxIndex = (i + boxItems.length) % boxItems.length;
      var item = boxItems[boxIndex];
      var img = item.querySelector('img');
      var name = item.getAttribute('data-credit');
      boxImg.src = item.getAttribute('href');
      boxImg.alt = img ? img.alt : '';
      boxCap.textContent = (boxIndex + 1) + ' / ' + boxItems.length + (name ? '  ·  © ' + name : '');
    };
    lightbox = function (items, i, onClose) {
      boxItems = items;
      boxClosed = onClose || null;
      setBox(i);
      if (box.showModal) { box.showModal(); } else { box.setAttribute('open', ''); }
    };
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
    box.addEventListener('close', function () { if (boxClosed) { boxClosed(boxIndex); } });
    var touchX = null;
    box.addEventListener('touchstart', function (ev) { touchX = ev.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (ev) {
      if (touchX === null) { return; }
      var dx = ev.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) { setBox(boxIndex + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
  }

  /* ---------- Fotos, Variante «fokus»: Schärfeverlagerung ----------
     Grosse Bildschirme: Der Abschnitt bleibt stehen, das Scrollen schiebt die Fotos seitwärts.
     Handy: wischen. In beiden Fällen ist das Foto in der Mitte scharf und farbig. */
  function fokus(strip) {
    var section = strip.closest('section');
    var track = strip.querySelector('.strip__track');
    var lis = all('li', track);
    var items = all('.strip__item', track);
    var countEl = section.querySelector('.photos__count');
    var creditEl = section.querySelector('.photos__credit');
    var pinQuery = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
    var SPEED = 1.6;           /* seitliche Pixel pro gescrolltem Pixel */
    var pinned = false;
    var distance = 0;
    var current = -1;
    var ticking = false;
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    section.classList.add('has-now');

    var update = function () {
      ticking = false;
      var vw = track.clientWidth;
      var x;
      if (pinned) {
        var total = section.offsetHeight - window.innerHeight;
        var p = total > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / total)) : 0;
        x = p * distance;
        track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
      } else {
        x = track.scrollLeft;
      }
      var best = 0;
      var bestD = 2;
      lis.forEach(function (li, i) {
        var c = li.offsetLeft + li.offsetWidth / 2 - x;
        /* Rund um die Mitte bleibt das Foto ganz scharf (ohne Filter und ohne Verkleinerung) */
        var zone = Math.min(li.offsetWidth * 0.25, vw * 0.12);
        var d = Math.min(1, Math.max(0, Math.abs(c - vw / 2) - zone) / (vw * 0.45));
        if (reduce) { d = 0; }
        li.style.setProperty('--d', d.toFixed(3));
        li.classList.toggle('is-sharp', d === 0);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== current) {
        current = best;
        countEl.textContent = pad2(best + 1) + ' / ' + pad2(items.length);
        var name = items[best].getAttribute('data-credit');
        creditEl.textContent = name ? '© ' + name : '';
      }
    };
    var request = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    };
    var measure = function () {
      pinned = pinQuery.matches && !reduce;
      section.classList.toggle('is-pinned', pinned);
      track.style.transform = '';
      var vw = strip.clientWidth;
      var first = lis[0];
      var last = lis[lis.length - 1];
      /* Erstes und letztes Foto können genau in die Mitte kommen */
      track.style.paddingLeft = Math.max(0, (vw - first.offsetWidth) / 2) + 'px';
      track.style.paddingRight = Math.max(0, (vw - last.offsetWidth) / 2) + 'px';
      if (pinned) {
        all('img', track).forEach(function (img) { img.removeAttribute('loading'); });
        distance = (last.offsetLeft + last.offsetWidth / 2) - (first.offsetLeft + first.offsetWidth / 2);
        section.style.height = Math.round(window.innerHeight + distance / SPEED) + 'px';
      } else {
        distance = 0;
        section.style.height = '';
      }
      update();
    };
    var goTo = function (i) {
      i = Math.max(0, Math.min(lis.length - 1, i));
      var li = lis[i];
      var target = li.offsetLeft + li.offsetWidth / 2 - track.clientWidth / 2;
      if (pinned) {
        var total = section.offsetHeight - window.innerHeight;
        var p = distance > 0 ? Math.min(1, Math.max(0, target / distance)) : 0;
        window.scrollTo({ top: section.offsetTop + p * total, behavior: reduce ? 'auto' : 'smooth' });
      } else {
        track.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
      }
    };

    window.addEventListener('scroll', function () { if (pinned) { request(); } }, { passive: true });
    track.addEventListener('scroll', function () { if (!pinned) { request(); } }, { passive: true });
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 120);
    });
    if (pinQuery.addEventListener) { pinQuery.addEventListener('change', measure); }
    strip.querySelector('.strip__prev').addEventListener('click', function () { goTo(current - 1); });
    strip.querySelector('.strip__next').addEventListener('click', function () { goTo(current + 1); });
    items.forEach(function (item, i) {
      item.addEventListener('focus', function () { if (pinned && i !== current) { goTo(i); } });
    });
    track.addEventListener('click', function (ev) {
      var link = ev.target.closest ? ev.target.closest('.strip__item') : null;
      if (!link || !lightbox) { return; }
      ev.preventDefault();
      lightbox(items, parseInt(link.getAttribute('data-i'), 10) || 0);
    });
    measure();
  }

  /* ---------- Fotos, Variante «laufband»: läuft langsam von selbst durch ---------- */
  function laufband(strip) {
    var track = strip.querySelector('.strip__track');
    var items = all('.strip__item', track);
    var count = items.length;

    /* Für den endlosen Lauf hängen wir die Fotos ein zweites Mal an (für Screenreader verborgen). */
    all('li', track).forEach(function (li) {
      var copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      var a = copy.querySelector('a');
      a.setAttribute('tabindex', '-1');
      a.querySelector('img').setAttribute('loading', 'lazy');
      track.appendChild(copy);
    });

    var speed = 34;            /* Pixel pro Sekunde */
    var pos = 0;
    var last = 0;
    var running = false;
    var visibleStrip = false;
    var hover = false;
    var holdUntil = 0;
    var dragging = false;
    var moved = false;

    var loopWidth = function () {
      var first = track.children[0];
      var copyStart = track.children[count];
      return copyStart ? copyStart.offsetLeft - first.offsetLeft : 0;
    };
    var wrap = function () {
      var w = loopWidth();
      if (w > 0 && track.scrollLeft >= w) { track.scrollLeft -= w; }
    };
    var hold = function (ms) {
      holdUntil = Date.now() + ms;
      pos = track.scrollLeft;
    };
    var frame = function (now) {
      if (!running) { return; }
      var dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (!hover && !dragging && Date.now() > holdUntil && !doc.hidden) {
        pos += speed * dt / 1000;
        var w = loopWidth();
        if (w > 0 && pos >= w) { pos -= w; }
        track.scrollLeft = pos;
      } else {
        pos = track.scrollLeft;
      }
      window.requestAnimationFrame(frame);
    };
    var startStrip = function () {
      if (reduce || running || !visibleStrip) { return; }
      running = true;
      last = 0;
      pos = track.scrollLeft;
      window.requestAnimationFrame(frame);
    };
    var stopStrip = function () { running = false; };

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visibleStrip = entries[0].isIntersecting;
        if (visibleStrip) { startStrip(); } else { stopStrip(); }
      }, { threshold: 0.15 }).observe(strip);
    }

    /* Anhalten, solange die Maus darauf liegt (nur Maus, nicht Finger) */
    strip.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') { hover = true; } });
    strip.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') { hover = false; pos = track.scrollLeft; } });
    track.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
    track.addEventListener('focusin', function () { hold(6000); });
    track.addEventListener('wheel', function () { hold(2500); }, { passive: true });
    track.addEventListener('touchstart', function () { hold(4000); }, { passive: true });
    track.addEventListener('touchend', function () { hold(2500); }, { passive: true });
    track.addEventListener('scroll', function () { if (!running || hover || dragging || Date.now() <= holdUntil) { wrap(); } }, { passive: true });

    /* Mit der Maus ziehen */
    var startX = 0;
    var startLeft = 0;
    track.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'mouse' || ev.button !== 0) { return; }
      dragging = true;
      moved = false;
      startX = ev.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (ev) {
      if (!dragging) { return; }
      var dx = ev.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
      if (moved) { track.scrollLeft = startLeft - dx; wrap(); }
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) { return; }
      dragging = false;
      track.classList.remove('is-dragging');
      hold(1500);
    });

    var step = function (dir) {
      var w = loopWidth();
      if (dir < 0 && track.scrollLeft < 40 && w) { track.scrollLeft += w; }
      var amount = Math.max(items[0].parentNode.offsetWidth, track.clientWidth * 0.6);
      hold(5000);
      track.scrollBy({ left: dir * amount, behavior: reduce ? 'auto' : 'smooth' });
    };
    strip.querySelector('.strip__prev').addEventListener('click', function () { step(-1); });
    strip.querySelector('.strip__next').addEventListener('click', function () { step(1); });

    track.addEventListener('click', function (ev) {
      var link = ev.target.closest ? ev.target.closest('.strip__item') : null;
      if (!link || !lightbox) { return; }
      ev.preventDefault();
      if (moved) { moved = false; return; }
      stopStrip();
      lightbox(items, parseInt(link.getAttribute('data-i'), 10) || 0, function () { hold(3000); startStrip(); });
    });
  }

  var strip = doc.querySelector('[data-strip]');
  if (strip) {
    if (strip.getAttribute('data-mode') === 'laufband') { laufband(strip); } else { fokus(strip); }
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
