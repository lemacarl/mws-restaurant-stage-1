/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    openDatabase().then(db => {
      let store = db.transaction('restaurants').objectStore('restaurants');
      store.getAll().then(restaurants => {
        if (restaurants.length == 0) {
          fetch("http://localhost:1337/restaurants").then(response => response.json()).then(restaurants => {
            if (restaurants) {
              store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
              restaurants.forEach(restaurant => {
                store.put(restaurant, restaurant['id']);
              });
              callback(null, restaurants);
            }
          }).catch(error => {
            callback(error, null);
          });
        } else {
          callback(null, restaurants);
        }
      });
    });
  }
  /**
   * Fetch a restaurant by its ID.
   */


  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    openDatabase().then(db => {
      let store = db.transaction('restaurants').objectStore('restaurants');
      id = parseInt(id);
      store.get(id).then(restaurant => {
        if (!restaurant) {
          fetch(`http://localhost:1337/restaurants/${id}`).then(response => response.json()).then(restaurant => {
            if (restaurant) {
              store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
              store.put(restaurant, id);
              callback(null, restaurant);
            }
          }).catch(error => {
            callback(error, "Restaurant does not exist");
          });
        } else {
          callback(null, restaurant);
        }
      });
    });
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */


  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }
  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */


  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }
  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */


  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;

        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }

        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }

        callback(null, results);
      }
    });
  }
  /**
   * Fetch all neighborhoods with proper error handling.
   */


  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood); // Remove duplicates from neighborhoods

        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }
  /**
   * Fetch all cuisines with proper error handling.
   */


  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type); // Remove duplicates from cuisines

        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }
  /**
   * Restaurant page URL.
   */


  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }
  /**
   * Restaurant image URL.
   */


  static imageUrlForRestaurant(restaurant) {
    return `/img/${DBHelper.imageNameForRestaurant(restaurant)}-small.jpg`;
  }
  /**
   * Restaurant image name.
   */


  static imageNameForRestaurant(restaurant) {
    if (restaurant.photograph) return restaurant.photograph;
    return 'default';
  }
  /**
   * Map marker for a restaurant.
   */


  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
      title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
    });
    marker.addTo(newMap);
    return marker;
  }
  /**
   * Update restaurant
   */


  static updateRestaurantReviews(restaurant) {
    return openDatabase().then(db => {
      let store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      store.put(restaurant, restaurant.id);
      DBHelper.syncReviews();
      return true;
    });
  }
  /**
   * Sync reviews with backend
   */


  static syncReviews() {
    openDatabase().then(db => {
      let store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      store.getAll().then(restaurants => {
        if (restaurants.length === 0) return;
        restaurants.forEach(restaurant => {
          if (!restaurant.reviews) return;

          for (let i = 0; i < restaurant.reviews.length; i++) {
            let review = restaurant.reviews[i];

            if (review.synced == false) {
              DBHelper.syncReview(restaurant.id, review).then(response => {
                restaurant.reviews[i].synced = true;
                db.transaction('restaurants', 'readwrite').objectStore('restaurants').put(restaurant, restaurant.id);
              });
            }
          }
        });
      });
    });
  }
  /**
   * Sync a review
   */


  static syncReview(restaurant_id, review) {
    return fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        restaurant_id: restaurant_id,
        name: review.name,
        rating: review.rating,
        comments: review.comments
      })
    }).then(response => response.json());
  }

}
/**
 * Restaurant image base path.
 */


DBHelper.imageUrlBasePath = '/img/';
/**
 * Return IndexedDB
 */

function openDatabase() {
  if (!navigator.serviceWorker) return Promise.resolve();
  return idb.open('mws-restaurants', 1, upgradeDB => upgradeDB.createObjectStore('restaurants'));
}
'use strict';

(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });
    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function (value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function () {
          return this[targetProp][prop];
        },
        set: function (val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', ['name', 'keyPath', 'multiEntry', 'unique']);
  proxyRequestMethods(Index, '_index', IDBIndex, ['get', 'getKey', 'getAll', 'getAllKeys', 'count']);
  proxyCursorRequestMethods(Index, '_index', IDBIndex, ['openCursor', 'openKeyCursor']);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', ['direction', 'key', 'primaryKey', 'value']);
  proxyRequestMethods(Cursor, '_cursor', IDBCursor, ['update', 'delete']); // proxy 'next' methods

  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;

    Cursor.prototype[methodName] = function () {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);

        return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']);
  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, ['put', 'add', 'delete', 'clear', 'get', 'getAll', 'getKey', 'getAllKeys', 'count']);
  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']);
  proxyMethods(ObjectStore, '_store', IDBObjectStore, ['deleteIndex']);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };

      idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };

      idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', ['objectStoreNames', 'mode']);
  proxyMethods(Transaction, '_tx', IDBTransaction, ['abort']);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', ['name', 'version', 'objectStoreNames']);
  proxyMethods(UpgradeDB, '_db', IDBDatabase, ['deleteObjectStore', 'close']);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', ['name', 'version', 'objectStoreNames']);
  proxyMethods(DB, '_db', IDBDatabase, ['close']); // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises

  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));

        request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  }); // polyfill getAll

  [Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;

    Constructor.prototype.getAll = function (query, count) {
      var instance = this;
      var items = [];
      return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }

          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }

          cursor.continue();
        });
      });
    };
  });
  var exp = {
    open: function (name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function (event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function (db) {
        return new DB(db);
      });
    },
    delete: function (name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  } else {
    self.idb = exp;
  }
})();
!function (e, t) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : e.moment = t();
}(this, function () {
  "use strict";

  var e, i;

  function c() {
    return e.apply(null, arguments);
  }

  function o(e) {
    return e instanceof Array || "[object Array]" === Object.prototype.toString.call(e);
  }

  function u(e) {
    return null != e && "[object Object]" === Object.prototype.toString.call(e);
  }

  function l(e) {
    return void 0 === e;
  }

  function d(e) {
    return "number" == typeof e || "[object Number]" === Object.prototype.toString.call(e);
  }

  function h(e) {
    return e instanceof Date || "[object Date]" === Object.prototype.toString.call(e);
  }

  function f(e, t) {
    var n,
        s = [];

    for (n = 0; n < e.length; ++n) s.push(t(e[n], n));

    return s;
  }

  function m(e, t) {
    return Object.prototype.hasOwnProperty.call(e, t);
  }

  function _(e, t) {
    for (var n in t) m(t, n) && (e[n] = t[n]);

    return m(t, "toString") && (e.toString = t.toString), m(t, "valueOf") && (e.valueOf = t.valueOf), e;
  }

  function y(e, t, n, s) {
    return Ot(e, t, n, s, !0).utc();
  }

  function g(e) {
    return null == e._pf && (e._pf = {
      empty: !1,
      unusedTokens: [],
      unusedInput: [],
      overflow: -2,
      charsLeftOver: 0,
      nullInput: !1,
      invalidMonth: null,
      invalidFormat: !1,
      userInvalidated: !1,
      iso: !1,
      parsedDateParts: [],
      meridiem: null,
      rfc2822: !1,
      weekdayMismatch: !1
    }), e._pf;
  }

  function p(e) {
    if (null == e._isValid) {
      var t = g(e),
          n = i.call(t.parsedDateParts, function (e) {
        return null != e;
      }),
          s = !isNaN(e._d.getTime()) && t.overflow < 0 && !t.empty && !t.invalidMonth && !t.invalidWeekday && !t.weekdayMismatch && !t.nullInput && !t.invalidFormat && !t.userInvalidated && (!t.meridiem || t.meridiem && n);
      if (e._strict && (s = s && 0 === t.charsLeftOver && 0 === t.unusedTokens.length && void 0 === t.bigHour), null != Object.isFrozen && Object.isFrozen(e)) return s;
      e._isValid = s;
    }

    return e._isValid;
  }

  function v(e) {
    var t = y(NaN);
    return null != e ? _(g(t), e) : g(t).userInvalidated = !0, t;
  }

  i = Array.prototype.some ? Array.prototype.some : function (e) {
    for (var t = Object(this), n = t.length >>> 0, s = 0; s < n; s++) if (s in t && e.call(this, t[s], s, t)) return !0;

    return !1;
  };
  var r = c.momentProperties = [];

  function w(e, t) {
    var n, s, i;
    if (l(t._isAMomentObject) || (e._isAMomentObject = t._isAMomentObject), l(t._i) || (e._i = t._i), l(t._f) || (e._f = t._f), l(t._l) || (e._l = t._l), l(t._strict) || (e._strict = t._strict), l(t._tzm) || (e._tzm = t._tzm), l(t._isUTC) || (e._isUTC = t._isUTC), l(t._offset) || (e._offset = t._offset), l(t._pf) || (e._pf = g(t)), l(t._locale) || (e._locale = t._locale), 0 < r.length) for (n = 0; n < r.length; n++) l(i = t[s = r[n]]) || (e[s] = i);
    return e;
  }

  var t = !1;

  function M(e) {
    w(this, e), this._d = new Date(null != e._d ? e._d.getTime() : NaN), this.isValid() || (this._d = new Date(NaN)), !1 === t && (t = !0, c.updateOffset(this), t = !1);
  }

  function S(e) {
    return e instanceof M || null != e && null != e._isAMomentObject;
  }

  function D(e) {
    return e < 0 ? Math.ceil(e) || 0 : Math.floor(e);
  }

  function k(e) {
    var t = +e,
        n = 0;
    return 0 !== t && isFinite(t) && (n = D(t)), n;
  }

  function a(e, t, n) {
    var s,
        i = Math.min(e.length, t.length),
        r = Math.abs(e.length - t.length),
        a = 0;

    for (s = 0; s < i; s++) (n && e[s] !== t[s] || !n && k(e[s]) !== k(t[s])) && a++;

    return a + r;
  }

  function Y(e) {
    !1 === c.suppressDeprecationWarnings && "undefined" != typeof console && console.warn && console.warn("Deprecation warning: " + e);
  }

  function n(i, r) {
    var a = !0;
    return _(function () {
      if (null != c.deprecationHandler && c.deprecationHandler(null, i), a) {
        for (var e, t = [], n = 0; n < arguments.length; n++) {
          if (e = "", "object" == typeof arguments[n]) {
            for (var s in e += "\n[" + n + "] ", arguments[0]) e += s + ": " + arguments[0][s] + ", ";

            e = e.slice(0, -2);
          } else e = arguments[n];

          t.push(e);
        }

        Y(i + "\nArguments: " + Array.prototype.slice.call(t).join("") + "\n" + new Error().stack), a = !1;
      }

      return r.apply(this, arguments);
    }, r);
  }

  var s,
      O = {};

  function T(e, t) {
    null != c.deprecationHandler && c.deprecationHandler(e, t), O[e] || (Y(t), O[e] = !0);
  }

  function x(e) {
    return e instanceof Function || "[object Function]" === Object.prototype.toString.call(e);
  }

  function b(e, t) {
    var n,
        s = _({}, e);

    for (n in t) m(t, n) && (u(e[n]) && u(t[n]) ? (s[n] = {}, _(s[n], e[n]), _(s[n], t[n])) : null != t[n] ? s[n] = t[n] : delete s[n]);

    for (n in e) m(e, n) && !m(t, n) && u(e[n]) && (s[n] = _({}, s[n]));

    return s;
  }

  function P(e) {
    null != e && this.set(e);
  }

  c.suppressDeprecationWarnings = !1, c.deprecationHandler = null, s = Object.keys ? Object.keys : function (e) {
    var t,
        n = [];

    for (t in e) m(e, t) && n.push(t);

    return n;
  };
  var W = {};

  function H(e, t) {
    var n = e.toLowerCase();
    W[n] = W[n + "s"] = W[t] = e;
  }

  function R(e) {
    return "string" == typeof e ? W[e] || W[e.toLowerCase()] : void 0;
  }

  function C(e) {
    var t,
        n,
        s = {};

    for (n in e) m(e, n) && (t = R(n)) && (s[t] = e[n]);

    return s;
  }

  var F = {};

  function L(e, t) {
    F[e] = t;
  }

  function U(e, t, n) {
    var s = "" + Math.abs(e),
        i = t - s.length;
    return (0 <= e ? n ? "+" : "" : "-") + Math.pow(10, Math.max(0, i)).toString().substr(1) + s;
  }

  var N = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
      G = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
      V = {},
      E = {};

  function I(e, t, n, s) {
    var i = s;
    "string" == typeof s && (i = function () {
      return this[s]();
    }), e && (E[e] = i), t && (E[t[0]] = function () {
      return U(i.apply(this, arguments), t[1], t[2]);
    }), n && (E[n] = function () {
      return this.localeData().ordinal(i.apply(this, arguments), e);
    });
  }

  function A(e, t) {
    return e.isValid() ? (t = j(t, e.localeData()), V[t] = V[t] || function (s) {
      var e,
          i,
          t,
          r = s.match(N);

      for (e = 0, i = r.length; e < i; e++) E[r[e]] ? r[e] = E[r[e]] : r[e] = (t = r[e]).match(/\[[\s\S]/) ? t.replace(/^\[|\]$/g, "") : t.replace(/\\/g, "");

      return function (e) {
        var t,
            n = "";

        for (t = 0; t < i; t++) n += x(r[t]) ? r[t].call(e, s) : r[t];

        return n;
      };
    }(t), V[t](e)) : e.localeData().invalidDate();
  }

  function j(e, t) {
    var n = 5;

    function s(e) {
      return t.longDateFormat(e) || e;
    }

    for (G.lastIndex = 0; 0 <= n && G.test(e);) e = e.replace(G, s), G.lastIndex = 0, n -= 1;

    return e;
  }

  var Z = /\d/,
      z = /\d\d/,
      $ = /\d{3}/,
      q = /\d{4}/,
      J = /[+-]?\d{6}/,
      B = /\d\d?/,
      Q = /\d\d\d\d?/,
      X = /\d\d\d\d\d\d?/,
      K = /\d{1,3}/,
      ee = /\d{1,4}/,
      te = /[+-]?\d{1,6}/,
      ne = /\d+/,
      se = /[+-]?\d+/,
      ie = /Z|[+-]\d\d:?\d\d/gi,
      re = /Z|[+-]\d\d(?::?\d\d)?/gi,
      ae = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
      oe = {};

  function ue(e, n, s) {
    oe[e] = x(n) ? n : function (e, t) {
      return e && s ? s : n;
    };
  }

  function le(e, t) {
    return m(oe, e) ? oe[e](t._strict, t._locale) : new RegExp(de(e.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (e, t, n, s, i) {
      return t || n || s || i;
    })));
  }

  function de(e) {
    return e.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  var he = {};

  function ce(e, n) {
    var t,
        s = n;

    for ("string" == typeof e && (e = [e]), d(n) && (s = function (e, t) {
      t[n] = k(e);
    }), t = 0; t < e.length; t++) he[e[t]] = s;
  }

  function fe(e, i) {
    ce(e, function (e, t, n, s) {
      n._w = n._w || {}, i(e, n._w, n, s);
    });
  }

  var me = 0,
      _e = 1,
      ye = 2,
      ge = 3,
      pe = 4,
      ve = 5,
      we = 6,
      Me = 7,
      Se = 8;

  function De(e) {
    return ke(e) ? 366 : 365;
  }

  function ke(e) {
    return e % 4 == 0 && e % 100 != 0 || e % 400 == 0;
  }

  I("Y", 0, 0, function () {
    var e = this.year();
    return e <= 9999 ? "" + e : "+" + e;
  }), I(0, ["YY", 2], 0, function () {
    return this.year() % 100;
  }), I(0, ["YYYY", 4], 0, "year"), I(0, ["YYYYY", 5], 0, "year"), I(0, ["YYYYYY", 6, !0], 0, "year"), H("year", "y"), L("year", 1), ue("Y", se), ue("YY", B, z), ue("YYYY", ee, q), ue("YYYYY", te, J), ue("YYYYYY", te, J), ce(["YYYYY", "YYYYYY"], me), ce("YYYY", function (e, t) {
    t[me] = 2 === e.length ? c.parseTwoDigitYear(e) : k(e);
  }), ce("YY", function (e, t) {
    t[me] = c.parseTwoDigitYear(e);
  }), ce("Y", function (e, t) {
    t[me] = parseInt(e, 10);
  }), c.parseTwoDigitYear = function (e) {
    return k(e) + (68 < k(e) ? 1900 : 2e3);
  };
  var Ye,
      Oe = Te("FullYear", !0);

  function Te(t, n) {
    return function (e) {
      return null != e ? (be(this, t, e), c.updateOffset(this, n), this) : xe(this, t);
    };
  }

  function xe(e, t) {
    return e.isValid() ? e._d["get" + (e._isUTC ? "UTC" : "") + t]() : NaN;
  }

  function be(e, t, n) {
    e.isValid() && !isNaN(n) && ("FullYear" === t && ke(e.year()) && 1 === e.month() && 29 === e.date() ? e._d["set" + (e._isUTC ? "UTC" : "") + t](n, e.month(), Pe(n, e.month())) : e._d["set" + (e._isUTC ? "UTC" : "") + t](n));
  }

  function Pe(e, t) {
    if (isNaN(e) || isNaN(t)) return NaN;
    var n,
        s = (t % (n = 12) + n) % n;
    return e += (t - s) / 12, 1 === s ? ke(e) ? 29 : 28 : 31 - s % 7 % 2;
  }

  Ye = Array.prototype.indexOf ? Array.prototype.indexOf : function (e) {
    var t;

    for (t = 0; t < this.length; ++t) if (this[t] === e) return t;

    return -1;
  }, I("M", ["MM", 2], "Mo", function () {
    return this.month() + 1;
  }), I("MMM", 0, 0, function (e) {
    return this.localeData().monthsShort(this, e);
  }), I("MMMM", 0, 0, function (e) {
    return this.localeData().months(this, e);
  }), H("month", "M"), L("month", 8), ue("M", B), ue("MM", B, z), ue("MMM", function (e, t) {
    return t.monthsShortRegex(e);
  }), ue("MMMM", function (e, t) {
    return t.monthsRegex(e);
  }), ce(["M", "MM"], function (e, t) {
    t[_e] = k(e) - 1;
  }), ce(["MMM", "MMMM"], function (e, t, n, s) {
    var i = n._locale.monthsParse(e, s, n._strict);

    null != i ? t[_e] = i : g(n).invalidMonth = e;
  });
  var We = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
      He = "January_February_March_April_May_June_July_August_September_October_November_December".split("_");
  var Re = "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_");

  function Ce(e, t) {
    var n;
    if (!e.isValid()) return e;
    if ("string" == typeof t) if (/^\d+$/.test(t)) t = k(t);else if (!d(t = e.localeData().monthsParse(t))) return e;
    return n = Math.min(e.date(), Pe(e.year(), t)), e._d["set" + (e._isUTC ? "UTC" : "") + "Month"](t, n), e;
  }

  function Fe(e) {
    return null != e ? (Ce(this, e), c.updateOffset(this, !0), this) : xe(this, "Month");
  }

  var Le = ae;
  var Ue = ae;

  function Ne() {
    function e(e, t) {
      return t.length - e.length;
    }

    var t,
        n,
        s = [],
        i = [],
        r = [];

    for (t = 0; t < 12; t++) n = y([2e3, t]), s.push(this.monthsShort(n, "")), i.push(this.months(n, "")), r.push(this.months(n, "")), r.push(this.monthsShort(n, ""));

    for (s.sort(e), i.sort(e), r.sort(e), t = 0; t < 12; t++) s[t] = de(s[t]), i[t] = de(i[t]);

    for (t = 0; t < 24; t++) r[t] = de(r[t]);

    this._monthsRegex = new RegExp("^(" + r.join("|") + ")", "i"), this._monthsShortRegex = this._monthsRegex, this._monthsStrictRegex = new RegExp("^(" + i.join("|") + ")", "i"), this._monthsShortStrictRegex = new RegExp("^(" + s.join("|") + ")", "i");
  }

  function Ge(e) {
    var t = new Date(Date.UTC.apply(null, arguments));
    return e < 100 && 0 <= e && isFinite(t.getUTCFullYear()) && t.setUTCFullYear(e), t;
  }

  function Ve(e, t, n) {
    var s = 7 + t - n;
    return -((7 + Ge(e, 0, s).getUTCDay() - t) % 7) + s - 1;
  }

  function Ee(e, t, n, s, i) {
    var r,
        a,
        o = 1 + 7 * (t - 1) + (7 + n - s) % 7 + Ve(e, s, i);
    return o <= 0 ? a = De(r = e - 1) + o : o > De(e) ? (r = e + 1, a = o - De(e)) : (r = e, a = o), {
      year: r,
      dayOfYear: a
    };
  }

  function Ie(e, t, n) {
    var s,
        i,
        r = Ve(e.year(), t, n),
        a = Math.floor((e.dayOfYear() - r - 1) / 7) + 1;
    return a < 1 ? s = a + Ae(i = e.year() - 1, t, n) : a > Ae(e.year(), t, n) ? (s = a - Ae(e.year(), t, n), i = e.year() + 1) : (i = e.year(), s = a), {
      week: s,
      year: i
    };
  }

  function Ae(e, t, n) {
    var s = Ve(e, t, n),
        i = Ve(e + 1, t, n);
    return (De(e) - s + i) / 7;
  }

  I("w", ["ww", 2], "wo", "week"), I("W", ["WW", 2], "Wo", "isoWeek"), H("week", "w"), H("isoWeek", "W"), L("week", 5), L("isoWeek", 5), ue("w", B), ue("ww", B, z), ue("W", B), ue("WW", B, z), fe(["w", "ww", "W", "WW"], function (e, t, n, s) {
    t[s.substr(0, 1)] = k(e);
  });
  I("d", 0, "do", "day"), I("dd", 0, 0, function (e) {
    return this.localeData().weekdaysMin(this, e);
  }), I("ddd", 0, 0, function (e) {
    return this.localeData().weekdaysShort(this, e);
  }), I("dddd", 0, 0, function (e) {
    return this.localeData().weekdays(this, e);
  }), I("e", 0, 0, "weekday"), I("E", 0, 0, "isoWeekday"), H("day", "d"), H("weekday", "e"), H("isoWeekday", "E"), L("day", 11), L("weekday", 11), L("isoWeekday", 11), ue("d", B), ue("e", B), ue("E", B), ue("dd", function (e, t) {
    return t.weekdaysMinRegex(e);
  }), ue("ddd", function (e, t) {
    return t.weekdaysShortRegex(e);
  }), ue("dddd", function (e, t) {
    return t.weekdaysRegex(e);
  }), fe(["dd", "ddd", "dddd"], function (e, t, n, s) {
    var i = n._locale.weekdaysParse(e, s, n._strict);

    null != i ? t.d = i : g(n).invalidWeekday = e;
  }), fe(["d", "e", "E"], function (e, t, n, s) {
    t[s] = k(e);
  });
  var je = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_");
  var Ze = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_");
  var ze = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");
  var $e = ae;
  var qe = ae;
  var Je = ae;

  function Be() {
    function e(e, t) {
      return t.length - e.length;
    }

    var t,
        n,
        s,
        i,
        r,
        a = [],
        o = [],
        u = [],
        l = [];

    for (t = 0; t < 7; t++) n = y([2e3, 1]).day(t), s = this.weekdaysMin(n, ""), i = this.weekdaysShort(n, ""), r = this.weekdays(n, ""), a.push(s), o.push(i), u.push(r), l.push(s), l.push(i), l.push(r);

    for (a.sort(e), o.sort(e), u.sort(e), l.sort(e), t = 0; t < 7; t++) o[t] = de(o[t]), u[t] = de(u[t]), l[t] = de(l[t]);

    this._weekdaysRegex = new RegExp("^(" + l.join("|") + ")", "i"), this._weekdaysShortRegex = this._weekdaysRegex, this._weekdaysMinRegex = this._weekdaysRegex, this._weekdaysStrictRegex = new RegExp("^(" + u.join("|") + ")", "i"), this._weekdaysShortStrictRegex = new RegExp("^(" + o.join("|") + ")", "i"), this._weekdaysMinStrictRegex = new RegExp("^(" + a.join("|") + ")", "i");
  }

  function Qe() {
    return this.hours() % 12 || 12;
  }

  function Xe(e, t) {
    I(e, 0, 0, function () {
      return this.localeData().meridiem(this.hours(), this.minutes(), t);
    });
  }

  function Ke(e, t) {
    return t._meridiemParse;
  }

  I("H", ["HH", 2], 0, "hour"), I("h", ["hh", 2], 0, Qe), I("k", ["kk", 2], 0, function () {
    return this.hours() || 24;
  }), I("hmm", 0, 0, function () {
    return "" + Qe.apply(this) + U(this.minutes(), 2);
  }), I("hmmss", 0, 0, function () {
    return "" + Qe.apply(this) + U(this.minutes(), 2) + U(this.seconds(), 2);
  }), I("Hmm", 0, 0, function () {
    return "" + this.hours() + U(this.minutes(), 2);
  }), I("Hmmss", 0, 0, function () {
    return "" + this.hours() + U(this.minutes(), 2) + U(this.seconds(), 2);
  }), Xe("a", !0), Xe("A", !1), H("hour", "h"), L("hour", 13), ue("a", Ke), ue("A", Ke), ue("H", B), ue("h", B), ue("k", B), ue("HH", B, z), ue("hh", B, z), ue("kk", B, z), ue("hmm", Q), ue("hmmss", X), ue("Hmm", Q), ue("Hmmss", X), ce(["H", "HH"], ge), ce(["k", "kk"], function (e, t, n) {
    var s = k(e);
    t[ge] = 24 === s ? 0 : s;
  }), ce(["a", "A"], function (e, t, n) {
    n._isPm = n._locale.isPM(e), n._meridiem = e;
  }), ce(["h", "hh"], function (e, t, n) {
    t[ge] = k(e), g(n).bigHour = !0;
  }), ce("hmm", function (e, t, n) {
    var s = e.length - 2;
    t[ge] = k(e.substr(0, s)), t[pe] = k(e.substr(s)), g(n).bigHour = !0;
  }), ce("hmmss", function (e, t, n) {
    var s = e.length - 4,
        i = e.length - 2;
    t[ge] = k(e.substr(0, s)), t[pe] = k(e.substr(s, 2)), t[ve] = k(e.substr(i)), g(n).bigHour = !0;
  }), ce("Hmm", function (e, t, n) {
    var s = e.length - 2;
    t[ge] = k(e.substr(0, s)), t[pe] = k(e.substr(s));
  }), ce("Hmmss", function (e, t, n) {
    var s = e.length - 4,
        i = e.length - 2;
    t[ge] = k(e.substr(0, s)), t[pe] = k(e.substr(s, 2)), t[ve] = k(e.substr(i));
  });
  var et,
      tt = Te("Hours", !0),
      nt = {
    calendar: {
      sameDay: "[Today at] LT",
      nextDay: "[Tomorrow at] LT",
      nextWeek: "dddd [at] LT",
      lastDay: "[Yesterday at] LT",
      lastWeek: "[Last] dddd [at] LT",
      sameElse: "L"
    },
    longDateFormat: {
      LTS: "h:mm:ss A",
      LT: "h:mm A",
      L: "MM/DD/YYYY",
      LL: "MMMM D, YYYY",
      LLL: "MMMM D, YYYY h:mm A",
      LLLL: "dddd, MMMM D, YYYY h:mm A"
    },
    invalidDate: "Invalid date",
    ordinal: "%d",
    dayOfMonthOrdinalParse: /\d{1,2}/,
    relativeTime: {
      future: "in %s",
      past: "%s ago",
      s: "a few seconds",
      ss: "%d seconds",
      m: "a minute",
      mm: "%d minutes",
      h: "an hour",
      hh: "%d hours",
      d: "a day",
      dd: "%d days",
      M: "a month",
      MM: "%d months",
      y: "a year",
      yy: "%d years"
    },
    months: He,
    monthsShort: Re,
    week: {
      dow: 0,
      doy: 6
    },
    weekdays: je,
    weekdaysMin: ze,
    weekdaysShort: Ze,
    meridiemParse: /[ap]\.?m?\.?/i
  },
      st = {},
      it = {};

  function rt(e) {
    return e ? e.toLowerCase().replace("_", "-") : e;
  }

  function at(e) {
    var t = null;
    if (!st[e] && "undefined" != typeof module && module && module.exports) try {
      t = et._abbr, require("./locale/" + e), ot(t);
    } catch (e) {}
    return st[e];
  }

  function ot(e, t) {
    var n;
    return e && ((n = l(t) ? lt(e) : ut(e, t)) ? et = n : "undefined" != typeof console && console.warn && console.warn("Locale " + e + " not found. Did you forget to load it?")), et._abbr;
  }

  function ut(e, t) {
    if (null !== t) {
      var n,
          s = nt;
      if (t.abbr = e, null != st[e]) T("defineLocaleOverride", "use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."), s = st[e]._config;else if (null != t.parentLocale) if (null != st[t.parentLocale]) s = st[t.parentLocale]._config;else {
        if (null == (n = at(t.parentLocale))) return it[t.parentLocale] || (it[t.parentLocale] = []), it[t.parentLocale].push({
          name: e,
          config: t
        }), null;
        s = n._config;
      }
      return st[e] = new P(b(s, t)), it[e] && it[e].forEach(function (e) {
        ut(e.name, e.config);
      }), ot(e), st[e];
    }

    return delete st[e], null;
  }

  function lt(e) {
    var t;
    if (e && e._locale && e._locale._abbr && (e = e._locale._abbr), !e) return et;

    if (!o(e)) {
      if (t = at(e)) return t;
      e = [e];
    }

    return function (e) {
      for (var t, n, s, i, r = 0; r < e.length;) {
        for (t = (i = rt(e[r]).split("-")).length, n = (n = rt(e[r + 1])) ? n.split("-") : null; 0 < t;) {
          if (s = at(i.slice(0, t).join("-"))) return s;
          if (n && n.length >= t && a(i, n, !0) >= t - 1) break;
          t--;
        }

        r++;
      }

      return et;
    }(e);
  }

  function dt(e) {
    var t,
        n = e._a;
    return n && -2 === g(e).overflow && (t = n[_e] < 0 || 11 < n[_e] ? _e : n[ye] < 1 || n[ye] > Pe(n[me], n[_e]) ? ye : n[ge] < 0 || 24 < n[ge] || 24 === n[ge] && (0 !== n[pe] || 0 !== n[ve] || 0 !== n[we]) ? ge : n[pe] < 0 || 59 < n[pe] ? pe : n[ve] < 0 || 59 < n[ve] ? ve : n[we] < 0 || 999 < n[we] ? we : -1, g(e)._overflowDayOfYear && (t < me || ye < t) && (t = ye), g(e)._overflowWeeks && -1 === t && (t = Me), g(e)._overflowWeekday && -1 === t && (t = Se), g(e).overflow = t), e;
  }

  function ht(e, t, n) {
    return null != e ? e : null != t ? t : n;
  }

  function ct(e) {
    var t,
        n,
        s,
        i,
        r,
        a = [];

    if (!e._d) {
      var o, u;

      for (o = e, u = new Date(c.now()), s = o._useUTC ? [u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()] : [u.getFullYear(), u.getMonth(), u.getDate()], e._w && null == e._a[ye] && null == e._a[_e] && function (e) {
        var t, n, s, i, r, a, o, u;
        if (null != (t = e._w).GG || null != t.W || null != t.E) r = 1, a = 4, n = ht(t.GG, e._a[me], Ie(Tt(), 1, 4).year), s = ht(t.W, 1), ((i = ht(t.E, 1)) < 1 || 7 < i) && (u = !0);else {
          r = e._locale._week.dow, a = e._locale._week.doy;
          var l = Ie(Tt(), r, a);
          n = ht(t.gg, e._a[me], l.year), s = ht(t.w, l.week), null != t.d ? ((i = t.d) < 0 || 6 < i) && (u = !0) : null != t.e ? (i = t.e + r, (t.e < 0 || 6 < t.e) && (u = !0)) : i = r;
        }
        s < 1 || s > Ae(n, r, a) ? g(e)._overflowWeeks = !0 : null != u ? g(e)._overflowWeekday = !0 : (o = Ee(n, s, i, r, a), e._a[me] = o.year, e._dayOfYear = o.dayOfYear);
      }(e), null != e._dayOfYear && (r = ht(e._a[me], s[me]), (e._dayOfYear > De(r) || 0 === e._dayOfYear) && (g(e)._overflowDayOfYear = !0), n = Ge(r, 0, e._dayOfYear), e._a[_e] = n.getUTCMonth(), e._a[ye] = n.getUTCDate()), t = 0; t < 3 && null == e._a[t]; ++t) e._a[t] = a[t] = s[t];

      for (; t < 7; t++) e._a[t] = a[t] = null == e._a[t] ? 2 === t ? 1 : 0 : e._a[t];

      24 === e._a[ge] && 0 === e._a[pe] && 0 === e._a[ve] && 0 === e._a[we] && (e._nextDay = !0, e._a[ge] = 0), e._d = (e._useUTC ? Ge : function (e, t, n, s, i, r, a) {
        var o = new Date(e, t, n, s, i, r, a);
        return e < 100 && 0 <= e && isFinite(o.getFullYear()) && o.setFullYear(e), o;
      }).apply(null, a), i = e._useUTC ? e._d.getUTCDay() : e._d.getDay(), null != e._tzm && e._d.setUTCMinutes(e._d.getUTCMinutes() - e._tzm), e._nextDay && (e._a[ge] = 24), e._w && void 0 !== e._w.d && e._w.d !== i && (g(e).weekdayMismatch = !0);
    }
  }

  var ft = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
      mt = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
      _t = /Z|[+-]\d\d(?::?\d\d)?/,
      yt = [["YYYYYY-MM-DD", /[+-]\d{6}-\d\d-\d\d/], ["YYYY-MM-DD", /\d{4}-\d\d-\d\d/], ["GGGG-[W]WW-E", /\d{4}-W\d\d-\d/], ["GGGG-[W]WW", /\d{4}-W\d\d/, !1], ["YYYY-DDD", /\d{4}-\d{3}/], ["YYYY-MM", /\d{4}-\d\d/, !1], ["YYYYYYMMDD", /[+-]\d{10}/], ["YYYYMMDD", /\d{8}/], ["GGGG[W]WWE", /\d{4}W\d{3}/], ["GGGG[W]WW", /\d{4}W\d{2}/, !1], ["YYYYDDD", /\d{7}/]],
      gt = [["HH:mm:ss.SSSS", /\d\d:\d\d:\d\d\.\d+/], ["HH:mm:ss,SSSS", /\d\d:\d\d:\d\d,\d+/], ["HH:mm:ss", /\d\d:\d\d:\d\d/], ["HH:mm", /\d\d:\d\d/], ["HHmmss.SSSS", /\d\d\d\d\d\d\.\d+/], ["HHmmss,SSSS", /\d\d\d\d\d\d,\d+/], ["HHmmss", /\d\d\d\d\d\d/], ["HHmm", /\d\d\d\d/], ["HH", /\d\d/]],
      pt = /^\/?Date\((\-?\d+)/i;

  function vt(e) {
    var t,
        n,
        s,
        i,
        r,
        a,
        o = e._i,
        u = ft.exec(o) || mt.exec(o);

    if (u) {
      for (g(e).iso = !0, t = 0, n = yt.length; t < n; t++) if (yt[t][1].exec(u[1])) {
        i = yt[t][0], s = !1 !== yt[t][2];
        break;
      }

      if (null == i) return void (e._isValid = !1);

      if (u[3]) {
        for (t = 0, n = gt.length; t < n; t++) if (gt[t][1].exec(u[3])) {
          r = (u[2] || " ") + gt[t][0];
          break;
        }

        if (null == r) return void (e._isValid = !1);
      }

      if (!s && null != r) return void (e._isValid = !1);

      if (u[4]) {
        if (!_t.exec(u[4])) return void (e._isValid = !1);
        a = "Z";
      }

      e._f = i + (r || "") + (a || ""), kt(e);
    } else e._isValid = !1;
  }

  var wt = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

  function Mt(e, t, n, s, i, r) {
    var a = [function (e) {
      var t = parseInt(e, 10);
      {
        if (t <= 49) return 2e3 + t;
        if (t <= 999) return 1900 + t;
      }
      return t;
    }(e), Re.indexOf(t), parseInt(n, 10), parseInt(s, 10), parseInt(i, 10)];
    return r && a.push(parseInt(r, 10)), a;
  }

  var St = {
    UT: 0,
    GMT: 0,
    EDT: -240,
    EST: -300,
    CDT: -300,
    CST: -360,
    MDT: -360,
    MST: -420,
    PDT: -420,
    PST: -480
  };

  function Dt(e) {
    var t,
        n,
        s,
        i = wt.exec(e._i.replace(/\([^)]*\)|[\n\t]/g, " ").replace(/(\s\s+)/g, " ").replace(/^\s\s*/, "").replace(/\s\s*$/, ""));

    if (i) {
      var r = Mt(i[4], i[3], i[2], i[5], i[6], i[7]);
      if (t = i[1], n = r, s = e, t && Ze.indexOf(t) !== new Date(n[0], n[1], n[2]).getDay() && (g(s).weekdayMismatch = !0, !(s._isValid = !1))) return;
      e._a = r, e._tzm = function (e, t, n) {
        if (e) return St[e];
        if (t) return 0;
        var s = parseInt(n, 10),
            i = s % 100;
        return (s - i) / 100 * 60 + i;
      }(i[8], i[9], i[10]), e._d = Ge.apply(null, e._a), e._d.setUTCMinutes(e._d.getUTCMinutes() - e._tzm), g(e).rfc2822 = !0;
    } else e._isValid = !1;
  }

  function kt(e) {
    if (e._f !== c.ISO_8601) {
      if (e._f !== c.RFC_2822) {
        e._a = [], g(e).empty = !0;
        var t,
            n,
            s,
            i,
            r,
            a,
            o,
            u,
            l = "" + e._i,
            d = l.length,
            h = 0;

        for (s = j(e._f, e._locale).match(N) || [], t = 0; t < s.length; t++) i = s[t], (n = (l.match(le(i, e)) || [])[0]) && (0 < (r = l.substr(0, l.indexOf(n))).length && g(e).unusedInput.push(r), l = l.slice(l.indexOf(n) + n.length), h += n.length), E[i] ? (n ? g(e).empty = !1 : g(e).unusedTokens.push(i), a = i, u = e, null != (o = n) && m(he, a) && he[a](o, u._a, u, a)) : e._strict && !n && g(e).unusedTokens.push(i);

        g(e).charsLeftOver = d - h, 0 < l.length && g(e).unusedInput.push(l), e._a[ge] <= 12 && !0 === g(e).bigHour && 0 < e._a[ge] && (g(e).bigHour = void 0), g(e).parsedDateParts = e._a.slice(0), g(e).meridiem = e._meridiem, e._a[ge] = function (e, t, n) {
          var s;
          if (null == n) return t;
          return null != e.meridiemHour ? e.meridiemHour(t, n) : (null != e.isPM && ((s = e.isPM(n)) && t < 12 && (t += 12), s || 12 !== t || (t = 0)), t);
        }(e._locale, e._a[ge], e._meridiem), ct(e), dt(e);
      } else Dt(e);
    } else vt(e);
  }

  function Yt(e) {
    var t,
        n,
        s,
        i,
        r = e._i,
        a = e._f;
    return e._locale = e._locale || lt(e._l), null === r || void 0 === a && "" === r ? v({
      nullInput: !0
    }) : ("string" == typeof r && (e._i = r = e._locale.preparse(r)), S(r) ? new M(dt(r)) : (h(r) ? e._d = r : o(a) ? function (e) {
      var t, n, s, i, r;
      if (0 === e._f.length) return g(e).invalidFormat = !0, e._d = new Date(NaN);

      for (i = 0; i < e._f.length; i++) r = 0, t = w({}, e), null != e._useUTC && (t._useUTC = e._useUTC), t._f = e._f[i], kt(t), p(t) && (r += g(t).charsLeftOver, r += 10 * g(t).unusedTokens.length, g(t).score = r, (null == s || r < s) && (s = r, n = t));

      _(e, n || t);
    }(e) : a ? kt(e) : l(n = (t = e)._i) ? t._d = new Date(c.now()) : h(n) ? t._d = new Date(n.valueOf()) : "string" == typeof n ? (s = t, null === (i = pt.exec(s._i)) ? (vt(s), !1 === s._isValid && (delete s._isValid, Dt(s), !1 === s._isValid && (delete s._isValid, c.createFromInputFallback(s)))) : s._d = new Date(+i[1])) : o(n) ? (t._a = f(n.slice(0), function (e) {
      return parseInt(e, 10);
    }), ct(t)) : u(n) ? function (e) {
      if (!e._d) {
        var t = C(e._i);
        e._a = f([t.year, t.month, t.day || t.date, t.hour, t.minute, t.second, t.millisecond], function (e) {
          return e && parseInt(e, 10);
        }), ct(e);
      }
    }(t) : d(n) ? t._d = new Date(n) : c.createFromInputFallback(t), p(e) || (e._d = null), e));
  }

  function Ot(e, t, n, s, i) {
    var r,
        a = {};
    return !0 !== n && !1 !== n || (s = n, n = void 0), (u(e) && function (e) {
      if (Object.getOwnPropertyNames) return 0 === Object.getOwnPropertyNames(e).length;
      var t;

      for (t in e) if (e.hasOwnProperty(t)) return !1;

      return !0;
    }(e) || o(e) && 0 === e.length) && (e = void 0), a._isAMomentObject = !0, a._useUTC = a._isUTC = i, a._l = n, a._i = e, a._f = t, a._strict = s, (r = new M(dt(Yt(a))))._nextDay && (r.add(1, "d"), r._nextDay = void 0), r;
  }

  function Tt(e, t, n, s) {
    return Ot(e, t, n, s, !1);
  }

  c.createFromInputFallback = n("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.", function (e) {
    e._d = new Date(e._i + (e._useUTC ? " UTC" : ""));
  }), c.ISO_8601 = function () {}, c.RFC_2822 = function () {};
  var xt = n("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/", function () {
    var e = Tt.apply(null, arguments);
    return this.isValid() && e.isValid() ? e < this ? this : e : v();
  }),
      bt = n("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/", function () {
    var e = Tt.apply(null, arguments);
    return this.isValid() && e.isValid() ? this < e ? this : e : v();
  });

  function Pt(e, t) {
    var n, s;
    if (1 === t.length && o(t[0]) && (t = t[0]), !t.length) return Tt();

    for (n = t[0], s = 1; s < t.length; ++s) t[s].isValid() && !t[s][e](n) || (n = t[s]);

    return n;
  }

  var Wt = ["year", "quarter", "month", "week", "day", "hour", "minute", "second", "millisecond"];

  function Ht(e) {
    var t = C(e),
        n = t.year || 0,
        s = t.quarter || 0,
        i = t.month || 0,
        r = t.week || 0,
        a = t.day || 0,
        o = t.hour || 0,
        u = t.minute || 0,
        l = t.second || 0,
        d = t.millisecond || 0;
    this._isValid = function (e) {
      for (var t in e) if (-1 === Ye.call(Wt, t) || null != e[t] && isNaN(e[t])) return !1;

      for (var n = !1, s = 0; s < Wt.length; ++s) if (e[Wt[s]]) {
        if (n) return !1;
        parseFloat(e[Wt[s]]) !== k(e[Wt[s]]) && (n = !0);
      }

      return !0;
    }(t), this._milliseconds = +d + 1e3 * l + 6e4 * u + 1e3 * o * 60 * 60, this._days = +a + 7 * r, this._months = +i + 3 * s + 12 * n, this._data = {}, this._locale = lt(), this._bubble();
  }

  function Rt(e) {
    return e instanceof Ht;
  }

  function Ct(e) {
    return e < 0 ? -1 * Math.round(-1 * e) : Math.round(e);
  }

  function Ft(e, n) {
    I(e, 0, 0, function () {
      var e = this.utcOffset(),
          t = "+";
      return e < 0 && (e = -e, t = "-"), t + U(~~(e / 60), 2) + n + U(~~e % 60, 2);
    });
  }

  Ft("Z", ":"), Ft("ZZ", ""), ue("Z", re), ue("ZZ", re), ce(["Z", "ZZ"], function (e, t, n) {
    n._useUTC = !0, n._tzm = Ut(re, e);
  });
  var Lt = /([\+\-]|\d\d)/gi;

  function Ut(e, t) {
    var n = (t || "").match(e);
    if (null === n) return null;
    var s = ((n[n.length - 1] || []) + "").match(Lt) || ["-", 0, 0],
        i = 60 * s[1] + k(s[2]);
    return 0 === i ? 0 : "+" === s[0] ? i : -i;
  }

  function Nt(e, t) {
    var n, s;
    return t._isUTC ? (n = t.clone(), s = (S(e) || h(e) ? e.valueOf() : Tt(e).valueOf()) - n.valueOf(), n._d.setTime(n._d.valueOf() + s), c.updateOffset(n, !1), n) : Tt(e).local();
  }

  function Gt(e) {
    return 15 * -Math.round(e._d.getTimezoneOffset() / 15);
  }

  function Vt() {
    return !!this.isValid() && this._isUTC && 0 === this._offset;
  }

  c.updateOffset = function () {};

  var Et = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/,
      It = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

  function At(e, t) {
    var n,
        s,
        i,
        r = e,
        a = null;
    return Rt(e) ? r = {
      ms: e._milliseconds,
      d: e._days,
      M: e._months
    } : d(e) ? (r = {}, t ? r[t] = e : r.milliseconds = e) : (a = Et.exec(e)) ? (n = "-" === a[1] ? -1 : 1, r = {
      y: 0,
      d: k(a[ye]) * n,
      h: k(a[ge]) * n,
      m: k(a[pe]) * n,
      s: k(a[ve]) * n,
      ms: k(Ct(1e3 * a[we])) * n
    }) : (a = It.exec(e)) ? (n = "-" === a[1] ? -1 : (a[1], 1), r = {
      y: jt(a[2], n),
      M: jt(a[3], n),
      w: jt(a[4], n),
      d: jt(a[5], n),
      h: jt(a[6], n),
      m: jt(a[7], n),
      s: jt(a[8], n)
    }) : null == r ? r = {} : "object" == typeof r && ("from" in r || "to" in r) && (i = function (e, t) {
      var n;
      if (!e.isValid() || !t.isValid()) return {
        milliseconds: 0,
        months: 0
      };
      t = Nt(t, e), e.isBefore(t) ? n = Zt(e, t) : ((n = Zt(t, e)).milliseconds = -n.milliseconds, n.months = -n.months);
      return n;
    }(Tt(r.from), Tt(r.to)), (r = {}).ms = i.milliseconds, r.M = i.months), s = new Ht(r), Rt(e) && m(e, "_locale") && (s._locale = e._locale), s;
  }

  function jt(e, t) {
    var n = e && parseFloat(e.replace(",", "."));
    return (isNaN(n) ? 0 : n) * t;
  }

  function Zt(e, t) {
    var n = {
      milliseconds: 0,
      months: 0
    };
    return n.months = t.month() - e.month() + 12 * (t.year() - e.year()), e.clone().add(n.months, "M").isAfter(t) && --n.months, n.milliseconds = +t - +e.clone().add(n.months, "M"), n;
  }

  function zt(s, i) {
    return function (e, t) {
      var n;
      return null === t || isNaN(+t) || (T(i, "moment()." + i + "(period, number) is deprecated. Please use moment()." + i + "(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."), n = e, e = t, t = n), $t(this, At(e = "string" == typeof e ? +e : e, t), s), this;
    };
  }

  function $t(e, t, n, s) {
    var i = t._milliseconds,
        r = Ct(t._days),
        a = Ct(t._months);
    e.isValid() && (s = null == s || s, a && Ce(e, xe(e, "Month") + a * n), r && be(e, "Date", xe(e, "Date") + r * n), i && e._d.setTime(e._d.valueOf() + i * n), s && c.updateOffset(e, r || a));
  }

  At.fn = Ht.prototype, At.invalid = function () {
    return At(NaN);
  };
  var qt = zt(1, "add"),
      Jt = zt(-1, "subtract");

  function Bt(e, t) {
    var n = 12 * (t.year() - e.year()) + (t.month() - e.month()),
        s = e.clone().add(n, "months");
    return -(n + (t - s < 0 ? (t - s) / (s - e.clone().add(n - 1, "months")) : (t - s) / (e.clone().add(n + 1, "months") - s))) || 0;
  }

  function Qt(e) {
    var t;
    return void 0 === e ? this._locale._abbr : (null != (t = lt(e)) && (this._locale = t), this);
  }

  c.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ", c.defaultFormatUtc = "YYYY-MM-DDTHH:mm:ss[Z]";
  var Xt = n("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.", function (e) {
    return void 0 === e ? this.localeData() : this.locale(e);
  });

  function Kt() {
    return this._locale;
  }

  function en(e, t) {
    I(0, [e, e.length], 0, t);
  }

  function tn(e, t, n, s, i) {
    var r;
    return null == e ? Ie(this, s, i).year : ((r = Ae(e, s, i)) < t && (t = r), function (e, t, n, s, i) {
      var r = Ee(e, t, n, s, i),
          a = Ge(r.year, 0, r.dayOfYear);
      return this.year(a.getUTCFullYear()), this.month(a.getUTCMonth()), this.date(a.getUTCDate()), this;
    }.call(this, e, t, n, s, i));
  }

  I(0, ["gg", 2], 0, function () {
    return this.weekYear() % 100;
  }), I(0, ["GG", 2], 0, function () {
    return this.isoWeekYear() % 100;
  }), en("gggg", "weekYear"), en("ggggg", "weekYear"), en("GGGG", "isoWeekYear"), en("GGGGG", "isoWeekYear"), H("weekYear", "gg"), H("isoWeekYear", "GG"), L("weekYear", 1), L("isoWeekYear", 1), ue("G", se), ue("g", se), ue("GG", B, z), ue("gg", B, z), ue("GGGG", ee, q), ue("gggg", ee, q), ue("GGGGG", te, J), ue("ggggg", te, J), fe(["gggg", "ggggg", "GGGG", "GGGGG"], function (e, t, n, s) {
    t[s.substr(0, 2)] = k(e);
  }), fe(["gg", "GG"], function (e, t, n, s) {
    t[s] = c.parseTwoDigitYear(e);
  }), I("Q", 0, "Qo", "quarter"), H("quarter", "Q"), L("quarter", 7), ue("Q", Z), ce("Q", function (e, t) {
    t[_e] = 3 * (k(e) - 1);
  }), I("D", ["DD", 2], "Do", "date"), H("date", "D"), L("date", 9), ue("D", B), ue("DD", B, z), ue("Do", function (e, t) {
    return e ? t._dayOfMonthOrdinalParse || t._ordinalParse : t._dayOfMonthOrdinalParseLenient;
  }), ce(["D", "DD"], ye), ce("Do", function (e, t) {
    t[ye] = k(e.match(B)[0]);
  });
  var nn = Te("Date", !0);
  I("DDD", ["DDDD", 3], "DDDo", "dayOfYear"), H("dayOfYear", "DDD"), L("dayOfYear", 4), ue("DDD", K), ue("DDDD", $), ce(["DDD", "DDDD"], function (e, t, n) {
    n._dayOfYear = k(e);
  }), I("m", ["mm", 2], 0, "minute"), H("minute", "m"), L("minute", 14), ue("m", B), ue("mm", B, z), ce(["m", "mm"], pe);
  var sn = Te("Minutes", !1);
  I("s", ["ss", 2], 0, "second"), H("second", "s"), L("second", 15), ue("s", B), ue("ss", B, z), ce(["s", "ss"], ve);
  var rn,
      an = Te("Seconds", !1);

  for (I("S", 0, 0, function () {
    return ~~(this.millisecond() / 100);
  }), I(0, ["SS", 2], 0, function () {
    return ~~(this.millisecond() / 10);
  }), I(0, ["SSS", 3], 0, "millisecond"), I(0, ["SSSS", 4], 0, function () {
    return 10 * this.millisecond();
  }), I(0, ["SSSSS", 5], 0, function () {
    return 100 * this.millisecond();
  }), I(0, ["SSSSSS", 6], 0, function () {
    return 1e3 * this.millisecond();
  }), I(0, ["SSSSSSS", 7], 0, function () {
    return 1e4 * this.millisecond();
  }), I(0, ["SSSSSSSS", 8], 0, function () {
    return 1e5 * this.millisecond();
  }), I(0, ["SSSSSSSSS", 9], 0, function () {
    return 1e6 * this.millisecond();
  }), H("millisecond", "ms"), L("millisecond", 16), ue("S", K, Z), ue("SS", K, z), ue("SSS", K, $), rn = "SSSS"; rn.length <= 9; rn += "S") ue(rn, ne);

  function on(e, t) {
    t[we] = k(1e3 * ("0." + e));
  }

  for (rn = "S"; rn.length <= 9; rn += "S") ce(rn, on);

  var un = Te("Milliseconds", !1);
  I("z", 0, 0, "zoneAbbr"), I("zz", 0, 0, "zoneName");
  var ln = M.prototype;

  function dn(e) {
    return e;
  }

  ln.add = qt, ln.calendar = function (e, t) {
    var n = e || Tt(),
        s = Nt(n, this).startOf("day"),
        i = c.calendarFormat(this, s) || "sameElse",
        r = t && (x(t[i]) ? t[i].call(this, n) : t[i]);
    return this.format(r || this.localeData().calendar(i, this, Tt(n)));
  }, ln.clone = function () {
    return new M(this);
  }, ln.diff = function (e, t, n) {
    var s, i, r;
    if (!this.isValid()) return NaN;
    if (!(s = Nt(e, this)).isValid()) return NaN;

    switch (i = 6e4 * (s.utcOffset() - this.utcOffset()), t = R(t)) {
      case "year":
        r = Bt(this, s) / 12;
        break;

      case "month":
        r = Bt(this, s);
        break;

      case "quarter":
        r = Bt(this, s) / 3;
        break;

      case "second":
        r = (this - s) / 1e3;
        break;

      case "minute":
        r = (this - s) / 6e4;
        break;

      case "hour":
        r = (this - s) / 36e5;
        break;

      case "day":
        r = (this - s - i) / 864e5;
        break;

      case "week":
        r = (this - s - i) / 6048e5;
        break;

      default:
        r = this - s;
    }

    return n ? r : D(r);
  }, ln.endOf = function (e) {
    return void 0 === (e = R(e)) || "millisecond" === e ? this : ("date" === e && (e = "day"), this.startOf(e).add(1, "isoWeek" === e ? "week" : e).subtract(1, "ms"));
  }, ln.format = function (e) {
    e || (e = this.isUtc() ? c.defaultFormatUtc : c.defaultFormat);
    var t = A(this, e);
    return this.localeData().postformat(t);
  }, ln.from = function (e, t) {
    return this.isValid() && (S(e) && e.isValid() || Tt(e).isValid()) ? At({
      to: this,
      from: e
    }).locale(this.locale()).humanize(!t) : this.localeData().invalidDate();
  }, ln.fromNow = function (e) {
    return this.from(Tt(), e);
  }, ln.to = function (e, t) {
    return this.isValid() && (S(e) && e.isValid() || Tt(e).isValid()) ? At({
      from: this,
      to: e
    }).locale(this.locale()).humanize(!t) : this.localeData().invalidDate();
  }, ln.toNow = function (e) {
    return this.to(Tt(), e);
  }, ln.get = function (e) {
    return x(this[e = R(e)]) ? this[e]() : this;
  }, ln.invalidAt = function () {
    return g(this).overflow;
  }, ln.isAfter = function (e, t) {
    var n = S(e) ? e : Tt(e);
    return !(!this.isValid() || !n.isValid()) && ("millisecond" === (t = R(l(t) ? "millisecond" : t)) ? this.valueOf() > n.valueOf() : n.valueOf() < this.clone().startOf(t).valueOf());
  }, ln.isBefore = function (e, t) {
    var n = S(e) ? e : Tt(e);
    return !(!this.isValid() || !n.isValid()) && ("millisecond" === (t = R(l(t) ? "millisecond" : t)) ? this.valueOf() < n.valueOf() : this.clone().endOf(t).valueOf() < n.valueOf());
  }, ln.isBetween = function (e, t, n, s) {
    return ("(" === (s = s || "()")[0] ? this.isAfter(e, n) : !this.isBefore(e, n)) && (")" === s[1] ? this.isBefore(t, n) : !this.isAfter(t, n));
  }, ln.isSame = function (e, t) {
    var n,
        s = S(e) ? e : Tt(e);
    return !(!this.isValid() || !s.isValid()) && ("millisecond" === (t = R(t || "millisecond")) ? this.valueOf() === s.valueOf() : (n = s.valueOf(), this.clone().startOf(t).valueOf() <= n && n <= this.clone().endOf(t).valueOf()));
  }, ln.isSameOrAfter = function (e, t) {
    return this.isSame(e, t) || this.isAfter(e, t);
  }, ln.isSameOrBefore = function (e, t) {
    return this.isSame(e, t) || this.isBefore(e, t);
  }, ln.isValid = function () {
    return p(this);
  }, ln.lang = Xt, ln.locale = Qt, ln.localeData = Kt, ln.max = bt, ln.min = xt, ln.parsingFlags = function () {
    return _({}, g(this));
  }, ln.set = function (e, t) {
    if ("object" == typeof e) for (var n = function (e) {
      var t = [];

      for (var n in e) t.push({
        unit: n,
        priority: F[n]
      });

      return t.sort(function (e, t) {
        return e.priority - t.priority;
      }), t;
    }(e = C(e)), s = 0; s < n.length; s++) this[n[s].unit](e[n[s].unit]);else if (x(this[e = R(e)])) return this[e](t);
    return this;
  }, ln.startOf = function (e) {
    switch (e = R(e)) {
      case "year":
        this.month(0);

      case "quarter":
      case "month":
        this.date(1);

      case "week":
      case "isoWeek":
      case "day":
      case "date":
        this.hours(0);

      case "hour":
        this.minutes(0);

      case "minute":
        this.seconds(0);

      case "second":
        this.milliseconds(0);
    }

    return "week" === e && this.weekday(0), "isoWeek" === e && this.isoWeekday(1), "quarter" === e && this.month(3 * Math.floor(this.month() / 3)), this;
  }, ln.subtract = Jt, ln.toArray = function () {
    var e = this;
    return [e.year(), e.month(), e.date(), e.hour(), e.minute(), e.second(), e.millisecond()];
  }, ln.toObject = function () {
    var e = this;
    return {
      years: e.year(),
      months: e.month(),
      date: e.date(),
      hours: e.hours(),
      minutes: e.minutes(),
      seconds: e.seconds(),
      milliseconds: e.milliseconds()
    };
  }, ln.toDate = function () {
    return new Date(this.valueOf());
  }, ln.toISOString = function (e) {
    if (!this.isValid()) return null;
    var t = !0 !== e,
        n = t ? this.clone().utc() : this;
    return n.year() < 0 || 9999 < n.year() ? A(n, t ? "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]" : "YYYYYY-MM-DD[T]HH:mm:ss.SSSZ") : x(Date.prototype.toISOString) ? t ? this.toDate().toISOString() : new Date(this.valueOf() + 60 * this.utcOffset() * 1e3).toISOString().replace("Z", A(n, "Z")) : A(n, t ? "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]" : "YYYY-MM-DD[T]HH:mm:ss.SSSZ");
  }, ln.inspect = function () {
    if (!this.isValid()) return "moment.invalid(/* " + this._i + " */)";
    var e = "moment",
        t = "";
    this.isLocal() || (e = 0 === this.utcOffset() ? "moment.utc" : "moment.parseZone", t = "Z");
    var n = "[" + e + '("]',
        s = 0 <= this.year() && this.year() <= 9999 ? "YYYY" : "YYYYYY",
        i = t + '[")]';
    return this.format(n + s + "-MM-DD[T]HH:mm:ss.SSS" + i);
  }, ln.toJSON = function () {
    return this.isValid() ? this.toISOString() : null;
  }, ln.toString = function () {
    return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
  }, ln.unix = function () {
    return Math.floor(this.valueOf() / 1e3);
  }, ln.valueOf = function () {
    return this._d.valueOf() - 6e4 * (this._offset || 0);
  }, ln.creationData = function () {
    return {
      input: this._i,
      format: this._f,
      locale: this._locale,
      isUTC: this._isUTC,
      strict: this._strict
    };
  }, ln.year = Oe, ln.isLeapYear = function () {
    return ke(this.year());
  }, ln.weekYear = function (e) {
    return tn.call(this, e, this.week(), this.weekday(), this.localeData()._week.dow, this.localeData()._week.doy);
  }, ln.isoWeekYear = function (e) {
    return tn.call(this, e, this.isoWeek(), this.isoWeekday(), 1, 4);
  }, ln.quarter = ln.quarters = function (e) {
    return null == e ? Math.ceil((this.month() + 1) / 3) : this.month(3 * (e - 1) + this.month() % 3);
  }, ln.month = Fe, ln.daysInMonth = function () {
    return Pe(this.year(), this.month());
  }, ln.week = ln.weeks = function (e) {
    var t = this.localeData().week(this);
    return null == e ? t : this.add(7 * (e - t), "d");
  }, ln.isoWeek = ln.isoWeeks = function (e) {
    var t = Ie(this, 1, 4).week;
    return null == e ? t : this.add(7 * (e - t), "d");
  }, ln.weeksInYear = function () {
    var e = this.localeData()._week;

    return Ae(this.year(), e.dow, e.doy);
  }, ln.isoWeeksInYear = function () {
    return Ae(this.year(), 1, 4);
  }, ln.date = nn, ln.day = ln.days = function (e) {
    if (!this.isValid()) return null != e ? this : NaN;
    var t,
        n,
        s = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
    return null != e ? (t = e, n = this.localeData(), e = "string" != typeof t ? t : isNaN(t) ? "number" == typeof (t = n.weekdaysParse(t)) ? t : null : parseInt(t, 10), this.add(e - s, "d")) : s;
  }, ln.weekday = function (e) {
    if (!this.isValid()) return null != e ? this : NaN;
    var t = (this.day() + 7 - this.localeData()._week.dow) % 7;
    return null == e ? t : this.add(e - t, "d");
  }, ln.isoWeekday = function (e) {
    if (!this.isValid()) return null != e ? this : NaN;

    if (null != e) {
      var t = (n = e, s = this.localeData(), "string" == typeof n ? s.weekdaysParse(n) % 7 || 7 : isNaN(n) ? null : n);
      return this.day(this.day() % 7 ? t : t - 7);
    }

    return this.day() || 7;
    var n, s;
  }, ln.dayOfYear = function (e) {
    var t = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
    return null == e ? t : this.add(e - t, "d");
  }, ln.hour = ln.hours = tt, ln.minute = ln.minutes = sn, ln.second = ln.seconds = an, ln.millisecond = ln.milliseconds = un, ln.utcOffset = function (e, t, n) {
    var s,
        i = this._offset || 0;
    if (!this.isValid()) return null != e ? this : NaN;

    if (null != e) {
      if ("string" == typeof e) {
        if (null === (e = Ut(re, e))) return this;
      } else Math.abs(e) < 16 && !n && (e *= 60);

      return !this._isUTC && t && (s = Gt(this)), this._offset = e, this._isUTC = !0, null != s && this.add(s, "m"), i !== e && (!t || this._changeInProgress ? $t(this, At(e - i, "m"), 1, !1) : this._changeInProgress || (this._changeInProgress = !0, c.updateOffset(this, !0), this._changeInProgress = null)), this;
    }

    return this._isUTC ? i : Gt(this);
  }, ln.utc = function (e) {
    return this.utcOffset(0, e);
  }, ln.local = function (e) {
    return this._isUTC && (this.utcOffset(0, e), this._isUTC = !1, e && this.subtract(Gt(this), "m")), this;
  }, ln.parseZone = function () {
    if (null != this._tzm) this.utcOffset(this._tzm, !1, !0);else if ("string" == typeof this._i) {
      var e = Ut(ie, this._i);
      null != e ? this.utcOffset(e) : this.utcOffset(0, !0);
    }
    return this;
  }, ln.hasAlignedHourOffset = function (e) {
    return !!this.isValid() && (e = e ? Tt(e).utcOffset() : 0, (this.utcOffset() - e) % 60 == 0);
  }, ln.isDST = function () {
    return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset();
  }, ln.isLocal = function () {
    return !!this.isValid() && !this._isUTC;
  }, ln.isUtcOffset = function () {
    return !!this.isValid() && this._isUTC;
  }, ln.isUtc = Vt, ln.isUTC = Vt, ln.zoneAbbr = function () {
    return this._isUTC ? "UTC" : "";
  }, ln.zoneName = function () {
    return this._isUTC ? "Coordinated Universal Time" : "";
  }, ln.dates = n("dates accessor is deprecated. Use date instead.", nn), ln.months = n("months accessor is deprecated. Use month instead", Fe), ln.years = n("years accessor is deprecated. Use year instead", Oe), ln.zone = n("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/", function (e, t) {
    return null != e ? ("string" != typeof e && (e = -e), this.utcOffset(e, t), this) : -this.utcOffset();
  }), ln.isDSTShifted = n("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information", function () {
    if (!l(this._isDSTShifted)) return this._isDSTShifted;
    var e = {};

    if (w(e, this), (e = Yt(e))._a) {
      var t = e._isUTC ? y(e._a) : Tt(e._a);
      this._isDSTShifted = this.isValid() && 0 < a(e._a, t.toArray());
    } else this._isDSTShifted = !1;

    return this._isDSTShifted;
  });
  var hn = P.prototype;

  function cn(e, t, n, s) {
    var i = lt(),
        r = y().set(s, t);
    return i[n](r, e);
  }

  function fn(e, t, n) {
    if (d(e) && (t = e, e = void 0), e = e || "", null != t) return cn(e, t, n, "month");
    var s,
        i = [];

    for (s = 0; s < 12; s++) i[s] = cn(e, s, n, "month");

    return i;
  }

  function mn(e, t, n, s) {
    "boolean" == typeof e ? d(t) && (n = t, t = void 0) : (t = e, e = !1, d(n = t) && (n = t, t = void 0)), t = t || "";
    var i,
        r = lt(),
        a = e ? r._week.dow : 0;
    if (null != n) return cn(t, (n + a) % 7, s, "day");
    var o = [];

    for (i = 0; i < 7; i++) o[i] = cn(t, (i + a) % 7, s, "day");

    return o;
  }

  hn.calendar = function (e, t, n) {
    var s = this._calendar[e] || this._calendar.sameElse;
    return x(s) ? s.call(t, n) : s;
  }, hn.longDateFormat = function (e) {
    var t = this._longDateFormat[e],
        n = this._longDateFormat[e.toUpperCase()];

    return t || !n ? t : (this._longDateFormat[e] = n.replace(/MMMM|MM|DD|dddd/g, function (e) {
      return e.slice(1);
    }), this._longDateFormat[e]);
  }, hn.invalidDate = function () {
    return this._invalidDate;
  }, hn.ordinal = function (e) {
    return this._ordinal.replace("%d", e);
  }, hn.preparse = dn, hn.postformat = dn, hn.relativeTime = function (e, t, n, s) {
    var i = this._relativeTime[n];
    return x(i) ? i(e, t, n, s) : i.replace(/%d/i, e);
  }, hn.pastFuture = function (e, t) {
    var n = this._relativeTime[0 < e ? "future" : "past"];
    return x(n) ? n(t) : n.replace(/%s/i, t);
  }, hn.set = function (e) {
    var t, n;

    for (n in e) x(t = e[n]) ? this[n] = t : this["_" + n] = t;

    this._config = e, this._dayOfMonthOrdinalParseLenient = new RegExp((this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) + "|" + /\d{1,2}/.source);
  }, hn.months = function (e, t) {
    return e ? o(this._months) ? this._months[e.month()] : this._months[(this._months.isFormat || We).test(t) ? "format" : "standalone"][e.month()] : o(this._months) ? this._months : this._months.standalone;
  }, hn.monthsShort = function (e, t) {
    return e ? o(this._monthsShort) ? this._monthsShort[e.month()] : this._monthsShort[We.test(t) ? "format" : "standalone"][e.month()] : o(this._monthsShort) ? this._monthsShort : this._monthsShort.standalone;
  }, hn.monthsParse = function (e, t, n) {
    var s, i, r;
    if (this._monthsParseExact) return function (e, t, n) {
      var s,
          i,
          r,
          a = e.toLocaleLowerCase();
      if (!this._monthsParse) for (this._monthsParse = [], this._longMonthsParse = [], this._shortMonthsParse = [], s = 0; s < 12; ++s) r = y([2e3, s]), this._shortMonthsParse[s] = this.monthsShort(r, "").toLocaleLowerCase(), this._longMonthsParse[s] = this.months(r, "").toLocaleLowerCase();
      return n ? "MMM" === t ? -1 !== (i = Ye.call(this._shortMonthsParse, a)) ? i : null : -1 !== (i = Ye.call(this._longMonthsParse, a)) ? i : null : "MMM" === t ? -1 !== (i = Ye.call(this._shortMonthsParse, a)) ? i : -1 !== (i = Ye.call(this._longMonthsParse, a)) ? i : null : -1 !== (i = Ye.call(this._longMonthsParse, a)) ? i : -1 !== (i = Ye.call(this._shortMonthsParse, a)) ? i : null;
    }.call(this, e, t, n);

    for (this._monthsParse || (this._monthsParse = [], this._longMonthsParse = [], this._shortMonthsParse = []), s = 0; s < 12; s++) {
      if (i = y([2e3, s]), n && !this._longMonthsParse[s] && (this._longMonthsParse[s] = new RegExp("^" + this.months(i, "").replace(".", "") + "$", "i"), this._shortMonthsParse[s] = new RegExp("^" + this.monthsShort(i, "").replace(".", "") + "$", "i")), n || this._monthsParse[s] || (r = "^" + this.months(i, "") + "|^" + this.monthsShort(i, ""), this._monthsParse[s] = new RegExp(r.replace(".", ""), "i")), n && "MMMM" === t && this._longMonthsParse[s].test(e)) return s;
      if (n && "MMM" === t && this._shortMonthsParse[s].test(e)) return s;
      if (!n && this._monthsParse[s].test(e)) return s;
    }
  }, hn.monthsRegex = function (e) {
    return this._monthsParseExact ? (m(this, "_monthsRegex") || Ne.call(this), e ? this._monthsStrictRegex : this._monthsRegex) : (m(this, "_monthsRegex") || (this._monthsRegex = Ue), this._monthsStrictRegex && e ? this._monthsStrictRegex : this._monthsRegex);
  }, hn.monthsShortRegex = function (e) {
    return this._monthsParseExact ? (m(this, "_monthsRegex") || Ne.call(this), e ? this._monthsShortStrictRegex : this._monthsShortRegex) : (m(this, "_monthsShortRegex") || (this._monthsShortRegex = Le), this._monthsShortStrictRegex && e ? this._monthsShortStrictRegex : this._monthsShortRegex);
  }, hn.week = function (e) {
    return Ie(e, this._week.dow, this._week.doy).week;
  }, hn.firstDayOfYear = function () {
    return this._week.doy;
  }, hn.firstDayOfWeek = function () {
    return this._week.dow;
  }, hn.weekdays = function (e, t) {
    return e ? o(this._weekdays) ? this._weekdays[e.day()] : this._weekdays[this._weekdays.isFormat.test(t) ? "format" : "standalone"][e.day()] : o(this._weekdays) ? this._weekdays : this._weekdays.standalone;
  }, hn.weekdaysMin = function (e) {
    return e ? this._weekdaysMin[e.day()] : this._weekdaysMin;
  }, hn.weekdaysShort = function (e) {
    return e ? this._weekdaysShort[e.day()] : this._weekdaysShort;
  }, hn.weekdaysParse = function (e, t, n) {
    var s, i, r;
    if (this._weekdaysParseExact) return function (e, t, n) {
      var s,
          i,
          r,
          a = e.toLocaleLowerCase();
      if (!this._weekdaysParse) for (this._weekdaysParse = [], this._shortWeekdaysParse = [], this._minWeekdaysParse = [], s = 0; s < 7; ++s) r = y([2e3, 1]).day(s), this._minWeekdaysParse[s] = this.weekdaysMin(r, "").toLocaleLowerCase(), this._shortWeekdaysParse[s] = this.weekdaysShort(r, "").toLocaleLowerCase(), this._weekdaysParse[s] = this.weekdays(r, "").toLocaleLowerCase();
      return n ? "dddd" === t ? -1 !== (i = Ye.call(this._weekdaysParse, a)) ? i : null : "ddd" === t ? -1 !== (i = Ye.call(this._shortWeekdaysParse, a)) ? i : null : -1 !== (i = Ye.call(this._minWeekdaysParse, a)) ? i : null : "dddd" === t ? -1 !== (i = Ye.call(this._weekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._shortWeekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._minWeekdaysParse, a)) ? i : null : "ddd" === t ? -1 !== (i = Ye.call(this._shortWeekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._weekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._minWeekdaysParse, a)) ? i : null : -1 !== (i = Ye.call(this._minWeekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._weekdaysParse, a)) ? i : -1 !== (i = Ye.call(this._shortWeekdaysParse, a)) ? i : null;
    }.call(this, e, t, n);

    for (this._weekdaysParse || (this._weekdaysParse = [], this._minWeekdaysParse = [], this._shortWeekdaysParse = [], this._fullWeekdaysParse = []), s = 0; s < 7; s++) {
      if (i = y([2e3, 1]).day(s), n && !this._fullWeekdaysParse[s] && (this._fullWeekdaysParse[s] = new RegExp("^" + this.weekdays(i, "").replace(".", "\\.?") + "$", "i"), this._shortWeekdaysParse[s] = new RegExp("^" + this.weekdaysShort(i, "").replace(".", "\\.?") + "$", "i"), this._minWeekdaysParse[s] = new RegExp("^" + this.weekdaysMin(i, "").replace(".", "\\.?") + "$", "i")), this._weekdaysParse[s] || (r = "^" + this.weekdays(i, "") + "|^" + this.weekdaysShort(i, "") + "|^" + this.weekdaysMin(i, ""), this._weekdaysParse[s] = new RegExp(r.replace(".", ""), "i")), n && "dddd" === t && this._fullWeekdaysParse[s].test(e)) return s;
      if (n && "ddd" === t && this._shortWeekdaysParse[s].test(e)) return s;
      if (n && "dd" === t && this._minWeekdaysParse[s].test(e)) return s;
      if (!n && this._weekdaysParse[s].test(e)) return s;
    }
  }, hn.weekdaysRegex = function (e) {
    return this._weekdaysParseExact ? (m(this, "_weekdaysRegex") || Be.call(this), e ? this._weekdaysStrictRegex : this._weekdaysRegex) : (m(this, "_weekdaysRegex") || (this._weekdaysRegex = $e), this._weekdaysStrictRegex && e ? this._weekdaysStrictRegex : this._weekdaysRegex);
  }, hn.weekdaysShortRegex = function (e) {
    return this._weekdaysParseExact ? (m(this, "_weekdaysRegex") || Be.call(this), e ? this._weekdaysShortStrictRegex : this._weekdaysShortRegex) : (m(this, "_weekdaysShortRegex") || (this._weekdaysShortRegex = qe), this._weekdaysShortStrictRegex && e ? this._weekdaysShortStrictRegex : this._weekdaysShortRegex);
  }, hn.weekdaysMinRegex = function (e) {
    return this._weekdaysParseExact ? (m(this, "_weekdaysRegex") || Be.call(this), e ? this._weekdaysMinStrictRegex : this._weekdaysMinRegex) : (m(this, "_weekdaysMinRegex") || (this._weekdaysMinRegex = Je), this._weekdaysMinStrictRegex && e ? this._weekdaysMinStrictRegex : this._weekdaysMinRegex);
  }, hn.isPM = function (e) {
    return "p" === (e + "").toLowerCase().charAt(0);
  }, hn.meridiem = function (e, t, n) {
    return 11 < e ? n ? "pm" : "PM" : n ? "am" : "AM";
  }, ot("en", {
    dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal: function (e) {
      var t = e % 10;
      return e + (1 === k(e % 100 / 10) ? "th" : 1 === t ? "st" : 2 === t ? "nd" : 3 === t ? "rd" : "th");
    }
  }), c.lang = n("moment.lang is deprecated. Use moment.locale instead.", ot), c.langData = n("moment.langData is deprecated. Use moment.localeData instead.", lt);
  var _n = Math.abs;

  function yn(e, t, n, s) {
    var i = At(t, n);
    return e._milliseconds += s * i._milliseconds, e._days += s * i._days, e._months += s * i._months, e._bubble();
  }

  function gn(e) {
    return e < 0 ? Math.floor(e) : Math.ceil(e);
  }

  function pn(e) {
    return 4800 * e / 146097;
  }

  function vn(e) {
    return 146097 * e / 4800;
  }

  function wn(e) {
    return function () {
      return this.as(e);
    };
  }

  var Mn = wn("ms"),
      Sn = wn("s"),
      Dn = wn("m"),
      kn = wn("h"),
      Yn = wn("d"),
      On = wn("w"),
      Tn = wn("M"),
      xn = wn("y");

  function bn(e) {
    return function () {
      return this.isValid() ? this._data[e] : NaN;
    };
  }

  var Pn = bn("milliseconds"),
      Wn = bn("seconds"),
      Hn = bn("minutes"),
      Rn = bn("hours"),
      Cn = bn("days"),
      Fn = bn("months"),
      Ln = bn("years");
  var Un = Math.round,
      Nn = {
    ss: 44,
    s: 45,
    m: 45,
    h: 22,
    d: 26,
    M: 11
  };
  var Gn = Math.abs;

  function Vn(e) {
    return (0 < e) - (e < 0) || +e;
  }

  function En() {
    if (!this.isValid()) return this.localeData().invalidDate();
    var e,
        t,
        n = Gn(this._milliseconds) / 1e3,
        s = Gn(this._days),
        i = Gn(this._months);
    t = D((e = D(n / 60)) / 60), n %= 60, e %= 60;
    var r = D(i / 12),
        a = i %= 12,
        o = s,
        u = t,
        l = e,
        d = n ? n.toFixed(3).replace(/\.?0+$/, "") : "",
        h = this.asSeconds();
    if (!h) return "P0D";

    var c = h < 0 ? "-" : "",
        f = Vn(this._months) !== Vn(h) ? "-" : "",
        m = Vn(this._days) !== Vn(h) ? "-" : "",
        _ = Vn(this._milliseconds) !== Vn(h) ? "-" : "";

    return c + "P" + (r ? f + r + "Y" : "") + (a ? f + a + "M" : "") + (o ? m + o + "D" : "") + (u || l || d ? "T" : "") + (u ? _ + u + "H" : "") + (l ? _ + l + "M" : "") + (d ? _ + d + "S" : "");
  }

  var In = Ht.prototype;
  return In.isValid = function () {
    return this._isValid;
  }, In.abs = function () {
    var e = this._data;
    return this._milliseconds = _n(this._milliseconds), this._days = _n(this._days), this._months = _n(this._months), e.milliseconds = _n(e.milliseconds), e.seconds = _n(e.seconds), e.minutes = _n(e.minutes), e.hours = _n(e.hours), e.months = _n(e.months), e.years = _n(e.years), this;
  }, In.add = function (e, t) {
    return yn(this, e, t, 1);
  }, In.subtract = function (e, t) {
    return yn(this, e, t, -1);
  }, In.as = function (e) {
    if (!this.isValid()) return NaN;
    var t,
        n,
        s = this._milliseconds;
    if ("month" === (e = R(e)) || "year" === e) return t = this._days + s / 864e5, n = this._months + pn(t), "month" === e ? n : n / 12;

    switch (t = this._days + Math.round(vn(this._months)), e) {
      case "week":
        return t / 7 + s / 6048e5;

      case "day":
        return t + s / 864e5;

      case "hour":
        return 24 * t + s / 36e5;

      case "minute":
        return 1440 * t + s / 6e4;

      case "second":
        return 86400 * t + s / 1e3;

      case "millisecond":
        return Math.floor(864e5 * t) + s;

      default:
        throw new Error("Unknown unit " + e);
    }
  }, In.asMilliseconds = Mn, In.asSeconds = Sn, In.asMinutes = Dn, In.asHours = kn, In.asDays = Yn, In.asWeeks = On, In.asMonths = Tn, In.asYears = xn, In.valueOf = function () {
    return this.isValid() ? this._milliseconds + 864e5 * this._days + this._months % 12 * 2592e6 + 31536e6 * k(this._months / 12) : NaN;
  }, In._bubble = function () {
    var e,
        t,
        n,
        s,
        i,
        r = this._milliseconds,
        a = this._days,
        o = this._months,
        u = this._data;
    return 0 <= r && 0 <= a && 0 <= o || r <= 0 && a <= 0 && o <= 0 || (r += 864e5 * gn(vn(o) + a), o = a = 0), u.milliseconds = r % 1e3, e = D(r / 1e3), u.seconds = e % 60, t = D(e / 60), u.minutes = t % 60, n = D(t / 60), u.hours = n % 24, o += i = D(pn(a += D(n / 24))), a -= gn(vn(i)), s = D(o / 12), o %= 12, u.days = a, u.months = o, u.years = s, this;
  }, In.clone = function () {
    return At(this);
  }, In.get = function (e) {
    return e = R(e), this.isValid() ? this[e + "s"]() : NaN;
  }, In.milliseconds = Pn, In.seconds = Wn, In.minutes = Hn, In.hours = Rn, In.days = Cn, In.weeks = function () {
    return D(this.days() / 7);
  }, In.months = Fn, In.years = Ln, In.humanize = function (e) {
    if (!this.isValid()) return this.localeData().invalidDate();
    var t,
        n,
        s,
        i,
        r,
        a,
        o,
        u,
        l,
        d,
        h,
        c = this.localeData(),
        f = (n = !e, s = c, i = At(t = this).abs(), r = Un(i.as("s")), a = Un(i.as("m")), o = Un(i.as("h")), u = Un(i.as("d")), l = Un(i.as("M")), d = Un(i.as("y")), (h = r <= Nn.ss && ["s", r] || r < Nn.s && ["ss", r] || a <= 1 && ["m"] || a < Nn.m && ["mm", a] || o <= 1 && ["h"] || o < Nn.h && ["hh", o] || u <= 1 && ["d"] || u < Nn.d && ["dd", u] || l <= 1 && ["M"] || l < Nn.M && ["MM", l] || d <= 1 && ["y"] || ["yy", d])[2] = n, h[3] = 0 < +t, h[4] = s, function (e, t, n, s, i) {
      return i.relativeTime(t || 1, !!n, e, s);
    }.apply(null, h));
    return e && (f = c.pastFuture(+this, f)), c.postformat(f);
  }, In.toISOString = En, In.toString = En, In.toJSON = En, In.locale = Qt, In.localeData = Kt, In.toIsoString = n("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)", En), In.lang = Xt, I("X", 0, 0, "unix"), I("x", 0, 0, "valueOf"), ue("x", se), ue("X", /[+-]?\d+(\.\d{1,3})?/), ce("X", function (e, t, n) {
    n._d = new Date(1e3 * parseFloat(e, 10));
  }), ce("x", function (e, t, n) {
    n._d = new Date(k(e));
  }), c.version = "2.22.2", e = Tt, c.fn = ln, c.min = function () {
    return Pt("isBefore", [].slice.call(arguments, 0));
  }, c.max = function () {
    return Pt("isAfter", [].slice.call(arguments, 0));
  }, c.now = function () {
    return Date.now ? Date.now() : +new Date();
  }, c.utc = y, c.unix = function (e) {
    return Tt(1e3 * e);
  }, c.months = function (e, t) {
    return fn(e, t, "months");
  }, c.isDate = h, c.locale = ot, c.invalid = v, c.duration = At, c.isMoment = S, c.weekdays = function (e, t, n) {
    return mn(e, t, n, "weekdays");
  }, c.parseZone = function () {
    return Tt.apply(null, arguments).parseZone();
  }, c.localeData = lt, c.isDuration = Rt, c.monthsShort = function (e, t) {
    return fn(e, t, "monthsShort");
  }, c.weekdaysMin = function (e, t, n) {
    return mn(e, t, n, "weekdaysMin");
  }, c.defineLocale = ut, c.updateLocale = function (e, t) {
    if (null != t) {
      var n,
          s,
          i = nt;
      null != (s = at(e)) && (i = s._config), (n = new P(t = b(i, t))).parentLocale = st[e], st[e] = n, ot(e);
    } else null != st[e] && (null != st[e].parentLocale ? st[e] = st[e].parentLocale : null != st[e] && delete st[e]);

    return st[e];
  }, c.locales = function () {
    return s(st);
  }, c.weekdaysShort = function (e, t, n) {
    return mn(e, t, n, "weekdaysShort");
  }, c.normalizeUnits = R, c.relativeTimeRounding = function (e) {
    return void 0 === e ? Un : "function" == typeof e && (Un = e, !0);
  }, c.relativeTimeThreshold = function (e, t) {
    return void 0 !== Nn[e] && (void 0 === t ? Nn[e] : (Nn[e] = t, "s" === e && (Nn.ss = t - 1), !0));
  }, c.calendarFormat = function (e, t) {
    var n = e.diff(t, "days", !0);
    return n < -6 ? "sameElse" : n < -1 ? "lastWeek" : n < 0 ? "lastDay" : n < 1 ? "sameDay" : n < 2 ? "nextDay" : n < 7 ? "nextWeek" : "sameElse";
  }, c.prototype = ln, c.HTML5_FMT = {
    DATETIME_LOCAL: "YYYY-MM-DDTHH:mm",
    DATETIME_LOCAL_SECONDS: "YYYY-MM-DDTHH:mm:ss",
    DATETIME_LOCAL_MS: "YYYY-MM-DDTHH:mm:ss.SSS",
    DATE: "YYYY-MM-DD",
    TIME: "HH:mm",
    TIME_SECONDS: "HH:mm:ss",
    TIME_MS: "HH:mm:ss.SSS",
    WEEK: "YYYY-[W]WW",
    MONTH: "YYYY-MM"
  }, c;
});
/**
 * Register service worker
 */
registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register('/sw.js').then(reg => {
    if (!navigator.serviceWorker.controller) return;

    if (reg.waiting) {
      updateReady(reg.waiting);
      return;
    }

    if (reg.installing) {
      trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
  });
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
};

updateReady = worker => {
  const toast = Toast.create({
    text: "New version available.",
    button: "Refresh",
    callback: event => {
      event.preventDefault();
      worker.postMessage({
        action: 'skipWaiting'
      });
    }
  });
};

trackInstalling = worker => {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      updateReady(worker);
    }
  });
};
/**
 * @author https://github.com/AlexKvazos/VanillaToasts/blob/master/vanillatoasts.js
 */
(function (root, factory) {
  try {
    // commonjs
    if (typeof exports === 'object') {
      module.exports = factory(); // global
    } else {
      root.Toast = factory();
    }
  } catch (error) {
    console.log('Isomorphic compatibility is not supported at this time for Toast.');
  }
})(this, function () {
  // We need DOM to be ready
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  } // Create Toast object


  Toast = {
    // In case toast creation is attempted before dom has finished loading!
    create: function () {
      console.error(['DOM has not finished loading.', '\tInvoke create method when DOM\s readyState is complete'].join('\n'));
    },
    //function to manually set timeout after create
    setTimeout: function () {
      console.error(['DOM has not finished loading.', '\tInvoke create method when DOM\s readyState is complete'].join('\n'));
    },
    toasts: {} //store toasts to modify later

  };
  var autoincrement = 0; // Initialize library

  function init() {
    // Toast container
    var container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container); // @Override
    // Replace create method when DOM has finished loading

    Toast.create = function (options) {
      var toast = document.createElement('div');
      toast.id = ++autoincrement;
      toast.id = 'toast-' + toast.id;
      toast.className = 'toast'; // title

      if (options.title) {
        var h4 = document.createElement('h4');
        h4.className = 'toast-title';
        h4.innerHTML = options.title;
        toast.appendChild(h4);
      } // text


      if (options.text) {
        var p = document.createElement('p');
        p.className = 'toast-text';
        p.innerHTML = options.text;
        toast.appendChild(p);
      } // icon


      if (options.icon) {
        var img = document.createElement('img');
        img.src = options.icon;
        img.className = 'toast-icon';
        toast.appendChild(img);
      } // button


      if (options.button) {
        var button = document.createElement('button');
        button.className = 'toast-button';
        button.innerHTML = options.button;
        toast.appendChild(button);
      } // click callback


      if (typeof options.callback === 'function') {
        toast.addEventListener('click', options.callback);
      } // toast api


      toast.hide = function () {
        toast.className += ' toast-fadeout';
        toast.addEventListener('animationend', removeToast, false);
      }; // autohide


      if (options.timeout) {
        setTimeout(toast.hide, options.timeout);
      }

      if (options.type) {
        toast.className += ' toast-' + options.type;
      }

      toast.addEventListener('click', toast.hide);

      function removeToast() {
        document.getElementById('toast-container').removeChild(toast);
        delete Toast.toasts[toast.id]; //remove toast from object
      }

      document.getElementById('toast-container').appendChild(toast); //add toast to object so its easily gettable by its id

      Toast.toasts[toast.id] = toast;
      return toast;
    };
    /*
    custom function to manually initiate timeout of
    the toast.  Useful if toast is created as persistant
    because we don't want it to start to timeout until
    we tell it to
    */


    Toast.setTimeout = function (toastid, val) {
      if (Toast.toasts[toastid]) {
        setTimeout(Toast.toasts[toastid].hide, val);
      }
    };
  }

  return Toast;
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyLmpzIiwiaWRiLmpzIiwibW9tZW50Lm1pbi5qcyIsInNlcnZpY2Utd29ya2VyLmpzIiwidG9hc3QuanMiXSwibmFtZXMiOlsiREJIZWxwZXIiLCJmZXRjaFJlc3RhdXJhbnRzIiwiY2FsbGJhY2siLCJvcGVuRGF0YWJhc2UiLCJ0aGVuIiwiZGIiLCJzdG9yZSIsInRyYW5zYWN0aW9uIiwib2JqZWN0U3RvcmUiLCJnZXRBbGwiLCJyZXN0YXVyYW50cyIsImxlbmd0aCIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiZm9yRWFjaCIsInJlc3RhdXJhbnQiLCJwdXQiLCJjYXRjaCIsImVycm9yIiwiZmV0Y2hSZXN0YXVyYW50QnlJZCIsImlkIiwicGFyc2VJbnQiLCJnZXQiLCJmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUiLCJjdWlzaW5lIiwicmVzdWx0cyIsImZpbHRlciIsInIiLCJjdWlzaW5lX3R5cGUiLCJmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZCIsIm5laWdoYm9yaG9vZCIsImZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZCIsImZldGNoTmVpZ2hib3Job29kcyIsIm5laWdoYm9yaG9vZHMiLCJtYXAiLCJ2IiwiaSIsInVuaXF1ZU5laWdoYm9yaG9vZHMiLCJpbmRleE9mIiwiZmV0Y2hDdWlzaW5lcyIsImN1aXNpbmVzIiwidW5pcXVlQ3Vpc2luZXMiLCJ1cmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VVcmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VOYW1lRm9yUmVzdGF1cmFudCIsInBob3RvZ3JhcGgiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50IiwibWFya2VyIiwiTCIsImxhdGxuZyIsImxhdCIsImxuZyIsInRpdGxlIiwibmFtZSIsImFsdCIsInVybCIsImFkZFRvIiwibmV3TWFwIiwidXBkYXRlUmVzdGF1cmFudFJldmlld3MiLCJzeW5jUmV2aWV3cyIsInJldmlld3MiLCJyZXZpZXciLCJzeW5jZWQiLCJzeW5jUmV2aWV3IiwicmVzdGF1cmFudF9pZCIsIm1ldGhvZCIsImhlYWRlcnMiLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsInJhdGluZyIsImNvbW1lbnRzIiwiaW1hZ2VVcmxCYXNlUGF0aCIsIm5hdmlnYXRvciIsInNlcnZpY2VXb3JrZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsImlkYiIsIm9wZW4iLCJ1cGdyYWRlREIiLCJjcmVhdGVPYmplY3RTdG9yZSIsInRvQXJyYXkiLCJhcnIiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsInByb21pc2lmeVJlcXVlc3QiLCJyZXF1ZXN0IiwicmVqZWN0Iiwib25zdWNjZXNzIiwicmVzdWx0Iiwib25lcnJvciIsInByb21pc2lmeVJlcXVlc3RDYWxsIiwib2JqIiwiYXJncyIsInAiLCJhcHBseSIsInByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsIiwidmFsdWUiLCJDdXJzb3IiLCJwcm94eVByb3BlcnRpZXMiLCJQcm94eUNsYXNzIiwidGFyZ2V0UHJvcCIsInByb3BlcnRpZXMiLCJwcm9wIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJzZXQiLCJ2YWwiLCJwcm94eVJlcXVlc3RNZXRob2RzIiwiQ29uc3RydWN0b3IiLCJhcmd1bWVudHMiLCJwcm94eU1ldGhvZHMiLCJwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzIiwiSW5kZXgiLCJpbmRleCIsIl9pbmRleCIsIklEQkluZGV4IiwiY3Vyc29yIiwiX2N1cnNvciIsIl9yZXF1ZXN0IiwiSURCQ3Vyc29yIiwibWV0aG9kTmFtZSIsIk9iamVjdFN0b3JlIiwiX3N0b3JlIiwiY3JlYXRlSW5kZXgiLCJJREJPYmplY3RTdG9yZSIsIlRyYW5zYWN0aW9uIiwiaWRiVHJhbnNhY3Rpb24iLCJfdHgiLCJjb21wbGV0ZSIsIm9uY29tcGxldGUiLCJvbmFib3J0IiwiSURCVHJhbnNhY3Rpb24iLCJVcGdyYWRlREIiLCJvbGRWZXJzaW9uIiwiX2RiIiwiSURCRGF0YWJhc2UiLCJEQiIsImZ1bmNOYW1lIiwicmVwbGFjZSIsIm5hdGl2ZU9iamVjdCIsInF1ZXJ5IiwiY291bnQiLCJpbnN0YW5jZSIsIml0ZW1zIiwiaXRlcmF0ZUN1cnNvciIsInB1c2giLCJ1bmRlZmluZWQiLCJjb250aW51ZSIsImV4cCIsInZlcnNpb24iLCJ1cGdyYWRlQ2FsbGJhY2siLCJpbmRleGVkREIiLCJvbnVwZ3JhZGVuZWVkZWQiLCJldmVudCIsImRlbGV0ZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJkZWZhdWx0Iiwic2VsZiIsImUiLCJ0IiwiZGVmaW5lIiwiYW1kIiwibW9tZW50IiwiYyIsIm8iLCJ0b1N0cmluZyIsInUiLCJsIiwiZCIsImgiLCJEYXRlIiwiZiIsIm4iLCJzIiwibSIsImhhc093blByb3BlcnR5IiwiXyIsInZhbHVlT2YiLCJ5IiwiT3QiLCJ1dGMiLCJnIiwiX3BmIiwiZW1wdHkiLCJ1bnVzZWRUb2tlbnMiLCJ1bnVzZWRJbnB1dCIsIm92ZXJmbG93IiwiY2hhcnNMZWZ0T3ZlciIsIm51bGxJbnB1dCIsImludmFsaWRNb250aCIsImludmFsaWRGb3JtYXQiLCJ1c2VySW52YWxpZGF0ZWQiLCJpc28iLCJwYXJzZWREYXRlUGFydHMiLCJtZXJpZGllbSIsInJmYzI4MjIiLCJ3ZWVrZGF5TWlzbWF0Y2giLCJfaXNWYWxpZCIsImlzTmFOIiwiX2QiLCJnZXRUaW1lIiwiaW52YWxpZFdlZWtkYXkiLCJfc3RyaWN0IiwiYmlnSG91ciIsImlzRnJvemVuIiwiTmFOIiwic29tZSIsIm1vbWVudFByb3BlcnRpZXMiLCJ3IiwiX2lzQU1vbWVudE9iamVjdCIsIl9pIiwiX2YiLCJfbCIsIl90em0iLCJfaXNVVEMiLCJfb2Zmc2V0IiwiX2xvY2FsZSIsIk0iLCJpc1ZhbGlkIiwidXBkYXRlT2Zmc2V0IiwiUyIsIkQiLCJNYXRoIiwiY2VpbCIsImZsb29yIiwiayIsImlzRmluaXRlIiwiYSIsIm1pbiIsImFicyIsIlkiLCJzdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MiLCJjb25zb2xlIiwid2FybiIsImRlcHJlY2F0aW9uSGFuZGxlciIsImpvaW4iLCJFcnJvciIsInN0YWNrIiwiTyIsIlQiLCJ4IiwiRnVuY3Rpb24iLCJiIiwiUCIsImtleXMiLCJXIiwiSCIsInRvTG93ZXJDYXNlIiwiUiIsIkMiLCJGIiwiVSIsInBvdyIsIm1heCIsInN1YnN0ciIsIk4iLCJHIiwiViIsIkUiLCJJIiwibG9jYWxlRGF0YSIsIm9yZGluYWwiLCJBIiwiaiIsIm1hdGNoIiwiaW52YWxpZERhdGUiLCJsb25nRGF0ZUZvcm1hdCIsImxhc3RJbmRleCIsInRlc3QiLCJaIiwieiIsIiQiLCJxIiwiSiIsIkIiLCJRIiwiWCIsIksiLCJlZSIsInRlIiwibmUiLCJzZSIsImllIiwicmUiLCJhZSIsIm9lIiwidWUiLCJsZSIsIlJlZ0V4cCIsImRlIiwiaGUiLCJjZSIsImZlIiwiX3ciLCJtZSIsIl9lIiwieWUiLCJnZSIsInBlIiwidmUiLCJ3ZSIsIk1lIiwiU2UiLCJEZSIsImtlIiwieWVhciIsInBhcnNlVHdvRGlnaXRZZWFyIiwiWWUiLCJPZSIsIlRlIiwiYmUiLCJ4ZSIsIm1vbnRoIiwiZGF0ZSIsIlBlIiwibW9udGhzU2hvcnQiLCJtb250aHMiLCJtb250aHNTaG9ydFJlZ2V4IiwibW9udGhzUmVnZXgiLCJtb250aHNQYXJzZSIsIldlIiwiSGUiLCJzcGxpdCIsIlJlIiwiQ2UiLCJGZSIsIkxlIiwiVWUiLCJOZSIsInNvcnQiLCJfbW9udGhzUmVnZXgiLCJfbW9udGhzU2hvcnRSZWdleCIsIl9tb250aHNTdHJpY3RSZWdleCIsIl9tb250aHNTaG9ydFN0cmljdFJlZ2V4IiwiR2UiLCJVVEMiLCJnZXRVVENGdWxsWWVhciIsInNldFVUQ0Z1bGxZZWFyIiwiVmUiLCJnZXRVVENEYXkiLCJFZSIsImRheU9mWWVhciIsIkllIiwiQWUiLCJ3ZWVrIiwid2Vla2RheXNNaW4iLCJ3ZWVrZGF5c1Nob3J0Iiwid2Vla2RheXMiLCJ3ZWVrZGF5c01pblJlZ2V4Iiwid2Vla2RheXNTaG9ydFJlZ2V4Iiwid2Vla2RheXNSZWdleCIsIndlZWtkYXlzUGFyc2UiLCJqZSIsIlplIiwiemUiLCIkZSIsInFlIiwiSmUiLCJCZSIsImRheSIsIl93ZWVrZGF5c1JlZ2V4IiwiX3dlZWtkYXlzU2hvcnRSZWdleCIsIl93ZWVrZGF5c01pblJlZ2V4IiwiX3dlZWtkYXlzU3RyaWN0UmVnZXgiLCJfd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4IiwiX3dlZWtkYXlzTWluU3RyaWN0UmVnZXgiLCJRZSIsImhvdXJzIiwiWGUiLCJtaW51dGVzIiwiS2UiLCJfbWVyaWRpZW1QYXJzZSIsInNlY29uZHMiLCJfaXNQbSIsImlzUE0iLCJfbWVyaWRpZW0iLCJldCIsInR0IiwibnQiLCJjYWxlbmRhciIsInNhbWVEYXkiLCJuZXh0RGF5IiwibmV4dFdlZWsiLCJsYXN0RGF5IiwibGFzdFdlZWsiLCJzYW1lRWxzZSIsIkxUUyIsIkxUIiwiTEwiLCJMTEwiLCJMTExMIiwiZGF5T2ZNb250aE9yZGluYWxQYXJzZSIsInJlbGF0aXZlVGltZSIsImZ1dHVyZSIsInBhc3QiLCJzcyIsIm1tIiwiaGgiLCJkZCIsIk1NIiwieXkiLCJkb3ciLCJkb3kiLCJtZXJpZGllbVBhcnNlIiwic3QiLCJpdCIsInJ0IiwiYXQiLCJfYWJiciIsInJlcXVpcmUiLCJvdCIsImx0IiwidXQiLCJhYmJyIiwiX2NvbmZpZyIsInBhcmVudExvY2FsZSIsImNvbmZpZyIsImR0IiwiX2EiLCJfb3ZlcmZsb3dEYXlPZlllYXIiLCJfb3ZlcmZsb3dXZWVrcyIsIl9vdmVyZmxvd1dlZWtkYXkiLCJodCIsImN0Iiwibm93IiwiX3VzZVVUQyIsImdldFVUQ01vbnRoIiwiZ2V0VVRDRGF0ZSIsImdldEZ1bGxZZWFyIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiR0ciLCJUdCIsIl93ZWVrIiwiZ2ciLCJfZGF5T2ZZZWFyIiwiX25leHREYXkiLCJzZXRGdWxsWWVhciIsImdldERheSIsInNldFVUQ01pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwiZnQiLCJtdCIsIl90IiwieXQiLCJndCIsInB0IiwidnQiLCJleGVjIiwia3QiLCJ3dCIsIk10IiwiU3QiLCJVVCIsIkdNVCIsIkVEVCIsIkVTVCIsIkNEVCIsIkNTVCIsIk1EVCIsIk1TVCIsIlBEVCIsIlBTVCIsIkR0IiwiSVNPXzg2MDEiLCJSRkNfMjgyMiIsIm1lcmlkaWVtSG91ciIsIll0IiwicHJlcGFyc2UiLCJzY29yZSIsImNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrIiwiaG91ciIsIm1pbnV0ZSIsInNlY29uZCIsIm1pbGxpc2Vjb25kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImFkZCIsInh0IiwiYnQiLCJQdCIsIld0IiwiSHQiLCJxdWFydGVyIiwicGFyc2VGbG9hdCIsIl9taWxsaXNlY29uZHMiLCJfZGF5cyIsIl9tb250aHMiLCJfZGF0YSIsIl9idWJibGUiLCJSdCIsIkN0Iiwicm91bmQiLCJGdCIsInV0Y09mZnNldCIsIlV0IiwiTHQiLCJOdCIsImNsb25lIiwic2V0VGltZSIsImxvY2FsIiwiR3QiLCJnZXRUaW1lem9uZU9mZnNldCIsIlZ0IiwiRXQiLCJJdCIsIkF0IiwibXMiLCJtaWxsaXNlY29uZHMiLCJqdCIsImlzQmVmb3JlIiwiWnQiLCJmcm9tIiwidG8iLCJpc0FmdGVyIiwienQiLCIkdCIsImZuIiwiaW52YWxpZCIsInF0IiwiSnQiLCJCdCIsIlF0IiwiZGVmYXVsdEZvcm1hdCIsImRlZmF1bHRGb3JtYXRVdGMiLCJYdCIsImxvY2FsZSIsIkt0IiwiZW4iLCJ0biIsIndlZWtZZWFyIiwiaXNvV2Vla1llYXIiLCJfZGF5T2ZNb250aE9yZGluYWxQYXJzZSIsIl9vcmRpbmFsUGFyc2UiLCJfZGF5T2ZNb250aE9yZGluYWxQYXJzZUxlbmllbnQiLCJubiIsInNuIiwicm4iLCJhbiIsIm9uIiwidW4iLCJsbiIsImRuIiwic3RhcnRPZiIsImNhbGVuZGFyRm9ybWF0IiwiZm9ybWF0IiwiZGlmZiIsImVuZE9mIiwic3VidHJhY3QiLCJpc1V0YyIsInBvc3Rmb3JtYXQiLCJodW1hbml6ZSIsImZyb21Ob3ciLCJ0b05vdyIsImludmFsaWRBdCIsImlzQmV0d2VlbiIsImlzU2FtZSIsImlzU2FtZU9yQWZ0ZXIiLCJpc1NhbWVPckJlZm9yZSIsImxhbmciLCJwYXJzaW5nRmxhZ3MiLCJ1bml0IiwicHJpb3JpdHkiLCJ3ZWVrZGF5IiwiaXNvV2Vla2RheSIsInRvT2JqZWN0IiwieWVhcnMiLCJ0b0RhdGUiLCJ0b0lTT1N0cmluZyIsImluc3BlY3QiLCJpc0xvY2FsIiwidG9KU09OIiwidW5peCIsImNyZWF0aW9uRGF0YSIsImlucHV0IiwiaXNVVEMiLCJzdHJpY3QiLCJpc0xlYXBZZWFyIiwiaXNvV2VlayIsInF1YXJ0ZXJzIiwiZGF5c0luTW9udGgiLCJ3ZWVrcyIsImlzb1dlZWtzIiwid2Vla3NJblllYXIiLCJpc29XZWVrc0luWWVhciIsImRheXMiLCJfY2hhbmdlSW5Qcm9ncmVzcyIsInBhcnNlWm9uZSIsImhhc0FsaWduZWRIb3VyT2Zmc2V0IiwiaXNEU1QiLCJpc1V0Y09mZnNldCIsInpvbmVBYmJyIiwiem9uZU5hbWUiLCJkYXRlcyIsInpvbmUiLCJpc0RTVFNoaWZ0ZWQiLCJfaXNEU1RTaGlmdGVkIiwiaG4iLCJjbiIsIm1uIiwiX2NhbGVuZGFyIiwiX2xvbmdEYXRlRm9ybWF0IiwidG9VcHBlckNhc2UiLCJfaW52YWxpZERhdGUiLCJfb3JkaW5hbCIsIl9yZWxhdGl2ZVRpbWUiLCJwYXN0RnV0dXJlIiwic291cmNlIiwiaXNGb3JtYXQiLCJzdGFuZGFsb25lIiwiX21vbnRoc1Nob3J0IiwiX21vbnRoc1BhcnNlRXhhY3QiLCJ0b0xvY2FsZUxvd2VyQ2FzZSIsIl9tb250aHNQYXJzZSIsIl9sb25nTW9udGhzUGFyc2UiLCJfc2hvcnRNb250aHNQYXJzZSIsImZpcnN0RGF5T2ZZZWFyIiwiZmlyc3REYXlPZldlZWsiLCJfd2Vla2RheXMiLCJfd2Vla2RheXNNaW4iLCJfd2Vla2RheXNTaG9ydCIsIl93ZWVrZGF5c1BhcnNlRXhhY3QiLCJfd2Vla2RheXNQYXJzZSIsIl9zaG9ydFdlZWtkYXlzUGFyc2UiLCJfbWluV2Vla2RheXNQYXJzZSIsIl9mdWxsV2Vla2RheXNQYXJzZSIsImNoYXJBdCIsImxhbmdEYXRhIiwiX24iLCJ5biIsImduIiwicG4iLCJ2biIsInduIiwiYXMiLCJNbiIsIlNuIiwiRG4iLCJrbiIsIlluIiwiT24iLCJUbiIsInhuIiwiYm4iLCJQbiIsIlduIiwiSG4iLCJSbiIsIkNuIiwiRm4iLCJMbiIsIlVuIiwiTm4iLCJHbiIsIlZuIiwiRW4iLCJ0b0ZpeGVkIiwiYXNTZWNvbmRzIiwiSW4iLCJhc01pbGxpc2Vjb25kcyIsImFzTWludXRlcyIsImFzSG91cnMiLCJhc0RheXMiLCJhc1dlZWtzIiwiYXNNb250aHMiLCJhc1llYXJzIiwidG9Jc29TdHJpbmciLCJpc0RhdGUiLCJkdXJhdGlvbiIsImlzTW9tZW50IiwiaXNEdXJhdGlvbiIsImRlZmluZUxvY2FsZSIsInVwZGF0ZUxvY2FsZSIsImxvY2FsZXMiLCJub3JtYWxpemVVbml0cyIsInJlbGF0aXZlVGltZVJvdW5kaW5nIiwicmVsYXRpdmVUaW1lVGhyZXNob2xkIiwiSFRNTDVfRk1UIiwiREFURVRJTUVfTE9DQUwiLCJEQVRFVElNRV9MT0NBTF9TRUNPTkRTIiwiREFURVRJTUVfTE9DQUxfTVMiLCJEQVRFIiwiVElNRSIsIlRJTUVfU0VDT05EUyIsIlRJTUVfTVMiLCJXRUVLIiwiTU9OVEgiLCJyZWdpc3RlclNlcnZpY2VXb3JrZXIiLCJyZWdpc3RlciIsInJlZyIsImNvbnRyb2xsZXIiLCJ3YWl0aW5nIiwidXBkYXRlUmVhZHkiLCJpbnN0YWxsaW5nIiwidHJhY2tJbnN0YWxsaW5nIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlZnJlc2hpbmciLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIndvcmtlciIsInRvYXN0IiwiVG9hc3QiLCJjcmVhdGUiLCJ0ZXh0IiwiYnV0dG9uIiwicHJldmVudERlZmF1bHQiLCJwb3N0TWVzc2FnZSIsImFjdGlvbiIsInN0YXRlIiwicm9vdCIsImZhY3RvcnkiLCJsb2ciLCJkb2N1bWVudCIsInJlYWR5U3RhdGUiLCJpbml0Iiwic2V0VGltZW91dCIsInRvYXN0cyIsImF1dG9pbmNyZW1lbnQiLCJjb250YWluZXIiLCJjcmVhdGVFbGVtZW50IiwiYXBwZW5kQ2hpbGQiLCJvcHRpb25zIiwiY2xhc3NOYW1lIiwiaDQiLCJpbm5lckhUTUwiLCJpY29uIiwiaW1nIiwic3JjIiwiaGlkZSIsInJlbW92ZVRvYXN0IiwidGltZW91dCIsInR5cGUiLCJnZXRFbGVtZW50QnlJZCIsInJlbW92ZUNoaWxkIiwidG9hc3RpZCJdLCJtYXBwaW5ncyI6IkFBQUE7OztBQUdBLE1BQU1BLFFBQU4sQ0FBZTtBQUViOzs7QUFHQSxTQUFPQyxnQkFBUCxDQUF3QkMsUUFBeEIsRUFBa0M7QUFDaENDLElBQUFBLFlBQVksR0FBR0MsSUFBZixDQUFvQkMsRUFBRSxJQUFJO0FBQ3hCLFVBQUlDLEtBQUssR0FBR0QsRUFBRSxDQUFDRSxXQUFILENBQWUsYUFBZixFQUE4QkMsV0FBOUIsQ0FBMEMsYUFBMUMsQ0FBWjtBQUNBRixNQUFBQSxLQUFLLENBQUNHLE1BQU4sR0FBZUwsSUFBZixDQUFvQk0sV0FBVyxJQUFJO0FBQ2pDLFlBQUlBLFdBQVcsQ0FBQ0MsTUFBWixJQUFzQixDQUExQixFQUE2QjtBQUMzQkMsVUFBQUEsS0FBSyxDQUFDLG1DQUFELENBQUwsQ0FDQ1IsSUFERCxDQUNNUyxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsSUFBVCxFQURsQixFQUVDVixJQUZELENBRU1NLFdBQVcsSUFBSTtBQUNuQixnQkFBSUEsV0FBSixFQUFpQjtBQUNmSixjQUFBQSxLQUFLLEdBQUdELEVBQUUsQ0FBQ0UsV0FBSCxDQUFlLGFBQWYsRUFBOEIsV0FBOUIsRUFBMkNDLFdBQTNDLENBQXVELGFBQXZELENBQVI7QUFDQUUsY0FBQUEsV0FBVyxDQUFDSyxPQUFaLENBQW9CQyxVQUFVLElBQUk7QUFDaENWLGdCQUFBQSxLQUFLLENBQUNXLEdBQU4sQ0FBVUQsVUFBVixFQUFzQkEsVUFBVSxDQUFDLElBQUQsQ0FBaEM7QUFDRCxlQUZEO0FBR0FkLGNBQUFBLFFBQVEsQ0FBQyxJQUFELEVBQU9RLFdB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QVlELE9BQU8sQ0FBQ1UsSUFBdkM7QUFDRDs7QUFFRC9CLE1BQUFBLEtBQUssQ0FBQ04sZ0JBQU4sQ0FBdUIsT0FBdkIsRUFBZ0NNLEtBQUssQ0FBQzRCLElBQXRDOztBQUdBLGVBQVNDLFdBQVQsR0FBdUI7QUFDckJqQixRQUFBQSxRQUFRLENBQUNvQixjQUFULENBQXdCLGlCQUF4QixFQUEyQ0MsV0FBM0MsQ0FBdURqQyxLQUF2RDtBQUNBLGVBQU9DLEtBQUssQ0FBQ2UsTUFBTixDQUFhaEIsS0FBSyxDQUFDNXFCLEVBQW5CLENBQVAsQ0FGcUIsQ0FFVztBQUNqQzs7QUFFRHdyQixNQUFBQSxRQUFRLENBQUNvQixjQUFULENBQXdCLGlCQUF4QixFQUEyQ1osV0FBM0MsQ0FBdURwQixLQUF2RCxFQWxFK0IsQ0FvRS9COztBQUNBQyxNQUFBQSxLQUFLLENBQUNlLE1BQU4sQ0FBYWhCLEtBQUssQ0FBQzVxQixFQUFuQixJQUF5QjRxQixLQUF6QjtBQUVBLGFBQU9BLEtBQVA7QUFDRCxLQXhFRDtBQTBFQTs7Ozs7Ozs7QUFNQUMsSUFBQUEsS0FBSyxDQUFDYyxVQUFOLEdBQW1CLFVBQVNtQixPQUFULEVBQWtCcm5CLEdBQWxCLEVBQXVCO0FBQ3hDLFVBQUdvbEIsS0FBSyxDQUFDZSxNQUFOLENBQWFrQixPQUFiLENBQUgsRUFBeUI7QUFDdkJuQixRQUFBQSxVQUFVLENBQUNkLEtBQUssQ0FBQ2UsTUFBTixDQUFha0IsT0FBYixFQUFzQk4sSUFBdkIsRUFBNkIvbUIsR0FBN0IsQ0FBVjtBQUNEO0FBQ0YsS0FKRDtBQUtEOztBQUVELFNBQU9vbEIsS0FBUDtBQUVELENBM0lEIiwiZmlsZSI6ImxpYnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ29tbW9uIGRhdGFiYXNlIGhlbHBlciBmdW5jdGlvbnMuXHJcbiAqL1xyXG5jbGFzcyBEQkhlbHBlciB7XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCByZXN0YXVyYW50cy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50cyhjYWxsYmFjaykge1xyXG4gICAgb3BlbkRhdGFiYXNlKCkudGhlbihkYiA9PiB7XHJcbiAgICAgIGxldCBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICBzdG9yZS5nZXRBbGwoKS50aGVuKHJlc3RhdXJhbnRzID0+IHtcclxuICAgICAgICBpZiAocmVzdGF1cmFudHMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgIGZldGNoKFwiaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jlc3RhdXJhbnRzXCIpXHJcbiAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAudGhlbihyZXN0YXVyYW50cyA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXN0YXVyYW50cykge1xyXG4gICAgICAgICAgICAgIHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICAgICAgICAgIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5wdXQocmVzdGF1cmFudCwgcmVzdGF1cmFudFsnaWQnXSlcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBmZXRjaCBhbGwgcmVzdGF1cmFudHMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQpO1xyXG4gICAgICBzdG9yZS5nZXQoaWQpLnRoZW4ocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgICBmZXRjaChgaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jlc3RhdXJhbnRzLyR7aWR9YClcclxuICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgIC50aGVuKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzdGF1cmFudCkge1xyXG4gICAgICAgICAgICAgIHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICAgICAgICAgIHN0b3JlLnB1dChyZXN0YXVyYW50LCBpZCk7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgXCJSZXN0YXVyYW50IGRvZXMgbm90IGV4aXN0XCIpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSB0eXBlIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUoY3Vpc2luZSwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50cyAgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRmlsdGVyIHJlc3RhdXJhbnRzIHRvIGhhdmUgb25seSBnaXZlbiBjdWlzaW5lIHR5cGVcclxuICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzdGF1cmFudHMuZmlsdGVyKHIgPT4gci5jdWlzaW5lX3R5cGUgPT0gY3Vpc2luZSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggcmVzdGF1cmFudHMgYnkgYSBuZWlnaGJvcmhvb2Qgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5TmVpZ2hib3Job29kKG5laWdoYm9yaG9vZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBGaWx0ZXIgcmVzdGF1cmFudHMgdG8gaGF2ZSBvbmx5IGdpdmVuIG5laWdoYm9yaG9vZFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXN0YXVyYW50cy5maWx0ZXIociA9PiByLm5laWdoYm9yaG9vZCA9PSBuZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSBhbmQgYSBuZWlnaGJvcmhvb2Qgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdHMgPSByZXN0YXVyYW50c1xyXG4gICAgICAgIGlmIChjdWlzaW5lICE9ICdhbGwnKSB7IC8vIGZpbHRlciBieSBjdWlzaW5lXHJcbiAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIociA9PiByLmN1aXNpbmVfdHlwZSA9PSBjdWlzaW5lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm9yaG9vZCAhPSAnYWxsJykgeyAvLyBmaWx0ZXIgYnkgbmVpZ2hib3Job29kXHJcbiAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIociA9PiByLm5laWdoYm9yaG9vZCA9PSBuZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgbmVpZ2hib3Job29kcyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hOZWlnaGJvcmhvb2RzKGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBuZWlnaGJvcmhvb2RzIGZyb20gYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgY29uc3QgbmVpZ2hib3Job29kcyA9IHJlc3RhdXJhbnRzLm1hcCgodiwgaSkgPT4gcmVzdGF1cmFudHNbaV0ubmVpZ2hib3Job29kKVxyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gbmVpZ2hib3Job29kc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZU5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzLmZpbHRlcigodiwgaSkgPT4gbmVpZ2hib3Job29kcy5pbmRleE9mKHYpID09IGkpXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlTmVpZ2hib3Job29kcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIGN1aXNpbmVzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaEN1aXNpbmVzKGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBjdWlzaW5lcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIGNvbnN0IGN1aXNpbmVzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5jdWlzaW5lX3R5cGUpXHJcbiAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBjdWlzaW5lc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZUN1aXNpbmVzID0gY3Vpc2luZXMuZmlsdGVyKCh2LCBpKSA9PiBjdWlzaW5lcy5pbmRleE9mKHYpID09IGkpXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlQ3Vpc2luZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC9pbWcvJHtEQkhlbHBlci5pbWFnZU5hbWVGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfS1zbWFsbC5qcGdgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgaW1hZ2UgbmFtZS5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VOYW1lRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICBpZiAocmVzdGF1cmFudC5waG90b2dyYXBoKVxyXG4gICAgICByZXR1cm4gcmVzdGF1cmFudC5waG90b2dyYXBoO1xyXG4gICAgcmV0dXJuICdkZWZhdWx0JztcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBNYXAgbWFya2VyIGZvciBhIHJlc3RhdXJhbnQuXHJcbiAgICovXHJcbiAgIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgLy8gaHR0cHM6Ly9sZWFmbGV0anMuY29tL3JlZmVyZW5jZS0xLjMuMC5odG1sI21hcmtlciAgXHJcbiAgICBjb25zdCBtYXJrZXIgPSBuZXcgTC5tYXJrZXIoW3Jlc3RhdXJhbnQubGF0bG5nLmxhdCwgcmVzdGF1cmFudC5sYXRsbmcubG5nXSxcclxuICAgICAge3RpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIGFsdDogcmVzdGF1cmFudC5uYW1lLFxyXG4gICAgICB1cmw6IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudClcclxuICAgICAgfSlcclxuICAgICAgbWFya2VyLmFkZFRvKG5ld01hcCk7XHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG4gIH0gXHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSByZXN0YXVyYW50XHJcbiAgICovXHJcbiAgc3RhdGljIHVwZGF0ZVJlc3RhdXJhbnRSZXZpZXdzKHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICBzdG9yZS5wdXQocmVzdGF1cmFudCwgcmVzdGF1cmFudC5pZCk7XHJcbiAgICAgIERCSGVscGVyLnN5bmNSZXZpZXdzKCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTeW5jIHJldmlld3Mgd2l0aCBiYWNrZW5kXHJcbiAgICovXHJcbiAgc3RhdGljIHN5bmNSZXZpZXdzKCkge1xyXG4gICAgb3BlbkRhdGFiYXNlKCkudGhlbihkYiA9PiB7XHJcbiAgICAgIGxldCBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgc3RvcmUuZ2V0QWxsKCkudGhlbihyZXN0YXVyYW50cyA9PiB7XHJcbiAgICAgICAgaWYgKHJlc3RhdXJhbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgICBpZiAoIXJlc3RhdXJhbnQucmV2aWV3cykgcmV0dXJuO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlc3RhdXJhbnQucmV2aWV3cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgcmV2aWV3ID0gcmVzdGF1cmFudC5yZXZpZXdzW2ldOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAocmV2aWV3LnN5bmNlZCA9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgREJIZWxwZXIuc3luY1JldmlldyhyZXN0YXVyYW50LmlkLCByZXZpZXcpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgICAgICAgICByZXN0YXVyYW50LnJldmlld3NbaV0uc3luY2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpLnB1dChyZXN0YXVyYW50LCByZXN0YXVyYW50LmlkKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTeW5jIGEgcmV2aWV3XHJcbiAgICovXHJcbiAgc3RhdGljIHN5bmNSZXZpZXcocmVzdGF1cmFudF9pZCwgcmV2aWV3KSB7XHJcbiAgICByZXR1cm4gZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzLycsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgcmVzdGF1cmFudF9pZDogcmVzdGF1cmFudF9pZCxcclxuICAgICAgICAgIG5hbWU6IHJldmlldy5uYW1lLFxyXG4gICAgICAgICAgcmF0aW5nOiByZXZpZXcucmF0aW5nLFxyXG4gICAgICAgICAgY29tbWVudHM6IHJldmlldy5jb21tZW50c1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH0pXHJcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXN0YXVyYW50IGltYWdlIGJhc2UgcGF0aC5cclxuICovXHJcbkRCSGVscGVyLmltYWdlVXJsQmFzZVBhdGggPSAnL2ltZy8nO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBJbmRleGVkREJcclxuICovXHJcbmZ1bmN0aW9uIG9wZW5EYXRhYmFzZSgpIHtcclxuICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgcmV0dXJuIGlkYi5vcGVuKCdtd3MtcmVzdGF1cmFudHMnLCAxLCB1cGdyYWRlREIgPT4gdXBncmFkZURCLmNyZWF0ZU9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpKTtcclxufVxyXG5cclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIC8vIERvbid0IGNyZWF0ZSBpdGVyYXRlS2V5Q3Vyc29yIGlmIG9wZW5LZXlDdXJzb3IgZG9lc24ndCBleGlzdC5cbiAgICAgIGlmICghKGZ1bmNOYW1lIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcblxuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIGlmIChyZXF1ZXN0KSB7XG4gICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAodXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbihkYikge1xuICAgICAgICByZXR1cm4gbmV3IERCKGRiKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwoaW5kZXhlZERCLCAnZGVsZXRlRGF0YWJhc2UnLCBbbmFtZV0pO1xuICAgIH1cbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cDtcbiAgICBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHM7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7IiwiIWZ1bmN0aW9uKGUsdCl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9dCgpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUodCk6ZS5tb21lbnQ9dCgpfSh0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIGUsaTtmdW5jdGlvbiBjKCl7cmV0dXJuIGUuYXBwbHkobnVsbCxhcmd1bWVudHMpfWZ1bmN0aW9uIG8oZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBBcnJheXx8XCJbb2JqZWN0IEFycmF5XVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIHUoZSl7cmV0dXJuIG51bGwhPWUmJlwiW29iamVjdCBPYmplY3RdXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSl9ZnVuY3Rpb24gbChlKXtyZXR1cm4gdm9pZCAwPT09ZX1mdW5jdGlvbiBkKGUpe3JldHVyblwibnVtYmVyXCI9PXR5cGVvZiBlfHxcIltvYmplY3QgTnVtYmVyXVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIGgoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBEYXRlfHxcIltvYmplY3QgRGF0ZV1cIj09PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlKX1mdW5jdGlvbiBmKGUsdCl7dmFyIG4scz1bXTtmb3Iobj0wO248ZS5sZW5ndGg7KytuKXMucHVzaCh0KGVbbl0sbikpO3JldHVybiBzfWZ1bmN0aW9uIG0oZSx0KXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGUsdCl9ZnVuY3Rpb24gXyhlLHQpe2Zvcih2YXIgbiBpbiB0KW0odCxuKSYmKGVbbl09dFtuXSk7cmV0dXJuIG0odCxcInRvU3RyaW5nXCIpJiYoZS50b1N0cmluZz10LnRvU3RyaW5nKSxtKHQsXCJ2YWx1ZU9mXCIpJiYoZS52YWx1ZU9mPXQudmFsdWVPZiksZX1mdW5jdGlvbiB5KGUsdCxuLHMpe3JldHVybiBPdChlLHQsbixzLCEwKS51dGMoKX1mdW5jdGlvbiBnKGUpe3JldHVybiBudWxsPT1lLl9wZiYmKGUuX3BmPXtlbXB0eTohMSx1bnVzZWRUb2tlbnM6W10sdW51c2VkSW5wdXQ6W10sb3ZlcmZsb3c6LTIsY2hhcnNMZWZ0T3ZlcjowLG51bGxJbnB1dDohMSxpbnZhbGlkTW9udGg6bnVsbCxpbnZhbGlkRm9ybWF0OiExLHVzZXJJbnZhbGlkYXRlZDohMSxpc286ITEscGFyc2VkRGF0ZVBhcnRzOltdLG1lcmlkaWVtOm51bGwscmZjMjgyMjohMSx3ZWVrZGF5TWlzbWF0Y2g6ITF9KSxlLl9wZn1mdW5jdGlvbiBwKGUpe2lmKG51bGw9PWUuX2lzVmFsaWQpe3ZhciB0PWcoZSksbj1pLmNhbGwodC5wYXJzZWREYXRlUGFydHMsZnVuY3Rpb24oZSl7cmV0dXJuIG51bGwhPWV9KSxzPSFpc05hTihlLl9kLmdldFRpbWUoKSkmJnQub3ZlcmZsb3c8MCYmIXQuZW1wdHkmJiF0LmludmFsaWRNb250aCYmIXQuaW52YWxpZFdlZWtkYXkmJiF0LndlZWtkYXlNaXNtYXRjaCYmIXQubnVsbElucHV0JiYhdC5pbnZhbGlkRm9ybWF0JiYhdC51c2VySW52YWxpZGF0ZWQmJighdC5tZXJpZGllbXx8dC5tZXJpZGllbSYmbik7aWYoZS5fc3RyaWN0JiYocz1zJiYwPT09dC5jaGFyc0xlZnRPdmVyJiYwPT09dC51bnVzZWRUb2tlbnMubGVuZ3RoJiZ2b2lkIDA9PT10LmJpZ0hvdXIpLG51bGwhPU9iamVjdC5pc0Zyb3plbiYmT2JqZWN0LmlzRnJvemVuKGUpKXJldHVybiBzO2UuX2lzVmFsaWQ9c31yZXR1cm4gZS5faXNWYWxpZH1mdW5jdGlvbiB2KGUpe3ZhciB0PXkoTmFOKTtyZXR1cm4gbnVsbCE9ZT9fKGcodCksZSk6Zyh0KS51c2VySW52YWxpZGF0ZWQ9ITAsdH1pPUFycmF5LnByb3RvdHlwZS5zb21lP0FycmF5LnByb3RvdHlwZS5zb21lOmZ1bmN0aW9uKGUpe2Zvcih2YXIgdD1PYmplY3QodGhpcyksbj10Lmxlbmd0aD4+PjAscz0wO3M8bjtzKyspaWYocyBpbiB0JiZlLmNhbGwodGhpcyx0W3NdLHMsdCkpcmV0dXJuITA7cmV0dXJuITF9O3ZhciByPWMubW9tZW50UHJvcGVydGllcz1bXTtmdW5jdGlvbiB3KGUsdCl7dmFyIG4scyxpO2lmKGwodC5faXNBTW9tZW50T2JqZWN0KXx8KGUuX2lzQU1vbWVudE9iamVjdD10Ll9pc0FNb21lbnRPYmplY3QpLGwodC5faSl8fChlLl9pPXQuX2kpLGwodC5fZil8fChlLl9mPXQuX2YpLGwodC5fbCl8fChlLl9sPXQuX2wpLGwodC5fc3RyaWN0KXx8KGUuX3N0cmljdD10Ll9zdHJpY3QpLGwodC5fdHptKXx8KGUuX3R6bT10Ll90em0pLGwodC5faXNVVEMpfHwoZS5faXNVVEM9dC5faXNVVEMpLGwodC5fb2Zmc2V0KXx8KGUuX29mZnNldD10Ll9vZmZzZXQpLGwodC5fcGYpfHwoZS5fcGY9Zyh0KSksbCh0Ll9sb2NhbGUpfHwoZS5fbG9jYWxlPXQuX2xvY2FsZSksMDxyLmxlbmd0aClmb3Iobj0wO248ci5sZW5ndGg7bisrKWwoaT10W3M9cltuXV0pfHwoZVtzXT1pKTtyZXR1cm4gZX12YXIgdD0hMTtmdW5jdGlvbiBNKGUpe3codGhpcyxlKSx0aGlzLl9kPW5ldyBEYXRlKG51bGwhPWUuX2Q/ZS5fZC5nZXRUaW1lKCk6TmFOKSx0aGlzLmlzVmFsaWQoKXx8KHRoaXMuX2Q9bmV3IERhdGUoTmFOKSksITE9PT10JiYodD0hMCxjLnVwZGF0ZU9mZnNldCh0aGlzKSx0PSExKX1mdW5jdGlvbiBTKGUpe3JldHVybiBlIGluc3RhbmNlb2YgTXx8bnVsbCE9ZSYmbnVsbCE9ZS5faXNBTW9tZW50T2JqZWN0fWZ1bmN0aW9uIEQoZSl7cmV0dXJuIGU8MD9NYXRoLmNlaWwoZSl8fDA6TWF0aC5mbG9vcihlKX1mdW5jdGlvbiBrKGUpe3ZhciB0PStlLG49MDtyZXR1cm4gMCE9PXQmJmlzRmluaXRlKHQpJiYobj1EKHQpKSxufWZ1bmN0aW9uIGEoZSx0LG4pe3ZhciBzLGk9TWF0aC5taW4oZS5sZW5ndGgsdC5sZW5ndGgpLHI9TWF0aC5hYnMoZS5sZW5ndGgtdC5sZW5ndGgpLGE9MDtmb3Iocz0wO3M8aTtzKyspKG4mJmVbc10hPT10W3NdfHwhbiYmayhlW3NdKSE9PWsodFtzXSkpJiZhKys7cmV0dXJuIGErcn1mdW5jdGlvbiBZKGUpeyExPT09Yy5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIkRlcHJlY2F0aW9uIHdhcm5pbmc6IFwiK2UpfWZ1bmN0aW9uIG4oaSxyKXt2YXIgYT0hMDtyZXR1cm4gXyhmdW5jdGlvbigpe2lmKG51bGwhPWMuZGVwcmVjYXRpb25IYW5kbGVyJiZjLmRlcHJlY2F0aW9uSGFuZGxlcihudWxsLGkpLGEpe2Zvcih2YXIgZSx0PVtdLG49MDtuPGFyZ3VtZW50cy5sZW5ndGg7bisrKXtpZihlPVwiXCIsXCJvYmplY3RcIj09dHlwZW9mIGFyZ3VtZW50c1tuXSl7Zm9yKHZhciBzIGluIGUrPVwiXFxuW1wiK24rXCJdIFwiLGFyZ3VtZW50c1swXSllKz1zK1wiOiBcIithcmd1bWVudHNbMF1bc10rXCIsIFwiO2U9ZS5zbGljZSgwLC0yKX1lbHNlIGU9YXJndW1lbnRzW25dO3QucHVzaChlKX1ZKGkrXCJcXG5Bcmd1bWVudHM6IFwiK0FycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHQpLmpvaW4oXCJcIikrXCJcXG5cIisobmV3IEVycm9yKS5zdGFjayksYT0hMX1yZXR1cm4gci5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LHIpfXZhciBzLE89e307ZnVuY3Rpb24gVChlLHQpe251bGwhPWMuZGVwcmVjYXRpb25IYW5kbGVyJiZjLmRlcHJlY2F0aW9uSGFuZGxlcihlLHQpLE9bZV18fChZKHQpLE9bZV09ITApfWZ1bmN0aW9uIHgoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBGdW5jdGlvbnx8XCJbb2JqZWN0IEZ1bmN0aW9uXVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIGIoZSx0KXt2YXIgbixzPV8oe30sZSk7Zm9yKG4gaW4gdCltKHQsbikmJih1KGVbbl0pJiZ1KHRbbl0pPyhzW25dPXt9LF8oc1tuXSxlW25dKSxfKHNbbl0sdFtuXSkpOm51bGwhPXRbbl0/c1tuXT10W25dOmRlbGV0ZSBzW25dKTtmb3IobiBpbiBlKW0oZSxuKSYmIW0odCxuKSYmdShlW25dKSYmKHNbbl09Xyh7fSxzW25dKSk7cmV0dXJuIHN9ZnVuY3Rpb24gUChlKXtudWxsIT1lJiZ0aGlzLnNldChlKX1jLnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncz0hMSxjLmRlcHJlY2F0aW9uSGFuZGxlcj1udWxsLHM9T2JqZWN0LmtleXM/T2JqZWN0LmtleXM6ZnVuY3Rpb24oZSl7dmFyIHQsbj1bXTtmb3IodCBpbiBlKW0oZSx0KSYmbi5wdXNoKHQpO3JldHVybiBufTt2YXIgVz17fTtmdW5jdGlvbiBIKGUsdCl7dmFyIG49ZS50b0xvd2VyQ2FzZSgpO1dbbl09V1tuK1wic1wiXT1XW3RdPWV9ZnVuY3Rpb24gUihlKXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgZT9XW2VdfHxXW2UudG9Mb3dlckNhc2UoKV06dm9pZCAwfWZ1bmN0aW9uIEMoZSl7dmFyIHQsbixzPXt9O2ZvcihuIGluIGUpbShlLG4pJiYodD1SKG4pKSYmKHNbdF09ZVtuXSk7cmV0dXJuIHN9dmFyIEY9e307ZnVuY3Rpb24gTChlLHQpe0ZbZV09dH1mdW5jdGlvbiBVKGUsdCxuKXt2YXIgcz1cIlwiK01hdGguYWJzKGUpLGk9dC1zLmxlbmd0aDtyZXR1cm4oMDw9ZT9uP1wiK1wiOlwiXCI6XCItXCIpK01hdGgucG93KDEwLE1hdGgubWF4KDAsaSkpLnRvU3RyaW5nKCkuc3Vic3RyKDEpK3N9dmFyIE49LyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KFtIaF1tbShzcyk/fE1vfE1NP00/TT98RG98REREb3xERD9EP0Q/fGRkZD9kP3xkbz98d1tvfHddP3xXW298V10/fFFvP3xZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xraz98bW0/fHNzP3xTezEsOX18eHxYfHp6P3xaWj98LikvZyxHPS8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhMVFN8TFR8TEw/TD9MP3xsezEsNH0pL2csVj17fSxFPXt9O2Z1bmN0aW9uIEkoZSx0LG4scyl7dmFyIGk9cztcInN0cmluZ1wiPT10eXBlb2YgcyYmKGk9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc1tzXSgpfSksZSYmKEVbZV09aSksdCYmKEVbdFswXV09ZnVuY3Rpb24oKXtyZXR1cm4gVShpLmFwcGx5KHRoaXMsYXJndW1lbnRzKSx0WzFdLHRbMl0pfSksbiYmKEVbbl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkub3JkaW5hbChpLmFwcGx5KHRoaXMsYXJndW1lbnRzKSxlKX0pfWZ1bmN0aW9uIEEoZSx0KXtyZXR1cm4gZS5pc1ZhbGlkKCk/KHQ9aih0LGUubG9jYWxlRGF0YSgpKSxWW3RdPVZbdF18fGZ1bmN0aW9uKHMpe3ZhciBlLGksdCxyPXMubWF0Y2goTik7Zm9yKGU9MCxpPXIubGVuZ3RoO2U8aTtlKyspRVtyW2VdXT9yW2VdPUVbcltlXV06cltlXT0odD1yW2VdKS5tYXRjaCgvXFxbW1xcc1xcU10vKT90LnJlcGxhY2UoL15cXFt8XFxdJC9nLFwiXCIpOnQucmVwbGFjZSgvXFxcXC9nLFwiXCIpO3JldHVybiBmdW5jdGlvbihlKXt2YXIgdCxuPVwiXCI7Zm9yKHQ9MDt0PGk7dCsrKW4rPXgoclt0XSk/clt0XS5jYWxsKGUscyk6clt0XTtyZXR1cm4gbn19KHQpLFZbdF0oZSkpOmUubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCl9ZnVuY3Rpb24gaihlLHQpe3ZhciBuPTU7ZnVuY3Rpb24gcyhlKXtyZXR1cm4gdC5sb25nRGF0ZUZvcm1hdChlKXx8ZX1mb3IoRy5sYXN0SW5kZXg9MDswPD1uJiZHLnRlc3QoZSk7KWU9ZS5yZXBsYWNlKEcscyksRy5sYXN0SW5kZXg9MCxuLT0xO3JldHVybiBlfXZhciBaPS9cXGQvLHo9L1xcZFxcZC8sJD0vXFxkezN9LyxxPS9cXGR7NH0vLEo9L1srLV0/XFxkezZ9LyxCPS9cXGRcXGQ/LyxRPS9cXGRcXGRcXGRcXGQ/LyxYPS9cXGRcXGRcXGRcXGRcXGRcXGQ/LyxLPS9cXGR7MSwzfS8sZWU9L1xcZHsxLDR9Lyx0ZT0vWystXT9cXGR7MSw2fS8sbmU9L1xcZCsvLHNlPS9bKy1dP1xcZCsvLGllPS9afFsrLV1cXGRcXGQ6P1xcZFxcZC9naSxyZT0vWnxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPy9naSxhZT0vWzAtOV17MCwyNTZ9WydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGMDdcXHVGRjEwLVxcdUZGRUZdezEsMjU2fXxbXFx1MDYwMC1cXHUwNkZGXFwvXXsxLDI1Nn0oXFxzKj9bXFx1MDYwMC1cXHUwNkZGXXsxLDI1Nn0pezEsMn0vaSxvZT17fTtmdW5jdGlvbiB1ZShlLG4scyl7b2VbZV09eChuKT9uOmZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUmJnM/czpufX1mdW5jdGlvbiBsZShlLHQpe3JldHVybiBtKG9lLGUpP29lW2VdKHQuX3N0cmljdCx0Ll9sb2NhbGUpOm5ldyBSZWdFeHAoZGUoZS5yZXBsYWNlKFwiXFxcXFwiLFwiXCIpLnJlcGxhY2UoL1xcXFwoXFxbKXxcXFxcKFxcXSl8XFxbKFteXFxdXFxbXSopXFxdfFxcXFwoLikvZyxmdW5jdGlvbihlLHQsbixzLGkpe3JldHVybiB0fHxufHxzfHxpfSkpKX1mdW5jdGlvbiBkZShlKXtyZXR1cm4gZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csXCJcXFxcJCZcIil9dmFyIGhlPXt9O2Z1bmN0aW9uIGNlKGUsbil7dmFyIHQscz1uO2ZvcihcInN0cmluZ1wiPT10eXBlb2YgZSYmKGU9W2VdKSxkKG4pJiYocz1mdW5jdGlvbihlLHQpe3Rbbl09ayhlKX0pLHQ9MDt0PGUubGVuZ3RoO3QrKyloZVtlW3RdXT1zfWZ1bmN0aW9uIGZlKGUsaSl7Y2UoZSxmdW5jdGlvbihlLHQsbixzKXtuLl93PW4uX3d8fHt9LGkoZSxuLl93LG4scyl9KX12YXIgbWU9MCxfZT0xLHllPTIsZ2U9MyxwZT00LHZlPTUsd2U9NixNZT03LFNlPTg7ZnVuY3Rpb24gRGUoZSl7cmV0dXJuIGtlKGUpPzM2NjozNjV9ZnVuY3Rpb24ga2UoZSl7cmV0dXJuIGUlND09MCYmZSUxMDAhPTB8fGUlNDAwPT0wfUkoXCJZXCIsMCwwLGZ1bmN0aW9uKCl7dmFyIGU9dGhpcy55ZWFyKCk7cmV0dXJuIGU8PTk5OTk/XCJcIitlOlwiK1wiK2V9KSxJKDAsW1wiWVlcIiwyXSwwLGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMueWVhcigpJTEwMH0pLEkoMCxbXCJZWVlZXCIsNF0sMCxcInllYXJcIiksSSgwLFtcIllZWVlZXCIsNV0sMCxcInllYXJcIiksSSgwLFtcIllZWVlZWVwiLDYsITBdLDAsXCJ5ZWFyXCIpLEgoXCJ5ZWFyXCIsXCJ5XCIpLEwoXCJ5ZWFyXCIsMSksdWUoXCJZXCIsc2UpLHVlKFwiWVlcIixCLHopLHVlKFwiWVlZWVwiLGVlLHEpLHVlKFwiWVlZWVlcIix0ZSxKKSx1ZShcIllZWVlZWVwiLHRlLEopLGNlKFtcIllZWVlZXCIsXCJZWVlZWVlcIl0sbWUpLGNlKFwiWVlZWVwiLGZ1bmN0aW9uKGUsdCl7dFttZV09Mj09PWUubGVuZ3RoP2MucGFyc2VUd29EaWdpdFllYXIoZSk6ayhlKX0pLGNlKFwiWVlcIixmdW5jdGlvbihlLHQpe3RbbWVdPWMucGFyc2VUd29EaWdpdFllYXIoZSl9KSxjZShcIllcIixmdW5jdGlvbihlLHQpe3RbbWVdPXBhcnNlSW50KGUsMTApfSksYy5wYXJzZVR3b0RpZ2l0WWVhcj1mdW5jdGlvbihlKXtyZXR1cm4gayhlKSsoNjg8ayhlKT8xOTAwOjJlMyl9O3ZhciBZZSxPZT1UZShcIkZ1bGxZZWFyXCIsITApO2Z1bmN0aW9uIFRlKHQsbil7cmV0dXJuIGZ1bmN0aW9uKGUpe3JldHVybiBudWxsIT1lPyhiZSh0aGlzLHQsZSksYy51cGRhdGVPZmZzZXQodGhpcyxuKSx0aGlzKTp4ZSh0aGlzLHQpfX1mdW5jdGlvbiB4ZShlLHQpe3JldHVybiBlLmlzVmFsaWQoKT9lLl9kW1wiZ2V0XCIrKGUuX2lzVVRDP1wiVVRDXCI6XCJcIikrdF0oKTpOYU59ZnVuY3Rpb24gYmUoZSx0LG4pe2UuaXNWYWxpZCgpJiYhaXNOYU4obikmJihcIkZ1bGxZZWFyXCI9PT10JiZrZShlLnllYXIoKSkmJjE9PT1lLm1vbnRoKCkmJjI5PT09ZS5kYXRlKCk/ZS5fZFtcInNldFwiKyhlLl9pc1VUQz9cIlVUQ1wiOlwiXCIpK3RdKG4sZS5tb250aCgpLFBlKG4sZS5tb250aCgpKSk6ZS5fZFtcInNldFwiKyhlLl9pc1VUQz9cIlVUQ1wiOlwiXCIpK3RdKG4pKX1mdW5jdGlvbiBQZShlLHQpe2lmKGlzTmFOKGUpfHxpc05hTih0KSlyZXR1cm4gTmFOO3ZhciBuLHM9KHQlKG49MTIpK24pJW47cmV0dXJuIGUrPSh0LXMpLzEyLDE9PT1zP2tlKGUpPzI5OjI4OjMxLXMlNyUyfVllPUFycmF5LnByb3RvdHlwZS5pbmRleE9mP0FycmF5LnByb3RvdHlwZS5pbmRleE9mOmZ1bmN0aW9uKGUpe3ZhciB0O2Zvcih0PTA7dDx0aGlzLmxlbmd0aDsrK3QpaWYodGhpc1t0XT09PWUpcmV0dXJuIHQ7cmV0dXJuLTF9LEkoXCJNXCIsW1wiTU1cIiwyXSxcIk1vXCIsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tb250aCgpKzF9KSxJKFwiTU1NXCIsMCwwLGZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHNTaG9ydCh0aGlzLGUpfSksSShcIk1NTU1cIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1vbnRocyh0aGlzLGUpfSksSChcIm1vbnRoXCIsXCJNXCIpLEwoXCJtb250aFwiLDgpLHVlKFwiTVwiLEIpLHVlKFwiTU1cIixCLHopLHVlKFwiTU1NXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC5tb250aHNTaG9ydFJlZ2V4KGUpfSksdWUoXCJNTU1NXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC5tb250aHNSZWdleChlKX0pLGNlKFtcIk1cIixcIk1NXCJdLGZ1bmN0aW9uKGUsdCl7dFtfZV09ayhlKS0xfSksY2UoW1wiTU1NXCIsXCJNTU1NXCJdLGZ1bmN0aW9uKGUsdCxuLHMpe3ZhciBpPW4uX2xvY2FsZS5tb250aHNQYXJzZShlLHMsbi5fc3RyaWN0KTtudWxsIT1pP3RbX2VdPWk6ZyhuKS5pbnZhbGlkTW9udGg9ZX0pO3ZhciBXZT0vRFtvRF0/KFxcW1teXFxbXFxdXSpcXF18XFxzKStNTU1NPy8sSGU9XCJKYW51YXJ5X0ZlYnJ1YXJ5X01hcmNoX0FwcmlsX01heV9KdW5lX0p1bHlfQXVndXN0X1NlcHRlbWJlcl9PY3RvYmVyX05vdmVtYmVyX0RlY2VtYmVyXCIuc3BsaXQoXCJfXCIpO3ZhciBSZT1cIkphbl9GZWJfTWFyX0Fwcl9NYXlfSnVuX0p1bF9BdWdfU2VwX09jdF9Ob3ZfRGVjXCIuc3BsaXQoXCJfXCIpO2Z1bmN0aW9uIENlKGUsdCl7dmFyIG47aWYoIWUuaXNWYWxpZCgpKXJldHVybiBlO2lmKFwic3RyaW5nXCI9PXR5cGVvZiB0KWlmKC9eXFxkKyQvLnRlc3QodCkpdD1rKHQpO2Vsc2UgaWYoIWQodD1lLmxvY2FsZURhdGEoKS5tb250aHNQYXJzZSh0KSkpcmV0dXJuIGU7cmV0dXJuIG49TWF0aC5taW4oZS5kYXRlKCksUGUoZS55ZWFyKCksdCkpLGUuX2RbXCJzZXRcIisoZS5faXNVVEM/XCJVVENcIjpcIlwiKStcIk1vbnRoXCJdKHQsbiksZX1mdW5jdGlvbiBGZShlKXtyZXR1cm4gbnVsbCE9ZT8oQ2UodGhpcyxlKSxjLnVwZGF0ZU9mZnNldCh0aGlzLCEwKSx0aGlzKTp4ZSh0aGlzLFwiTW9udGhcIil9dmFyIExlPWFlO3ZhciBVZT1hZTtmdW5jdGlvbiBOZSgpe2Z1bmN0aW9uIGUoZSx0KXtyZXR1cm4gdC5sZW5ndGgtZS5sZW5ndGh9dmFyIHQsbixzPVtdLGk9W10scj1bXTtmb3IodD0wO3Q8MTI7dCsrKW49eShbMmUzLHRdKSxzLnB1c2godGhpcy5tb250aHNTaG9ydChuLFwiXCIpKSxpLnB1c2godGhpcy5tb250aHMobixcIlwiKSksci5wdXNoKHRoaXMubW9udGhzKG4sXCJcIikpLHIucHVzaCh0aGlzLm1vbnRoc1Nob3J0KG4sXCJcIikpO2ZvcihzLnNvcnQoZSksaS5zb3J0KGUpLHIuc29ydChlKSx0PTA7dDwxMjt0Kyspc1t0XT1kZShzW3RdKSxpW3RdPWRlKGlbdF0pO2Zvcih0PTA7dDwyNDt0Kyspclt0XT1kZShyW3RdKTt0aGlzLl9tb250aHNSZWdleD1uZXcgUmVnRXhwKFwiXihcIityLmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKSx0aGlzLl9tb250aHNTaG9ydFJlZ2V4PXRoaXMuX21vbnRoc1JlZ2V4LHRoaXMuX21vbnRoc1N0cmljdFJlZ2V4PW5ldyBSZWdFeHAoXCJeKFwiK2kuam9pbihcInxcIikrXCIpXCIsXCJpXCIpLHRoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrcy5qb2luKFwifFwiKStcIilcIixcImlcIil9ZnVuY3Rpb24gR2UoZSl7dmFyIHQ9bmV3IERhdGUoRGF0ZS5VVEMuYXBwbHkobnVsbCxhcmd1bWVudHMpKTtyZXR1cm4gZTwxMDAmJjA8PWUmJmlzRmluaXRlKHQuZ2V0VVRDRnVsbFllYXIoKSkmJnQuc2V0VVRDRnVsbFllYXIoZSksdH1mdW5jdGlvbiBWZShlLHQsbil7dmFyIHM9Nyt0LW47cmV0dXJuLSgoNytHZShlLDAscykuZ2V0VVRDRGF5KCktdCklNykrcy0xfWZ1bmN0aW9uIEVlKGUsdCxuLHMsaSl7dmFyIHIsYSxvPTErNyoodC0xKSsoNytuLXMpJTcrVmUoZSxzLGkpO3JldHVybiBvPD0wP2E9RGUocj1lLTEpK286bz5EZShlKT8ocj1lKzEsYT1vLURlKGUpKToocj1lLGE9bykse3llYXI6cixkYXlPZlllYXI6YX19ZnVuY3Rpb24gSWUoZSx0LG4pe3ZhciBzLGkscj1WZShlLnllYXIoKSx0LG4pLGE9TWF0aC5mbG9vcigoZS5kYXlPZlllYXIoKS1yLTEpLzcpKzE7cmV0dXJuIGE8MT9zPWErQWUoaT1lLnllYXIoKS0xLHQsbik6YT5BZShlLnllYXIoKSx0LG4pPyhzPWEtQWUoZS55ZWFyKCksdCxuKSxpPWUueWVhcigpKzEpOihpPWUueWVhcigpLHM9YSkse3dlZWs6cyx5ZWFyOml9fWZ1bmN0aW9uIEFlKGUsdCxuKXt2YXIgcz1WZShlLHQsbiksaT1WZShlKzEsdCxuKTtyZXR1cm4oRGUoZSktcytpKS83fUkoXCJ3XCIsW1wid3dcIiwyXSxcIndvXCIsXCJ3ZWVrXCIpLEkoXCJXXCIsW1wiV1dcIiwyXSxcIldvXCIsXCJpc29XZWVrXCIpLEgoXCJ3ZWVrXCIsXCJ3XCIpLEgoXCJpc29XZWVrXCIsXCJXXCIpLEwoXCJ3ZWVrXCIsNSksTChcImlzb1dlZWtcIiw1KSx1ZShcIndcIixCKSx1ZShcInd3XCIsQix6KSx1ZShcIldcIixCKSx1ZShcIldXXCIsQix6KSxmZShbXCJ3XCIsXCJ3d1wiLFwiV1wiLFwiV1dcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzLnN1YnN0cigwLDEpXT1rKGUpfSk7SShcImRcIiwwLFwiZG9cIixcImRheVwiKSxJKFwiZGRcIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzTWluKHRoaXMsZSl9KSxJKFwiZGRkXCIsMCwwLGZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsZSl9KSxJKFwiZGRkZFwiLDAsMCxmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXModGhpcyxlKX0pLEkoXCJlXCIsMCwwLFwid2Vla2RheVwiKSxJKFwiRVwiLDAsMCxcImlzb1dlZWtkYXlcIiksSChcImRheVwiLFwiZFwiKSxIKFwid2Vla2RheVwiLFwiZVwiKSxIKFwiaXNvV2Vla2RheVwiLFwiRVwiKSxMKFwiZGF5XCIsMTEpLEwoXCJ3ZWVrZGF5XCIsMTEpLEwoXCJpc29XZWVrZGF5XCIsMTEpLHVlKFwiZFwiLEIpLHVlKFwiZVwiLEIpLHVlKFwiRVwiLEIpLHVlKFwiZGRcIixmdW5jdGlvbihlLHQpe3JldHVybiB0LndlZWtkYXlzTWluUmVnZXgoZSl9KSx1ZShcImRkZFwiLGZ1bmN0aW9uKGUsdCl7cmV0dXJuIHQud2Vla2RheXNTaG9ydFJlZ2V4KGUpfSksdWUoXCJkZGRkXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC53ZWVrZGF5c1JlZ2V4KGUpfSksZmUoW1wiZGRcIixcImRkZFwiLFwiZGRkZFwiXSxmdW5jdGlvbihlLHQsbixzKXt2YXIgaT1uLl9sb2NhbGUud2Vla2RheXNQYXJzZShlLHMsbi5fc3RyaWN0KTtudWxsIT1pP3QuZD1pOmcobikuaW52YWxpZFdlZWtkYXk9ZX0pLGZlKFtcImRcIixcImVcIixcIkVcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzXT1rKGUpfSk7dmFyIGplPVwiU3VuZGF5X01vbmRheV9UdWVzZGF5X1dlZG5lc2RheV9UaHVyc2RheV9GcmlkYXlfU2F0dXJkYXlcIi5zcGxpdChcIl9cIik7dmFyIFplPVwiU3VuX01vbl9UdWVfV2VkX1RodV9GcmlfU2F0XCIuc3BsaXQoXCJfXCIpO3ZhciB6ZT1cIlN1X01vX1R1X1dlX1RoX0ZyX1NhXCIuc3BsaXQoXCJfXCIpO3ZhciAkZT1hZTt2YXIgcWU9YWU7dmFyIEplPWFlO2Z1bmN0aW9uIEJlKCl7ZnVuY3Rpb24gZShlLHQpe3JldHVybiB0Lmxlbmd0aC1lLmxlbmd0aH12YXIgdCxuLHMsaSxyLGE9W10sbz1bXSx1PVtdLGw9W107Zm9yKHQ9MDt0PDc7dCsrKW49eShbMmUzLDFdKS5kYXkodCkscz10aGlzLndlZWtkYXlzTWluKG4sXCJcIiksaT10aGlzLndlZWtkYXlzU2hvcnQobixcIlwiKSxyPXRoaXMud2Vla2RheXMobixcIlwiKSxhLnB1c2gocyksby5wdXNoKGkpLHUucHVzaChyKSxsLnB1c2gocyksbC5wdXNoKGkpLGwucHVzaChyKTtmb3IoYS5zb3J0KGUpLG8uc29ydChlKSx1LnNvcnQoZSksbC5zb3J0KGUpLHQ9MDt0PDc7dCsrKW9bdF09ZGUob1t0XSksdVt0XT1kZSh1W3RdKSxsW3RdPWRlKGxbdF0pO3RoaXMuX3dlZWtkYXlzUmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrbC5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4PXRoaXMuX3dlZWtkYXlzUmVnZXgsdGhpcy5fd2Vla2RheXNNaW5SZWdleD10aGlzLl93ZWVrZGF5c1JlZ2V4LHRoaXMuX3dlZWtkYXlzU3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrdS5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4PW5ldyBSZWdFeHAoXCJeKFwiK28uam9pbihcInxcIikrXCIpXCIsXCJpXCIpLHRoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrYS5qb2luKFwifFwiKStcIilcIixcImlcIil9ZnVuY3Rpb24gUWUoKXtyZXR1cm4gdGhpcy5ob3VycygpJTEyfHwxMn1mdW5jdGlvbiBYZShlLHQpe0koZSwwLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLHRoaXMubWludXRlcygpLHQpfSl9ZnVuY3Rpb24gS2UoZSx0KXtyZXR1cm4gdC5fbWVyaWRpZW1QYXJzZX1JKFwiSFwiLFtcIkhIXCIsMl0sMCxcImhvdXJcIiksSShcImhcIixbXCJoaFwiLDJdLDAsUWUpLEkoXCJrXCIsW1wia2tcIiwyXSwwLGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaG91cnMoKXx8MjR9KSxJKFwiaG1tXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIitRZS5hcHBseSh0aGlzKStVKHRoaXMubWludXRlcygpLDIpfSksSShcImhtbXNzXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIitRZS5hcHBseSh0aGlzKStVKHRoaXMubWludXRlcygpLDIpK1UodGhpcy5zZWNvbmRzKCksMil9KSxJKFwiSG1tXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzLmhvdXJzKCkrVSh0aGlzLm1pbnV0ZXMoKSwyKX0pLEkoXCJIbW1zc1wiLDAsMCxmdW5jdGlvbigpe3JldHVyblwiXCIrdGhpcy5ob3VycygpK1UodGhpcy5taW51dGVzKCksMikrVSh0aGlzLnNlY29uZHMoKSwyKX0pLFhlKFwiYVwiLCEwKSxYZShcIkFcIiwhMSksSChcImhvdXJcIixcImhcIiksTChcImhvdXJcIiwxMyksdWUoXCJhXCIsS2UpLHVlKFwiQVwiLEtlKSx1ZShcIkhcIixCKSx1ZShcImhcIixCKSx1ZShcImtcIixCKSx1ZShcIkhIXCIsQix6KSx1ZShcImhoXCIsQix6KSx1ZShcImtrXCIsQix6KSx1ZShcImhtbVwiLFEpLHVlKFwiaG1tc3NcIixYKSx1ZShcIkhtbVwiLFEpLHVlKFwiSG1tc3NcIixYKSxjZShbXCJIXCIsXCJISFwiXSxnZSksY2UoW1wia1wiLFwia2tcIl0sZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWsoZSk7dFtnZV09MjQ9PT1zPzA6c30pLGNlKFtcImFcIixcIkFcIl0sZnVuY3Rpb24oZSx0LG4pe24uX2lzUG09bi5fbG9jYWxlLmlzUE0oZSksbi5fbWVyaWRpZW09ZX0pLGNlKFtcImhcIixcImhoXCJdLGZ1bmN0aW9uKGUsdCxuKXt0W2dlXT1rKGUpLGcobikuYmlnSG91cj0hMH0pLGNlKFwiaG1tXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTI7dFtnZV09ayhlLnN1YnN0cigwLHMpKSx0W3BlXT1rKGUuc3Vic3RyKHMpKSxnKG4pLmJpZ0hvdXI9ITB9KSxjZShcImhtbXNzXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTQsaT1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzLDIpKSx0W3ZlXT1rKGUuc3Vic3RyKGkpKSxnKG4pLmJpZ0hvdXI9ITB9KSxjZShcIkhtbVwiLGZ1bmN0aW9uKGUsdCxuKXt2YXIgcz1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzKSl9KSxjZShcIkhtbXNzXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTQsaT1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzLDIpKSx0W3ZlXT1rKGUuc3Vic3RyKGkpKX0pO3ZhciBldCx0dD1UZShcIkhvdXJzXCIsITApLG50PXtjYWxlbmRhcjp7c2FtZURheTpcIltUb2RheSBhdF0gTFRcIixuZXh0RGF5OlwiW1RvbW9ycm93IGF0XSBMVFwiLG5leHRXZWVrOlwiZGRkZCBbYXRdIExUXCIsbGFzdERheTpcIltZZXN0ZXJkYXkgYXRdIExUXCIsbGFzdFdlZWs6XCJbTGFzdF0gZGRkZCBbYXRdIExUXCIsc2FtZUVsc2U6XCJMXCJ9LGxvbmdEYXRlRm9ybWF0OntMVFM6XCJoOm1tOnNzIEFcIixMVDpcImg6bW0gQVwiLEw6XCJNTS9ERC9ZWVlZXCIsTEw6XCJNTU1NIEQsIFlZWVlcIixMTEw6XCJNTU1NIEQsIFlZWVkgaDptbSBBXCIsTExMTDpcImRkZGQsIE1NTU0gRCwgWVlZWSBoOm1tIEFcIn0saW52YWxpZERhdGU6XCJJbnZhbGlkIGRhdGVcIixvcmRpbmFsOlwiJWRcIixkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOi9cXGR7MSwyfS8scmVsYXRpdmVUaW1lOntmdXR1cmU6XCJpbiAlc1wiLHBhc3Q6XCIlcyBhZ29cIixzOlwiYSBmZXcgc2Vjb25kc1wiLHNzOlwiJWQgc2Vjb25kc1wiLG06XCJhIG1pbnV0ZVwiLG1tOlwiJWQgbWludXRlc1wiLGg6XCJhbiBob3VyXCIsaGg6XCIlZCBob3Vyc1wiLGQ6XCJhIGRheVwiLGRkOlwiJWQgZGF5c1wiLE06XCJhIG1vbnRoXCIsTU06XCIlZCBtb250aHNcIix5OlwiYSB5ZWFyXCIseXk6XCIlZCB5ZWFyc1wifSxtb250aHM6SGUsbW9udGhzU2hvcnQ6UmUsd2Vlazp7ZG93OjAsZG95OjZ9LHdlZWtkYXlzOmplLHdlZWtkYXlzTWluOnplLHdlZWtkYXlzU2hvcnQ6WmUsbWVyaWRpZW1QYXJzZTovW2FwXVxcLj9tP1xcLj8vaX0sc3Q9e30saXQ9e307ZnVuY3Rpb24gcnQoZSl7cmV0dXJuIGU/ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoXCJfXCIsXCItXCIpOmV9ZnVuY3Rpb24gYXQoZSl7dmFyIHQ9bnVsbDtpZighc3RbZV0mJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJm1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpdHJ5e3Q9ZXQuX2FiYnIscmVxdWlyZShcIi4vbG9jYWxlL1wiK2UpLG90KHQpfWNhdGNoKGUpe31yZXR1cm4gc3RbZV19ZnVuY3Rpb24gb3QoZSx0KXt2YXIgbjtyZXR1cm4gZSYmKChuPWwodCk/bHQoZSk6dXQoZSx0KSk/ZXQ9bjpcInVuZGVmaW5lZFwiIT10eXBlb2YgY29uc29sZSYmY29uc29sZS53YXJuJiZjb25zb2xlLndhcm4oXCJMb2NhbGUgXCIrZStcIiBub3QgZm91bmQuIERpZCB5b3UgZm9yZ2V0IHRvIGxvYWQgaXQ/XCIpKSxldC5fYWJicn1mdW5jdGlvbiB1dChlLHQpe2lmKG51bGwhPT10KXt2YXIgbixzPW50O2lmKHQuYWJicj1lLG51bGwhPXN0W2VdKVQoXCJkZWZpbmVMb2NhbGVPdmVycmlkZVwiLFwidXNlIG1vbWVudC51cGRhdGVMb2NhbGUobG9jYWxlTmFtZSwgY29uZmlnKSB0byBjaGFuZ2UgYW4gZXhpc3RpbmcgbG9jYWxlLiBtb21lbnQuZGVmaW5lTG9jYWxlKGxvY2FsZU5hbWUsIGNvbmZpZykgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgY3JlYXRpbmcgYSBuZXcgbG9jYWxlIFNlZSBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL2RlZmluZS1sb2NhbGUvIGZvciBtb3JlIGluZm8uXCIpLHM9c3RbZV0uX2NvbmZpZztlbHNlIGlmKG51bGwhPXQucGFyZW50TG9jYWxlKWlmKG51bGwhPXN0W3QucGFyZW50TG9jYWxlXSlzPXN0W3QucGFyZW50TG9jYWxlXS5fY29uZmlnO2Vsc2V7aWYobnVsbD09KG49YXQodC5wYXJlbnRMb2NhbGUpKSlyZXR1cm4gaXRbdC5wYXJlbnRMb2NhbGVdfHwoaXRbdC5wYXJlbnRMb2NhbGVdPVtdKSxpdFt0LnBhcmVudExvY2FsZV0ucHVzaCh7bmFtZTplLGNvbmZpZzp0fSksbnVsbDtzPW4uX2NvbmZpZ31yZXR1cm4gc3RbZV09bmV3IFAoYihzLHQpKSxpdFtlXSYmaXRbZV0uZm9yRWFjaChmdW5jdGlvbihlKXt1dChlLm5hbWUsZS5jb25maWcpfSksb3QoZSksc3RbZV19cmV0dXJuIGRlbGV0ZSBzdFtlXSxudWxsfWZ1bmN0aW9uIGx0KGUpe3ZhciB0O2lmKGUmJmUuX2xvY2FsZSYmZS5fbG9jYWxlLl9hYmJyJiYoZT1lLl9sb2NhbGUuX2FiYnIpLCFlKXJldHVybiBldDtpZighbyhlKSl7aWYodD1hdChlKSlyZXR1cm4gdDtlPVtlXX1yZXR1cm4gZnVuY3Rpb24oZSl7Zm9yKHZhciB0LG4scyxpLHI9MDtyPGUubGVuZ3RoOyl7Zm9yKHQ9KGk9cnQoZVtyXSkuc3BsaXQoXCItXCIpKS5sZW5ndGgsbj0obj1ydChlW3IrMV0pKT9uLnNwbGl0KFwiLVwiKTpudWxsOzA8dDspe2lmKHM9YXQoaS5zbGljZSgwLHQpLmpvaW4oXCItXCIpKSlyZXR1cm4gcztpZihuJiZuLmxlbmd0aD49dCYmYShpLG4sITApPj10LTEpYnJlYWs7dC0tfXIrK31yZXR1cm4gZXR9KGUpfWZ1bmN0aW9uIGR0KGUpe3ZhciB0LG49ZS5fYTtyZXR1cm4gbiYmLTI9PT1nKGUpLm92ZXJmbG93JiYodD1uW19lXTwwfHwxMTxuW19lXT9fZTpuW3llXTwxfHxuW3llXT5QZShuW21lXSxuW19lXSk/eWU6bltnZV08MHx8MjQ8bltnZV18fDI0PT09bltnZV0mJigwIT09bltwZV18fDAhPT1uW3ZlXXx8MCE9PW5bd2VdKT9nZTpuW3BlXTwwfHw1OTxuW3BlXT9wZTpuW3ZlXTwwfHw1OTxuW3ZlXT92ZTpuW3dlXTwwfHw5OTk8blt3ZV0/d2U6LTEsZyhlKS5fb3ZlcmZsb3dEYXlPZlllYXImJih0PG1lfHx5ZTx0KSYmKHQ9eWUpLGcoZSkuX292ZXJmbG93V2Vla3MmJi0xPT09dCYmKHQ9TWUpLGcoZSkuX292ZXJmbG93V2Vla2RheSYmLTE9PT10JiYodD1TZSksZyhlKS5vdmVyZmxvdz10KSxlfWZ1bmN0aW9uIGh0KGUsdCxuKXtyZXR1cm4gbnVsbCE9ZT9lOm51bGwhPXQ/dDpufWZ1bmN0aW9uIGN0KGUpe3ZhciB0LG4scyxpLHIsYT1bXTtpZighZS5fZCl7dmFyIG8sdTtmb3Iobz1lLHU9bmV3IERhdGUoYy5ub3coKSkscz1vLl91c2VVVEM/W3UuZ2V0VVRDRnVsbFllYXIoKSx1LmdldFVUQ01vbnRoKCksdS5nZXRVVENEYXRlKCldOlt1LmdldEZ1bGxZZWFyKCksdS5nZXRNb250aCgpLHUuZ2V0RGF0ZSgpXSxlLl93JiZudWxsPT1lLl9hW3llXSYmbnVsbD09ZS5fYVtfZV0mJmZ1bmN0aW9uKGUpe3ZhciB0LG4scyxpLHIsYSxvLHU7aWYobnVsbCE9KHQ9ZS5fdykuR0d8fG51bGwhPXQuV3x8bnVsbCE9dC5FKXI9MSxhPTQsbj1odCh0LkdHLGUuX2FbbWVdLEllKFR0KCksMSw0KS55ZWFyKSxzPWh0KHQuVywxKSwoKGk9aHQodC5FLDEpKTwxfHw3PGkpJiYodT0hMCk7ZWxzZXtyPWUuX2xvY2FsZS5fd2Vlay5kb3csYT1lLl9sb2NhbGUuX3dlZWsuZG95O3ZhciBsPUllKFR0KCkscixhKTtuPWh0KHQuZ2csZS5fYVttZV0sbC55ZWFyKSxzPWh0KHQudyxsLndlZWspLG51bGwhPXQuZD8oKGk9dC5kKTwwfHw2PGkpJiYodT0hMCk6bnVsbCE9dC5lPyhpPXQuZStyLCh0LmU8MHx8Njx0LmUpJiYodT0hMCkpOmk9cn1zPDF8fHM+QWUobixyLGEpP2coZSkuX292ZXJmbG93V2Vla3M9ITA6bnVsbCE9dT9nKGUpLl9vdmVyZmxvd1dlZWtkYXk9ITA6KG89RWUobixzLGkscixhKSxlLl9hW21lXT1vLnllYXIsZS5fZGF5T2ZZZWFyPW8uZGF5T2ZZZWFyKX0oZSksbnVsbCE9ZS5fZGF5T2ZZZWFyJiYocj1odChlLl9hW21lXSxzW21lXSksKGUuX2RheU9mWWVhcj5EZShyKXx8MD09PWUuX2RheU9mWWVhcikmJihnKGUpLl9vdmVyZmxvd0RheU9mWWVhcj0hMCksbj1HZShyLDAsZS5fZGF5T2ZZZWFyKSxlLl9hW19lXT1uLmdldFVUQ01vbnRoKCksZS5fYVt5ZV09bi5nZXRVVENEYXRlKCkpLHQ9MDt0PDMmJm51bGw9PWUuX2FbdF07Kyt0KWUuX2FbdF09YVt0XT1zW3RdO2Zvcig7dDw3O3QrKyllLl9hW3RdPWFbdF09bnVsbD09ZS5fYVt0XT8yPT09dD8xOjA6ZS5fYVt0XTsyND09PWUuX2FbZ2VdJiYwPT09ZS5fYVtwZV0mJjA9PT1lLl9hW3ZlXSYmMD09PWUuX2Fbd2VdJiYoZS5fbmV4dERheT0hMCxlLl9hW2dlXT0wKSxlLl9kPShlLl91c2VVVEM/R2U6ZnVuY3Rpb24oZSx0LG4scyxpLHIsYSl7dmFyIG89bmV3IERhdGUoZSx0LG4scyxpLHIsYSk7cmV0dXJuIGU8MTAwJiYwPD1lJiZpc0Zpbml0ZShvLmdldEZ1bGxZZWFyKCkpJiZvLnNldEZ1bGxZZWFyKGUpLG99KS5hcHBseShudWxsLGEpLGk9ZS5fdXNlVVRDP2UuX2QuZ2V0VVRDRGF5KCk6ZS5fZC5nZXREYXkoKSxudWxsIT1lLl90em0mJmUuX2Quc2V0VVRDTWludXRlcyhlLl9kLmdldFVUQ01pbnV0ZXMoKS1lLl90em0pLGUuX25leHREYXkmJihlLl9hW2dlXT0yNCksZS5fdyYmdm9pZCAwIT09ZS5fdy5kJiZlLl93LmQhPT1pJiYoZyhlKS53ZWVrZGF5TWlzbWF0Y2g9ITApfX12YXIgZnQ9L15cXHMqKCg/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzpcXGRcXGQtXFxkXFxkfFdcXGRcXGQtXFxkfFdcXGRcXGR8XFxkXFxkXFxkfFxcZFxcZCkpKD86KFR8ICkoXFxkXFxkKD86OlxcZFxcZCg/OjpcXGRcXGQoPzpbLixdXFxkKyk/KT8pPykoW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvLG10PS9eXFxzKigoPzpbKy1dXFxkezZ9fFxcZHs0fSkoPzpcXGRcXGRcXGRcXGR8V1xcZFxcZFxcZHxXXFxkXFxkfFxcZFxcZFxcZHxcXGRcXGQpKSg/OihUfCApKFxcZFxcZCg/OlxcZFxcZCg/OlxcZFxcZCg/OlsuLF1cXGQrKT8pPyk/KShbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sX3Q9L1p8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8vLHl0PVtbXCJZWVlZWVktTU0tRERcIiwvWystXVxcZHs2fS1cXGRcXGQtXFxkXFxkL10sW1wiWVlZWS1NTS1ERFwiLC9cXGR7NH0tXFxkXFxkLVxcZFxcZC9dLFtcIkdHR0ctW1ddV1ctRVwiLC9cXGR7NH0tV1xcZFxcZC1cXGQvXSxbXCJHR0dHLVtXXVdXXCIsL1xcZHs0fS1XXFxkXFxkLywhMV0sW1wiWVlZWS1ERERcIiwvXFxkezR9LVxcZHszfS9dLFtcIllZWVktTU1cIiwvXFxkezR9LVxcZFxcZC8sITFdLFtcIllZWVlZWU1NRERcIiwvWystXVxcZHsxMH0vXSxbXCJZWVlZTU1ERFwiLC9cXGR7OH0vXSxbXCJHR0dHW1ddV1dFXCIsL1xcZHs0fVdcXGR7M30vXSxbXCJHR0dHW1ddV1dcIiwvXFxkezR9V1xcZHsyfS8sITFdLFtcIllZWVlERERcIiwvXFxkezd9L11dLGd0PVtbXCJISDptbTpzcy5TU1NTXCIsL1xcZFxcZDpcXGRcXGQ6XFxkXFxkXFwuXFxkKy9dLFtcIkhIOm1tOnNzLFNTU1NcIiwvXFxkXFxkOlxcZFxcZDpcXGRcXGQsXFxkKy9dLFtcIkhIOm1tOnNzXCIsL1xcZFxcZDpcXGRcXGQ6XFxkXFxkL10sW1wiSEg6bW1cIiwvXFxkXFxkOlxcZFxcZC9dLFtcIkhIbW1zcy5TU1NTXCIsL1xcZFxcZFxcZFxcZFxcZFxcZFxcLlxcZCsvXSxbXCJISG1tc3MsU1NTU1wiLC9cXGRcXGRcXGRcXGRcXGRcXGQsXFxkKy9dLFtcIkhIbW1zc1wiLC9cXGRcXGRcXGRcXGRcXGRcXGQvXSxbXCJISG1tXCIsL1xcZFxcZFxcZFxcZC9dLFtcIkhIXCIsL1xcZFxcZC9dXSxwdD0vXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pO2Z1bmN0aW9uIHZ0KGUpe3ZhciB0LG4scyxpLHIsYSxvPWUuX2ksdT1mdC5leGVjKG8pfHxtdC5leGVjKG8pO2lmKHUpe2ZvcihnKGUpLmlzbz0hMCx0PTAsbj15dC5sZW5ndGg7dDxuO3QrKylpZih5dFt0XVsxXS5leGVjKHVbMV0pKXtpPXl0W3RdWzBdLHM9ITEhPT15dFt0XVsyXTticmVha31pZihudWxsPT1pKXJldHVybiB2b2lkKGUuX2lzVmFsaWQ9ITEpO2lmKHVbM10pe2Zvcih0PTAsbj1ndC5sZW5ndGg7dDxuO3QrKylpZihndFt0XVsxXS5leGVjKHVbM10pKXtyPSh1WzJdfHxcIiBcIikrZ3RbdF1bMF07YnJlYWt9aWYobnVsbD09cilyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKX1pZighcyYmbnVsbCE9cilyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKTtpZih1WzRdKXtpZighX3QuZXhlYyh1WzRdKSlyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKTthPVwiWlwifWUuX2Y9aSsocnx8XCJcIikrKGF8fFwiXCIpLGt0KGUpfWVsc2UgZS5faXNWYWxpZD0hMX12YXIgd3Q9L14oPzooTW9ufFR1ZXxXZWR8VGh1fEZyaXxTYXR8U3VuKSw/XFxzKT8oXFxkezEsMn0pXFxzKEphbnxGZWJ8TWFyfEFwcnxNYXl8SnVufEp1bHxBdWd8U2VwfE9jdHxOb3Z8RGVjKVxccyhcXGR7Miw0fSlcXHMoXFxkXFxkKTooXFxkXFxkKSg/OjooXFxkXFxkKSk/XFxzKD86KFVUfEdNVHxbRUNNUF1bU0RdVCl8KFtael0pfChbKy1dXFxkezR9KSkkLztmdW5jdGlvbiBNdChlLHQsbixzLGkscil7dmFyIGE9W2Z1bmN0aW9uKGUpe3ZhciB0PXBhcnNlSW50KGUsMTApO3tpZih0PD00OSlyZXR1cm4gMmUzK3Q7aWYodDw9OTk5KXJldHVybiAxOTAwK3R9cmV0dXJuIHR9KGUpLFJlLmluZGV4T2YodCkscGFyc2VJbnQobiwxMCkscGFyc2VJbnQocywxMCkscGFyc2VJbnQoaSwxMCldO3JldHVybiByJiZhLnB1c2gocGFyc2VJbnQociwxMCkpLGF9dmFyIFN0PXtVVDowLEdNVDowLEVEVDotMjQwLEVTVDotMzAwLENEVDotMzAwLENTVDotMzYwLE1EVDotMzYwLE1TVDotNDIwLFBEVDotNDIwLFBTVDotNDgwfTtmdW5jdGlvbiBEdChlKXt2YXIgdCxuLHMsaT13dC5leGVjKGUuX2kucmVwbGFjZSgvXFwoW14pXSpcXCl8W1xcblxcdF0vZyxcIiBcIikucmVwbGFjZSgvKFxcc1xccyspL2csXCIgXCIpLnJlcGxhY2UoL15cXHNcXHMqLyxcIlwiKS5yZXBsYWNlKC9cXHNcXHMqJC8sXCJcIikpO2lmKGkpe3ZhciByPU10KGlbNF0saVszXSxpWzJdLGlbNV0saVs2XSxpWzddKTtpZih0PWlbMV0sbj1yLHM9ZSx0JiZaZS5pbmRleE9mKHQpIT09bmV3IERhdGUoblswXSxuWzFdLG5bMl0pLmdldERheSgpJiYoZyhzKS53ZWVrZGF5TWlzbWF0Y2g9ITAsIShzLl9pc1ZhbGlkPSExKSkpcmV0dXJuO2UuX2E9cixlLl90em09ZnVuY3Rpb24oZSx0LG4pe2lmKGUpcmV0dXJuIFN0W2VdO2lmKHQpcmV0dXJuIDA7dmFyIHM9cGFyc2VJbnQobiwxMCksaT1zJTEwMDtyZXR1cm4ocy1pKS8xMDAqNjAraX0oaVs4XSxpWzldLGlbMTBdKSxlLl9kPUdlLmFwcGx5KG51bGwsZS5fYSksZS5fZC5zZXRVVENNaW51dGVzKGUuX2QuZ2V0VVRDTWludXRlcygpLWUuX3R6bSksZyhlKS5yZmMyODIyPSEwfWVsc2UgZS5faXNWYWxpZD0hMX1mdW5jdGlvbiBrdChlKXtpZihlLl9mIT09Yy5JU09fODYwMSlpZihlLl9mIT09Yy5SRkNfMjgyMil7ZS5fYT1bXSxnKGUpLmVtcHR5PSEwO3ZhciB0LG4scyxpLHIsYSxvLHUsbD1cIlwiK2UuX2ksZD1sLmxlbmd0aCxoPTA7Zm9yKHM9aihlLl9mLGUuX2xvY2FsZSkubWF0Y2goTil8fFtdLHQ9MDt0PHMubGVuZ3RoO3QrKylpPXNbdF0sKG49KGwubWF0Y2gobGUoaSxlKSl8fFtdKVswXSkmJigwPChyPWwuc3Vic3RyKDAsbC5pbmRleE9mKG4pKSkubGVuZ3RoJiZnKGUpLnVudXNlZElucHV0LnB1c2gociksbD1sLnNsaWNlKGwuaW5kZXhPZihuKStuLmxlbmd0aCksaCs9bi5sZW5ndGgpLEVbaV0/KG4/ZyhlKS5lbXB0eT0hMTpnKGUpLnVudXNlZFRva2Vucy5wdXNoKGkpLGE9aSx1PWUsbnVsbCE9KG89bikmJm0oaGUsYSkmJmhlW2FdKG8sdS5fYSx1LGEpKTplLl9zdHJpY3QmJiFuJiZnKGUpLnVudXNlZFRva2Vucy5wdXNoKGkpO2coZSkuY2hhcnNMZWZ0T3Zlcj1kLWgsMDxsLmxlbmd0aCYmZyhlKS51bnVzZWRJbnB1dC5wdXNoKGwpLGUuX2FbZ2VdPD0xMiYmITA9PT1nKGUpLmJpZ0hvdXImJjA8ZS5fYVtnZV0mJihnKGUpLmJpZ0hvdXI9dm9pZCAwKSxnKGUpLnBhcnNlZERhdGVQYXJ0cz1lLl9hLnNsaWNlKDApLGcoZSkubWVyaWRpZW09ZS5fbWVyaWRpZW0sZS5fYVtnZV09ZnVuY3Rpb24oZSx0LG4pe3ZhciBzO2lmKG51bGw9PW4pcmV0dXJuIHQ7cmV0dXJuIG51bGwhPWUubWVyaWRpZW1Ib3VyP2UubWVyaWRpZW1Ib3VyKHQsbik6KG51bGwhPWUuaXNQTSYmKChzPWUuaXNQTShuKSkmJnQ8MTImJih0Kz0xMiksc3x8MTIhPT10fHwodD0wKSksdCl9KGUuX2xvY2FsZSxlLl9hW2dlXSxlLl9tZXJpZGllbSksY3QoZSksZHQoZSl9ZWxzZSBEdChlKTtlbHNlIHZ0KGUpfWZ1bmN0aW9uIFl0KGUpe3ZhciB0LG4scyxpLHI9ZS5faSxhPWUuX2Y7cmV0dXJuIGUuX2xvY2FsZT1lLl9sb2NhbGV8fGx0KGUuX2wpLG51bGw9PT1yfHx2b2lkIDA9PT1hJiZcIlwiPT09cj92KHtudWxsSW5wdXQ6ITB9KTooXCJzdHJpbmdcIj09dHlwZW9mIHImJihlLl9pPXI9ZS5fbG9jYWxlLnByZXBhcnNlKHIpKSxTKHIpP25ldyBNKGR0KHIpKTooaChyKT9lLl9kPXI6byhhKT9mdW5jdGlvbihlKXt2YXIgdCxuLHMsaSxyO2lmKDA9PT1lLl9mLmxlbmd0aClyZXR1cm4gZyhlKS5pbnZhbGlkRm9ybWF0PSEwLGUuX2Q9bmV3IERhdGUoTmFOKTtmb3IoaT0wO2k8ZS5fZi5sZW5ndGg7aSsrKXI9MCx0PXcoe30sZSksbnVsbCE9ZS5fdXNlVVRDJiYodC5fdXNlVVRDPWUuX3VzZVVUQyksdC5fZj1lLl9mW2ldLGt0KHQpLHAodCkmJihyKz1nKHQpLmNoYXJzTGVmdE92ZXIscis9MTAqZyh0KS51bnVzZWRUb2tlbnMubGVuZ3RoLGcodCkuc2NvcmU9ciwobnVsbD09c3x8cjxzKSYmKHM9cixuPXQpKTtfKGUsbnx8dCl9KGUpOmE/a3QoZSk6bChuPSh0PWUpLl9pKT90Ll9kPW5ldyBEYXRlKGMubm93KCkpOmgobik/dC5fZD1uZXcgRGF0ZShuLnZhbHVlT2YoKSk6XCJzdHJpbmdcIj09dHlwZW9mIG4/KHM9dCxudWxsPT09KGk9cHQuZXhlYyhzLl9pKSk/KHZ0KHMpLCExPT09cy5faXNWYWxpZCYmKGRlbGV0ZSBzLl9pc1ZhbGlkLER0KHMpLCExPT09cy5faXNWYWxpZCYmKGRlbGV0ZSBzLl9pc1ZhbGlkLGMuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2socykpKSk6cy5fZD1uZXcgRGF0ZSgraVsxXSkpOm8obik/KHQuX2E9ZihuLnNsaWNlKDApLGZ1bmN0aW9uKGUpe3JldHVybiBwYXJzZUludChlLDEwKX0pLGN0KHQpKTp1KG4pP2Z1bmN0aW9uKGUpe2lmKCFlLl9kKXt2YXIgdD1DKGUuX2kpO2UuX2E9ZihbdC55ZWFyLHQubW9udGgsdC5kYXl8fHQuZGF0ZSx0LmhvdXIsdC5taW51dGUsdC5zZWNvbmQsdC5taWxsaXNlY29uZF0sZnVuY3Rpb24oZSl7cmV0dXJuIGUmJnBhcnNlSW50KGUsMTApfSksY3QoZSl9fSh0KTpkKG4pP3QuX2Q9bmV3IERhdGUobik6Yy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayh0KSxwKGUpfHwoZS5fZD1udWxsKSxlKSl9ZnVuY3Rpb24gT3QoZSx0LG4scyxpKXt2YXIgcixhPXt9O3JldHVybiEwIT09biYmITEhPT1ufHwocz1uLG49dm9pZCAwKSwodShlKSYmZnVuY3Rpb24oZSl7aWYoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMpcmV0dXJuIDA9PT1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhlKS5sZW5ndGg7dmFyIHQ7Zm9yKHQgaW4gZSlpZihlLmhhc093blByb3BlcnR5KHQpKXJldHVybiExO3JldHVybiEwfShlKXx8byhlKSYmMD09PWUubGVuZ3RoKSYmKGU9dm9pZCAwKSxhLl9pc0FNb21lbnRPYmplY3Q9ITAsYS5fdXNlVVRDPWEuX2lzVVRDPWksYS5fbD1uLGEuX2k9ZSxhLl9mPXQsYS5fc3RyaWN0PXMsKHI9bmV3IE0oZHQoWXQoYSkpKSkuX25leHREYXkmJihyLmFkZCgxLFwiZFwiKSxyLl9uZXh0RGF5PXZvaWQgMCkscn1mdW5jdGlvbiBUdChlLHQsbixzKXtyZXR1cm4gT3QoZSx0LG4scywhMSl9Yy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjaz1uKFwidmFsdWUgcHJvdmlkZWQgaXMgbm90IGluIGEgcmVjb2duaXplZCBSRkMyODIyIG9yIElTTyBmb3JtYXQuIG1vbWVudCBjb25zdHJ1Y3Rpb24gZmFsbHMgYmFjayB0byBqcyBEYXRlKCksIHdoaWNoIGlzIG5vdCByZWxpYWJsZSBhY3Jvc3MgYWxsIGJyb3dzZXJzIGFuZCB2ZXJzaW9ucy4gTm9uIFJGQzI4MjIvSVNPIGRhdGUgZm9ybWF0cyBhcmUgZGlzY291cmFnZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyBtYWpvciByZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9qcy1kYXRlLyBmb3IgbW9yZSBpbmZvLlwiLGZ1bmN0aW9uKGUpe2UuX2Q9bmV3IERhdGUoZS5faSsoZS5fdXNlVVRDP1wiIFVUQ1wiOlwiXCIpKX0pLGMuSVNPXzg2MDE9ZnVuY3Rpb24oKXt9LGMuUkZDXzI4MjI9ZnVuY3Rpb24oKXt9O3ZhciB4dD1uKFwibW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvbWluLW1heC9cIixmdW5jdGlvbigpe3ZhciBlPVR0LmFwcGx5KG51bGwsYXJndW1lbnRzKTtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJmUuaXNWYWxpZCgpP2U8dGhpcz90aGlzOmU6digpfSksYnQ9bihcIm1vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL21pbi1tYXgvXCIsZnVuY3Rpb24oKXt2YXIgZT1UdC5hcHBseShudWxsLGFyZ3VtZW50cyk7cmV0dXJuIHRoaXMuaXNWYWxpZCgpJiZlLmlzVmFsaWQoKT90aGlzPGU/dGhpczplOnYoKX0pO2Z1bmN0aW9uIFB0KGUsdCl7dmFyIG4scztpZigxPT09dC5sZW5ndGgmJm8odFswXSkmJih0PXRbMF0pLCF0Lmxlbmd0aClyZXR1cm4gVHQoKTtmb3Iobj10WzBdLHM9MTtzPHQubGVuZ3RoOysrcyl0W3NdLmlzVmFsaWQoKSYmIXRbc11bZV0obil8fChuPXRbc10pO3JldHVybiBufXZhciBXdD1bXCJ5ZWFyXCIsXCJxdWFydGVyXCIsXCJtb250aFwiLFwid2Vla1wiLFwiZGF5XCIsXCJob3VyXCIsXCJtaW51dGVcIixcInNlY29uZFwiLFwibWlsbGlzZWNvbmRcIl07ZnVuY3Rpb24gSHQoZSl7dmFyIHQ9QyhlKSxuPXQueWVhcnx8MCxzPXQucXVhcnRlcnx8MCxpPXQubW9udGh8fDAscj10LndlZWt8fDAsYT10LmRheXx8MCxvPXQuaG91cnx8MCx1PXQubWludXRlfHwwLGw9dC5zZWNvbmR8fDAsZD10Lm1pbGxpc2Vjb25kfHwwO3RoaXMuX2lzVmFsaWQ9ZnVuY3Rpb24oZSl7Zm9yKHZhciB0IGluIGUpaWYoLTE9PT1ZZS5jYWxsKFd0LHQpfHxudWxsIT1lW3RdJiZpc05hTihlW3RdKSlyZXR1cm4hMTtmb3IodmFyIG49ITEscz0wO3M8V3QubGVuZ3RoOysrcylpZihlW1d0W3NdXSl7aWYobilyZXR1cm4hMTtwYXJzZUZsb2F0KGVbV3Rbc11dKSE9PWsoZVtXdFtzXV0pJiYobj0hMCl9cmV0dXJuITB9KHQpLHRoaXMuX21pbGxpc2Vjb25kcz0rZCsxZTMqbCs2ZTQqdSsxZTMqbyo2MCo2MCx0aGlzLl9kYXlzPSthKzcqcix0aGlzLl9tb250aHM9K2krMypzKzEyKm4sdGhpcy5fZGF0YT17fSx0aGlzLl9sb2NhbGU9bHQoKSx0aGlzLl9idWJibGUoKX1mdW5jdGlvbiBSdChlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEh0fWZ1bmN0aW9uIEN0KGUpe3JldHVybiBlPDA/LTEqTWF0aC5yb3VuZCgtMSplKTpNYXRoLnJvdW5kKGUpfWZ1bmN0aW9uIEZ0KGUsbil7SShlLDAsMCxmdW5jdGlvbigpe3ZhciBlPXRoaXMudXRjT2Zmc2V0KCksdD1cIitcIjtyZXR1cm4gZTwwJiYoZT0tZSx0PVwiLVwiKSx0K1Uofn4oZS82MCksMikrbitVKH5+ZSU2MCwyKX0pfUZ0KFwiWlwiLFwiOlwiKSxGdChcIlpaXCIsXCJcIiksdWUoXCJaXCIscmUpLHVlKFwiWlpcIixyZSksY2UoW1wiWlwiLFwiWlpcIl0sZnVuY3Rpb24oZSx0LG4pe24uX3VzZVVUQz0hMCxuLl90em09VXQocmUsZSl9KTt2YXIgTHQ9LyhbXFwrXFwtXXxcXGRcXGQpL2dpO2Z1bmN0aW9uIFV0KGUsdCl7dmFyIG49KHR8fFwiXCIpLm1hdGNoKGUpO2lmKG51bGw9PT1uKXJldHVybiBudWxsO3ZhciBzPSgobltuLmxlbmd0aC0xXXx8W10pK1wiXCIpLm1hdGNoKEx0KXx8W1wiLVwiLDAsMF0saT02MCpzWzFdK2soc1syXSk7cmV0dXJuIDA9PT1pPzA6XCIrXCI9PT1zWzBdP2k6LWl9ZnVuY3Rpb24gTnQoZSx0KXt2YXIgbixzO3JldHVybiB0Ll9pc1VUQz8obj10LmNsb25lKCkscz0oUyhlKXx8aChlKT9lLnZhbHVlT2YoKTpUdChlKS52YWx1ZU9mKCkpLW4udmFsdWVPZigpLG4uX2Quc2V0VGltZShuLl9kLnZhbHVlT2YoKStzKSxjLnVwZGF0ZU9mZnNldChuLCExKSxuKTpUdChlKS5sb2NhbCgpfWZ1bmN0aW9uIEd0KGUpe3JldHVybiAxNSotTWF0aC5yb3VuZChlLl9kLmdldFRpbWV6b25lT2Zmc2V0KCkvMTUpfWZ1bmN0aW9uIFZ0KCl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmKHRoaXMuX2lzVVRDJiYwPT09dGhpcy5fb2Zmc2V0KX1jLnVwZGF0ZU9mZnNldD1mdW5jdGlvbigpe307dmFyIEV0PS9eKFxcLXxcXCspPyg/OihcXGQqKVsuIF0pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKShcXC5cXGQqKT8pPyQvLEl0PS9eKC18XFwrKT9QKD86KFstK10/WzAtOSwuXSopWSk/KD86KFstK10/WzAtOSwuXSopTSk/KD86KFstK10/WzAtOSwuXSopVyk/KD86KFstK10/WzAtOSwuXSopRCk/KD86VCg/OihbLStdP1swLTksLl0qKUgpPyg/OihbLStdP1swLTksLl0qKU0pPyg/OihbLStdP1swLTksLl0qKVMpPyk/JC87ZnVuY3Rpb24gQXQoZSx0KXt2YXIgbixzLGkscj1lLGE9bnVsbDtyZXR1cm4gUnQoZSk/cj17bXM6ZS5fbWlsbGlzZWNvbmRzLGQ6ZS5fZGF5cyxNOmUuX21vbnRoc306ZChlKT8ocj17fSx0P3JbdF09ZTpyLm1pbGxpc2Vjb25kcz1lKTooYT1FdC5leGVjKGUpKT8obj1cIi1cIj09PWFbMV0/LTE6MSxyPXt5OjAsZDprKGFbeWVdKSpuLGg6ayhhW2dlXSkqbixtOmsoYVtwZV0pKm4sczprKGFbdmVdKSpuLG1zOmsoQ3QoMWUzKmFbd2VdKSkqbn0pOihhPUl0LmV4ZWMoZSkpPyhuPVwiLVwiPT09YVsxXT8tMTooYVsxXSwxKSxyPXt5Omp0KGFbMl0sbiksTTpqdChhWzNdLG4pLHc6anQoYVs0XSxuKSxkOmp0KGFbNV0sbiksaDpqdChhWzZdLG4pLG06anQoYVs3XSxuKSxzOmp0KGFbOF0sbil9KTpudWxsPT1yP3I9e306XCJvYmplY3RcIj09dHlwZW9mIHImJihcImZyb21cImluIHJ8fFwidG9cImluIHIpJiYoaT1mdW5jdGlvbihlLHQpe3ZhciBuO2lmKCFlLmlzVmFsaWQoKXx8IXQuaXNWYWxpZCgpKXJldHVybnttaWxsaXNlY29uZHM6MCxtb250aHM6MH07dD1OdCh0LGUpLGUuaXNCZWZvcmUodCk/bj1adChlLHQpOigobj1adCh0LGUpKS5taWxsaXNlY29uZHM9LW4ubWlsbGlzZWNvbmRzLG4ubW9udGhzPS1uLm1vbnRocyk7cmV0dXJuIG59KFR0KHIuZnJvbSksVHQoci50bykpLChyPXt9KS5tcz1pLm1pbGxpc2Vjb25kcyxyLk09aS5tb250aHMpLHM9bmV3IEh0KHIpLFJ0KGUpJiZtKGUsXCJfbG9jYWxlXCIpJiYocy5fbG9jYWxlPWUuX2xvY2FsZSksc31mdW5jdGlvbiBqdChlLHQpe3ZhciBuPWUmJnBhcnNlRmxvYXQoZS5yZXBsYWNlKFwiLFwiLFwiLlwiKSk7cmV0dXJuKGlzTmFOKG4pPzA6bikqdH1mdW5jdGlvbiBadChlLHQpe3ZhciBuPXttaWxsaXNlY29uZHM6MCxtb250aHM6MH07cmV0dXJuIG4ubW9udGhzPXQubW9udGgoKS1lLm1vbnRoKCkrMTIqKHQueWVhcigpLWUueWVhcigpKSxlLmNsb25lKCkuYWRkKG4ubW9udGhzLFwiTVwiKS5pc0FmdGVyKHQpJiYtLW4ubW9udGhzLG4ubWlsbGlzZWNvbmRzPSt0LStlLmNsb25lKCkuYWRkKG4ubW9udGhzLFwiTVwiKSxufWZ1bmN0aW9uIHp0KHMsaSl7cmV0dXJuIGZ1bmN0aW9uKGUsdCl7dmFyIG47cmV0dXJuIG51bGw9PT10fHxpc05hTigrdCl8fChUKGksXCJtb21lbnQoKS5cIitpK1wiKHBlcmlvZCwgbnVtYmVyKSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIG1vbWVudCgpLlwiK2krXCIobnVtYmVyLCBwZXJpb2QpLiBTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9hZGQtaW52ZXJ0ZWQtcGFyYW0vIGZvciBtb3JlIGluZm8uXCIpLG49ZSxlPXQsdD1uKSwkdCh0aGlzLEF0KGU9XCJzdHJpbmdcIj09dHlwZW9mIGU/K2U6ZSx0KSxzKSx0aGlzfX1mdW5jdGlvbiAkdChlLHQsbixzKXt2YXIgaT10Ll9taWxsaXNlY29uZHMscj1DdCh0Ll9kYXlzKSxhPUN0KHQuX21vbnRocyk7ZS5pc1ZhbGlkKCkmJihzPW51bGw9PXN8fHMsYSYmQ2UoZSx4ZShlLFwiTW9udGhcIikrYSpuKSxyJiZiZShlLFwiRGF0ZVwiLHhlKGUsXCJEYXRlXCIpK3IqbiksaSYmZS5fZC5zZXRUaW1lKGUuX2QudmFsdWVPZigpK2kqbikscyYmYy51cGRhdGVPZmZzZXQoZSxyfHxhKSl9QXQuZm49SHQucHJvdG90eXBlLEF0LmludmFsaWQ9ZnVuY3Rpb24oKXtyZXR1cm4gQXQoTmFOKX07dmFyIHF0PXp0KDEsXCJhZGRcIiksSnQ9enQoLTEsXCJzdWJ0cmFjdFwiKTtmdW5jdGlvbiBCdChlLHQpe3ZhciBuPTEyKih0LnllYXIoKS1lLnllYXIoKSkrKHQubW9udGgoKS1lLm1vbnRoKCkpLHM9ZS5jbG9uZSgpLmFkZChuLFwibW9udGhzXCIpO3JldHVybi0obisodC1zPDA/KHQtcykvKHMtZS5jbG9uZSgpLmFkZChuLTEsXCJtb250aHNcIikpOih0LXMpLyhlLmNsb25lKCkuYWRkKG4rMSxcIm1vbnRoc1wiKS1zKSkpfHwwfWZ1bmN0aW9uIFF0KGUpe3ZhciB0O3JldHVybiB2b2lkIDA9PT1lP3RoaXMuX2xvY2FsZS5fYWJicjoobnVsbCE9KHQ9bHQoZSkpJiYodGhpcy5fbG9jYWxlPXQpLHRoaXMpfWMuZGVmYXVsdEZvcm1hdD1cIllZWVktTU0tRERUSEg6bW06c3NaXCIsYy5kZWZhdWx0Rm9ybWF0VXRjPVwiWVlZWS1NTS1ERFRISDptbTpzc1taXVwiO3ZhciBYdD1uKFwibW9tZW50KCkubGFuZygpIGlzIGRlcHJlY2F0ZWQuIEluc3RlYWQsIHVzZSBtb21lbnQoKS5sb2NhbGVEYXRhKCkgdG8gZ2V0IHRoZSBsYW5ndWFnZSBjb25maWd1cmF0aW9uLiBVc2UgbW9tZW50KCkubG9jYWxlKCkgdG8gY2hhbmdlIGxhbmd1YWdlcy5cIixmdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09ZT90aGlzLmxvY2FsZURhdGEoKTp0aGlzLmxvY2FsZShlKX0pO2Z1bmN0aW9uIEt0KCl7cmV0dXJuIHRoaXMuX2xvY2FsZX1mdW5jdGlvbiBlbihlLHQpe0koMCxbZSxlLmxlbmd0aF0sMCx0KX1mdW5jdGlvbiB0bihlLHQsbixzLGkpe3ZhciByO3JldHVybiBudWxsPT1lP0llKHRoaXMscyxpKS55ZWFyOigocj1BZShlLHMsaSkpPHQmJih0PXIpLGZ1bmN0aW9uKGUsdCxuLHMsaSl7dmFyIHI9RWUoZSx0LG4scyxpKSxhPUdlKHIueWVhciwwLHIuZGF5T2ZZZWFyKTtyZXR1cm4gdGhpcy55ZWFyKGEuZ2V0VVRDRnVsbFllYXIoKSksdGhpcy5tb250aChhLmdldFVUQ01vbnRoKCkpLHRoaXMuZGF0ZShhLmdldFVUQ0RhdGUoKSksdGhpc30uY2FsbCh0aGlzLGUsdCxuLHMsaSkpfUkoMCxbXCJnZ1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy53ZWVrWWVhcigpJTEwMH0pLEkoMCxbXCJHR1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc29XZWVrWWVhcigpJTEwMH0pLGVuKFwiZ2dnZ1wiLFwid2Vla1llYXJcIiksZW4oXCJnZ2dnZ1wiLFwid2Vla1llYXJcIiksZW4oXCJHR0dHXCIsXCJpc29XZWVrWWVhclwiKSxlbihcIkdHR0dHXCIsXCJpc29XZWVrWWVhclwiKSxIKFwid2Vla1llYXJcIixcImdnXCIpLEgoXCJpc29XZWVrWWVhclwiLFwiR0dcIiksTChcIndlZWtZZWFyXCIsMSksTChcImlzb1dlZWtZZWFyXCIsMSksdWUoXCJHXCIsc2UpLHVlKFwiZ1wiLHNlKSx1ZShcIkdHXCIsQix6KSx1ZShcImdnXCIsQix6KSx1ZShcIkdHR0dcIixlZSxxKSx1ZShcImdnZ2dcIixlZSxxKSx1ZShcIkdHR0dHXCIsdGUsSiksdWUoXCJnZ2dnZ1wiLHRlLEopLGZlKFtcImdnZ2dcIixcImdnZ2dnXCIsXCJHR0dHXCIsXCJHR0dHR1wiXSxmdW5jdGlvbihlLHQsbixzKXt0W3Muc3Vic3RyKDAsMildPWsoZSl9KSxmZShbXCJnZ1wiLFwiR0dcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzXT1jLnBhcnNlVHdvRGlnaXRZZWFyKGUpfSksSShcIlFcIiwwLFwiUW9cIixcInF1YXJ0ZXJcIiksSChcInF1YXJ0ZXJcIixcIlFcIiksTChcInF1YXJ0ZXJcIiw3KSx1ZShcIlFcIixaKSxjZShcIlFcIixmdW5jdGlvbihlLHQpe3RbX2VdPTMqKGsoZSktMSl9KSxJKFwiRFwiLFtcIkREXCIsMl0sXCJEb1wiLFwiZGF0ZVwiKSxIKFwiZGF0ZVwiLFwiRFwiKSxMKFwiZGF0ZVwiLDkpLHVlKFwiRFwiLEIpLHVlKFwiRERcIixCLHopLHVlKFwiRG9cIixmdW5jdGlvbihlLHQpe3JldHVybiBlP3QuX2RheU9mTW9udGhPcmRpbmFsUGFyc2V8fHQuX29yZGluYWxQYXJzZTp0Ll9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlTGVuaWVudH0pLGNlKFtcIkRcIixcIkREXCJdLHllKSxjZShcIkRvXCIsZnVuY3Rpb24oZSx0KXt0W3llXT1rKGUubWF0Y2goQilbMF0pfSk7dmFyIG5uPVRlKFwiRGF0ZVwiLCEwKTtJKFwiREREXCIsW1wiRERERFwiLDNdLFwiREREb1wiLFwiZGF5T2ZZZWFyXCIpLEgoXCJkYXlPZlllYXJcIixcIkRERFwiKSxMKFwiZGF5T2ZZZWFyXCIsNCksdWUoXCJERERcIixLKSx1ZShcIkRERERcIiwkKSxjZShbXCJERERcIixcIkRERERcIl0sZnVuY3Rpb24oZSx0LG4pe24uX2RheU9mWWVhcj1rKGUpfSksSShcIm1cIixbXCJtbVwiLDJdLDAsXCJtaW51dGVcIiksSChcIm1pbnV0ZVwiLFwibVwiKSxMKFwibWludXRlXCIsMTQpLHVlKFwibVwiLEIpLHVlKFwibW1cIixCLHopLGNlKFtcIm1cIixcIm1tXCJdLHBlKTt2YXIgc249VGUoXCJNaW51dGVzXCIsITEpO0koXCJzXCIsW1wic3NcIiwyXSwwLFwic2Vjb25kXCIpLEgoXCJzZWNvbmRcIixcInNcIiksTChcInNlY29uZFwiLDE1KSx1ZShcInNcIixCKSx1ZShcInNzXCIsQix6KSxjZShbXCJzXCIsXCJzc1wiXSx2ZSk7dmFyIHJuLGFuPVRlKFwiU2Vjb25kc1wiLCExKTtmb3IoSShcIlNcIiwwLDAsZnVuY3Rpb24oKXtyZXR1cm5+fih0aGlzLm1pbGxpc2Vjb25kKCkvMTAwKX0pLEkoMCxbXCJTU1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm5+fih0aGlzLm1pbGxpc2Vjb25kKCkvMTApfSksSSgwLFtcIlNTU1wiLDNdLDAsXCJtaWxsaXNlY29uZFwiKSxJKDAsW1wiU1NTU1wiLDRdLDAsZnVuY3Rpb24oKXtyZXR1cm4gMTAqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTXCIsNV0sMCxmdW5jdGlvbigpe3JldHVybiAxMDAqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1wiLDZdLDAsZnVuY3Rpb24oKXtyZXR1cm4gMWUzKnRoaXMubWlsbGlzZWNvbmQoKX0pLEkoMCxbXCJTU1NTU1NTXCIsN10sMCxmdW5jdGlvbigpe3JldHVybiAxZTQqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1NTXCIsOF0sMCxmdW5jdGlvbigpe3JldHVybiAxZTUqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1NTU1wiLDldLDAsZnVuY3Rpb24oKXtyZXR1cm4gMWU2KnRoaXMubWlsbGlzZWNvbmQoKX0pLEgoXCJtaWxsaXNlY29uZFwiLFwibXNcIiksTChcIm1pbGxpc2Vjb25kXCIsMTYpLHVlKFwiU1wiLEssWiksdWUoXCJTU1wiLEsseiksdWUoXCJTU1NcIixLLCQpLHJuPVwiU1NTU1wiO3JuLmxlbmd0aDw9OTtybis9XCJTXCIpdWUocm4sbmUpO2Z1bmN0aW9uIG9uKGUsdCl7dFt3ZV09aygxZTMqKFwiMC5cIitlKSl9Zm9yKHJuPVwiU1wiO3JuLmxlbmd0aDw9OTtybis9XCJTXCIpY2Uocm4sb24pO3ZhciB1bj1UZShcIk1pbGxpc2Vjb25kc1wiLCExKTtJKFwielwiLDAsMCxcInpvbmVBYmJyXCIpLEkoXCJ6elwiLDAsMCxcInpvbmVOYW1lXCIpO3ZhciBsbj1NLnByb3RvdHlwZTtmdW5jdGlvbiBkbihlKXtyZXR1cm4gZX1sbi5hZGQ9cXQsbG4uY2FsZW5kYXI9ZnVuY3Rpb24oZSx0KXt2YXIgbj1lfHxUdCgpLHM9TnQobix0aGlzKS5zdGFydE9mKFwiZGF5XCIpLGk9Yy5jYWxlbmRhckZvcm1hdCh0aGlzLHMpfHxcInNhbWVFbHNlXCIscj10JiYoeCh0W2ldKT90W2ldLmNhbGwodGhpcyxuKTp0W2ldKTtyZXR1cm4gdGhpcy5mb3JtYXQocnx8dGhpcy5sb2NhbGVEYXRhKCkuY2FsZW5kYXIoaSx0aGlzLFR0KG4pKSl9LGxuLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBNKHRoaXMpfSxsbi5kaWZmPWZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpLHI7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBOYU47aWYoIShzPU50KGUsdGhpcykpLmlzVmFsaWQoKSlyZXR1cm4gTmFOO3N3aXRjaChpPTZlNCoocy51dGNPZmZzZXQoKS10aGlzLnV0Y09mZnNldCgpKSx0PVIodCkpe2Nhc2VcInllYXJcIjpyPUJ0KHRoaXMscykvMTI7YnJlYWs7Y2FzZVwibW9udGhcIjpyPUJ0KHRoaXMscyk7YnJlYWs7Y2FzZVwicXVhcnRlclwiOnI9QnQodGhpcyxzKS8zO2JyZWFrO2Nhc2VcInNlY29uZFwiOnI9KHRoaXMtcykvMWUzO2JyZWFrO2Nhc2VcIm1pbnV0ZVwiOnI9KHRoaXMtcykvNmU0O2JyZWFrO2Nhc2VcImhvdXJcIjpyPSh0aGlzLXMpLzM2ZTU7YnJlYWs7Y2FzZVwiZGF5XCI6cj0odGhpcy1zLWkpLzg2NGU1O2JyZWFrO2Nhc2VcIndlZWtcIjpyPSh0aGlzLXMtaSkvNjA0OGU1O2JyZWFrO2RlZmF1bHQ6cj10aGlzLXN9cmV0dXJuIG4/cjpEKHIpfSxsbi5lbmRPZj1mdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09KGU9UihlKSl8fFwibWlsbGlzZWNvbmRcIj09PWU/dGhpczooXCJkYXRlXCI9PT1lJiYoZT1cImRheVwiKSx0aGlzLnN0YXJ0T2YoZSkuYWRkKDEsXCJpc29XZWVrXCI9PT1lP1wid2Vla1wiOmUpLnN1YnRyYWN0KDEsXCJtc1wiKSl9LGxuLmZvcm1hdD1mdW5jdGlvbihlKXtlfHwoZT10aGlzLmlzVXRjKCk/Yy5kZWZhdWx0Rm9ybWF0VXRjOmMuZGVmYXVsdEZvcm1hdCk7dmFyIHQ9QSh0aGlzLGUpO3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KHQpfSxsbi5mcm9tPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHRoaXMuaXNWYWxpZCgpJiYoUyhlKSYmZS5pc1ZhbGlkKCl8fFR0KGUpLmlzVmFsaWQoKSk/QXQoe3RvOnRoaXMsZnJvbTplfSkubG9jYWxlKHRoaXMubG9jYWxlKCkpLmh1bWFuaXplKCF0KTp0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpfSxsbi5mcm9tTm93PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmZyb20oVHQoKSxlKX0sbG4udG89ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJihTKGUpJiZlLmlzVmFsaWQoKXx8VHQoZSkuaXNWYWxpZCgpKT9BdCh7ZnJvbTp0aGlzLHRvOmV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXQpOnRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCl9LGxuLnRvTm93PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLnRvKFR0KCksZSl9LGxuLmdldD1mdW5jdGlvbihlKXtyZXR1cm4geCh0aGlzW2U9UihlKV0pP3RoaXNbZV0oKTp0aGlzfSxsbi5pbnZhbGlkQXQ9ZnVuY3Rpb24oKXtyZXR1cm4gZyh0aGlzKS5vdmVyZmxvd30sbG4uaXNBZnRlcj1mdW5jdGlvbihlLHQpe3ZhciBuPVMoZSk/ZTpUdChlKTtyZXR1cm4hKCF0aGlzLmlzVmFsaWQoKXx8IW4uaXNWYWxpZCgpKSYmKFwibWlsbGlzZWNvbmRcIj09PSh0PVIobCh0KT9cIm1pbGxpc2Vjb25kXCI6dCkpP3RoaXMudmFsdWVPZigpPm4udmFsdWVPZigpOm4udmFsdWVPZigpPHRoaXMuY2xvbmUoKS5zdGFydE9mKHQpLnZhbHVlT2YoKSl9LGxuLmlzQmVmb3JlPWZ1bmN0aW9uKGUsdCl7dmFyIG49UyhlKT9lOlR0KGUpO3JldHVybiEoIXRoaXMuaXNWYWxpZCgpfHwhbi5pc1ZhbGlkKCkpJiYoXCJtaWxsaXNlY29uZFwiPT09KHQ9UihsKHQpP1wibWlsbGlzZWNvbmRcIjp0KSk/dGhpcy52YWx1ZU9mKCk8bi52YWx1ZU9mKCk6dGhpcy5jbG9uZSgpLmVuZE9mKHQpLnZhbHVlT2YoKTxuLnZhbHVlT2YoKSl9LGxuLmlzQmV0d2Vlbj1mdW5jdGlvbihlLHQsbixzKXtyZXR1cm4oXCIoXCI9PT0ocz1zfHxcIigpXCIpWzBdP3RoaXMuaXNBZnRlcihlLG4pOiF0aGlzLmlzQmVmb3JlKGUsbikpJiYoXCIpXCI9PT1zWzFdP3RoaXMuaXNCZWZvcmUodCxuKTohdGhpcy5pc0FmdGVyKHQsbikpfSxsbi5pc1NhbWU9ZnVuY3Rpb24oZSx0KXt2YXIgbixzPVMoZSk/ZTpUdChlKTtyZXR1cm4hKCF0aGlzLmlzVmFsaWQoKXx8IXMuaXNWYWxpZCgpKSYmKFwibWlsbGlzZWNvbmRcIj09PSh0PVIodHx8XCJtaWxsaXNlY29uZFwiKSk/dGhpcy52YWx1ZU9mKCk9PT1zLnZhbHVlT2YoKToobj1zLnZhbHVlT2YoKSx0aGlzLmNsb25lKCkuc3RhcnRPZih0KS52YWx1ZU9mKCk8PW4mJm48PXRoaXMuY2xvbmUoKS5lbmRPZih0KS52YWx1ZU9mKCkpKX0sbG4uaXNTYW1lT3JBZnRlcj1mdW5jdGlvbihlLHQpe3JldHVybiB0aGlzLmlzU2FtZShlLHQpfHx0aGlzLmlzQWZ0ZXIoZSx0KX0sbG4uaXNTYW1lT3JCZWZvcmU9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdGhpcy5pc1NhbWUoZSx0KXx8dGhpcy5pc0JlZm9yZShlLHQpfSxsbi5pc1ZhbGlkPWZ1bmN0aW9uKCl7cmV0dXJuIHAodGhpcyl9LGxuLmxhbmc9WHQsbG4ubG9jYWxlPVF0LGxuLmxvY2FsZURhdGE9S3QsbG4ubWF4PWJ0LGxuLm1pbj14dCxsbi5wYXJzaW5nRmxhZ3M9ZnVuY3Rpb24oKXtyZXR1cm4gXyh7fSxnKHRoaXMpKX0sbG4uc2V0PWZ1bmN0aW9uKGUsdCl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGUpZm9yKHZhciBuPWZ1bmN0aW9uKGUpe3ZhciB0PVtdO2Zvcih2YXIgbiBpbiBlKXQucHVzaCh7dW5pdDpuLHByaW9yaXR5OkZbbl19KTtyZXR1cm4gdC5zb3J0KGZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUucHJpb3JpdHktdC5wcmlvcml0eX0pLHR9KGU9QyhlKSkscz0wO3M8bi5sZW5ndGg7cysrKXRoaXNbbltzXS51bml0XShlW25bc10udW5pdF0pO2Vsc2UgaWYoeCh0aGlzW2U9UihlKV0pKXJldHVybiB0aGlzW2VdKHQpO3JldHVybiB0aGlzfSxsbi5zdGFydE9mPWZ1bmN0aW9uKGUpe3N3aXRjaChlPVIoZSkpe2Nhc2VcInllYXJcIjp0aGlzLm1vbnRoKDApO2Nhc2VcInF1YXJ0ZXJcIjpjYXNlXCJtb250aFwiOnRoaXMuZGF0ZSgxKTtjYXNlXCJ3ZWVrXCI6Y2FzZVwiaXNvV2Vla1wiOmNhc2VcImRheVwiOmNhc2VcImRhdGVcIjp0aGlzLmhvdXJzKDApO2Nhc2VcImhvdXJcIjp0aGlzLm1pbnV0ZXMoMCk7Y2FzZVwibWludXRlXCI6dGhpcy5zZWNvbmRzKDApO2Nhc2VcInNlY29uZFwiOnRoaXMubWlsbGlzZWNvbmRzKDApfXJldHVyblwid2Vla1wiPT09ZSYmdGhpcy53ZWVrZGF5KDApLFwiaXNvV2Vla1wiPT09ZSYmdGhpcy5pc29XZWVrZGF5KDEpLFwicXVhcnRlclwiPT09ZSYmdGhpcy5tb250aCgzKk1hdGguZmxvb3IodGhpcy5tb250aCgpLzMpKSx0aGlzfSxsbi5zdWJ0cmFjdD1KdCxsbi50b0FycmF5PWZ1bmN0aW9uKCl7dmFyIGU9dGhpcztyZXR1cm5bZS55ZWFyKCksZS5tb250aCgpLGUuZGF0ZSgpLGUuaG91cigpLGUubWludXRlKCksZS5zZWNvbmQoKSxlLm1pbGxpc2Vjb25kKCldfSxsbi50b09iamVjdD1mdW5jdGlvbigpe3ZhciBlPXRoaXM7cmV0dXJue3llYXJzOmUueWVhcigpLG1vbnRoczplLm1vbnRoKCksZGF0ZTplLmRhdGUoKSxob3VyczplLmhvdXJzKCksbWludXRlczplLm1pbnV0ZXMoKSxzZWNvbmRzOmUuc2Vjb25kcygpLG1pbGxpc2Vjb25kczplLm1pbGxpc2Vjb25kcygpfX0sbG4udG9EYXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBEYXRlKHRoaXMudmFsdWVPZigpKX0sbG4udG9JU09TdHJpbmc9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsO3ZhciB0PSEwIT09ZSxuPXQ/dGhpcy5jbG9uZSgpLnV0YygpOnRoaXM7cmV0dXJuIG4ueWVhcigpPDB8fDk5OTk8bi55ZWFyKCk/QShuLHQ/XCJZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1cIjpcIllZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1pcIik6eChEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZyk/dD90aGlzLnRvRGF0ZSgpLnRvSVNPU3RyaW5nKCk6bmV3IERhdGUodGhpcy52YWx1ZU9mKCkrNjAqdGhpcy51dGNPZmZzZXQoKSoxZTMpLnRvSVNPU3RyaW5nKCkucmVwbGFjZShcIlpcIixBKG4sXCJaXCIpKTpBKG4sdD9cIllZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1cIjpcIllZWVktTU0tRERbVF1ISDptbTpzcy5TU1NaXCIpfSxsbi5pbnNwZWN0PWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVyblwibW9tZW50LmludmFsaWQoLyogXCIrdGhpcy5faStcIiAqLylcIjt2YXIgZT1cIm1vbWVudFwiLHQ9XCJcIjt0aGlzLmlzTG9jYWwoKXx8KGU9MD09PXRoaXMudXRjT2Zmc2V0KCk/XCJtb21lbnQudXRjXCI6XCJtb21lbnQucGFyc2Vab25lXCIsdD1cIlpcIik7dmFyIG49XCJbXCIrZSsnKFwiXScscz0wPD10aGlzLnllYXIoKSYmdGhpcy55ZWFyKCk8PTk5OTk/XCJZWVlZXCI6XCJZWVlZWVlcIixpPXQrJ1tcIildJztyZXR1cm4gdGhpcy5mb3JtYXQobitzK1wiLU1NLUREW1RdSEg6bW06c3MuU1NTXCIraSl9LGxuLnRvSlNPTj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLnRvSVNPU3RyaW5nKCk6bnVsbH0sbG4udG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZShcImVuXCIpLmZvcm1hdChcImRkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaXCIpfSxsbi51bml4PWZ1bmN0aW9uKCl7cmV0dXJuIE1hdGguZmxvb3IodGhpcy52YWx1ZU9mKCkvMWUzKX0sbG4udmFsdWVPZj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9kLnZhbHVlT2YoKS02ZTQqKHRoaXMuX29mZnNldHx8MCl9LGxuLmNyZWF0aW9uRGF0YT1mdW5jdGlvbigpe3JldHVybntpbnB1dDp0aGlzLl9pLGZvcm1hdDp0aGlzLl9mLGxvY2FsZTp0aGlzLl9sb2NhbGUsaXNVVEM6dGhpcy5faXNVVEMsc3RyaWN0OnRoaXMuX3N0cmljdH19LGxuLnllYXI9T2UsbG4uaXNMZWFwWWVhcj1mdW5jdGlvbigpe3JldHVybiBrZSh0aGlzLnllYXIoKSl9LGxuLndlZWtZZWFyPWZ1bmN0aW9uKGUpe3JldHVybiB0bi5jYWxsKHRoaXMsZSx0aGlzLndlZWsoKSx0aGlzLndlZWtkYXkoKSx0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3csdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG95KX0sbG4uaXNvV2Vla1llYXI9ZnVuY3Rpb24oZSl7cmV0dXJuIHRuLmNhbGwodGhpcyxlLHRoaXMuaXNvV2VlaygpLHRoaXMuaXNvV2Vla2RheSgpLDEsNCl9LGxuLnF1YXJ0ZXI9bG4ucXVhcnRlcnM9ZnVuY3Rpb24oZSl7cmV0dXJuIG51bGw9PWU/TWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkrMSkvMyk6dGhpcy5tb250aCgzKihlLTEpK3RoaXMubW9udGgoKSUzKX0sbG4ubW9udGg9RmUsbG4uZGF5c0luTW9udGg9ZnVuY3Rpb24oKXtyZXR1cm4gUGUodGhpcy55ZWFyKCksdGhpcy5tb250aCgpKX0sbG4ud2Vlaz1sbi53ZWVrcz1mdW5jdGlvbihlKXt2YXIgdD10aGlzLmxvY2FsZURhdGEoKS53ZWVrKHRoaXMpO3JldHVybiBudWxsPT1lP3Q6dGhpcy5hZGQoNyooZS10KSxcImRcIil9LGxuLmlzb1dlZWs9bG4uaXNvV2Vla3M9ZnVuY3Rpb24oZSl7dmFyIHQ9SWUodGhpcywxLDQpLndlZWs7cmV0dXJuIG51bGw9PWU/dDp0aGlzLmFkZCg3KihlLXQpLFwiZFwiKX0sbG4ud2Vla3NJblllYXI9ZnVuY3Rpb24oKXt2YXIgZT10aGlzLmxvY2FsZURhdGEoKS5fd2VlaztyZXR1cm4gQWUodGhpcy55ZWFyKCksZS5kb3csZS5kb3kpfSxsbi5pc29XZWVrc0luWWVhcj1mdW5jdGlvbigpe3JldHVybiBBZSh0aGlzLnllYXIoKSwxLDQpfSxsbi5kYXRlPW5uLGxuLmRheT1sbi5kYXlzPWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gbnVsbCE9ZT90aGlzOk5hTjt2YXIgdCxuLHM9dGhpcy5faXNVVEM/dGhpcy5fZC5nZXRVVENEYXkoKTp0aGlzLl9kLmdldERheSgpO3JldHVybiBudWxsIT1lPyh0PWUsbj10aGlzLmxvY2FsZURhdGEoKSxlPVwic3RyaW5nXCIhPXR5cGVvZiB0P3Q6aXNOYU4odCk/XCJudW1iZXJcIj09dHlwZW9mKHQ9bi53ZWVrZGF5c1BhcnNlKHQpKT90Om51bGw6cGFyc2VJbnQodCwxMCksdGhpcy5hZGQoZS1zLFwiZFwiKSk6c30sbG4ud2Vla2RheT1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIG51bGwhPWU/dGhpczpOYU47dmFyIHQ9KHRoaXMuZGF5KCkrNy10aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3cpJTc7cmV0dXJuIG51bGw9PWU/dDp0aGlzLmFkZChlLXQsXCJkXCIpfSxsbi5pc29XZWVrZGF5PWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gbnVsbCE9ZT90aGlzOk5hTjtpZihudWxsIT1lKXt2YXIgdD0obj1lLHM9dGhpcy5sb2NhbGVEYXRhKCksXCJzdHJpbmdcIj09dHlwZW9mIG4/cy53ZWVrZGF5c1BhcnNlKG4pJTd8fDc6aXNOYU4obik/bnVsbDpuKTtyZXR1cm4gdGhpcy5kYXkodGhpcy5kYXkoKSU3P3Q6dC03KX1yZXR1cm4gdGhpcy5kYXkoKXx8Nzt2YXIgbixzfSxsbi5kYXlPZlllYXI9ZnVuY3Rpb24oZSl7dmFyIHQ9TWF0aC5yb3VuZCgodGhpcy5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIiktdGhpcy5jbG9uZSgpLnN0YXJ0T2YoXCJ5ZWFyXCIpKS84NjRlNSkrMTtyZXR1cm4gbnVsbD09ZT90OnRoaXMuYWRkKGUtdCxcImRcIil9LGxuLmhvdXI9bG4uaG91cnM9dHQsbG4ubWludXRlPWxuLm1pbnV0ZXM9c24sbG4uc2Vjb25kPWxuLnNlY29uZHM9YW4sbG4ubWlsbGlzZWNvbmQ9bG4ubWlsbGlzZWNvbmRzPXVuLGxuLnV0Y09mZnNldD1mdW5jdGlvbihlLHQsbil7dmFyIHMsaT10aGlzLl9vZmZzZXR8fDA7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsIT1lP3RoaXM6TmFOO2lmKG51bGwhPWUpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiBlKXtpZihudWxsPT09KGU9VXQocmUsZSkpKXJldHVybiB0aGlzfWVsc2UgTWF0aC5hYnMoZSk8MTYmJiFuJiYoZSo9NjApO3JldHVybiF0aGlzLl9pc1VUQyYmdCYmKHM9R3QodGhpcykpLHRoaXMuX29mZnNldD1lLHRoaXMuX2lzVVRDPSEwLG51bGwhPXMmJnRoaXMuYWRkKHMsXCJtXCIpLGkhPT1lJiYoIXR8fHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3M/JHQodGhpcyxBdChlLWksXCJtXCIpLDEsITEpOnRoaXMuX2NoYW5nZUluUHJvZ3Jlc3N8fCh0aGlzLl9jaGFuZ2VJblByb2dyZXNzPSEwLGMudXBkYXRlT2Zmc2V0KHRoaXMsITApLHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3M9bnVsbCkpLHRoaXN9cmV0dXJuIHRoaXMuX2lzVVRDP2k6R3QodGhpcyl9LGxuLnV0Yz1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy51dGNPZmZzZXQoMCxlKX0sbG4ubG9jYWw9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2lzVVRDJiYodGhpcy51dGNPZmZzZXQoMCxlKSx0aGlzLl9pc1VUQz0hMSxlJiZ0aGlzLnN1YnRyYWN0KEd0KHRoaXMpLFwibVwiKSksdGhpc30sbG4ucGFyc2Vab25lPWZ1bmN0aW9uKCl7aWYobnVsbCE9dGhpcy5fdHptKXRoaXMudXRjT2Zmc2V0KHRoaXMuX3R6bSwhMSwhMCk7ZWxzZSBpZihcInN0cmluZ1wiPT10eXBlb2YgdGhpcy5faSl7dmFyIGU9VXQoaWUsdGhpcy5faSk7bnVsbCE9ZT90aGlzLnV0Y09mZnNldChlKTp0aGlzLnV0Y09mZnNldCgwLCEwKX1yZXR1cm4gdGhpc30sbG4uaGFzQWxpZ25lZEhvdXJPZmZzZXQ9ZnVuY3Rpb24oZSl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmKGU9ZT9UdChlKS51dGNPZmZzZXQoKTowLCh0aGlzLnV0Y09mZnNldCgpLWUpJTYwPT0wKX0sbG4uaXNEU1Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51dGNPZmZzZXQoKT50aGlzLmNsb25lKCkubW9udGgoMCkudXRjT2Zmc2V0KCl8fHRoaXMudXRjT2Zmc2V0KCk+dGhpcy5jbG9uZSgpLm1vbnRoKDUpLnV0Y09mZnNldCgpfSxsbi5pc0xvY2FsPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmIXRoaXMuX2lzVVRDfSxsbi5pc1V0Y09mZnNldD1mdW5jdGlvbigpe3JldHVybiEhdGhpcy5pc1ZhbGlkKCkmJnRoaXMuX2lzVVRDfSxsbi5pc1V0Yz1WdCxsbi5pc1VUQz1WdCxsbi56b25lQWJicj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pc1VUQz9cIlVUQ1wiOlwiXCJ9LGxuLnpvbmVOYW1lPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2lzVVRDP1wiQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWVcIjpcIlwifSxsbi5kYXRlcz1uKFwiZGF0ZXMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIGRhdGUgaW5zdGVhZC5cIixubiksbG4ubW9udGhzPW4oXCJtb250aHMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbnRoIGluc3RlYWRcIixGZSksbG4ueWVhcnM9bihcInllYXJzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSB5ZWFyIGluc3RlYWRcIixPZSksbG4uem9uZT1uKFwibW9tZW50KCkuem9uZSBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50KCkudXRjT2Zmc2V0IGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3Mvem9uZS9cIixmdW5jdGlvbihlLHQpe3JldHVybiBudWxsIT1lPyhcInN0cmluZ1wiIT10eXBlb2YgZSYmKGU9LWUpLHRoaXMudXRjT2Zmc2V0KGUsdCksdGhpcyk6LXRoaXMudXRjT2Zmc2V0KCl9KSxsbi5pc0RTVFNoaWZ0ZWQ9bihcImlzRFNUU2hpZnRlZCBpcyBkZXByZWNhdGVkLiBTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9kc3Qtc2hpZnRlZC8gZm9yIG1vcmUgaW5mb3JtYXRpb25cIixmdW5jdGlvbigpe2lmKCFsKHRoaXMuX2lzRFNUU2hpZnRlZCkpcmV0dXJuIHRoaXMuX2lzRFNUU2hpZnRlZDt2YXIgZT17fTtpZih3KGUsdGhpcyksKGU9WXQoZSkpLl9hKXt2YXIgdD1lLl9pc1VUQz95KGUuX2EpOlR0KGUuX2EpO3RoaXMuX2lzRFNUU2hpZnRlZD10aGlzLmlzVmFsaWQoKSYmMDxhKGUuX2EsdC50b0FycmF5KCkpfWVsc2UgdGhpcy5faXNEU1RTaGlmdGVkPSExO3JldHVybiB0aGlzLl9pc0RTVFNoaWZ0ZWR9KTt2YXIgaG49UC5wcm90b3R5cGU7ZnVuY3Rpb24gY24oZSx0LG4scyl7dmFyIGk9bHQoKSxyPXkoKS5zZXQocyx0KTtyZXR1cm4gaVtuXShyLGUpfWZ1bmN0aW9uIGZuKGUsdCxuKXtpZihkKGUpJiYodD1lLGU9dm9pZCAwKSxlPWV8fFwiXCIsbnVsbCE9dClyZXR1cm4gY24oZSx0LG4sXCJtb250aFwiKTt2YXIgcyxpPVtdO2ZvcihzPTA7czwxMjtzKyspaVtzXT1jbihlLHMsbixcIm1vbnRoXCIpO3JldHVybiBpfWZ1bmN0aW9uIG1uKGUsdCxuLHMpe1wiYm9vbGVhblwiPT10eXBlb2YgZT9kKHQpJiYobj10LHQ9dm9pZCAwKToodD1lLGU9ITEsZChuPXQpJiYobj10LHQ9dm9pZCAwKSksdD10fHxcIlwiO3ZhciBpLHI9bHQoKSxhPWU/ci5fd2Vlay5kb3c6MDtpZihudWxsIT1uKXJldHVybiBjbih0LChuK2EpJTcscyxcImRheVwiKTt2YXIgbz1bXTtmb3IoaT0wO2k8NztpKyspb1tpXT1jbih0LChpK2EpJTcscyxcImRheVwiKTtyZXR1cm4gb31obi5jYWxlbmRhcj1mdW5jdGlvbihlLHQsbil7dmFyIHM9dGhpcy5fY2FsZW5kYXJbZV18fHRoaXMuX2NhbGVuZGFyLnNhbWVFbHNlO3JldHVybiB4KHMpP3MuY2FsbCh0LG4pOnN9LGhuLmxvbmdEYXRlRm9ybWF0PWZ1bmN0aW9uKGUpe3ZhciB0PXRoaXMuX2xvbmdEYXRlRm9ybWF0W2VdLG49dGhpcy5fbG9uZ0RhdGVGb3JtYXRbZS50b1VwcGVyQ2FzZSgpXTtyZXR1cm4gdHx8IW4/dDoodGhpcy5fbG9uZ0RhdGVGb3JtYXRbZV09bi5yZXBsYWNlKC9NTU1NfE1NfEREfGRkZGQvZyxmdW5jdGlvbihlKXtyZXR1cm4gZS5zbGljZSgxKX0pLHRoaXMuX2xvbmdEYXRlRm9ybWF0W2VdKX0saG4uaW52YWxpZERhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faW52YWxpZERhdGV9LGhuLm9yZGluYWw9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZShcIiVkXCIsZSl9LGhuLnByZXBhcnNlPWRuLGhuLnBvc3Rmb3JtYXQ9ZG4saG4ucmVsYXRpdmVUaW1lPWZ1bmN0aW9uKGUsdCxuLHMpe3ZhciBpPXRoaXMuX3JlbGF0aXZlVGltZVtuXTtyZXR1cm4geChpKT9pKGUsdCxuLHMpOmkucmVwbGFjZSgvJWQvaSxlKX0saG4ucGFzdEZ1dHVyZT1mdW5jdGlvbihlLHQpe3ZhciBuPXRoaXMuX3JlbGF0aXZlVGltZVswPGU/XCJmdXR1cmVcIjpcInBhc3RcIl07cmV0dXJuIHgobik/bih0KTpuLnJlcGxhY2UoLyVzL2ksdCl9LGhuLnNldD1mdW5jdGlvbihlKXt2YXIgdCxuO2ZvcihuIGluIGUpeCh0PWVbbl0pP3RoaXNbbl09dDp0aGlzW1wiX1wiK25dPXQ7dGhpcy5fY29uZmlnPWUsdGhpcy5fZGF5T2ZNb250aE9yZGluYWxQYXJzZUxlbmllbnQ9bmV3IFJlZ0V4cCgodGhpcy5fZGF5T2ZNb250aE9yZGluYWxQYXJzZS5zb3VyY2V8fHRoaXMuX29yZGluYWxQYXJzZS5zb3VyY2UpK1wifFwiKy9cXGR7MSwyfS8uc291cmNlKX0saG4ubW9udGhzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl9tb250aHMpP3RoaXMuX21vbnRoc1tlLm1vbnRoKCldOnRoaXMuX21vbnRoc1sodGhpcy5fbW9udGhzLmlzRm9ybWF0fHxXZSkudGVzdCh0KT9cImZvcm1hdFwiOlwic3RhbmRhbG9uZVwiXVtlLm1vbnRoKCldOm8odGhpcy5fbW9udGhzKT90aGlzLl9tb250aHM6dGhpcy5fbW9udGhzLnN0YW5kYWxvbmV9LGhuLm1vbnRoc1Nob3J0PWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl9tb250aHNTaG9ydCk/dGhpcy5fbW9udGhzU2hvcnRbZS5tb250aCgpXTp0aGlzLl9tb250aHNTaG9ydFtXZS50ZXN0KHQpP1wiZm9ybWF0XCI6XCJzdGFuZGFsb25lXCJdW2UubW9udGgoKV06byh0aGlzLl9tb250aHNTaG9ydCk/dGhpcy5fbW9udGhzU2hvcnQ6dGhpcy5fbW9udGhzU2hvcnQuc3RhbmRhbG9uZX0saG4ubW9udGhzUGFyc2U9ZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscjtpZih0aGlzLl9tb250aHNQYXJzZUV4YWN0KXJldHVybiBmdW5jdGlvbihlLHQsbil7dmFyIHMsaSxyLGE9ZS50b0xvY2FsZUxvd2VyQ2FzZSgpO2lmKCF0aGlzLl9tb250aHNQYXJzZSlmb3IodGhpcy5fbW9udGhzUGFyc2U9W10sdGhpcy5fbG9uZ01vbnRoc1BhcnNlPVtdLHRoaXMuX3Nob3J0TW9udGhzUGFyc2U9W10scz0wO3M8MTI7KytzKXI9eShbMmUzLHNdKSx0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW3NdPXRoaXMubW9udGhzU2hvcnQocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX2xvbmdNb250aHNQYXJzZVtzXT10aGlzLm1vbnRocyhyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCk7cmV0dXJuIG4/XCJNTU1cIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6bnVsbDotMSE9PShpPVllLmNhbGwodGhpcy5fbG9uZ01vbnRoc1BhcnNlLGEpKT9pOm51bGw6XCJNTU1cIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX2xvbmdNb250aHNQYXJzZSxhKSk/aTpudWxsOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9sb25nTW9udGhzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6bnVsbH0uY2FsbCh0aGlzLGUsdCxuKTtmb3IodGhpcy5fbW9udGhzUGFyc2V8fCh0aGlzLl9tb250aHNQYXJzZT1bXSx0aGlzLl9sb25nTW9udGhzUGFyc2U9W10sdGhpcy5fc2hvcnRNb250aHNQYXJzZT1bXSkscz0wO3M8MTI7cysrKXtpZihpPXkoWzJlMyxzXSksbiYmIXRoaXMuX2xvbmdNb250aHNQYXJzZVtzXSYmKHRoaXMuX2xvbmdNb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMubW9udGhzKGksXCJcIikucmVwbGFjZShcIi5cIixcIlwiKStcIiRcIixcImlcIiksdGhpcy5fc2hvcnRNb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMubW9udGhzU2hvcnQoaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXCIpK1wiJFwiLFwiaVwiKSksbnx8dGhpcy5fbW9udGhzUGFyc2Vbc118fChyPVwiXlwiK3RoaXMubW9udGhzKGksXCJcIikrXCJ8XlwiK3RoaXMubW9udGhzU2hvcnQoaSxcIlwiKSx0aGlzLl9tb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKHIucmVwbGFjZShcIi5cIixcIlwiKSxcImlcIikpLG4mJlwiTU1NTVwiPT09dCYmdGhpcy5fbG9uZ01vbnRoc1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHM7aWYobiYmXCJNTU1cIj09PXQmJnRoaXMuX3Nob3J0TW9udGhzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZighbiYmdGhpcy5fbW9udGhzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gc319LGhuLm1vbnRoc1JlZ2V4PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLl9tb250aHNQYXJzZUV4YWN0PyhtKHRoaXMsXCJfbW9udGhzUmVnZXhcIil8fE5lLmNhbGwodGhpcyksZT90aGlzLl9tb250aHNTdHJpY3RSZWdleDp0aGlzLl9tb250aHNSZWdleCk6KG0odGhpcyxcIl9tb250aHNSZWdleFwiKXx8KHRoaXMuX21vbnRoc1JlZ2V4PVVlKSx0aGlzLl9tb250aHNTdHJpY3RSZWdleCYmZT90aGlzLl9tb250aHNTdHJpY3RSZWdleDp0aGlzLl9tb250aHNSZWdleCl9LGhuLm1vbnRoc1Nob3J0UmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX21vbnRoc1BhcnNlRXhhY3Q/KG0odGhpcyxcIl9tb250aHNSZWdleFwiKXx8TmUuY2FsbCh0aGlzKSxlP3RoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXg6dGhpcy5fbW9udGhzU2hvcnRSZWdleCk6KG0odGhpcyxcIl9tb250aHNTaG9ydFJlZ2V4XCIpfHwodGhpcy5fbW9udGhzU2hvcnRSZWdleD1MZSksdGhpcy5fbW9udGhzU2hvcnRTdHJpY3RSZWdleCYmZT90aGlzLl9tb250aHNTaG9ydFN0cmljdFJlZ2V4OnRoaXMuX21vbnRoc1Nob3J0UmVnZXgpfSxobi53ZWVrPWZ1bmN0aW9uKGUpe3JldHVybiBJZShlLHRoaXMuX3dlZWsuZG93LHRoaXMuX3dlZWsuZG95KS53ZWVrfSxobi5maXJzdERheU9mWWVhcj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl93ZWVrLmRveX0saG4uZmlyc3REYXlPZldlZWs9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fd2Vlay5kb3d9LGhuLndlZWtkYXlzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl93ZWVrZGF5cyk/dGhpcy5fd2Vla2RheXNbZS5kYXkoKV06dGhpcy5fd2Vla2RheXNbdGhpcy5fd2Vla2RheXMuaXNGb3JtYXQudGVzdCh0KT9cImZvcm1hdFwiOlwic3RhbmRhbG9uZVwiXVtlLmRheSgpXTpvKHRoaXMuX3dlZWtkYXlzKT90aGlzLl93ZWVrZGF5czp0aGlzLl93ZWVrZGF5cy5zdGFuZGFsb25lfSxobi53ZWVrZGF5c01pbj1mdW5jdGlvbihlKXtyZXR1cm4gZT90aGlzLl93ZWVrZGF5c01pbltlLmRheSgpXTp0aGlzLl93ZWVrZGF5c01pbn0saG4ud2Vla2RheXNTaG9ydD1mdW5jdGlvbihlKXtyZXR1cm4gZT90aGlzLl93ZWVrZGF5c1Nob3J0W2UuZGF5KCldOnRoaXMuX3dlZWtkYXlzU2hvcnR9LGhuLndlZWtkYXlzUGFyc2U9ZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscjtpZih0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3QpcmV0dXJuIGZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpLHIsYT1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7aWYoIXRoaXMuX3dlZWtkYXlzUGFyc2UpZm9yKHRoaXMuX3dlZWtkYXlzUGFyc2U9W10sdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlPVtdLHRoaXMuX21pbldlZWtkYXlzUGFyc2U9W10scz0wO3M8NzsrK3Mpcj15KFsyZTMsMV0pLmRheShzKSx0aGlzLl9taW5XZWVrZGF5c1BhcnNlW3NdPXRoaXMud2Vla2RheXNNaW4ocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZVtzXT10aGlzLndlZWtkYXlzU2hvcnQocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX3dlZWtkYXlzUGFyc2Vbc109dGhpcy53ZWVrZGF5cyhyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCk7cmV0dXJuIG4/XCJkZGRkXCI9PT10Py0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6XCJkZGRcIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSxhKSk/aTpudWxsOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6XCJkZGRkXCI9PT10Py0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6bnVsbDpcImRkZFwiPT09dD8tMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSxhKSk/aTpudWxsfS5jYWxsKHRoaXMsZSx0LG4pO2Zvcih0aGlzLl93ZWVrZGF5c1BhcnNlfHwodGhpcy5fd2Vla2RheXNQYXJzZT1bXSx0aGlzLl9taW5XZWVrZGF5c1BhcnNlPVtdLHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZT1bXSx0aGlzLl9mdWxsV2Vla2RheXNQYXJzZT1bXSkscz0wO3M8NztzKyspe2lmKGk9eShbMmUzLDFdKS5kYXkocyksbiYmIXRoaXMuX2Z1bGxXZWVrZGF5c1BhcnNlW3NdJiYodGhpcy5fZnVsbFdlZWtkYXlzUGFyc2Vbc109bmV3IFJlZ0V4cChcIl5cIit0aGlzLndlZWtkYXlzKGksXCJcIikucmVwbGFjZShcIi5cIixcIlxcXFwuP1wiKStcIiRcIixcImlcIiksdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlW3NdPW5ldyBSZWdFeHAoXCJeXCIrdGhpcy53ZWVrZGF5c1Nob3J0KGksXCJcIikucmVwbGFjZShcIi5cIixcIlxcXFwuP1wiKStcIiRcIixcImlcIiksdGhpcy5fbWluV2Vla2RheXNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMud2Vla2RheXNNaW4oaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXFxcXC4/XCIpK1wiJFwiLFwiaVwiKSksdGhpcy5fd2Vla2RheXNQYXJzZVtzXXx8KHI9XCJeXCIrdGhpcy53ZWVrZGF5cyhpLFwiXCIpK1wifF5cIit0aGlzLndlZWtkYXlzU2hvcnQoaSxcIlwiKStcInxeXCIrdGhpcy53ZWVrZGF5c01pbihpLFwiXCIpLHRoaXMuX3dlZWtkYXlzUGFyc2Vbc109bmV3IFJlZ0V4cChyLnJlcGxhY2UoXCIuXCIsXCJcIiksXCJpXCIpKSxuJiZcImRkZGRcIj09PXQmJnRoaXMuX2Z1bGxXZWVrZGF5c1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHM7aWYobiYmXCJkZGRcIj09PXQmJnRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzO2lmKG4mJlwiZGRcIj09PXQmJnRoaXMuX21pbldlZWtkYXlzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZighbiYmdGhpcy5fd2Vla2RheXNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzfX0saG4ud2Vla2RheXNSZWdleD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fd2Vla2RheXNQYXJzZUV4YWN0PyhtKHRoaXMsXCJfd2Vla2RheXNSZWdleFwiKXx8QmUuY2FsbCh0aGlzKSxlP3RoaXMuX3dlZWtkYXlzU3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNSZWdleCk6KG0odGhpcyxcIl93ZWVrZGF5c1JlZ2V4XCIpfHwodGhpcy5fd2Vla2RheXNSZWdleD0kZSksdGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleCYmZT90aGlzLl93ZWVrZGF5c1N0cmljdFJlZ2V4OnRoaXMuX3dlZWtkYXlzUmVnZXgpfSxobi53ZWVrZGF5c1Nob3J0UmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX3dlZWtkYXlzUGFyc2VFeGFjdD8obSh0aGlzLFwiX3dlZWtkYXlzUmVnZXhcIil8fEJlLmNhbGwodGhpcyksZT90aGlzLl93ZWVrZGF5c1Nob3J0U3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4KToobSh0aGlzLFwiX3dlZWtkYXlzU2hvcnRSZWdleFwiKXx8KHRoaXMuX3dlZWtkYXlzU2hvcnRSZWdleD1xZSksdGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4JiZlP3RoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXgpfSxobi53ZWVrZGF5c01pblJlZ2V4PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3Q/KG0odGhpcyxcIl93ZWVrZGF5c1JlZ2V4XCIpfHxCZS5jYWxsKHRoaXMpLGU/dGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c01pblJlZ2V4KToobSh0aGlzLFwiX3dlZWtkYXlzTWluUmVnZXhcIil8fCh0aGlzLl93ZWVrZGF5c01pblJlZ2V4PUplKSx0aGlzLl93ZWVrZGF5c01pblN0cmljdFJlZ2V4JiZlP3RoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNNaW5SZWdleCl9LGhuLmlzUE09ZnVuY3Rpb24oZSl7cmV0dXJuXCJwXCI9PT0oZStcIlwiKS50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKX0saG4ubWVyaWRpZW09ZnVuY3Rpb24oZSx0LG4pe3JldHVybiAxMTxlP24/XCJwbVwiOlwiUE1cIjpuP1wiYW1cIjpcIkFNXCJ9LG90KFwiZW5cIix7ZGF5T2ZNb250aE9yZGluYWxQYXJzZTovXFxkezEsMn0odGh8c3R8bmR8cmQpLyxvcmRpbmFsOmZ1bmN0aW9uKGUpe3ZhciB0PWUlMTA7cmV0dXJuIGUrKDE9PT1rKGUlMTAwLzEwKT9cInRoXCI6MT09PXQ/XCJzdFwiOjI9PT10P1wibmRcIjozPT09dD9cInJkXCI6XCJ0aFwiKX19KSxjLmxhbmc9bihcIm1vbWVudC5sYW5nIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlIGluc3RlYWQuXCIsb3QpLGMubGFuZ0RhdGE9bihcIm1vbWVudC5sYW5nRGF0YSBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZURhdGEgaW5zdGVhZC5cIixsdCk7dmFyIF9uPU1hdGguYWJzO2Z1bmN0aW9uIHluKGUsdCxuLHMpe3ZhciBpPUF0KHQsbik7cmV0dXJuIGUuX21pbGxpc2Vjb25kcys9cyppLl9taWxsaXNlY29uZHMsZS5fZGF5cys9cyppLl9kYXlzLGUuX21vbnRocys9cyppLl9tb250aHMsZS5fYnViYmxlKCl9ZnVuY3Rpb24gZ24oZSl7cmV0dXJuIGU8MD9NYXRoLmZsb29yKGUpOk1hdGguY2VpbChlKX1mdW5jdGlvbiBwbihlKXtyZXR1cm4gNDgwMCplLzE0NjA5N31mdW5jdGlvbiB2bihlKXtyZXR1cm4gMTQ2MDk3KmUvNDgwMH1mdW5jdGlvbiB3bihlKXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5hcyhlKX19dmFyIE1uPXduKFwibXNcIiksU249d24oXCJzXCIpLERuPXduKFwibVwiKSxrbj13bihcImhcIiksWW49d24oXCJkXCIpLE9uPXduKFwid1wiKSxUbj13bihcIk1cIikseG49d24oXCJ5XCIpO2Z1bmN0aW9uIGJuKGUpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLl9kYXRhW2VdOk5hTn19dmFyIFBuPWJuKFwibWlsbGlzZWNvbmRzXCIpLFduPWJuKFwic2Vjb25kc1wiKSxIbj1ibihcIm1pbnV0ZXNcIiksUm49Ym4oXCJob3Vyc1wiKSxDbj1ibihcImRheXNcIiksRm49Ym4oXCJtb250aHNcIiksTG49Ym4oXCJ5ZWFyc1wiKTt2YXIgVW49TWF0aC5yb3VuZCxObj17c3M6NDQsczo0NSxtOjQ1LGg6MjIsZDoyNixNOjExfTt2YXIgR249TWF0aC5hYnM7ZnVuY3Rpb24gVm4oZSl7cmV0dXJuKDA8ZSktKGU8MCl8fCtlfWZ1bmN0aW9uIEVuKCl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpO3ZhciBlLHQsbj1Hbih0aGlzLl9taWxsaXNlY29uZHMpLzFlMyxzPUduKHRoaXMuX2RheXMpLGk9R24odGhpcy5fbW9udGhzKTt0PUQoKGU9RChuLzYwKSkvNjApLG4lPTYwLGUlPTYwO3ZhciByPUQoaS8xMiksYT1pJT0xMixvPXMsdT10LGw9ZSxkPW4/bi50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLFwiXCIpOlwiXCIsaD10aGlzLmFzU2Vjb25kcygpO2lmKCFoKXJldHVyblwiUDBEXCI7dmFyIGM9aDwwP1wiLVwiOlwiXCIsZj1Wbih0aGlzLl9tb250aHMpIT09Vm4oaCk/XCItXCI6XCJcIixtPVZuKHRoaXMuX2RheXMpIT09Vm4oaCk/XCItXCI6XCJcIixfPVZuKHRoaXMuX21pbGxpc2Vjb25kcykhPT1WbihoKT9cIi1cIjpcIlwiO3JldHVybiBjK1wiUFwiKyhyP2YrcitcIllcIjpcIlwiKSsoYT9mK2ErXCJNXCI6XCJcIikrKG8/bStvK1wiRFwiOlwiXCIpKyh1fHxsfHxkP1wiVFwiOlwiXCIpKyh1P18rdStcIkhcIjpcIlwiKSsobD9fK2wrXCJNXCI6XCJcIikrKGQ/XytkK1wiU1wiOlwiXCIpfXZhciBJbj1IdC5wcm90b3R5cGU7cmV0dXJuIEluLmlzVmFsaWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXNWYWxpZH0sSW4uYWJzPWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy5fZGF0YTtyZXR1cm4gdGhpcy5fbWlsbGlzZWNvbmRzPV9uKHRoaXMuX21pbGxpc2Vjb25kcyksdGhpcy5fZGF5cz1fbih0aGlzLl9kYXlzKSx0aGlzLl9tb250aHM9X24odGhpcy5fbW9udGhzKSxlLm1pbGxpc2Vjb25kcz1fbihlLm1pbGxpc2Vjb25kcyksZS5zZWNvbmRzPV9uKGUuc2Vjb25kcyksZS5taW51dGVzPV9uKGUubWludXRlcyksZS5ob3Vycz1fbihlLmhvdXJzKSxlLm1vbnRocz1fbihlLm1vbnRocyksZS55ZWFycz1fbihlLnllYXJzKSx0aGlzfSxJbi5hZGQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4geW4odGhpcyxlLHQsMSl9LEluLnN1YnRyYWN0PWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHluKHRoaXMsZSx0LC0xKX0sSW4uYXM9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBOYU47dmFyIHQsbixzPXRoaXMuX21pbGxpc2Vjb25kcztpZihcIm1vbnRoXCI9PT0oZT1SKGUpKXx8XCJ5ZWFyXCI9PT1lKXJldHVybiB0PXRoaXMuX2RheXMrcy84NjRlNSxuPXRoaXMuX21vbnRocytwbih0KSxcIm1vbnRoXCI9PT1lP246bi8xMjtzd2l0Y2godD10aGlzLl9kYXlzK01hdGgucm91bmQodm4odGhpcy5fbW9udGhzKSksZSl7Y2FzZVwid2Vla1wiOnJldHVybiB0Lzcrcy82MDQ4ZTU7Y2FzZVwiZGF5XCI6cmV0dXJuIHQrcy84NjRlNTtjYXNlXCJob3VyXCI6cmV0dXJuIDI0KnQrcy8zNmU1O2Nhc2VcIm1pbnV0ZVwiOnJldHVybiAxNDQwKnQrcy82ZTQ7Y2FzZVwic2Vjb25kXCI6cmV0dXJuIDg2NDAwKnQrcy8xZTM7Y2FzZVwibWlsbGlzZWNvbmRcIjpyZXR1cm4gTWF0aC5mbG9vcig4NjRlNSp0KStzO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biB1bml0IFwiK2UpfX0sSW4uYXNNaWxsaXNlY29uZHM9TW4sSW4uYXNTZWNvbmRzPVNuLEluLmFzTWludXRlcz1EbixJbi5hc0hvdXJzPWtuLEluLmFzRGF5cz1ZbixJbi5hc1dlZWtzPU9uLEluLmFzTW9udGhzPVRuLEluLmFzWWVhcnM9eG4sSW4udmFsdWVPZj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLl9taWxsaXNlY29uZHMrODY0ZTUqdGhpcy5fZGF5cyt0aGlzLl9tb250aHMlMTIqMjU5MmU2KzMxNTM2ZTYqayh0aGlzLl9tb250aHMvMTIpOk5hTn0sSW4uX2J1YmJsZT1mdW5jdGlvbigpe3ZhciBlLHQsbixzLGkscj10aGlzLl9taWxsaXNlY29uZHMsYT10aGlzLl9kYXlzLG89dGhpcy5fbW9udGhzLHU9dGhpcy5fZGF0YTtyZXR1cm4gMDw9ciYmMDw9YSYmMDw9b3x8cjw9MCYmYTw9MCYmbzw9MHx8KHIrPTg2NGU1KmduKHZuKG8pK2EpLG89YT0wKSx1Lm1pbGxpc2Vjb25kcz1yJTFlMyxlPUQoci8xZTMpLHUuc2Vjb25kcz1lJTYwLHQ9RChlLzYwKSx1Lm1pbnV0ZXM9dCU2MCxuPUQodC82MCksdS5ob3Vycz1uJTI0LG8rPWk9RChwbihhKz1EKG4vMjQpKSksYS09Z24odm4oaSkpLHM9RChvLzEyKSxvJT0xMix1LmRheXM9YSx1Lm1vbnRocz1vLHUueWVhcnM9cyx0aGlzfSxJbi5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBBdCh0aGlzKX0sSW4uZ2V0PWZ1bmN0aW9uKGUpe3JldHVybiBlPVIoZSksdGhpcy5pc1ZhbGlkKCk/dGhpc1tlK1wic1wiXSgpOk5hTn0sSW4ubWlsbGlzZWNvbmRzPVBuLEluLnNlY29uZHM9V24sSW4ubWludXRlcz1IbixJbi5ob3Vycz1SbixJbi5kYXlzPUNuLEluLndlZWtzPWZ1bmN0aW9uKCl7cmV0dXJuIEQodGhpcy5kYXlzKCkvNyl9LEluLm1vbnRocz1GbixJbi55ZWFycz1MbixJbi5odW1hbml6ZT1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7dmFyIHQsbixzLGkscixhLG8sdSxsLGQsaCxjPXRoaXMubG9jYWxlRGF0YSgpLGY9KG49IWUscz1jLGk9QXQodD10aGlzKS5hYnMoKSxyPVVuKGkuYXMoXCJzXCIpKSxhPVVuKGkuYXMoXCJtXCIpKSxvPVVuKGkuYXMoXCJoXCIpKSx1PVVuKGkuYXMoXCJkXCIpKSxsPVVuKGkuYXMoXCJNXCIpKSxkPVVuKGkuYXMoXCJ5XCIpKSwoaD1yPD1Obi5zcyYmW1wic1wiLHJdfHxyPE5uLnMmJltcInNzXCIscl18fGE8PTEmJltcIm1cIl18fGE8Tm4ubSYmW1wibW1cIixhXXx8bzw9MSYmW1wiaFwiXXx8bzxObi5oJiZbXCJoaFwiLG9dfHx1PD0xJiZbXCJkXCJdfHx1PE5uLmQmJltcImRkXCIsdV18fGw8PTEmJltcIk1cIl18fGw8Tm4uTSYmW1wiTU1cIixsXXx8ZDw9MSYmW1wieVwiXXx8W1wieXlcIixkXSlbMl09bixoWzNdPTA8K3QsaFs0XT1zLGZ1bmN0aW9uKGUsdCxuLHMsaSl7cmV0dXJuIGkucmVsYXRpdmVUaW1lKHR8fDEsISFuLGUscyl9LmFwcGx5KG51bGwsaCkpO3JldHVybiBlJiYoZj1jLnBhc3RGdXR1cmUoK3RoaXMsZikpLGMucG9zdGZvcm1hdChmKX0sSW4udG9JU09TdHJpbmc9RW4sSW4udG9TdHJpbmc9RW4sSW4udG9KU09OPUVuLEluLmxvY2FsZT1RdCxJbi5sb2NhbGVEYXRhPUt0LEluLnRvSXNvU3RyaW5nPW4oXCJ0b0lzb1N0cmluZygpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgdG9JU09TdHJpbmcoKSBpbnN0ZWFkIChub3RpY2UgdGhlIGNhcGl0YWxzKVwiLEVuKSxJbi5sYW5nPVh0LEkoXCJYXCIsMCwwLFwidW5peFwiKSxJKFwieFwiLDAsMCxcInZhbHVlT2ZcIiksdWUoXCJ4XCIsc2UpLHVlKFwiWFwiLC9bKy1dP1xcZCsoXFwuXFxkezEsM30pPy8pLGNlKFwiWFwiLGZ1bmN0aW9uKGUsdCxuKXtuLl9kPW5ldyBEYXRlKDFlMypwYXJzZUZsb2F0KGUsMTApKX0pLGNlKFwieFwiLGZ1bmN0aW9uKGUsdCxuKXtuLl9kPW5ldyBEYXRlKGsoZSkpfSksYy52ZXJzaW9uPVwiMi4yMi4yXCIsZT1UdCxjLmZuPWxuLGMubWluPWZ1bmN0aW9uKCl7cmV0dXJuIFB0KFwiaXNCZWZvcmVcIixbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKSl9LGMubWF4PWZ1bmN0aW9uKCl7cmV0dXJuIFB0KFwiaXNBZnRlclwiLFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKX0sYy5ub3c9ZnVuY3Rpb24oKXtyZXR1cm4gRGF0ZS5ub3c/RGF0ZS5ub3coKTorbmV3IERhdGV9LGMudXRjPXksYy51bml4PWZ1bmN0aW9uKGUpe3JldHVybiBUdCgxZTMqZSl9LGMubW9udGhzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGZuKGUsdCxcIm1vbnRoc1wiKX0sYy5pc0RhdGU9aCxjLmxvY2FsZT1vdCxjLmludmFsaWQ9dixjLmR1cmF0aW9uPUF0LGMuaXNNb21lbnQ9UyxjLndlZWtkYXlzPWZ1bmN0aW9uKGUsdCxuKXtyZXR1cm4gbW4oZSx0LG4sXCJ3ZWVrZGF5c1wiKX0sYy5wYXJzZVpvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gVHQuYXBwbHkobnVsbCxhcmd1bWVudHMpLnBhcnNlWm9uZSgpfSxjLmxvY2FsZURhdGE9bHQsYy5pc0R1cmF0aW9uPVJ0LGMubW9udGhzU2hvcnQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZm4oZSx0LFwibW9udGhzU2hvcnRcIil9LGMud2Vla2RheXNNaW49ZnVuY3Rpb24oZSx0LG4pe3JldHVybiBtbihlLHQsbixcIndlZWtkYXlzTWluXCIpfSxjLmRlZmluZUxvY2FsZT11dCxjLnVwZGF0ZUxvY2FsZT1mdW5jdGlvbihlLHQpe2lmKG51bGwhPXQpe3ZhciBuLHMsaT1udDtudWxsIT0ocz1hdChlKSkmJihpPXMuX2NvbmZpZyksKG49bmV3IFAodD1iKGksdCkpKS5wYXJlbnRMb2NhbGU9c3RbZV0sc3RbZV09bixvdChlKX1lbHNlIG51bGwhPXN0W2VdJiYobnVsbCE9c3RbZV0ucGFyZW50TG9jYWxlP3N0W2VdPXN0W2VdLnBhcmVudExvY2FsZTpudWxsIT1zdFtlXSYmZGVsZXRlIHN0W2VdKTtyZXR1cm4gc3RbZV19LGMubG9jYWxlcz1mdW5jdGlvbigpe3JldHVybiBzKHN0KX0sYy53ZWVrZGF5c1Nob3J0PWZ1bmN0aW9uKGUsdCxuKXtyZXR1cm4gbW4oZSx0LG4sXCJ3ZWVrZGF5c1Nob3J0XCIpfSxjLm5vcm1hbGl6ZVVuaXRzPVIsYy5yZWxhdGl2ZVRpbWVSb3VuZGluZz1mdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09ZT9VbjpcImZ1bmN0aW9uXCI9PXR5cGVvZiBlJiYoVW49ZSwhMCl9LGMucmVsYXRpdmVUaW1lVGhyZXNob2xkPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHZvaWQgMCE9PU5uW2VdJiYodm9pZCAwPT09dD9ObltlXTooTm5bZV09dCxcInNcIj09PWUmJihObi5zcz10LTEpLCEwKSl9LGMuY2FsZW5kYXJGb3JtYXQ9ZnVuY3Rpb24oZSx0KXt2YXIgbj1lLmRpZmYodCxcImRheXNcIiwhMCk7cmV0dXJuIG48LTY/XCJzYW1lRWxzZVwiOm48LTE/XCJsYXN0V2Vla1wiOm48MD9cImxhc3REYXlcIjpuPDE/XCJzYW1lRGF5XCI6bjwyP1wibmV4dERheVwiOm48Nz9cIm5leHRXZWVrXCI6XCJzYW1lRWxzZVwifSxjLnByb3RvdHlwZT1sbixjLkhUTUw1X0ZNVD17REFURVRJTUVfTE9DQUw6XCJZWVlZLU1NLUREVEhIOm1tXCIsREFURVRJTUVfTE9DQUxfU0VDT05EUzpcIllZWVktTU0tRERUSEg6bW06c3NcIixEQVRFVElNRV9MT0NBTF9NUzpcIllZWVktTU0tRERUSEg6bW06c3MuU1NTXCIsREFURTpcIllZWVktTU0tRERcIixUSU1FOlwiSEg6bW1cIixUSU1FX1NFQ09ORFM6XCJISDptbTpzc1wiLFRJTUVfTVM6XCJISDptbTpzcy5TU1NcIixXRUVLOlwiWVlZWS1bV11XV1wiLE1PTlRIOlwiWVlZWS1NTVwifSxjfSk7IiwiLyoqXG4gKiBSZWdpc3RlciBzZXJ2aWNlIHdvcmtlclxuICovXG5cbnJlZ2lzdGVyU2VydmljZVdvcmtlciA9ICgpID0+IHtcbiAgICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSByZXR1cm47XG5cbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcignL3N3LmpzJykudGhlbihyZWcgPT4ge1xuICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSByZXR1cm47XG5cbiAgICAgIGlmIChyZWcud2FpdGluZykge1xuICAgICAgICB1cGRhdGVSZWFkeShyZWcud2FpdGluZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XG4gICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVnLmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZWZvdW5kJywgKCkgPT4gdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKSk7XG4gICAgfSk7XG5cbiAgICBsZXQgcmVmcmVzaGluZztcbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYocmVmcmVzaGluZykgcmV0dXJuO1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgcmVmcmVzaGluZyA9IHRydWU7XG4gICAgfSlcbn1cblxudXBkYXRlUmVhZHkgPSAod29ya2VyKSA9PiB7XG4gIGNvbnN0IHRvYXN0ID0gVG9hc3QuY3JlYXRlKHtcbiAgICB0ZXh0OiBcIk5ldyB2ZXJzaW9uIGF2YWlsYWJsZS5cIixcbiAgICBidXR0b246IFwiUmVmcmVzaFwiLFxuICAgIGNhbGxiYWNrOiBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246ICdza2lwV2FpdGluZyd9KTtcbiAgICB9XG4gIH0pO1xufVxuXG50cmFja0luc3RhbGxpbmcgPSAod29ya2VyKSA9PiB7XG4gICAgd29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ3N0YXRlY2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PT0gJ2luc3RhbGxlZCcpIHtcbiAgICAgICAgdXBkYXRlUmVhZHkod29ya2VyKTtcbiAgICAgIH1cbiAgICB9KTtcbn0iLCIvKipcbiAqIEBhdXRob3IgaHR0cHM6Ly9naXRodWIuY29tL0FsZXhLdmF6b3MvVmFuaWxsYVRvYXN0cy9ibG9iL21hc3Rlci92YW5pbGxhdG9hc3RzLmpzXG4gKi9cblxuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICB0cnkge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgLy8gZ2xvYmFsXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvb3QuVG9hc3QgPSBmYWN0b3J5KCk7XG4gICAgfVxuICB9IGNhdGNoKGVycm9yKSB7XG4gICAgY29uc29sZS5sb2coJ0lzb21vcnBoaWMgY29tcGF0aWJpbGl0eSBpcyBub3Qgc3VwcG9ydGVkIGF0IHRoaXMgdGltZSBmb3IgVG9hc3QuJylcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKSB7XG5cbiAgLy8gV2UgbmVlZCBET00gdG8gYmUgcmVhZHlcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICBpbml0KCk7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0KTtcbiAgfVxuXG4gIC8vIENyZWF0ZSBUb2FzdCBvYmplY3RcbiAgVG9hc3QgPSB7XG4gICAgLy8gSW4gY2FzZSB0b2FzdCBjcmVhdGlvbiBpcyBhdHRlbXB0ZWQgYmVmb3JlIGRvbSBoYXMgZmluaXNoZWQgbG9hZGluZyFcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5lcnJvcihbXG4gICAgICAgICdET00gaGFzIG5vdCBmaW5pc2hlZCBsb2FkaW5nLicsXG4gICAgICAgICdcXHRJbnZva2UgY3JlYXRlIG1ldGhvZCB3aGVuIERPTVxccyByZWFkeVN0YXRlIGlzIGNvbXBsZXRlJ1xuICAgICAgXS5qb2luKCdcXG4nKSlcbiAgICB9LFxuICAgIC8vZnVuY3Rpb24gdG8gbWFudWFsbHkgc2V0IHRpbWVvdXQgYWZ0ZXIgY3JlYXRlXG4gICAgc2V0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFtcbiAgICAgICAgJ0RPTSBoYXMgbm90IGZpbmlzaGVkIGxvYWRpbmcuJyxcbiAgICAgICAgJ1xcdEludm9rZSBjcmVhdGUgbWV0aG9kIHdoZW4gRE9NXFxzIHJlYWR5U3RhdGUgaXMgY29tcGxldGUnXG4gICAgICBdLmpvaW4oJ1xcbicpKVxuICAgIH0sXG4gICAgdG9hc3RzOiB7fSAvL3N0b3JlIHRvYXN0cyB0byBtb2RpZnkgbGF0ZXJcbiAgfTtcbiAgdmFyIGF1dG9pbmNyZW1lbnQgPSAwO1xuXG4gIC8vIEluaXRpYWxpemUgbGlicmFyeVxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIC8vIFRvYXN0IGNvbnRhaW5lclxuICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb250YWluZXIuaWQgPSAndG9hc3QtY29udGFpbmVyJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG5cbiAgICAvLyBAT3ZlcnJpZGVcbiAgICAvLyBSZXBsYWNlIGNyZWF0ZSBtZXRob2Qgd2hlbiBET00gaGFzIGZpbmlzaGVkIGxvYWRpbmdcbiAgICBUb2FzdC5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB2YXIgdG9hc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRvYXN0LmlkID0gKythdXRvaW5jcmVtZW50O1xuICAgICAgdG9hc3QuaWQgPSAndG9hc3QtJyArIHRvYXN0LmlkO1xuICAgICAgdG9hc3QuY2xhc3NOYW1lID0gJ3RvYXN0JztcblxuICAgICAgLy8gdGl0bGVcbiAgICAgIGlmIChvcHRpb25zLnRpdGxlKSB7XG4gICAgICAgIHZhciBoNCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2g0Jyk7XG4gICAgICAgIGg0LmNsYXNzTmFtZSA9ICd0b2FzdC10aXRsZSc7XG4gICAgICAgIGg0LmlubmVySFRNTCA9IG9wdGlvbnMudGl0bGU7XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGg0KTtcbiAgICAgIH1cblxuICAgICAgLy8gdGV4dFxuICAgICAgaWYgKG9wdGlvbnMudGV4dCkge1xuICAgICAgICB2YXIgcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICAgICAgcC5jbGFzc05hbWUgPSAndG9hc3QtdGV4dCc7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gb3B0aW9ucy50ZXh0O1xuICAgICAgICB0b2FzdC5hcHBlbmRDaGlsZChwKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWNvblxuICAgICAgaWYgKG9wdGlvbnMuaWNvbikge1xuICAgICAgICB2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgICAgIGltZy5zcmMgPSBvcHRpb25zLmljb247XG4gICAgICAgIGltZy5jbGFzc05hbWUgPSAndG9hc3QtaWNvbic7XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGltZyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGJ1dHRvblxuICAgICAgaWYgKG9wdGlvbnMuYnV0dG9uKSB7XG4gICAgICAgIHZhciBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgYnV0dG9uLmNsYXNzTmFtZSA9ICd0b2FzdC1idXR0b24nO1xuICAgICAgICBidXR0b24uaW5uZXJIVE1MID0gb3B0aW9ucy5idXR0b247XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGJ1dHRvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIGNsaWNrIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdG9hc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvcHRpb25zLmNhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgLy8gdG9hc3QgYXBpXG4gICAgICB0b2FzdC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRvYXN0LmNsYXNzTmFtZSArPSAnIHRvYXN0LWZhZGVvdXQnO1xuICAgICAgICB0b2FzdC5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCByZW1vdmVUb2FzdCwgZmFsc2UpO1xuICAgICAgfTtcblxuICAgICAgLy8gYXV0b2hpZGVcbiAgICAgIGlmIChvcHRpb25zLnRpbWVvdXQpIHtcbiAgICAgICAgc2V0VGltZW91dCh0b2FzdC5oaWRlLCBvcHRpb25zLnRpbWVvdXQpO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy50eXBlKSB7XG4gICAgICAgIHRvYXN0LmNsYXNzTmFtZSArPSAnIHRvYXN0LScgKyBvcHRpb25zLnR5cGU7XG4gICAgICB9XG5cbiAgICAgIHRvYXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9hc3QuaGlkZSk7XG5cblxuICAgICAgZnVuY3Rpb24gcmVtb3ZlVG9hc3QoKSB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2FzdC1jb250YWluZXInKS5yZW1vdmVDaGlsZCh0b2FzdCk7XG4gICAgICAgIGRlbGV0ZSBUb2FzdC50b2FzdHNbdG9hc3QuaWRdOyAgLy9yZW1vdmUgdG9hc3QgZnJvbSBvYmplY3RcbiAgICAgIH1cblxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvYXN0LWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvYXN0KTtcblxuICAgICAgLy9hZGQgdG9hc3QgdG8gb2JqZWN0IHNvIGl0cyBlYXNpbHkgZ2V0dGFibGUgYnkgaXRzIGlkXG4gICAgICBUb2FzdC50b2FzdHNbdG9hc3QuaWRdID0gdG9hc3Q7XG5cbiAgICAgIHJldHVybiB0b2FzdDtcbiAgICB9XG5cbiAgICAvKlxuICAgIGN1c3RvbSBmdW5jdGlvbiB0byBtYW51YWxseSBpbml0aWF0ZSB0aW1lb3V0IG9mXG4gICAgdGhlIHRvYXN0LiAgVXNlZnVsIGlmIHRvYXN0IGlzIGNyZWF0ZWQgYXMgcGVyc2lzdGFudFxuICAgIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCBpdCB0byBzdGFydCB0byB0aW1lb3V0IHVudGlsXG4gICAgd2UgdGVsbCBpdCB0b1xuICAgICovXG4gICAgVG9hc3Quc2V0VGltZW91dCA9IGZ1bmN0aW9uKHRvYXN0aWQsIHZhbCkge1xuICAgICAgaWYoVG9hc3QudG9hc3RzW3RvYXN0aWRdKXtcbiAgICAgICAgc2V0VGltZW91dChUb2FzdC50b2FzdHNbdG9hc3RpZF0uaGlkZSwgdmFsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gVG9hc3Q7XG5cbn0pOyJdfQ==
