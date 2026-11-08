/* Pocket Deck runtime: the tilt driver for card finishes and parallax.
   Classic script; assigns window.PocketDeck. No dependencies, no network.

   PocketDeck.attachTilt(card, options?) -> detach()
     Drives these custom properties on the card from pointer or device tilt,
     smoothed with a spring so the finish lags and settles like a held card:
       --pd-pointer-x / --pd-pointer-y   0%..100%  where the light hits
       --pd-from-center                  0..1      distance of the pointer from the middle
       --pd-tilt-x / --pd-tilt-y         -1..1     card rotation drivers
       --pd-active                       0..1      1 while interacting, eases back to 0
     options: { gyro: true, maxTilt: 1, restPose: { x: 35, y: 30 } }

   PocketDeck.requestTilt() -> Promise<boolean>
     Asks for device-orientation permission where a tap is required (iOS), then
     enables gyro for every attached card. Call it from a tap handler.

   Under prefers-reduced-motion the driver sets a fixed off-axis pose once and
   never animates, so finishes stay visible but still. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var cards = new Set();
  var gyroOn = false;
  var gyroBase = null;

  // Spring constants: interaction follows quickly with a little lag; release settles slowly.
  var FOLLOW = { k: 0.12, d: 0.32 };
  var RELEASE = { k: 0.035, d: 0.18 };

  function spring(state, target, c) {
    state.v += (target - state.x) * c.k;
    state.v *= 1 - c.d;
    state.x += state.v;
    return state.x;
  }

  function setPose(el, px, py, active) {
    var dx = (px - 50) / 50, dy = (py - 50) / 50;
    var fc = Math.min(1, Math.hypot(dx, dy));
    el.style.setProperty('--pd-pointer-x', px.toFixed(2) + '%');
    el.style.setProperty('--pd-pointer-y', py.toFixed(2) + '%');
    el.style.setProperty('--pd-from-center', fc.toFixed(3));
    el.style.setProperty('--pd-tilt-x', dx.toFixed(3));
    el.style.setProperty('--pd-tilt-y', dy.toFixed(3));
    el.style.setProperty('--pd-active', active.toFixed(3));
  }

  function attachTilt(el, options) {
    options = options || {};
    var rest = options.restPose || { x: 35, y: 30 };
    if (reduced.matches) {
      setPose(el, rest.x, rest.y, 0.6);
      return function () {};
    }
    var s = { x: { x: 50, v: 0 }, y: { x: 50, v: 0 }, a: { x: 0, v: 0 } };
    var target = { x: 50, y: 50, a: 0 };
    var pointerDown = false, hovering = false, raf = 0, idleFrames = 0;

    function frame() {
      var c = (pointerDown || hovering) ? FOLLOW : RELEASE;
      var px = spring(s.x, target.x, c), py = spring(s.y, target.y, c), a = spring(s.a, target.a, c);
      setPose(el, px, py, Math.max(0, Math.min(1, a)));
      var settled = Math.abs(s.x.v) + Math.abs(s.y.v) + Math.abs(s.a.v) < 0.002 && !pointerDown && !hovering && !gyroOn;
      idleFrames = settled ? idleFrames + 1 : 0;
      raf = idleFrames > 30 ? 0 : requestAnimationFrame(frame);
    }
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }
    function aim(clientX, clientY) {
      var r = el.getBoundingClientRect();
      target.x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      target.y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
      target.a = 1;
      wake();
    }
    function onMove(e) { if (e.pointerType === 'mouse' && !hovering) return; aim(e.clientX, e.clientY); }
    function onDown(e) { pointerDown = true; el.setPointerCapture && el.setPointerCapture(e.pointerId); aim(e.clientX, e.clientY); }
    function onUp() { pointerDown = false; if (!hovering) { target.x = 50; target.y = 50; target.a = 0; } wake(); }
    function onEnter(e) { if (e.pointerType === 'mouse') { hovering = true; aim(e.clientX, e.clientY); } }
    function onLeave() { hovering = false; if (!pointerDown) { target.x = 50; target.y = 50; target.a = 0; } wake(); }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    var entry = { el: el, target: target, wake: wake, max: options.maxTilt || 1 };
    cards.add(entry);
    setPose(el, 50, 50, 0);
    return function detach() {
      cards.delete(entry);
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }

  // Device tilt: gamma (left-right) and beta (front-back), relative to the pose at activation,
  // clamped to about 16 degrees so a comfortable wrist turn sweeps the whole finish.
  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    if (!gyroBase) gyroBase = { g: e.gamma, b: e.beta };
    var gx = Math.max(-16, Math.min(16, e.gamma - gyroBase.g)) / 16;
    var gy = Math.max(-16, Math.min(16, e.beta - gyroBase.b)) / 16;
    cards.forEach(function (c) {
      c.target.x = 50 + gx * 50 * c.max;
      c.target.y = 50 + gy * 50 * c.max;
      c.target.a = Math.min(1, Math.hypot(gx, gy) * 1.5);
      c.wake();
    });
  }

  function requestTilt() {
    if (reduced.matches || typeof DeviceOrientationEvent === 'undefined') return Promise.resolve(false);
    var ask = DeviceOrientationEvent.requestPermission
      ? DeviceOrientationEvent.requestPermission().then(function (r) { return r === 'granted'; }, function () { return false; })
      : Promise.resolve(true);
    return ask.then(function (ok) {
      if (ok && !gyroOn) {
        gyroOn = true;
        gyroBase = null;
        window.addEventListener('deviceorientation', onOrientation);
      }
      return ok;
    });
  }

  window.PocketDeck = { attachTilt: attachTilt, requestTilt: requestTilt, version: '0.2.0' };
})();
