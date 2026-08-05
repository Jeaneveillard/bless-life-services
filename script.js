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

  /* ---------- Notary quote form -> email Andrée only (body + attachment) ---------- */
  var notaryForm = document.getElementById('notaryQuoteForm');
  var notaryNote = document.getElementById('notaryFormNote');
  var notaryFilled = document.getElementById('nq-filled');
  var NOTARY_API = 'https://bless-life-admin-api.jeaneveillard.workers.dev';

  var stampNotaryFilled = function () {
    if (!notaryFilled) return '';
    var stamped = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    notaryFilled.value = stamped;
    return stamped;
  };

  if (notaryForm) {
    stampNotaryFilled();

    notaryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!notaryForm.checkValidity()) {
        notaryForm.reportValidity();
        return;
      }

      var get = function (name) {
        var el = notaryForm.elements[name];
        return el && el.value ? el.value.trim() : '';
      };

      var filledAt = stampNotaryFilled();

      var data = {
        name: get('name'),
        email: get('email'),
        phone: get('phone'),
        need: get('need'),
        location: get('location'),
        where: get('where'),
        date: get('date'),
        message: get('message')
      };

      var submitBtn = notaryForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (notaryNote) {
        notaryNote.textContent = 'Sending your request to Andrée…';
        notaryNote.classList.remove('is-ok');
      }

      fetch(NOTARY_API + '/api/notary-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().then(function (body) {
            return { res: res, body: body };
          }).catch(function () {
            return { res: res, body: null };
          });
        })
        .then(function (result) {
          if (!result.res.ok) {
            throw new Error(
              (result.body && result.body.error) ||
              'Could not send the request. Please call 857-373-9518.'
            );
          }
          var archiveDate = (result.body && result.body.filledAt) || filledAt;
          notaryForm.reset();
          stampNotaryFilled();
          if (notaryNote) {
            notaryNote.textContent =
              'Thank you. Your request was emailed to Andrée only. Archive date on her sheet: ' +
              archiveDate +
              '.';
            notaryNote.classList.add('is-ok');
          }
        })
        .catch(function (err) {
          if (notaryNote) {
            notaryNote.textContent = err && err.message
              ? err.message
              : 'Could not send the request. Please call 857-373-9518.';
            notaryNote.classList.remove('is-ok');
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
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
