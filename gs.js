/**
 * gs.js — Generative Sites Client SDK
 *
 * Discovers zones, identifies visitors, streams personalized text from Personize.
 * Optionally captures visitor input back to Personize memory.
 *
 * Usage:
 *   <script src="https://gs.personize.ai/gs.js" data-key="pk_live_..." async></script>
 *   <h1 data-gs-zone="website_zones:hero_headline"
 *       data-gs-identify="website_zones:slug">Default headline</h1>
 */
(function () {
  'use strict';

  // --- Config -----------------------------------------------------------

  var scriptTag = document.currentScript;

  // Default endpoint: same origin as gs.js (gs.personize.ai)
  // Override with data-endpoint for self-hosted or local dev.
  var scriptOrigin = null;
  if (scriptTag && scriptTag.src) {
    try { scriptOrigin = new URL(scriptTag.src).origin; } catch (e) {}
  }

  var config = {
    key: scriptTag ? scriptTag.getAttribute('data-key') : null,
    endpoint: scriptTag ? scriptTag.getAttribute('data-endpoint') : scriptOrigin,
    transition: scriptTag ? scriptTag.getAttribute('data-transition') !== 'false' : true,
  };

  if (!config.key) {
    console.warn('[GS] Missing data-key on script tag.');
    return;
  }

  if (!config.endpoint) {
    console.warn('[GS] Could not determine endpoint. Add data-endpoint to the script tag.');
    return;
  }

  // --- State ------------------------------------------------------------

  var zones = {};
  var visitor = null;
  var eventSource = null;
  var eventQueue = [];
  var memorizeQueue = [];
  var identified = false;
  var identifyConfig = null; // from data-gs-identify

  // --- Cookie helpers ---------------------------------------------------

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value)
      + ';expires=' + expires
      + ';path=/;SameSite=Lax'
      + (location.protocol === 'https:' ? ';Secure' : '');
  }

  // --- URL helpers ------------------------------------------------------

  function getURLParam(name) {
    var match = window.location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function cleanURL(param) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete(param);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }

  function collectUTMs() {
    var utms = {};
    var hasAny = false;
    try {
      var sp = new URLSearchParams(window.location.search);
      sp.forEach(function(value, key) {
        var k = key.toLowerCase();
        if (k.startsWith('utm_') || (k.startsWith('gs_') && k !== 'gs')) {
          utms[key] = value;
          hasAny = true;
        }
      });
    } catch (e) {
      var names = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      for (var i = 0; i < names.length; i++) {
        var val = getURLParam(names[i]);
        if (val) { utms[names[i]] = val; hasAny = true; }
      }
    }
    return hasAny ? utms : null;
  }

  function resolveIdentifyValue(property) {
    var paramValue = getURLParam(property);
    if (paramValue) return paramValue;

    var slugMatch = window.location.pathname.match(/\/for\/([^\/\?]+)/);
    if (slugMatch) return slugMatch[1];

    var gsId = getURLParam('gs_id');
    if (gsId) return gsId;

    return null;
  }

  // --- Callbacks --------------------------------------------------------

  var callbacks = {};

  function fireCallback(event, data) {
    var cbs = callbacks[event];
    if (!cbs) return;
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](data); } catch (e) {
        console.warn('[GS] Callback error:', e);
      }
    }
  }

  // --- Zone Discovery ---------------------------------------------------

  function discoverZones() {
    var elements = document.querySelectorAll('[data-gs-zone]');
    var newZones = [];

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var id = el.getAttribute('data-gs-zone');
      if (!id || zones[id]) continue;

      zones[id] = {
        el: el,
        fallback: el.textContent,
        prompt: el.getAttribute('data-gs-prompt') || null,
        mode: el.getAttribute('data-gs-mode') || 'auto',
        rendered: false,
      };
      newZones.push(id);

      // Check for data-gs-identify (once per page)
      var identify = el.getAttribute('data-gs-identify');
      if (identify && identify.indexOf(':') > 0 && !identifyConfig) {
        var parts = identify.split(':');
        identifyConfig = {
          collection: parts[0],
          property: parts[1],
          value: resolveIdentifyValue(parts[1]),
        };
      }
    }
    return newZones;
  }

  // --- Text Rendering ---------------------------------------------------

  function renderZone(zoneId, text) {
    var zone = zones[zoneId];
    if (!zone) return;

    if (config.transition) {
      zone.el.style.transition = 'opacity 0.2s ease';
      zone.el.style.opacity = '0';
      setTimeout(function () {
        zone.el.textContent = text;
        zone.el.style.opacity = '1';
        zone.rendered = true;
      }, 200);
    } else {
      zone.el.textContent = text;
      zone.rendered = true;
    }
    fireCallback('zone:render', { zone: zoneId, text: text });
  }

  // --- SSE Connection ---------------------------------------------------

  function buildStreamURL(zoneIds) {
    var params = [
      'key=' + encodeURIComponent(config.key),
      'zones=' + encodeURIComponent(zoneIds.join(',')),
      'url=' + encodeURIComponent(window.location.href),
    ];

    // Custom prompts from data-gs-prompt
    var prompts = {};
    var hasPrompts = false;
    for (var i = 0; i < zoneIds.length; i++) {
      var z = zones[zoneIds[i]];
      if (z && z.prompt) { prompts[zoneIds[i]] = z.prompt; hasPrompts = true; }
    }
    if (hasPrompts) {
      params.push('prompts=' + encodeURIComponent(JSON.stringify(prompts)));
    }

    if (document.referrer) {
      params.push('ref=' + encodeURIComponent(document.referrer));
    }

    var uid = getCookie('_gs_uid');
    if (uid) params.push('uid=' + encodeURIComponent(uid));

    // Encrypted token (?gs=...)
    var gsToken = getURLParam('gs');
    if (gsToken) params.push('token=' + encodeURIComponent(gsToken));

    // Identify via data-gs-identify
    if (identifyConfig) {
      params.push('identify_collection=' + encodeURIComponent(identifyConfig.collection));
      params.push('identify_property=' + encodeURIComponent(identifyConfig.property));
      if (identifyConfig.value) {
        params.push('identify_value=' + encodeURIComponent(identifyConfig.value));
      }
    }

    // Auth session
    if (window.__GS_USER__) {
      try {
        params.push('auth=' + encodeURIComponent(btoa(JSON.stringify(window.__GS_USER__))));
      } catch (e) {}
    }

    // UTM parameters
    var utms = collectUTMs();
    if (utms) params.push('utms=' + encodeURIComponent(JSON.stringify(utms)));

    return config.endpoint + '/api/gs/stream?' + params.join('&');
  }

  function connect(zoneIds) {
    if (!zoneIds.length) return;
    var url = buildStreamURL(zoneIds);

    if (eventSource) eventSource.close();
    eventSource = new EventSource(url);

    eventSource.addEventListener('zone', function (e) {
      try {
        var data = JSON.parse(e.data);
        if (data.zone && data.text) renderZone(data.zone, data.text);
      } catch (err) {}
    });

    eventSource.addEventListener('meta', function (e) {
      try {
        visitor = JSON.parse(e.data);
        if (visitor.uid) setCookie('_gs_uid', visitor.uid, 365);
        fireCallback('meta', visitor);
      } catch (err) {}
    });

    eventSource.addEventListener('done', function (e) {
      fireCallback('done', e.data ? JSON.parse(e.data) : {});
      if (eventSource) { eventSource.close(); eventSource = null; }
    });

    eventSource.addEventListener('error', function (e) {
      if (e.data) {
        try { fireCallback('error', JSON.parse(e.data)); } catch (err) {}
      }
    });

    eventSource.onerror = function () {
      console.debug('[GS] SSE interrupted. Auto-reconnecting...');
    };

    if (getURLParam('gs')) cleanURL('gs');
  }

  // --- Memorize Discovery (opt-in) --------------------------------------

  function discoverMemorizeBindings() {
    var elements = document.querySelectorAll('[data-gs-memorize]');
    for (var i = 0; i < elements.length; i++) bindMemorizeElement(elements[i]);

    var forms = document.querySelectorAll('[data-gs-memorize-form]');
    for (var j = 0; j < forms.length; j++) bindMemorizeForm(forms[j]);
  }

  function bindMemorizeElement(el) {
    if (el._gsBound) return;
    el._gsBound = true;

    var target = el.getAttribute('data-gs-memorize');
    var trigger = el.getAttribute('data-gs-trigger');
    if (!trigger) {
      var tag = el.tagName.toLowerCase();
      trigger = (tag === 'select') ? 'change' : 'blur';
    }
    if (trigger === 'submit') return;

    el.addEventListener(trigger, function () {
      var value = getElementValue(el);
      if (value) queueMemorize(target, value);
    });
  }

  function bindMemorizeForm(form) {
    if (form._gsBound) return;
    form._gsBound = true;

    form.addEventListener('submit', function () {
      var fields = form.querySelectorAll('[data-gs-memorize]');
      for (var i = 0; i < fields.length; i++) {
        var target = fields[i].getAttribute('data-gs-memorize');
        var value = getElementValue(fields[i]);
        if (target && value) queueMemorize(target, value);
      }
      flushMemorize();
    });
  }

  function getElementValue(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return el.value.trim();
    return el.isContentEditable ? el.textContent.trim() : el.textContent.trim();
  }

  function queueMemorize(target, value) {
    if (!target || !value) return;
    memorizeQueue.push({ target: target, value: value, url: window.location.href, timestamp: Date.now() });
    fireCallback('memorize', { target: target, value: value });
  }

  function flushMemorize() {
    if (memorizeQueue.length === 0) return;
    var batch = memorizeQueue.splice(0, 20);
    try {
      navigator.sendBeacon(
        config.endpoint + '/api/gs/memorize',
        new Blob([JSON.stringify({
          key: config.key,
          uid: getCookie('_gs_uid'),
          email: getVisitorEmail(),
          writes: batch,
        })], { type: 'application/json' })
      );
    } catch (e) {
      memorizeQueue = batch.concat(memorizeQueue);
    }
  }

  function getVisitorEmail() {
    if (visitor && visitor.email) return visitor.email;
    if (window.__GS_USER__ && window.__GS_USER__.email) return window.__GS_USER__.email;
    return null;
  }

  // --- Public API -------------------------------------------------------

  var GS = {
    identify: function (email, traits) {
      if (!email) return;
      identified = true;
      try {
        navigator.sendBeacon(
          config.endpoint + '/api/gs/identify',
          new Blob([JSON.stringify({
            key: config.key, uid: getCookie('_gs_uid'), email: email, traits: traits || {},
          })], { type: 'application/json' })
        );
      } catch (e) {}
      fireCallback('identify', { email: email, traits: traits });
    },

    track: function (type, properties) {
      eventQueue.push({ type: type, properties: properties || {}, url: window.location.href, timestamp: Date.now() });
    },

    memorize: function (target, value) {
      if (!target || !value) return;
      if (target.indexOf(':') === -1) {
        console.warn('[GS] memorize() target must be "collection:property". Got:', target);
        return;
      }
      queueMemorize(target, value);
    },

    on: function (event, callback) {
      if (!callbacks[event]) callbacks[event] = [];
      callbacks[event].push(callback);
    },

    refresh: function (zoneId) {
      connect(zoneId ? [zoneId] : Object.keys(zones));
    },

    debug: function () {
      return {
        config: config,
        visitor: visitor,
        identify: identifyConfig,
        zones: Object.keys(zones).map(function (id) {
          return { id: id, fallback: zones[id].fallback, rendered: zones[id].rendered, currentText: zones[id].el.textContent };
        }),
        connected: eventSource !== null && eventSource.readyState !== 2,
      };
    },
  };

  // --- Initialization ---------------------------------------------------

  function init() {
    var zoneIds = discoverZones();
    discoverMemorizeBindings();

    if (zoneIds.length > 0) {
      console.debug('[GS] Discovered ' + zoneIds.length + ' zones:', zoneIds);
      if (identifyConfig) {
        console.debug('[GS] Identify: ' + identifyConfig.collection + ':' + identifyConfig.property + '=' + (identifyConfig.value || '(server-side)'));
      }
      connect(zoneIds);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Flush loops ------------------------------------------------------

  function flushEvents() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0, 50);
    try {
      navigator.sendBeacon(
        config.endpoint + '/api/gs/event',
        new Blob([JSON.stringify({ key: config.key, uid: getCookie('_gs_uid'), events: batch })], { type: 'application/json' })
      );
    } catch (e) {
      eventQueue = batch.concat(eventQueue);
    }
  }

  setInterval(flushEvents, 5000);
  setInterval(flushMemorize, 5000);
  window.addEventListener('beforeunload', function () { flushEvents(); flushMemorize(); });

  window.GS = GS;

})();
