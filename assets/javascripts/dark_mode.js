/* Tmavý režim — prepínač v hlavičke.
 *
 * Vanilla JS bez závislostí, rovnako ako ostatné naše pluginy. Prefarbenie robí CSS
 * podľa atribútu `data-dark` na `<html>`; tento skript ten atribút len prehadzuje
 * a povie o tom serveru, aby si to účet pamätal.
 */
(function () {
  'use strict';

  var CFG = window.RDM_CONFIG || {};
  var i18n = CFG.i18n || {};

  function link() {
    return document.querySelector('a[data-rdm="toggle"]');
  }

  function isOn() {
    return document.documentElement.getAttribute('data-dark') === '1';
  }

  function csrfToken() {
    var m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.content : '';
  }

  /* Popisok sa mení podľa stavu, aby človek dopredu vedel, čo klik spraví.
   * Text je v DOM pre čítačky obrazovky; vizuálne ho téma skrýva a kreslí ikonu. */
  function refreshLabel() {
    var a = link();
    if (!a) { return; }

    a.title = isOn() ? i18n.toLight : i18n.toDark;
    a.setAttribute('aria-pressed', isOn() ? 'true' : 'false');
  }

  function apply(on) {
    document.documentElement.setAttribute('data-dark', on ? '1' : '0');
    try { localStorage.setItem('rdm-dark', on ? '1' : '0'); } catch (e) { /* súkromný režim */ }
    refreshLabel();
  }

  /* Prepnutie je okamžité a request ide až potom. Keby sa čakalo na server, klik by
   * pôsobil ako zaseknutý; a keď request zlyhá, vrátime to späť. */
  function toggle() {
    var next = !isOn();
    apply(next);

    fetch((CFG.base || '') + '/dark_mode/toggle', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrfToken()
      }
    }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    }).then(function (data) {
      // Server je zdroj pravdy; keby sa rozišli, platí jeho hodnota.
      if (typeof data.on === 'boolean' && data.on !== isOn()) { apply(data.on); }
    }).catch(function () {
      apply(!next);
    });
  }

  function init() {
    refreshLabel();

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-rdm="toggle"]');
      if (!a) { return; }

      e.preventDefault();
      toggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
