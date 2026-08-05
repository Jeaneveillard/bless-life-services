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

  /* ---------- Notary quote form -> printable sheet + mailto ---------- */
  var notaryForm = document.getElementById('notaryQuoteForm');
  var notaryNote = document.getElementById('notaryFormNote');

  var escapeHtml = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  var openNotaryPrintSheet = function (data) {
    var when = new Date();
    var stamped = when.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    var rows = [
      ['Full name', data.name],
      ['Email', data.email],
      ['Phone', data.phone || '—'],
      ['What needs notarizing', data.need],
      ['Appointment location', data.location],
      ['Meeting place', data.where],
      ['Preferred date', data.date || 'flexible'],
      ['Additional notes', data.message || '—']
    ];
    var rowsHtml = rows.map(function (row) {
      return (
        '<tr><th>' + escapeHtml(row[0]) + '</th><td>' +
        escapeHtml(row[1]).replace(/\n/g, '<br>') +
        '</td></tr>'
      );
    }).join('');

    var html = [
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">',
      '<title>Notary quote request — Bless Life Services</title>',
      '<style>',
      '*{box-sizing:border-box}',
      'body{font-family:Georgia,"Times New Roman",serif;color:#0a1020;margin:0;padding:1.5rem;background:#fff}',
      '.sheet{max-width:720px;margin:0 auto;border:1px solid #c9c4b8;padding:1.75rem 1.6rem 2rem}',
      '.brand{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:#8a7350;margin:0 0 .35rem}',
      'h1{font-size:1.55rem;margin:0 0 .35rem;color:#0d2350}',
      '.meta{font-size:.9rem;color:#4a5568;margin:0 0 1.25rem}',
      'table{width:100%;border-collapse:collapse;font-family:"Helvetica Neue",Arial,sans-serif;font-size:.95rem}',
      'th,td{border-top:1px solid #ddd6c8;padding:.7rem .2rem;vertical-align:top;text-align:left}',
      'th{width:34%;color:#0d2350;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}',
      'td{white-space:pre-wrap;word-break:break-word}',
      '.actions{margin:1.25rem 0 0;display:flex;gap:.6rem;flex-wrap:wrap}',
      'button{font:inherit;font-weight:700;padding:.65rem 1.1rem;border-radius:8px;border:1px solid #0d2350;background:#0d2350;color:#fff;cursor:pointer}',
      'button.secondary{background:#fff;color:#0d2350}',
      '.hint{margin:.9rem 0 0;font-size:.85rem;color:#4a5568;font-family:"Helvetica Neue",Arial,sans-serif}',
      '@media print{body{padding:0}.actions,.hint{display:none!important}.sheet{border:none;padding:0}}',
      '</style></head><body>',
      '<div class="sheet">',
      '<p class="brand">Bless Life Services LLC</p>',
      '<h1>Notary quote request</h1>',
      '<p class="meta">Submitted ' + escapeHtml(stamped) + ' · For Andrée / office use</p>',
      '<table>' + rowsHtml + '</table>',
      '<div class="actions">',
      '<button type="button" onclick="window.print()">Print this sheet</button>',
      '<button type="button" class="secondary" onclick="window.close()">Close</button>',
      '</div>',
      '<p class="hint">Print or save as PDF for your records. The client email app should also open so the request is sent to etienneandree@yahoo.com.</p>',
      '</div>',
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)});<\/script>',
      '</body></html>'
    ].join('');

    var printWindow = window.open('', '_blank');
    if (!printWindow) {
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  };

  if (notaryForm) {
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

      var printed = openNotaryPrintSheet(data);

      var subject = 'Notary quote request — ' + data.name;
      var body = [
        'New notary quote request from the website.',
        '',
        'Name:     ' + data.name,
        'Email:    ' + data.email,
        'Phone:    ' + (data.phone || '—'),
        'Need:     ' + data.need,
        'Location: ' + data.location,
        'Meeting:  ' + data.where,
        'Date:     ' + (data.date || 'flexible'),
        '',
        'Notes:',
        data.message || '—'
      ].join('\n');

      window.location.href =
        'mailto:' + BUSINESS_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (notaryNote) {
        notaryNote.textContent = printed
          ? 'A printable sheet opened (Print or Save as PDF). Your email app is also opening to send Andrée the request.'
          : 'Your email app is opening with the quote request. Allow pop-ups to also open the printable sheet. If nothing happens, call 857-373-9518.';
        notaryNote.classList.add('is-ok');
      }
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
