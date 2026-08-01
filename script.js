/* =====================================================================
   Bless Life Services LLC — interactions
   No dependencies. Everything degrades gracefully without JS.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Current year in footer ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Sticky header shadow ---------- */
  var header = document.getElementById('siteHeader');
  var onScroll = function () {
    header.classList.toggle('is-stuck', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  var closeMenu = function () {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('nav-open');
  };

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', open);
  });

  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      burger.focus();
    }
  });

  /* ---------- Scroll reveal ---------- */
  var revealables = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Accordion: one open at a time ---------- */
  var items = document.querySelectorAll('.qa');
  items.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      items.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- Booking form -> pre-filled email ----------
     Zero-backend approach: builds a mailto: with the request.
     To switch to a real form service (Formspree, Netlify Forms, etc.),
     see README.md — one attribute change.
  ------------------------------------------------------- */
  var form = document.getElementById('bookingForm');
  var note = document.getElementById('formNote');
  var BUSINESS_EMAIL = 'etienneandree@yahoo.com';

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var get = function (name) {
        var el = form.elements[name];
        return el && el.value ? el.value.trim() : '';
      };

      var service = get('service');
      var subject = 'Service Request: ' + service + ' — ' + get('name');

      var body = [
        'New booking request from the website.',
        '',
        'Name:    ' + get('name'),
        'Email:   ' + get('email'),
        'Phone:   ' + (get('phone') || '—'),
        'Service: ' + service,
        'Date:    ' + (get('date') || 'flexible'),
        '',
        'Details:',
        get('message') || '—'
      ].join('\n');

      window.location.href =
        'mailto:' + BUSINESS_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      note.textContent = 'Your email app is opening with the request ready to send. ' +
                         'If nothing happens, call 857-373-9518.';
      note.classList.add('is-ok');
    });
  }

  /* ---------- Header shrink on scroll ----------
     The logo lockup is tall by design at the top of the page; it tightens
     once the visitor starts reading so it never eats the viewport.
  ----------------------------------------------- */
  var shrink = function () {
    header.classList.toggle('is-compact', window.scrollY > 90);
  };
  shrink();
  window.addEventListener('scroll', shrink, { passive: true });
})();
