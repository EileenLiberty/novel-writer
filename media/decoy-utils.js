// utils.js - business helpers (decoy for Novel Writer Boss Mode)
'use strict';

/**
 * Validate order payload before checkout.
 * @param {object} order
 * @returns {boolean}
 */
function validateOrder(order) {
  if (!order || !order.id) {
    console.warn('order missing id', order);
    return false;
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }
  const total = order.items.reduce(function (sum, it) {
    return sum + Number(it.price) * Number(it.qty);
  }, 0);
  if (total <= 0) {
    throw new Error('invalid total: ' + total);
  }
  return true;
}

function debounce(fn, wait) {
  wait = wait || 300;
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, wait);
  };
}

function formatDate(d, fmt) {
  fmt = fmt || 'YYYY-MM-DD HH:mm';
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return fmt
    .replace('YYYY', d.getFullYear())
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()));
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  var out = {};
  Object.keys(obj).forEach(function (k) {
    out[k] = deepClone(obj[k]);
  });
  return out;
}

function throttle(fn, wait) {
  wait = wait || 200;
  var last = 0;
  return function () {
    var now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, arguments);
    }
  };
}

// TODO: shard batches larger than 1000 items
async function batchProcess(items, handler, size) {
  size = size || 100;
  var result = [];
  for (var i = 0; i < items.length; i += size) {
    var chunk = items.slice(i, i + size);
    var part = await Promise.all(chunk.map(handler));
    result = result.concat(part);
  }
  return result;
}

module.exports = {
  validateOrder: validateOrder,
  debounce: debounce,
  formatDate: formatDate,
  deepClone: deepClone,
  throttle: throttle,
  batchProcess: batchProcess
};
