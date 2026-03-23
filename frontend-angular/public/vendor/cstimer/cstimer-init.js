/**
 * Minimal shims for cstimer scramble scripts (no full cstimer UI).
 * - ISCSTIMER=false skips kernel/jQuery UI wiring in scramble.js
 * - $ provides $.noop and $.isArray used by cross.js and scrMgr.reg
 * - isaac: full csTimer loads vendor/isaac.js before mathlib.js; mathlib's RNG
 *   calls isaac.seed() / isaac.random() at load time. Without this, mathlib
 *   throws and scramble_333 / getOLLImage never attach.
 */
(function () {
  var isaacState = new Uint32Array(4);
  function isaacSeed(arr) {
    var h = 2166136261 >>> 0;
    if (arr && arr.length) {
      for (var i = 0; i < arr.length; i++) {
        h ^= arr[i];
        h = Math.imul(h, 16777619) >>> 0;
      }
    }
    isaacState[0] = h;
    isaacState[1] = (h ^ 0x9e3779b9) >>> 0;
    isaacState[2] = (h ^ 0x85ebca6b) >>> 0;
    isaacState[3] = (h ^ 0xc2b2ae35) >>> 0;
  }
  function isaacRandom() {
    var t = isaacState[0] ^ (isaacState[0] << 11);
    isaacState[0] = isaacState[1];
    isaacState[1] = isaacState[2];
    isaacState[2] = isaacState[3];
    isaacState[3] = (isaacState[3] ^ (isaacState[3] >>> 19) ^ t ^ (t >>> 8)) >>> 0;
    return isaacState[3] / 4294967296;
  }
  window.isaac = { seed: isaacSeed, random: isaacRandom };

  function jqish(arg) {
    if (typeof arg === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arg);
      } else {
        arg();
      }
    }
  }
  jqish.noop = function () {};
  jqish.isArray = Array.isArray;
  window.$ = jqish;
  window.ISCSTIMER = false;
  window.DEBUG = false;
})();
