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
  /**
   * Fetch restaurant reviews
   */


  static fetchRestaurantReviewsById(id, callback) {
    openDatabase().then(db => {
      let store = db.transaction('restaurants').objectStore('restaurants');
      id = parseInt(id);
      store.get(id).then(restaurant => {
        if (!restaurant.reviews) {
          fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`).then(response => response.json()).then(reviews => {
            let reviewsArray = [];
            reviews.forEach(review => {
              reviewsArray.push({
                name: review.name,
                rating: review.rating,
                comments: review.comments,
                date: moment(review.createdAt).format('MMMM D, YYYY')
              });
            });
            restaurant.reviews = reviewsArray;
            store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
            store.put(restaurant, id);
            callback(null, reviewsArray);
          }).catch(error => {
            callback(error, "Failed to fetch reviews");
          });
        } else {
          callback(null, restaurant.reviews);
        }
      });
    });
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
  // if (!navigator.serviceWorker) return Promise.resolve();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyLmpzIiwiaWRiLmpzIiwibW9tZW50Lm1pbi5qcyIsInNlcnZpY2Utd29ya2VyLmpzIiwidG9hc3QuanMiXSwibmFtZXMiOlsiREJIZWxwZXIiLCJmZXRjaFJlc3RhdXJhbnRzIiwiY2FsbGJhY2siLCJvcGVuRGF0YWJhc2UiLCJ0aGVuIiwiZGIiLCJzdG9yZSIsInRyYW5zYWN0aW9uIiwib2JqZWN0U3RvcmUiLCJnZXRBbGwiLCJyZXN0YXVyYW50cyIsImxlbmd0aCIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiZm9yRWFjaCIsInJlc3RhdXJhbnQiLCJwdXQiLCJjYXRjaCIsImVycm9yIiwiZmV0Y2hSZXN0YXVyYW50QnlJZCIsImlkIiwicGFyc2VJbnQiLCJnZXQiLCJmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUiLCJjdWlzaW5lIiwicmVzdWx0cyIsImZpbHRlciIsInIiLCJjdWlzaW5lX3R5cGUiLCJmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZCIsIm5laWdoYm9yaG9vZCIsImZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZCIsImZldGNoTmVpZ2hib3Job29kcyIsIm5laWdoYm9yaG9vZHMiLCJtYXAiLCJ2IiwiaSIsInVuaXF1ZU5laWdoYm9yaG9vZHMiLCJpbmRleE9mIiwiZmV0Y2hDdWlzaW5lcyIsImN1aXNpbmVzIiwidW5pcXVlQ3Vpc2luZXMiLCJ1cmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VVcmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VOYW1lRm9yUmVzdGF1cmFudCIsInBob3RvZ3JhcGgiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50IiwibWFya2VyIiwiTCIsImxhdGxuZyIsImxhdCIsImxuZyIsInRpdGxlIiwibmFtZSIsImFsdCIsInVybCIsImFkZFRvIiwibmV3TWFwIiwidXBkYXRlUmVzdGF1cmFudFJldmlld3MiLCJzeW5jUmV2aWV3cyIsInJldmlld3MiLCJyZXZpZXciLCJzeW5jZWQiLCJzeW5jUmV2aWV3IiwicmVzdGF1cmFudF9pZCIsIm1ldGhvZCIsImhlYWRlcnMiLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsInJhdGluZyIsImNvbW1lbnRzIiwiZmV0Y2hSZXN0YXVyYW50UmV2aWV3c0J5SWQiLCJyZXZpZXdzQXJyYXkiLCJwdXNoIiwiZGF0ZSIsIm1vbWVudCIsImNyZWF0ZWRBdCIsImZvcm1hdCIsImltYWdlVXJsQmFzZVBhdGgiLCJpZGIiLCJvcGVuIiwidXBncmFkZURCIiwiY3JlYXRlT2JqZWN0U3RvcmUiLCJ0b0FycmF5IiwiYXJyIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJzbGljZSIsImNhbGwiLCJwcm9taXNpZnlSZXF1ZXN0IiwicmVxdWVzdCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib25zdWNjZXNzIiwicmVzdWx0Iiwib25lcnJvciIsInByb21pc2lmeVJlcXVlc3RDYWxsIiwib2JqIiwiYXJncyIsInAiLCJhcHBseSIsInByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsIiwidmFsdWUiLCJDdXJzb3IiLCJwcm94eVByb3BlcnRpZXMiLCJQcm94eUNsYXNzIiwidGFyZ2V0UHJvcCIsInByb3BlcnRpZXMiLCJwcm9wIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJzZXQiLCJ2YWwiLCJwcm94eVJlcXVlc3RNZXRob2RzIiwiQ29uc3RydWN0b3IiLCJhcmd1bWVudHMiLCJwcm94eU1ldGhvZHMiLCJwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzIiwiSW5kZXgiLCJpbmRleCIsIl9pbmRleCIsIklEQkluZGV4IiwiY3Vyc29yIiwiX2N1cnNvciIsIl9yZXF1ZXN0IiwiSURCQ3Vyc29yIiwibWV0aG9kTmFtZSIsIk9iamVjdFN0b3JlIiwiX3N0b3JlIiwiY3JlYXRlSW5kZXgiLCJJREJPYmplY3RTdG9yZSIsIlRyYW5zYWN0aW9uIiwiaWRiVHJhbnNhY3Rpb24iLCJfdHgiLCJjb21wbGV0ZSIsIm9uY29tcGxldGUiLCJvbmFib3J0IiwiSURCVHJhbnNhY3Rpb24iLCJVcGdyYWRlREIiLCJvbGRWZXJzaW9uIiwiX2RiIiwiSURCRGF0YWJhc2UiLCJEQiIsImZ1bmNOYW1lIiwicmVwbGFjZSIsIm5hdGl2ZU9iamVjdCIsInF1ZXJ5IiwiY291bnQiLCJpbnN0YW5jZSIsIml0ZW1zIiwiaXRlcmF0ZUN1cnNvciIsInVuZGVmaW5lZCIsImNvbnRpbnVlIiwiZXhwIiwidmVyc2lvbiIsInVwZ3JhZGVDYWxsYmFjayIsImluZGV4ZWREQiIsIm9udXBncmFkZW5lZWRlZCIsImV2ZW50IiwiZGVsZXRlIiwibW9kdWxlIiwiZXhwb3J0cyIsImRlZmF1bHQiLCJzZWxmIiwiZSIsInQiLCJkZWZpbmUiLCJhbWQiLCJjIiwibyIsInRvU3RyaW5nIiwidSIsImwiLCJkIiwiaCIsIkRhdGUiLCJmIiwibiIsInMiLCJtIiwiaGFzT3duUHJvcGVydHkiLCJfIiwidmFsdWVPZiIsInkiLCJPdCIsInV0YyIsImciLCJfcGYiLCJlbXB0eSIsInVudXNlZFRva2VucyIsInVudXNlZElucHV0Iiwib3ZlcmZsb3ciLCJjaGFyc0xlZnRPdmVyIiwibnVsbElucHV0IiwiaW52YWxpZE1vbnRoIiwiaW52YWxpZEZvcm1hdCIsInVzZXJJbnZhbGlkYXRlZCIsImlzbyIsInBhcnNlZERhdGVQYXJ0cyIsIm1lcmlkaWVtIiwicmZjMjgyMiIsIndlZWtkYXlNaXNtYXRjaCIsIl9pc1ZhbGlkIiwiaXNOYU4iLCJfZCIsImdldFRpbWUiLCJpbnZhbGlkV2Vla2RheSIsIl9zdHJpY3QiLCJiaWdIb3VyIiwiaXNGcm96ZW4iLCJOYU4iLCJzb21lIiwibW9tZW50UHJvcGVydGllcyIsInciLCJfaXNBTW9tZW50T2JqZWN0IiwiX2kiLCJfZiIsIl9sIiwiX3R6bSIsIl9pc1VUQyIsIl9vZmZzZXQiLCJfbG9jYWxlIiwiTSIsImlzVmFsaWQiLCJ1cGRhdGVPZmZzZXQiLCJTIiwiRCIsIk1hdGgiLCJjZWlsIiwiZmxvb3IiLCJrIiwiaXNGaW5pdGUiLCJhIiwibWluIiwiYWJzIiwiWSIsInN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyIsImNvbnNvbGUiLCJ3YXJuIiwiZGVwcmVjYXRpb25IYW5kbGVyIiwiam9pbiIsIkVycm9yIiwic3RhY2siLCJPIiwiVCIsIngiLCJGdW5jdGlvbiIsImIiLCJQIiwia2V5cyIsIlciLCJIIiwidG9Mb3dlckNhc2UiLCJSIiwiQyIsIkYiLCJVIiwicG93IiwibWF4Iiwic3Vic3RyIiwiTiIsIkciLCJWIiwiRSIsIkkiLCJsb2NhbGVEYXRhIiwib3JkaW5hbCIsIkEiLCJqIiwibWF0Y2giLCJpbnZhbGlkRGF0ZSIsImxvbmdEYXRlRm9ybWF0IiwibGFzdEluZGV4IiwidGVzdCIsIloiLCJ6IiwiJCIsInEiLCJKIiwiQiIsIlEiLCJYIiwiSyIsImVlIiwidGUiLCJuZSIsInNlIiwiaWUiLCJyZSIsImFlIiwib2UiLCJ1ZSIsImxlIiwiUmVnRXhwIiwiZGUiLCJoZSIsImNlIiwiZmUiLCJfdyIsIm1lIiwiX2UiLCJ5ZSIsImdlIiwicGUiLCJ2ZSIsIndlIiwiTWUiLCJTZSIsIkRlIiwia2UiLCJ5ZWFyIiwicGFyc2VUd29EaWdpdFllYXIiLCJZZSIsIk9lIiwiVGUiLCJiZSIsInhlIiwibW9udGgiLCJQZSIsIm1vbnRoc1Nob3J0IiwibW9udGhzIiwibW9udGhzU2hvcnRSZWdleCIsIm1vbnRoc1JlZ2V4IiwibW9udGhzUGFyc2UiLCJXZSIsIkhlIiwic3BsaXQiLCJSZSIsIkNlIiwiRmUiLCJMZSIsIlVlIiwiTmUiLCJzb3J0IiwiX21vbnRoc1JlZ2V4IiwiX21vbnRoc1Nob3J0UmVnZXgiLCJfbW9udGhzU3RyaWN0UmVnZXgiLCJfbW9udGhzU2hvcnRTdHJpY3RSZWdleCIsIkdlIiwiVVRDIiwiZ2V0VVRDRnVsbFllYXIiLCJzZXRVVENGdWxsWWVhciIsIlZlIiwiZ2V0VVRDRGF5IiwiRWUiLCJkYXlPZlllYXIiLCJJZSIsIkFlIiwid2VlayIsIndlZWtkYXlzTWluIiwid2Vla2RheXNTaG9ydCIsIndlZWtkYXlzIiwid2Vla2RheXNNaW5SZWdleCIsIndlZWtkYXlzU2hvcnRSZWdleCIsIndlZWtkYXlzUmVnZXgiLCJ3ZWVrZGF5c1BhcnNlIiwiamUiLCJaZSIsInplIiwiJGUiLCJxZSIsIkplIiwiQmUiLCJkYXkiLCJfd2Vla2RheXNSZWdleCIsIl93ZWVrZGF5c1Nob3J0UmVnZXgiLCJfd2Vla2RheXNNaW5SZWdleCIsIl93ZWVrZGF5c1N0cmljdFJlZ2V4IiwiX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleCIsIl93ZWVrZGF5c01pblN0cmljdFJlZ2V4IiwiUWUiLCJob3VycyIsIlhlIiwibWludXRlcyIsIktlIiwiX21lcmlkaWVtUGFyc2UiLCJzZWNvbmRzIiwiX2lzUG0iLCJpc1BNIiwiX21lcmlkaWVtIiwiZXQiLCJ0dCIsIm50IiwiY2FsZW5kYXIiLCJzYW1lRGF5IiwibmV4dERheSIsIm5leHRXZWVrIiwibGFzdERheSIsImxhc3RXZWVrIiwic2FtZUVsc2UiLCJMVFMiLCJMVCIsIkxMIiwiTExMIiwiTExMTCIsImRheU9mTW9udGhPcmRpbmFsUGFyc2UiLCJyZWxhdGl2ZVRpbWUiLCJmdXR1cmUiLCJwYXN0Iiwic3MiLCJtbSIsImhoIiwiZGQiLCJNTSIsInl5IiwiZG93IiwiZG95IiwibWVyaWRpZW1QYXJzZSIsInN0IiwiaXQiLCJydCIsImF0IiwiX2FiYnIiLCJyZXF1aXJlIiwib3QiLCJsdCIsInV0IiwiYWJiciIsIl9jb25maWciLCJwYXJlbnRMb2NhbGUiLCJjb25maWciLCJkdCIsIl9hIiwiX292ZXJmbG93RGF5T2ZZZWFyIiwiX292ZXJmbG93V2Vla3MiLCJfb3ZlcmZsb3dXZWVrZGF5IiwiaHQiLCJjdCIsIm5vdyIsIl91c2VVVEMiLCJnZXRVVENNb250aCIsImdldFVUQ0RhdGUiLCJnZXRGdWxsWWVhciIsImdldE1vbnRoIiwiZ2V0RGF0ZSIsIkdHIiwiVHQiLCJfd2VlayIsImdnIiwiX2RheU9mWWVhciIsIl9uZXh0RGF5Iiwic2V0RnVsbFllYXIiLCJnZXREYXkiLCJzZXRVVENNaW51dGVzIiwiZ2V0VVRDTWludXRlcyIsImZ0IiwibXQiLCJfdCIsInl0IiwiZ3QiLCJwdCIsInZ0IiwiZXhlYyIsImt0Iiwid3QiLCJNdCIsIlN0IiwiVVQiLCJHTVQiLCJFRFQiLCJFU1QiLCJDRFQiLCJDU1QiLCJNRFQiLCJNU1QiLCJQRFQiLCJQU1QiLCJEdCIsIklTT184NjAxIiwiUkZDXzI4MjIiLCJtZXJpZGllbUhvdXIiLCJZdCIsInByZXBhcnNlIiwic2NvcmUiLCJjcmVhdGVGcm9tSW5wdXRGYWxsYmFjayIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJtaWxsaXNlY29uZCIsImdldE93blByb3BlcnR5TmFtZXMiLCJhZGQiLCJ4dCIsImJ0IiwiUHQiLCJXdCIsIkh0IiwicXVhcnRlciIsInBhcnNlRmxvYXQiLCJfbWlsbGlzZWNvbmRzIiwiX2RheXMiLCJfbW9udGhzIiwiX2RhdGEiLCJfYnViYmxlIiwiUnQiLCJDdCIsInJvdW5kIiwiRnQiLCJ1dGNPZmZzZXQiLCJVdCIsIkx0IiwiTnQiLCJjbG9uZSIsInNldFRpbWUiLCJsb2NhbCIsIkd0IiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJWdCIsIkV0IiwiSXQiLCJBdCIsIm1zIiwibWlsbGlzZWNvbmRzIiwianQiLCJpc0JlZm9yZSIsIlp0IiwiZnJvbSIsInRvIiwiaXNBZnRlciIsInp0IiwiJHQiLCJmbiIsImludmFsaWQiLCJxdCIsIkp0IiwiQnQiLCJRdCIsImRlZmF1bHRGb3JtYXQiLCJkZWZhdWx0Rm9ybWF0VXRjIiwiWHQiLCJsb2NhbGUiLCJLdCIsImVuIiwidG4iLCJ3ZWVrWWVhciIsImlzb1dlZWtZZWFyIiwiX2RheU9mTW9udGhPcmRpbmFsUGFyc2UiLCJfb3JkaW5hbFBhcnNlIiwiX2RheU9mTW9udGhPcmRpbmFsUGFyc2VMZW5pZW50Iiwibm4iLCJzbiIsInJuIiwiYW4iLCJvbiIsInVuIiwibG4iLCJkbiIsInN0YXJ0T2YiLCJjYWxlbmRhckZvcm1hdCIsImRpZmYiLCJlbmRPZiIsInN1YnRyYWN0IiwiaXNVdGMiLCJwb3N0Zm9ybWF0IiwiaHVtYW5pemUiLCJmcm9tTm93IiwidG9Ob3ciLCJpbnZhbGlkQXQiLCJpc0JldHdlZW4iLCJpc1NhbWUiLCJpc1NhbWVPckFmdGVyIiwiaXNTYW1lT3JCZWZvcmUiLCJsYW5nIiwicGFyc2luZ0ZsYWdzIiwidW5pdCIsInByaW9yaXR5Iiwid2Vla2RheSIsImlzb1dlZWtkYXkiLCJ0b09iamVjdCIsInllYXJzIiwidG9EYXRlIiwidG9JU09TdHJpbmciLCJpbnNwZWN0IiwiaXNMb2NhbCIsInRvSlNPTiIsInVuaXgiLCJjcmVhdGlvbkRhdGEiLCJpbnB1dCIsImlzVVRDIiwic3RyaWN0IiwiaXNMZWFwWWVhciIsImlzb1dlZWsiLCJxdWFydGVycyIsImRheXNJbk1vbnRoIiwid2Vla3MiLCJpc29XZWVrcyIsIndlZWtzSW5ZZWFyIiwiaXNvV2Vla3NJblllYXIiLCJkYXlzIiwiX2NoYW5nZUluUHJvZ3Jlc3MiLCJwYXJzZVpvbmUiLCJoYXNBbGlnbmVkSG91ck9mZnNldCIsImlzRFNUIiwiaXNVdGNPZmZzZXQiLCJ6b25lQWJiciIsInpvbmVOYW1lIiwiZGF0ZXMiLCJ6b25lIiwiaXNEU1RTaGlmdGVkIiwiX2lzRFNUU2hpZnRlZCIsImhuIiwiY24iLCJtbiIsIl9jYWxlbmRhciIsIl9sb25nRGF0ZUZvcm1hdCIsInRvVXBwZXJDYXNlIiwiX2ludmFsaWREYXRlIiwiX29yZGluYWwiLCJfcmVsYXRpdmVUaW1lIiwicGFzdEZ1dHVyZSIsInNvdXJjZSIsImlzRm9ybWF0Iiwic3RhbmRhbG9uZSIsIl9tb250aHNTaG9ydCIsIl9tb250aHNQYXJzZUV4YWN0IiwidG9Mb2NhbGVMb3dlckNhc2UiLCJfbW9udGhzUGFyc2UiLCJfbG9uZ01vbnRoc1BhcnNlIiwiX3Nob3J0TW9udGhzUGFyc2UiLCJmaXJzdERheU9mWWVhciIsImZpcnN0RGF5T2ZXZWVrIiwiX3dlZWtkYXlzIiwiX3dlZWtkYXlzTWluIiwiX3dlZWtkYXlzU2hvcnQiLCJfd2Vla2RheXNQYXJzZUV4YWN0IiwiX3dlZWtkYXlzUGFyc2UiLCJfc2hvcnRXZWVrZGF5c1BhcnNlIiwiX21pbldlZWtkYXlzUGFyc2UiLCJfZnVsbFdlZWtkYXlzUGFyc2UiLCJjaGFyQXQiLCJsYW5nRGF0YSIsIl9uIiwieW4iLCJnbiIsInBuIiwidm4iLCJ3biIsImFzIiwiTW4iLCJTbiIsIkRuIiwia24iLCJZbiIsIk9uIiwiVG4iLCJ4biIsImJuIiwiUG4iLCJXbiIsIkhuIiwiUm4iLCJDbiIsIkZuIiwiTG4iLCJVbiIsIk5uIiwiR24iLCJWbiIsIkVuIiwidG9GaXhlZCIsImFzU2Vjb25kcyIsIkluIiwiYXNNaWxsaXNlY29uZHMiLCJhc01pbnV0ZXMiLCJhc0hvdXJzIiwiYXNEYXlzIiwiYXNXZWVrcyIsImFzTW9udGhzIiwiYXNZZWFycyIsInRvSXNvU3RyaW5nIiwiaXNEYXRlIiwiZHVyYXRpb24iLCJpc01vbWVudCIsImlzRHVyYXRpb24iLCJkZWZpbmVMb2NhbGUiLCJ1cGRhdGVMb2NhbGUiLCJsb2NhbGVzIiwibm9ybWFsaXplVW5pdHMiLCJyZWxhdGl2ZVRpbWVSb3VuZGluZyIsInJlbGF0aXZlVGltZVRocmVzaG9sZCIsIkhUTUw1X0ZNVCIsIkRBVEVUSU1FX0xPQ0FMIiwiREFURVRJTUVfTE9DQUxfU0VDT05EUyIsIkRBVEVUSU1FX0xPQ0FMX01TIiwiREFURSIsIlRJTUUiLCJUSU1FX1NFQ09ORFMiLCJUSU1FX01TIiwiV0VFSyIsIk1PTlRIIiwicmVnaXN0ZXJTZXJ2aWNlV29ya2VyIiwibmF2aWdhdG9yIiwic2VydmljZVdvcmtlciIsInJlZ2lzdGVyIiwicmVnIiwiY29udHJvbGxlciIsIndhaXRpbmciLCJ1cGRhdGVSZWFkeSIsImluc3RhbGxpbmciLCJ0cmFja0luc3RhbGxpbmciLCJhZGRFdmVudExpc3RlbmVyIiwicmVmcmVzaGluZyIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwid29ya2VyIiwidG9hc3QiLCJUb2FzdCIsImNyZWF0ZSIsInRleHQiLCJidXR0b24iLCJwcmV2ZW50RGVmYXVsdCIsInBvc3RNZXNzYWdlIiwiYWN0aW9uIiwic3RhdGUiLCJyb290IiwiZmFjdG9yeSIsImxvZyIsImRvY3VtZW50IiwicmVhZHlTdGF0ZSIsImluaXQiLCJzZXRUaW1lb3V0IiwidG9hc3RzIiwiYXV0b2luY3JlbWVudCIsImNvbnRhaW5lciIsImNyZWF0ZUVsZW1lbnQiLCJhcHBlbmRDaGlsZCIsIm9wdGlvbnMiLCJjbGFzc05hbWUiLCJoNCIsImlubmVySFRNTCIsImljb24iLCJpbWciLCJzcmMiLCJoaWRlIiwicmVtb3ZlVG9hc3QiLCJ0aW1lb3V0IiwidHlwZSIsImdldEVsZW1lbnRCeUlkIiwicmVtb3ZlQ2hpbGQiLCJ0b2FzdGlkIl0sIm1hcHBpbmdzIjoiQUFBQTs7O0FBR0EsTUFBTUEsUUFBTixDQUFlO0FBRWI7OztBQUdBLFNBQU9DLGdCQUFQLENBQXdCQyxRQUF4QixFQUFrQztBQUNoQ0MsSUFBQUEsWUFBWSxHQUFHQyxJQUFmLENBQW9CQyxFQUFFLElBQUk7QUFDeEIsVUFBSUMsS0FBSyxHQUFHRCxFQUFFLENBQUNFLFdBQUgsQ0FBZSxhQUFmLEVBQThCQyxXQUE5QixDQUEwQyxhQUExQyxDQUFaO0FBQ0FGLE1BQUFBLEtBQUssQ0FBQ0csTUFBTixHQUFlTCxJQUFmLENBQW9CTSxXQUFXLElBQUk7QUFDakMsWUFBSUEsV0FBVyxDQUFDQyxNQUFaLElBQXNCLENBQTFCLEVBQTZCO0FBQzNCQyxVQUFBQSxLQUFLLENBQUMsbUNBQUQsQ0FBTCxDQUNDUixJQURELENBQ01TLFFBQVEsSUFBSUEsUUFBUSxDQUFDQyxJQUFULEVBRGxCLEVBRUNWLElBRkQsQ0FFTU0sV0FBVyxJQUFJO0FBQ25CLGdCQUFJQSxXQUFKLEVBQWlCO0FBQ2ZKLGNBQUFBLEtBQUssR0FBR0QsRUFBRSxDQUFDRSxXQUFILENBQWUsYUFBZixFQUE4QixXQUE5QixFQUEyQ0MsV0FBM0MsQ0FBdUQsYUFBdkQsQ0FBUjtBQUNBRSxjQUFBQSxXQUFXLENBQUNLLE9BQVosQ0FBb0JDLFVBQVUsSUFBSTtBQUNoQ1YsZ0JBQUFBLEtBQUssQ0FBQ1csR0FBTixDQUFVRCxVQUFWLEVBQXNCQSxVQUFVLENBQUMs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LEVBQXlCO0FBQ3ZCbkIsUUFBQUEsVUFBVSxDQUFDZCxLQUFLLENBQUNlLE1BQU4sQ0FBYWtCLE9BQWIsRUFBc0JOLElBQXZCLEVBQTZCN21CLEdBQTdCLENBQVY7QUFDRDtBQUNGLEtBSkQ7QUFLRDs7QUFFRCxTQUFPa2xCLEtBQVA7QUFFRCxDQTNJRCIsImZpbGUiOiJsaWJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENvbW1vbiBkYXRhYmFzZSBoZWxwZXIgZnVuY3Rpb25zLlxyXG4gKi9cclxuY2xhc3MgREJIZWxwZXIge1xyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgcmVzdGF1cmFudHMuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudHMoY2FsbGJhY2spIHtcclxuICAgIG9wZW5EYXRhYmFzZSgpLnRoZW4oZGIgPT4ge1xyXG4gICAgICBsZXQgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgc3RvcmUuZ2V0QWxsKCkudGhlbihyZXN0YXVyYW50cyA9PiB7XHJcbiAgICAgICAgaWYgKHJlc3RhdXJhbnRzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICBmZXRjaChcImh0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXN0YXVyYW50c1wiKVxyXG4gICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgLnRoZW4ocmVzdGF1cmFudHMgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzdGF1cmFudHMpIHtcclxuICAgICAgICAgICAgICBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgICAgICAgICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgc3RvcmUucHV0KHJlc3RhdXJhbnQsIHJlc3RhdXJhbnRbJ2lkJ10pXHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlJZChpZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIGZldGNoIGFsbCByZXN0YXVyYW50cyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgIG9wZW5EYXRhYmFzZSgpLnRoZW4oZGIgPT4ge1xyXG4gICAgICBsZXQgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgaWQgPSBwYXJzZUludChpZCk7XHJcbiAgICAgIHN0b3JlLmdldChpZCkudGhlbihyZXN0YXVyYW50ID0+IHtcclxuICAgICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcclxuICAgICAgICAgIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHMvJHtpZH1gKVxyXG4gICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgLnRoZW4ocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgICAgICAgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgICAgICAgICAgc3RvcmUucHV0KHJlc3RhdXJhbnQsIGlkKTtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBcIlJlc3RhdXJhbnQgZG9lcyBub3QgZXhpc3RcIik7XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSB0eXBlIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUoY3Vpc2luZSwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50cyAgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRmlsdGVyIHJlc3RhdXJhbnRzIHRvIGhhdmUgb25seSBnaXZlbiBjdWlzaW5lIHR5cGVcclxuICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzdGF1cmFudHMuZmlsdGVyKHIgPT4gci5jdWlzaW5lX3R5cGUgPT0gY3Vpc2luZSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggcmVzdGF1cmFudHMgYnkgYSBuZWlnaGJvcmhvb2Qgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5TmVpZ2hib3Job29kKG5laWdoYm9yaG9vZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBGaWx0ZXIgcmVzdGF1cmFudHMgdG8gaGF2ZSBvbmx5IGdpdmVuIG5laWdoYm9yaG9vZFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXN0YXVyYW50cy5maWx0ZXIociA9PiByLm5laWdoYm9yaG9vZCA9PSBuZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgY3Vpc2luZSBhbmQgYSBuZWlnaGJvcmhvb2Qgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdHMgPSByZXN0YXVyYW50c1xyXG4gICAgICAgIGlmIChjdWlzaW5lICE9ICdhbGwnKSB7IC8vIGZpbHRlciBieSBjdWlzaW5lXHJcbiAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIociA9PiByLmN1aXNpbmVfdHlwZSA9PSBjdWlzaW5lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm9yaG9vZCAhPSAnYWxsJykgeyAvLyBmaWx0ZXIgYnkgbmVpZ2hib3Job29kXHJcbiAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIociA9PiByLm5laWdoYm9yaG9vZCA9PSBuZWlnaGJvcmhvb2QpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgbmVpZ2hib3Job29kcyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hOZWlnaGJvcmhvb2RzKGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBuZWlnaGJvcmhvb2RzIGZyb20gYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgY29uc3QgbmVpZ2hib3Job29kcyA9IHJlc3RhdXJhbnRzLm1hcCgodiwgaSkgPT4gcmVzdGF1cmFudHNbaV0ubmVpZ2hib3Job29kKVxyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gbmVpZ2hib3Job29kc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZU5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzLmZpbHRlcigodiwgaSkgPT4gbmVpZ2hib3Job29kcy5pbmRleE9mKHYpID09IGkpXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlTmVpZ2hib3Job29kcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIGN1aXNpbmVzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaEN1aXNpbmVzKGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBjdWlzaW5lcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIGNvbnN0IGN1aXNpbmVzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5jdWlzaW5lX3R5cGUpXHJcbiAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBjdWlzaW5lc1xyXG4gICAgICAgIGNvbnN0IHVuaXF1ZUN1aXNpbmVzID0gY3Vpc2luZXMuZmlsdGVyKCh2LCBpKSA9PiBjdWlzaW5lcy5pbmRleE9mKHYpID09IGkpXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdW5pcXVlQ3Vpc2luZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC9pbWcvJHtEQkhlbHBlci5pbWFnZU5hbWVGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfS1zbWFsbC5qcGdgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgaW1hZ2UgbmFtZS5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VOYW1lRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICBpZiAocmVzdGF1cmFudC5waG90b2dyYXBoKVxyXG4gICAgICByZXR1cm4gcmVzdGF1cmFudC5waG90b2dyYXBoO1xyXG4gICAgcmV0dXJuICdkZWZhdWx0JztcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBNYXAgbWFya2VyIGZvciBhIHJlc3RhdXJhbnQuXHJcbiAgICovXHJcbiAgIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgLy8gaHR0cHM6Ly9sZWFmbGV0anMuY29tL3JlZmVyZW5jZS0xLjMuMC5odG1sI21hcmtlciAgXHJcbiAgICBjb25zdCBtYXJrZXIgPSBuZXcgTC5tYXJrZXIoW3Jlc3RhdXJhbnQubGF0bG5nLmxhdCwgcmVzdGF1cmFudC5sYXRsbmcubG5nXSxcclxuICAgICAge3RpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIGFsdDogcmVzdGF1cmFudC5uYW1lLFxyXG4gICAgICB1cmw6IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudClcclxuICAgICAgfSlcclxuICAgICAgbWFya2VyLmFkZFRvKG5ld01hcCk7XHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG4gIH0gXHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSByZXN0YXVyYW50XHJcbiAgICovXHJcbiAgc3RhdGljIHVwZGF0ZVJlc3RhdXJhbnRSZXZpZXdzKHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICBzdG9yZS5wdXQocmVzdGF1cmFudCwgcmVzdGF1cmFudC5pZCk7XHJcbiAgICAgIERCSGVscGVyLnN5bmNSZXZpZXdzKCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTeW5jIHJldmlld3Mgd2l0aCBiYWNrZW5kXHJcbiAgICovXHJcbiAgc3RhdGljIHN5bmNSZXZpZXdzKCkge1xyXG4gICAgb3BlbkRhdGFiYXNlKCkudGhlbihkYiA9PiB7XHJcbiAgICAgIGxldCBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgc3RvcmUuZ2V0QWxsKCkudGhlbihyZXN0YXVyYW50cyA9PiB7XHJcbiAgICAgICAgaWYgKHJlc3RhdXJhbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgICBpZiAoIXJlc3RhdXJhbnQucmV2aWV3cykgcmV0dXJuO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlc3RhdXJhbnQucmV2aWV3cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgcmV2aWV3ID0gcmVzdGF1cmFudC5yZXZpZXdzW2ldOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAocmV2aWV3LnN5bmNlZCA9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgREJIZWxwZXIuc3luY1JldmlldyhyZXN0YXVyYW50LmlkLCByZXZpZXcpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgICAgICAgICByZXN0YXVyYW50LnJldmlld3NbaV0uc3luY2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpLnB1dChyZXN0YXVyYW50LCByZXN0YXVyYW50LmlkKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTeW5jIGEgcmV2aWV3XHJcbiAgICovXHJcbiAgc3RhdGljIHN5bmNSZXZpZXcocmVzdGF1cmFudF9pZCwgcmV2aWV3KSB7XHJcbiAgICByZXR1cm4gZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzLycsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgcmVzdGF1cmFudF9pZDogcmVzdGF1cmFudF9pZCxcclxuICAgICAgICAgIG5hbWU6IHJldmlldy5uYW1lLFxyXG4gICAgICAgICAgcmF0aW5nOiByZXZpZXcucmF0aW5nLFxyXG4gICAgICAgICAgY29tbWVudHM6IHJldmlldy5jb21tZW50c1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH0pXHJcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnQgcmV2aWV3c1xyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRSZXZpZXdzQnlJZChpZCwgY2FsbGJhY2spIHtcclxuICAgIG9wZW5EYXRhYmFzZSgpLnRoZW4oZGIgPT4ge1xyXG4gICAgICBsZXQgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgaWQgPSBwYXJzZUludChpZCk7XHJcbiAgICAgIHN0b3JlLmdldChpZCkudGhlbihyZXN0YXVyYW50ID0+IHtcclxuICAgICAgICBpZiAoIXJlc3RhdXJhbnQucmV2aWV3cykge1xyXG4gICAgICAgICAgZmV0Y2goYGh0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzLz9yZXN0YXVyYW50X2lkPSR7aWR9YClcclxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAudGhlbihyZXZpZXdzID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCByZXZpZXdzQXJyYXkgPSBbXVxyXG4gICAgICAgICAgICAgICAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHJldmlld3NBcnJheS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiByZXZpZXcubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICByYXRpbmc6IHJldmlldy5yYXRpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudHM6IHJldmlldy5jb21tZW50cyxcclxuICAgICAgICAgICAgICAgICAgICBkYXRlOiBtb21lbnQocmV2aWV3LmNyZWF0ZWRBdCkuZm9ybWF0KCdNTU1NIEQsIFlZWVknKVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzID0gcmV2aWV3c0FycmF5O1xyXG4gICAgICAgICAgICAgICAgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5wdXQocmVzdGF1cmFudCwgaWQpO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmV2aWV3c0FycmF5KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgXCJGYWlsZWQgdG8gZmV0Y2ggcmV2aWV3c1wiKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudC5yZXZpZXdzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIFJlc3RhdXJhbnQgaW1hZ2UgYmFzZSBwYXRoLlxyXG4gKi9cclxuREJIZWxwZXIuaW1hZ2VVcmxCYXNlUGF0aCA9ICcvaW1nLyc7XHJcblxyXG4vKipcclxuICogUmV0dXJuIEluZGV4ZWREQlxyXG4gKi9cclxuZnVuY3Rpb24gb3BlbkRhdGFiYXNlKCkge1xyXG4gIC8vIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICByZXR1cm4gaWRiLm9wZW4oJ213cy1yZXN0YXVyYW50cycsIDEsIHVwZ3JhZGVEQiA9PiB1cGdyYWRlREIuY3JlYXRlT2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJykpO1xyXG59XHJcblxyXG4iLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgLy8gRG9uJ3QgY3JlYXRlIGl0ZXJhdGVLZXlDdXJzb3IgaWYgb3BlbktleUN1cnNvciBkb2Vzbid0IGV4aXN0LlxuICAgICAgaWYgKCEoZnVuY05hbWUgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuXG4gICAgICBDb25zdHJ1Y3Rvci5wcm90b3R5cGVbZnVuY05hbWUucmVwbGFjZSgnb3BlbicsICdpdGVyYXRlJyldID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gICAgICAgIHZhciBuYXRpdmVPYmplY3QgPSB0aGlzLl9zdG9yZSB8fCB0aGlzLl9pbmRleDtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuYXRpdmVPYmplY3RbZnVuY05hbWVdLmFwcGx5KG5hdGl2ZU9iamVjdCwgYXJncy5zbGljZSgwLCAtMSkpO1xuICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBvbHlmaWxsIGdldEFsbFxuICBbSW5kZXgsIE9iamVjdFN0b3JlXS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XG4gICAgaWYgKENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwpIHJldHVybjtcbiAgICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24ocXVlcnksIGNvdW50KSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIGluc3RhbmNlLml0ZXJhdGVDdXJzb3IocXVlcnksIGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAgIGlmICghY3Vyc29yKSB7XG4gICAgICAgICAgICByZXNvbHZlKGl0ZW1zKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaXRlbXMucHVzaChjdXJzb3IudmFsdWUpO1xuXG4gICAgICAgICAgaWYgKGNvdW50ICE9PSB1bmRlZmluZWQgJiYgaXRlbXMubGVuZ3RoID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXNvbHZlKGl0ZW1zKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGV4cCA9IHtcbiAgICBvcGVuOiBmdW5jdGlvbihuYW1lLCB2ZXJzaW9uLCB1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwoaW5kZXhlZERCLCAnb3BlbicsIFtuYW1lLCB2ZXJzaW9uXSk7XG4gICAgICB2YXIgcmVxdWVzdCA9IHAucmVxdWVzdDtcblxuICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgcmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICAgIG1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBtb2R1bGUuZXhwb3J0cztcbiAgfVxuICBlbHNlIHtcbiAgICBzZWxmLmlkYiA9IGV4cDtcbiAgfVxufSgpKTsiLCIhZnVuY3Rpb24oZSx0KXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZT9tb2R1bGUuZXhwb3J0cz10KCk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZSh0KTplLm1vbWVudD10KCl9KHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjt2YXIgZSxpO2Z1bmN0aW9uIGMoKXtyZXR1cm4gZS5hcHBseShudWxsLGFyZ3VtZW50cyl9ZnVuY3Rpb24gbyhlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEFycmF5fHxcIltvYmplY3QgQXJyYXldXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSl9ZnVuY3Rpb24gdShlKXtyZXR1cm4gbnVsbCE9ZSYmXCJbb2JqZWN0IE9iamVjdF1cIj09PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlKX1mdW5jdGlvbiBsKGUpe3JldHVybiB2b2lkIDA9PT1lfWZ1bmN0aW9uIGQoZSl7cmV0dXJuXCJudW1iZXJcIj09dHlwZW9mIGV8fFwiW29iamVjdCBOdW1iZXJdXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSl9ZnVuY3Rpb24gaChlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIERhdGV8fFwiW29iamVjdCBEYXRlXVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIGYoZSx0KXt2YXIgbixzPVtdO2ZvcihuPTA7bjxlLmxlbmd0aDsrK24pcy5wdXNoKHQoZVtuXSxuKSk7cmV0dXJuIHN9ZnVuY3Rpb24gbShlLHQpe3JldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZSx0KX1mdW5jdGlvbiBfKGUsdCl7Zm9yKHZhciBuIGluIHQpbSh0LG4pJiYoZVtuXT10W25dKTtyZXR1cm4gbSh0LFwidG9TdHJpbmdcIikmJihlLnRvU3RyaW5nPXQudG9TdHJpbmcpLG0odCxcInZhbHVlT2ZcIikmJihlLnZhbHVlT2Y9dC52YWx1ZU9mKSxlfWZ1bmN0aW9uIHkoZSx0LG4scyl7cmV0dXJuIE90KGUsdCxuLHMsITApLnV0YygpfWZ1bmN0aW9uIGcoZSl7cmV0dXJuIG51bGw9PWUuX3BmJiYoZS5fcGY9e2VtcHR5OiExLHVudXNlZFRva2VuczpbXSx1bnVzZWRJbnB1dDpbXSxvdmVyZmxvdzotMixjaGFyc0xlZnRPdmVyOjAsbnVsbElucHV0OiExLGludmFsaWRNb250aDpudWxsLGludmFsaWRGb3JtYXQ6ITEsdXNlckludmFsaWRhdGVkOiExLGlzbzohMSxwYXJzZWREYXRlUGFydHM6W10sbWVyaWRpZW06bnVsbCxyZmMyODIyOiExLHdlZWtkYXlNaXNtYXRjaDohMX0pLGUuX3BmfWZ1bmN0aW9uIHAoZSl7aWYobnVsbD09ZS5faXNWYWxpZCl7dmFyIHQ9ZyhlKSxuPWkuY2FsbCh0LnBhcnNlZERhdGVQYXJ0cyxmdW5jdGlvbihlKXtyZXR1cm4gbnVsbCE9ZX0pLHM9IWlzTmFOKGUuX2QuZ2V0VGltZSgpKSYmdC5vdmVyZmxvdzwwJiYhdC5lbXB0eSYmIXQuaW52YWxpZE1vbnRoJiYhdC5pbnZhbGlkV2Vla2RheSYmIXQud2Vla2RheU1pc21hdGNoJiYhdC5udWxsSW5wdXQmJiF0LmludmFsaWRGb3JtYXQmJiF0LnVzZXJJbnZhbGlkYXRlZCYmKCF0Lm1lcmlkaWVtfHx0Lm1lcmlkaWVtJiZuKTtpZihlLl9zdHJpY3QmJihzPXMmJjA9PT10LmNoYXJzTGVmdE92ZXImJjA9PT10LnVudXNlZFRva2Vucy5sZW5ndGgmJnZvaWQgMD09PXQuYmlnSG91ciksbnVsbCE9T2JqZWN0LmlzRnJvemVuJiZPYmplY3QuaXNGcm96ZW4oZSkpcmV0dXJuIHM7ZS5faXNWYWxpZD1zfXJldHVybiBlLl9pc1ZhbGlkfWZ1bmN0aW9uIHYoZSl7dmFyIHQ9eShOYU4pO3JldHVybiBudWxsIT1lP18oZyh0KSxlKTpnKHQpLnVzZXJJbnZhbGlkYXRlZD0hMCx0fWk9QXJyYXkucHJvdG90eXBlLnNvbWU/QXJyYXkucHJvdG90eXBlLnNvbWU6ZnVuY3Rpb24oZSl7Zm9yKHZhciB0PU9iamVjdCh0aGlzKSxuPXQubGVuZ3RoPj4+MCxzPTA7czxuO3MrKylpZihzIGluIHQmJmUuY2FsbCh0aGlzLHRbc10scyx0KSlyZXR1cm4hMDtyZXR1cm4hMX07dmFyIHI9Yy5tb21lbnRQcm9wZXJ0aWVzPVtdO2Z1bmN0aW9uIHcoZSx0KXt2YXIgbixzLGk7aWYobCh0Ll9pc0FNb21lbnRPYmplY3QpfHwoZS5faXNBTW9tZW50T2JqZWN0PXQuX2lzQU1vbWVudE9iamVjdCksbCh0Ll9pKXx8KGUuX2k9dC5faSksbCh0Ll9mKXx8KGUuX2Y9dC5fZiksbCh0Ll9sKXx8KGUuX2w9dC5fbCksbCh0Ll9zdHJpY3QpfHwoZS5fc3RyaWN0PXQuX3N0cmljdCksbCh0Ll90em0pfHwoZS5fdHptPXQuX3R6bSksbCh0Ll9pc1VUQyl8fChlLl9pc1VUQz10Ll9pc1VUQyksbCh0Ll9vZmZzZXQpfHwoZS5fb2Zmc2V0PXQuX29mZnNldCksbCh0Ll9wZil8fChlLl9wZj1nKHQpKSxsKHQuX2xvY2FsZSl8fChlLl9sb2NhbGU9dC5fbG9jYWxlKSwwPHIubGVuZ3RoKWZvcihuPTA7bjxyLmxlbmd0aDtuKyspbChpPXRbcz1yW25dXSl8fChlW3NdPWkpO3JldHVybiBlfXZhciB0PSExO2Z1bmN0aW9uIE0oZSl7dyh0aGlzLGUpLHRoaXMuX2Q9bmV3IERhdGUobnVsbCE9ZS5fZD9lLl9kLmdldFRpbWUoKTpOYU4pLHRoaXMuaXNWYWxpZCgpfHwodGhpcy5fZD1uZXcgRGF0ZShOYU4pKSwhMT09PXQmJih0PSEwLGMudXBkYXRlT2Zmc2V0KHRoaXMpLHQ9ITEpfWZ1bmN0aW9uIFMoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBNfHxudWxsIT1lJiZudWxsIT1lLl9pc0FNb21lbnRPYmplY3R9ZnVuY3Rpb24gRChlKXtyZXR1cm4gZTwwP01hdGguY2VpbChlKXx8MDpNYXRoLmZsb29yKGUpfWZ1bmN0aW9uIGsoZSl7dmFyIHQ9K2Usbj0wO3JldHVybiAwIT09dCYmaXNGaW5pdGUodCkmJihuPUQodCkpLG59ZnVuY3Rpb24gYShlLHQsbil7dmFyIHMsaT1NYXRoLm1pbihlLmxlbmd0aCx0Lmxlbmd0aCkscj1NYXRoLmFicyhlLmxlbmd0aC10Lmxlbmd0aCksYT0wO2ZvcihzPTA7czxpO3MrKykobiYmZVtzXSE9PXRbc118fCFuJiZrKGVbc10pIT09ayh0W3NdKSkmJmErKztyZXR1cm4gYStyfWZ1bmN0aW9uIFkoZSl7ITE9PT1jLnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGNvbnNvbGUmJmNvbnNvbGUud2FybiYmY29uc29sZS53YXJuKFwiRGVwcmVjYXRpb24gd2FybmluZzogXCIrZSl9ZnVuY3Rpb24gbihpLHIpe3ZhciBhPSEwO3JldHVybiBfKGZ1bmN0aW9uKCl7aWYobnVsbCE9Yy5kZXByZWNhdGlvbkhhbmRsZXImJmMuZGVwcmVjYXRpb25IYW5kbGVyKG51bGwsaSksYSl7Zm9yKHZhciBlLHQ9W10sbj0wO248YXJndW1lbnRzLmxlbmd0aDtuKyspe2lmKGU9XCJcIixcIm9iamVjdFwiPT10eXBlb2YgYXJndW1lbnRzW25dKXtmb3IodmFyIHMgaW4gZSs9XCJcXG5bXCIrbitcIl0gXCIsYXJndW1lbnRzWzBdKWUrPXMrXCI6IFwiK2FyZ3VtZW50c1swXVtzXStcIiwgXCI7ZT1lLnNsaWNlKDAsLTIpfWVsc2UgZT1hcmd1bWVudHNbbl07dC5wdXNoKGUpfVkoaStcIlxcbkFyZ3VtZW50czogXCIrQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodCkuam9pbihcIlwiKStcIlxcblwiKyhuZXcgRXJyb3IpLnN0YWNrKSxhPSExfXJldHVybiByLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0scil9dmFyIHMsTz17fTtmdW5jdGlvbiBUKGUsdCl7bnVsbCE9Yy5kZXByZWNhdGlvbkhhbmRsZXImJmMuZGVwcmVjYXRpb25IYW5kbGVyKGUsdCksT1tlXXx8KFkodCksT1tlXT0hMCl9ZnVuY3Rpb24geChlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEZ1bmN0aW9ufHxcIltvYmplY3QgRnVuY3Rpb25dXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSl9ZnVuY3Rpb24gYihlLHQpe3ZhciBuLHM9Xyh7fSxlKTtmb3IobiBpbiB0KW0odCxuKSYmKHUoZVtuXSkmJnUodFtuXSk/KHNbbl09e30sXyhzW25dLGVbbl0pLF8oc1tuXSx0W25dKSk6bnVsbCE9dFtuXT9zW25dPXRbbl06ZGVsZXRlIHNbbl0pO2ZvcihuIGluIGUpbShlLG4pJiYhbSh0LG4pJiZ1KGVbbl0pJiYoc1tuXT1fKHt9LHNbbl0pKTtyZXR1cm4gc31mdW5jdGlvbiBQKGUpe251bGwhPWUmJnRoaXMuc2V0KGUpfWMuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzPSExLGMuZGVwcmVjYXRpb25IYW5kbGVyPW51bGwscz1PYmplY3Qua2V5cz9PYmplY3Qua2V5czpmdW5jdGlvbihlKXt2YXIgdCxuPVtdO2Zvcih0IGluIGUpbShlLHQpJiZuLnB1c2godCk7cmV0dXJuIG59O3ZhciBXPXt9O2Z1bmN0aW9uIEgoZSx0KXt2YXIgbj1lLnRvTG93ZXJDYXNlKCk7V1tuXT1XW24rXCJzXCJdPVdbdF09ZX1mdW5jdGlvbiBSKGUpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiBlP1dbZV18fFdbZS50b0xvd2VyQ2FzZSgpXTp2b2lkIDB9ZnVuY3Rpb24gQyhlKXt2YXIgdCxuLHM9e307Zm9yKG4gaW4gZSltKGUsbikmJih0PVIobikpJiYoc1t0XT1lW25dKTtyZXR1cm4gc312YXIgRj17fTtmdW5jdGlvbiBMKGUsdCl7RltlXT10fWZ1bmN0aW9uIFUoZSx0LG4pe3ZhciBzPVwiXCIrTWF0aC5hYnMoZSksaT10LXMubGVuZ3RoO3JldHVybigwPD1lP24/XCIrXCI6XCJcIjpcIi1cIikrTWF0aC5wb3coMTAsTWF0aC5tYXgoMCxpKSkudG9TdHJpbmcoKS5zdWJzdHIoMSkrc312YXIgTj0vKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oW0hoXW1tKHNzKT98TW98TU0/TT9NP3xEb3xERERvfEREP0Q/RD98ZGRkP2Q/fGRvP3x3W298d10/fFdbb3xXXT98UW8/fFlZWVlZWXxZWVlZWXxZWVlZfFlZfGdnKGdnZz8pP3xHRyhHR0c/KT98ZXxFfGF8QXxoaD98SEg/fGtrP3xtbT98c3M/fFN7MSw5fXx4fFh8eno/fFpaP3wuKS9nLEc9LyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KExUU3xMVHxMTD9MP0w/fGx7MSw0fSkvZyxWPXt9LEU9e307ZnVuY3Rpb24gSShlLHQsbixzKXt2YXIgaT1zO1wic3RyaW5nXCI9PXR5cGVvZiBzJiYoaT1mdW5jdGlvbigpe3JldHVybiB0aGlzW3NdKCl9KSxlJiYoRVtlXT1pKSx0JiYoRVt0WzBdXT1mdW5jdGlvbigpe3JldHVybiBVKGkuYXBwbHkodGhpcyxhcmd1bWVudHMpLHRbMV0sdFsyXSl9KSxuJiYoRVtuXT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5vcmRpbmFsKGkuYXBwbHkodGhpcyxhcmd1bWVudHMpLGUpfSl9ZnVuY3Rpb24gQShlLHQpe3JldHVybiBlLmlzVmFsaWQoKT8odD1qKHQsZS5sb2NhbGVEYXRhKCkpLFZbdF09Vlt0XXx8ZnVuY3Rpb24ocyl7dmFyIGUsaSx0LHI9cy5tYXRjaChOKTtmb3IoZT0wLGk9ci5sZW5ndGg7ZTxpO2UrKylFW3JbZV1dP3JbZV09RVtyW2VdXTpyW2VdPSh0PXJbZV0pLm1hdGNoKC9cXFtbXFxzXFxTXS8pP3QucmVwbGFjZSgvXlxcW3xcXF0kL2csXCJcIik6dC5yZXBsYWNlKC9cXFxcL2csXCJcIik7cmV0dXJuIGZ1bmN0aW9uKGUpe3ZhciB0LG49XCJcIjtmb3IodD0wO3Q8aTt0Kyspbis9eChyW3RdKT9yW3RdLmNhbGwoZSxzKTpyW3RdO3JldHVybiBufX0odCksVlt0XShlKSk6ZS5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKX1mdW5jdGlvbiBqKGUsdCl7dmFyIG49NTtmdW5jdGlvbiBzKGUpe3JldHVybiB0LmxvbmdEYXRlRm9ybWF0KGUpfHxlfWZvcihHLmxhc3RJbmRleD0wOzA8PW4mJkcudGVzdChlKTspZT1lLnJlcGxhY2UoRyxzKSxHLmxhc3RJbmRleD0wLG4tPTE7cmV0dXJuIGV9dmFyIFo9L1xcZC8sej0vXFxkXFxkLywkPS9cXGR7M30vLHE9L1xcZHs0fS8sSj0vWystXT9cXGR7Nn0vLEI9L1xcZFxcZD8vLFE9L1xcZFxcZFxcZFxcZD8vLFg9L1xcZFxcZFxcZFxcZFxcZFxcZD8vLEs9L1xcZHsxLDN9LyxlZT0vXFxkezEsNH0vLHRlPS9bKy1dP1xcZHsxLDZ9LyxuZT0vXFxkKy8sc2U9L1srLV0/XFxkKy8saWU9L1p8WystXVxcZFxcZDo/XFxkXFxkL2dpLHJlPS9afFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/L2dpLGFlPS9bMC05XXswLDI1Nn1bJ2EtelxcdTAwQTAtXFx1MDVGRlxcdTA3MDAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkYwN1xcdUZGMTAtXFx1RkZFRl17MSwyNTZ9fFtcXHUwNjAwLVxcdTA2RkZcXC9dezEsMjU2fShcXHMqP1tcXHUwNjAwLVxcdTA2RkZdezEsMjU2fSl7MSwyfS9pLG9lPXt9O2Z1bmN0aW9uIHVlKGUsbixzKXtvZVtlXT14KG4pP246ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZSYmcz9zOm59fWZ1bmN0aW9uIGxlKGUsdCl7cmV0dXJuIG0ob2UsZSk/b2VbZV0odC5fc3RyaWN0LHQuX2xvY2FsZSk6bmV3IFJlZ0V4cChkZShlLnJlcGxhY2UoXCJcXFxcXCIsXCJcIikucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLGZ1bmN0aW9uKGUsdCxuLHMsaSl7cmV0dXJuIHR8fG58fHN8fGl9KSkpfWZ1bmN0aW9uIGRlKGUpe3JldHVybiBlLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZyxcIlxcXFwkJlwiKX12YXIgaGU9e307ZnVuY3Rpb24gY2UoZSxuKXt2YXIgdCxzPW47Zm9yKFwic3RyaW5nXCI9PXR5cGVvZiBlJiYoZT1bZV0pLGQobikmJihzPWZ1bmN0aW9uKGUsdCl7dFtuXT1rKGUpfSksdD0wO3Q8ZS5sZW5ndGg7dCsrKWhlW2VbdF1dPXN9ZnVuY3Rpb24gZmUoZSxpKXtjZShlLGZ1bmN0aW9uKGUsdCxuLHMpe24uX3c9bi5fd3x8e30saShlLG4uX3csbixzKX0pfXZhciBtZT0wLF9lPTEseWU9MixnZT0zLHBlPTQsdmU9NSx3ZT02LE1lPTcsU2U9ODtmdW5jdGlvbiBEZShlKXtyZXR1cm4ga2UoZSk/MzY2OjM2NX1mdW5jdGlvbiBrZShlKXtyZXR1cm4gZSU0PT0wJiZlJTEwMCE9MHx8ZSU0MDA9PTB9SShcIllcIiwwLDAsZnVuY3Rpb24oKXt2YXIgZT10aGlzLnllYXIoKTtyZXR1cm4gZTw9OTk5OT9cIlwiK2U6XCIrXCIrZX0pLEkoMCxbXCJZWVwiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy55ZWFyKCklMTAwfSksSSgwLFtcIllZWVlcIiw0XSwwLFwieWVhclwiKSxJKDAsW1wiWVlZWVlcIiw1XSwwLFwieWVhclwiKSxJKDAsW1wiWVlZWVlZXCIsNiwhMF0sMCxcInllYXJcIiksSChcInllYXJcIixcInlcIiksTChcInllYXJcIiwxKSx1ZShcIllcIixzZSksdWUoXCJZWVwiLEIseiksdWUoXCJZWVlZXCIsZWUscSksdWUoXCJZWVlZWVwiLHRlLEopLHVlKFwiWVlZWVlZXCIsdGUsSiksY2UoW1wiWVlZWVlcIixcIllZWVlZWVwiXSxtZSksY2UoXCJZWVlZXCIsZnVuY3Rpb24oZSx0KXt0W21lXT0yPT09ZS5sZW5ndGg/Yy5wYXJzZVR3b0RpZ2l0WWVhcihlKTprKGUpfSksY2UoXCJZWVwiLGZ1bmN0aW9uKGUsdCl7dFttZV09Yy5wYXJzZVR3b0RpZ2l0WWVhcihlKX0pLGNlKFwiWVwiLGZ1bmN0aW9uKGUsdCl7dFttZV09cGFyc2VJbnQoZSwxMCl9KSxjLnBhcnNlVHdvRGlnaXRZZWFyPWZ1bmN0aW9uKGUpe3JldHVybiBrKGUpKyg2ODxrKGUpPzE5MDA6MmUzKX07dmFyIFllLE9lPVRlKFwiRnVsbFllYXJcIiwhMCk7ZnVuY3Rpb24gVGUodCxuKXtyZXR1cm4gZnVuY3Rpb24oZSl7cmV0dXJuIG51bGwhPWU/KGJlKHRoaXMsdCxlKSxjLnVwZGF0ZU9mZnNldCh0aGlzLG4pLHRoaXMpOnhlKHRoaXMsdCl9fWZ1bmN0aW9uIHhlKGUsdCl7cmV0dXJuIGUuaXNWYWxpZCgpP2UuX2RbXCJnZXRcIisoZS5faXNVVEM/XCJVVENcIjpcIlwiKSt0XSgpOk5hTn1mdW5jdGlvbiBiZShlLHQsbil7ZS5pc1ZhbGlkKCkmJiFpc05hTihuKSYmKFwiRnVsbFllYXJcIj09PXQmJmtlKGUueWVhcigpKSYmMT09PWUubW9udGgoKSYmMjk9PT1lLmRhdGUoKT9lLl9kW1wic2V0XCIrKGUuX2lzVVRDP1wiVVRDXCI6XCJcIikrdF0obixlLm1vbnRoKCksUGUobixlLm1vbnRoKCkpKTplLl9kW1wic2V0XCIrKGUuX2lzVVRDP1wiVVRDXCI6XCJcIikrdF0obikpfWZ1bmN0aW9uIFBlKGUsdCl7aWYoaXNOYU4oZSl8fGlzTmFOKHQpKXJldHVybiBOYU47dmFyIG4scz0odCUobj0xMikrbiklbjtyZXR1cm4gZSs9KHQtcykvMTIsMT09PXM/a2UoZSk/Mjk6Mjg6MzEtcyU3JTJ9WWU9QXJyYXkucHJvdG90eXBlLmluZGV4T2Y/QXJyYXkucHJvdG90eXBlLmluZGV4T2Y6ZnVuY3Rpb24oZSl7dmFyIHQ7Zm9yKHQ9MDt0PHRoaXMubGVuZ3RoOysrdClpZih0aGlzW3RdPT09ZSlyZXR1cm4gdDtyZXR1cm4tMX0sSShcIk1cIixbXCJNTVwiLDJdLFwiTW9cIixmdW5jdGlvbigpe3JldHVybiB0aGlzLm1vbnRoKCkrMX0pLEkoXCJNTU1cIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1vbnRoc1Nob3J0KHRoaXMsZSl9KSxJKFwiTU1NTVwiLDAsMCxmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzKHRoaXMsZSl9KSxIKFwibW9udGhcIixcIk1cIiksTChcIm1vbnRoXCIsOCksdWUoXCJNXCIsQiksdWUoXCJNTVwiLEIseiksdWUoXCJNTU1cIixmdW5jdGlvbihlLHQpe3JldHVybiB0Lm1vbnRoc1Nob3J0UmVnZXgoZSl9KSx1ZShcIk1NTU1cIixmdW5jdGlvbihlLHQpe3JldHVybiB0Lm1vbnRoc1JlZ2V4KGUpfSksY2UoW1wiTVwiLFwiTU1cIl0sZnVuY3Rpb24oZSx0KXt0W19lXT1rKGUpLTF9KSxjZShbXCJNTU1cIixcIk1NTU1cIl0sZnVuY3Rpb24oZSx0LG4scyl7dmFyIGk9bi5fbG9jYWxlLm1vbnRoc1BhcnNlKGUscyxuLl9zdHJpY3QpO251bGwhPWk/dFtfZV09aTpnKG4pLmludmFsaWRNb250aD1lfSk7dmFyIFdlPS9EW29EXT8oXFxbW15cXFtcXF1dKlxcXXxcXHMpK01NTU0/LyxIZT1cIkphbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXJcIi5zcGxpdChcIl9cIik7dmFyIFJlPVwiSmFuX0ZlYl9NYXJfQXByX01heV9KdW5fSnVsX0F1Z19TZXBfT2N0X05vdl9EZWNcIi5zcGxpdChcIl9cIik7ZnVuY3Rpb24gQ2UoZSx0KXt2YXIgbjtpZighZS5pc1ZhbGlkKCkpcmV0dXJuIGU7aWYoXCJzdHJpbmdcIj09dHlwZW9mIHQpaWYoL15cXGQrJC8udGVzdCh0KSl0PWsodCk7ZWxzZSBpZighZCh0PWUubG9jYWxlRGF0YSgpLm1vbnRoc1BhcnNlKHQpKSlyZXR1cm4gZTtyZXR1cm4gbj1NYXRoLm1pbihlLmRhdGUoKSxQZShlLnllYXIoKSx0KSksZS5fZFtcInNldFwiKyhlLl9pc1VUQz9cIlVUQ1wiOlwiXCIpK1wiTW9udGhcIl0odCxuKSxlfWZ1bmN0aW9uIEZlKGUpe3JldHVybiBudWxsIT1lPyhDZSh0aGlzLGUpLGMudXBkYXRlT2Zmc2V0KHRoaXMsITApLHRoaXMpOnhlKHRoaXMsXCJNb250aFwiKX12YXIgTGU9YWU7dmFyIFVlPWFlO2Z1bmN0aW9uIE5lKCl7ZnVuY3Rpb24gZShlLHQpe3JldHVybiB0Lmxlbmd0aC1lLmxlbmd0aH12YXIgdCxuLHM9W10saT1bXSxyPVtdO2Zvcih0PTA7dDwxMjt0Kyspbj15KFsyZTMsdF0pLHMucHVzaCh0aGlzLm1vbnRoc1Nob3J0KG4sXCJcIikpLGkucHVzaCh0aGlzLm1vbnRocyhuLFwiXCIpKSxyLnB1c2godGhpcy5tb250aHMobixcIlwiKSksci5wdXNoKHRoaXMubW9udGhzU2hvcnQobixcIlwiKSk7Zm9yKHMuc29ydChlKSxpLnNvcnQoZSksci5zb3J0KGUpLHQ9MDt0PDEyO3QrKylzW3RdPWRlKHNbdF0pLGlbdF09ZGUoaVt0XSk7Zm9yKHQ9MDt0PDI0O3QrKylyW3RdPWRlKHJbdF0pO3RoaXMuX21vbnRoc1JlZ2V4PW5ldyBSZWdFeHAoXCJeKFwiK3Iuam9pbihcInxcIikrXCIpXCIsXCJpXCIpLHRoaXMuX21vbnRoc1Nob3J0UmVnZXg9dGhpcy5fbW9udGhzUmVnZXgsdGhpcy5fbW9udGhzU3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIraS5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fbW9udGhzU2hvcnRTdHJpY3RSZWdleD1uZXcgUmVnRXhwKFwiXihcIitzLmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKX1mdW5jdGlvbiBHZShlKXt2YXIgdD1uZXcgRGF0ZShEYXRlLlVUQy5hcHBseShudWxsLGFyZ3VtZW50cykpO3JldHVybiBlPDEwMCYmMDw9ZSYmaXNGaW5pdGUodC5nZXRVVENGdWxsWWVhcigpKSYmdC5zZXRVVENGdWxsWWVhcihlKSx0fWZ1bmN0aW9uIFZlKGUsdCxuKXt2YXIgcz03K3QtbjtyZXR1cm4tKCg3K0dlKGUsMCxzKS5nZXRVVENEYXkoKS10KSU3KStzLTF9ZnVuY3Rpb24gRWUoZSx0LG4scyxpKXt2YXIgcixhLG89MSs3Kih0LTEpKyg3K24tcyklNytWZShlLHMsaSk7cmV0dXJuIG88PTA/YT1EZShyPWUtMSkrbzpvPkRlKGUpPyhyPWUrMSxhPW8tRGUoZSkpOihyPWUsYT1vKSx7eWVhcjpyLGRheU9mWWVhcjphfX1mdW5jdGlvbiBJZShlLHQsbil7dmFyIHMsaSxyPVZlKGUueWVhcigpLHQsbiksYT1NYXRoLmZsb29yKChlLmRheU9mWWVhcigpLXItMSkvNykrMTtyZXR1cm4gYTwxP3M9YStBZShpPWUueWVhcigpLTEsdCxuKTphPkFlKGUueWVhcigpLHQsbik/KHM9YS1BZShlLnllYXIoKSx0LG4pLGk9ZS55ZWFyKCkrMSk6KGk9ZS55ZWFyKCkscz1hKSx7d2VlazpzLHllYXI6aX19ZnVuY3Rpb24gQWUoZSx0LG4pe3ZhciBzPVZlKGUsdCxuKSxpPVZlKGUrMSx0LG4pO3JldHVybihEZShlKS1zK2kpLzd9SShcIndcIixbXCJ3d1wiLDJdLFwid29cIixcIndlZWtcIiksSShcIldcIixbXCJXV1wiLDJdLFwiV29cIixcImlzb1dlZWtcIiksSChcIndlZWtcIixcIndcIiksSChcImlzb1dlZWtcIixcIldcIiksTChcIndlZWtcIiw1KSxMKFwiaXNvV2Vla1wiLDUpLHVlKFwid1wiLEIpLHVlKFwid3dcIixCLHopLHVlKFwiV1wiLEIpLHVlKFwiV1dcIixCLHopLGZlKFtcIndcIixcInd3XCIsXCJXXCIsXCJXV1wiXSxmdW5jdGlvbihlLHQsbixzKXt0W3Muc3Vic3RyKDAsMSldPWsoZSl9KTtJKFwiZFwiLDAsXCJkb1wiLFwiZGF5XCIpLEkoXCJkZFwiLDAsMCxmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNNaW4odGhpcyxlKX0pLEkoXCJkZGRcIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzU2hvcnQodGhpcyxlKX0pLEkoXCJkZGRkXCIsMCwwLGZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5cyh0aGlzLGUpfSksSShcImVcIiwwLDAsXCJ3ZWVrZGF5XCIpLEkoXCJFXCIsMCwwLFwiaXNvV2Vla2RheVwiKSxIKFwiZGF5XCIsXCJkXCIpLEgoXCJ3ZWVrZGF5XCIsXCJlXCIpLEgoXCJpc29XZWVrZGF5XCIsXCJFXCIpLEwoXCJkYXlcIiwxMSksTChcIndlZWtkYXlcIiwxMSksTChcImlzb1dlZWtkYXlcIiwxMSksdWUoXCJkXCIsQiksdWUoXCJlXCIsQiksdWUoXCJFXCIsQiksdWUoXCJkZFwiLGZ1bmN0aW9uKGUsdCl7cmV0dXJuIHQud2Vla2RheXNNaW5SZWdleChlKX0pLHVlKFwiZGRkXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC53ZWVrZGF5c1Nob3J0UmVnZXgoZSl9KSx1ZShcImRkZGRcIixmdW5jdGlvbihlLHQpe3JldHVybiB0LndlZWtkYXlzUmVnZXgoZSl9KSxmZShbXCJkZFwiLFwiZGRkXCIsXCJkZGRkXCJdLGZ1bmN0aW9uKGUsdCxuLHMpe3ZhciBpPW4uX2xvY2FsZS53ZWVrZGF5c1BhcnNlKGUscyxuLl9zdHJpY3QpO251bGwhPWk/dC5kPWk6ZyhuKS5pbnZhbGlkV2Vla2RheT1lfSksZmUoW1wiZFwiLFwiZVwiLFwiRVwiXSxmdW5jdGlvbihlLHQsbixzKXt0W3NdPWsoZSl9KTt2YXIgamU9XCJTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheVwiLnNwbGl0KFwiX1wiKTt2YXIgWmU9XCJTdW5fTW9uX1R1ZV9XZWRfVGh1X0ZyaV9TYXRcIi5zcGxpdChcIl9cIik7dmFyIHplPVwiU3VfTW9fVHVfV2VfVGhfRnJfU2FcIi5zcGxpdChcIl9cIik7dmFyICRlPWFlO3ZhciBxZT1hZTt2YXIgSmU9YWU7ZnVuY3Rpb24gQmUoKXtmdW5jdGlvbiBlKGUsdCl7cmV0dXJuIHQubGVuZ3RoLWUubGVuZ3RofXZhciB0LG4scyxpLHIsYT1bXSxvPVtdLHU9W10sbD1bXTtmb3IodD0wO3Q8Nzt0Kyspbj15KFsyZTMsMV0pLmRheSh0KSxzPXRoaXMud2Vla2RheXNNaW4obixcIlwiKSxpPXRoaXMud2Vla2RheXNTaG9ydChuLFwiXCIpLHI9dGhpcy53ZWVrZGF5cyhuLFwiXCIpLGEucHVzaChzKSxvLnB1c2goaSksdS5wdXNoKHIpLGwucHVzaChzKSxsLnB1c2goaSksbC5wdXNoKHIpO2ZvcihhLnNvcnQoZSksby5zb3J0KGUpLHUuc29ydChlKSxsLnNvcnQoZSksdD0wO3Q8Nzt0Kyspb1t0XT1kZShvW3RdKSx1W3RdPWRlKHVbdF0pLGxbdF09ZGUobFt0XSk7dGhpcy5fd2Vla2RheXNSZWdleD1uZXcgUmVnRXhwKFwiXihcIitsLmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKSx0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXg9dGhpcy5fd2Vla2RheXNSZWdleCx0aGlzLl93ZWVrZGF5c01pblJlZ2V4PXRoaXMuX3dlZWtkYXlzUmVnZXgsdGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleD1uZXcgUmVnRXhwKFwiXihcIit1LmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKSx0aGlzLl93ZWVrZGF5c1Nob3J0U3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrby5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleD1uZXcgUmVnRXhwKFwiXihcIithLmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKX1mdW5jdGlvbiBRZSgpe3JldHVybiB0aGlzLmhvdXJzKCklMTJ8fDEyfWZ1bmN0aW9uIFhlKGUsdCl7SShlLDAsMCxmdW5jdGlvbigpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tZXJpZGllbSh0aGlzLmhvdXJzKCksdGhpcy5taW51dGVzKCksdCl9KX1mdW5jdGlvbiBLZShlLHQpe3JldHVybiB0Ll9tZXJpZGllbVBhcnNlfUkoXCJIXCIsW1wiSEhcIiwyXSwwLFwiaG91clwiKSxJKFwiaFwiLFtcImhoXCIsMl0sMCxRZSksSShcImtcIixbXCJra1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5ob3VycygpfHwyNH0pLEkoXCJobW1cIiwwLDAsZnVuY3Rpb24oKXtyZXR1cm5cIlwiK1FlLmFwcGx5KHRoaXMpK1UodGhpcy5taW51dGVzKCksMil9KSxJKFwiaG1tc3NcIiwwLDAsZnVuY3Rpb24oKXtyZXR1cm5cIlwiK1FlLmFwcGx5KHRoaXMpK1UodGhpcy5taW51dGVzKCksMikrVSh0aGlzLnNlY29uZHMoKSwyKX0pLEkoXCJIbW1cIiwwLDAsZnVuY3Rpb24oKXtyZXR1cm5cIlwiK3RoaXMuaG91cnMoKStVKHRoaXMubWludXRlcygpLDIpfSksSShcIkhtbXNzXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzLmhvdXJzKCkrVSh0aGlzLm1pbnV0ZXMoKSwyKStVKHRoaXMuc2Vjb25kcygpLDIpfSksWGUoXCJhXCIsITApLFhlKFwiQVwiLCExKSxIKFwiaG91clwiLFwiaFwiKSxMKFwiaG91clwiLDEzKSx1ZShcImFcIixLZSksdWUoXCJBXCIsS2UpLHVlKFwiSFwiLEIpLHVlKFwiaFwiLEIpLHVlKFwia1wiLEIpLHVlKFwiSEhcIixCLHopLHVlKFwiaGhcIixCLHopLHVlKFwia2tcIixCLHopLHVlKFwiaG1tXCIsUSksdWUoXCJobW1zc1wiLFgpLHVlKFwiSG1tXCIsUSksdWUoXCJIbW1zc1wiLFgpLGNlKFtcIkhcIixcIkhIXCJdLGdlKSxjZShbXCJrXCIsXCJra1wiXSxmdW5jdGlvbihlLHQsbil7dmFyIHM9ayhlKTt0W2dlXT0yND09PXM/MDpzfSksY2UoW1wiYVwiLFwiQVwiXSxmdW5jdGlvbihlLHQsbil7bi5faXNQbT1uLl9sb2NhbGUuaXNQTShlKSxuLl9tZXJpZGllbT1lfSksY2UoW1wiaFwiLFwiaGhcIl0sZnVuY3Rpb24oZSx0LG4pe3RbZ2VdPWsoZSksZyhuKS5iaWdIb3VyPSEwfSksY2UoXCJobW1cIixmdW5jdGlvbihlLHQsbil7dmFyIHM9ZS5sZW5ndGgtMjt0W2dlXT1rKGUuc3Vic3RyKDAscykpLHRbcGVdPWsoZS5zdWJzdHIocykpLGcobikuYmlnSG91cj0hMH0pLGNlKFwiaG1tc3NcIixmdW5jdGlvbihlLHQsbil7dmFyIHM9ZS5sZW5ndGgtNCxpPWUubGVuZ3RoLTI7dFtnZV09ayhlLnN1YnN0cigwLHMpKSx0W3BlXT1rKGUuc3Vic3RyKHMsMikpLHRbdmVdPWsoZS5zdWJzdHIoaSkpLGcobikuYmlnSG91cj0hMH0pLGNlKFwiSG1tXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTI7dFtnZV09ayhlLnN1YnN0cigwLHMpKSx0W3BlXT1rKGUuc3Vic3RyKHMpKX0pLGNlKFwiSG1tc3NcIixmdW5jdGlvbihlLHQsbil7dmFyIHM9ZS5sZW5ndGgtNCxpPWUubGVuZ3RoLTI7dFtnZV09ayhlLnN1YnN0cigwLHMpKSx0W3BlXT1rKGUuc3Vic3RyKHMsMikpLHRbdmVdPWsoZS5zdWJzdHIoaSkpfSk7dmFyIGV0LHR0PVRlKFwiSG91cnNcIiwhMCksbnQ9e2NhbGVuZGFyOntzYW1lRGF5OlwiW1RvZGF5IGF0XSBMVFwiLG5leHREYXk6XCJbVG9tb3Jyb3cgYXRdIExUXCIsbmV4dFdlZWs6XCJkZGRkIFthdF0gTFRcIixsYXN0RGF5OlwiW1llc3RlcmRheSBhdF0gTFRcIixsYXN0V2VlazpcIltMYXN0XSBkZGRkIFthdF0gTFRcIixzYW1lRWxzZTpcIkxcIn0sbG9uZ0RhdGVGb3JtYXQ6e0xUUzpcImg6bW06c3MgQVwiLExUOlwiaDptbSBBXCIsTDpcIk1NL0REL1lZWVlcIixMTDpcIk1NTU0gRCwgWVlZWVwiLExMTDpcIk1NTU0gRCwgWVlZWSBoOm1tIEFcIixMTExMOlwiZGRkZCwgTU1NTSBELCBZWVlZIGg6bW0gQVwifSxpbnZhbGlkRGF0ZTpcIkludmFsaWQgZGF0ZVwiLG9yZGluYWw6XCIlZFwiLGRheU9mTW9udGhPcmRpbmFsUGFyc2U6L1xcZHsxLDJ9LyxyZWxhdGl2ZVRpbWU6e2Z1dHVyZTpcImluICVzXCIscGFzdDpcIiVzIGFnb1wiLHM6XCJhIGZldyBzZWNvbmRzXCIsc3M6XCIlZCBzZWNvbmRzXCIsbTpcImEgbWludXRlXCIsbW06XCIlZCBtaW51dGVzXCIsaDpcImFuIGhvdXJcIixoaDpcIiVkIGhvdXJzXCIsZDpcImEgZGF5XCIsZGQ6XCIlZCBkYXlzXCIsTTpcImEgbW9udGhcIixNTTpcIiVkIG1vbnRoc1wiLHk6XCJhIHllYXJcIix5eTpcIiVkIHllYXJzXCJ9LG1vbnRoczpIZSxtb250aHNTaG9ydDpSZSx3ZWVrOntkb3c6MCxkb3k6Nn0sd2Vla2RheXM6amUsd2Vla2RheXNNaW46emUsd2Vla2RheXNTaG9ydDpaZSxtZXJpZGllbVBhcnNlOi9bYXBdXFwuP20/XFwuPy9pfSxzdD17fSxpdD17fTtmdW5jdGlvbiBydChlKXtyZXR1cm4gZT9lLnRvTG93ZXJDYXNlKCkucmVwbGFjZShcIl9cIixcIi1cIik6ZX1mdW5jdGlvbiBhdChlKXt2YXIgdD1udWxsO2lmKCFzdFtlXSYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSYmbW9kdWxlJiZtb2R1bGUuZXhwb3J0cyl0cnl7dD1ldC5fYWJicixyZXF1aXJlKFwiLi9sb2NhbGUvXCIrZSksb3QodCl9Y2F0Y2goZSl7fXJldHVybiBzdFtlXX1mdW5jdGlvbiBvdChlLHQpe3ZhciBuO3JldHVybiBlJiYoKG49bCh0KT9sdChlKTp1dChlLHQpKT9ldD1uOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIkxvY2FsZSBcIitlK1wiIG5vdCBmb3VuZC4gRGlkIHlvdSBmb3JnZXQgdG8gbG9hZCBpdD9cIikpLGV0Ll9hYmJyfWZ1bmN0aW9uIHV0KGUsdCl7aWYobnVsbCE9PXQpe3ZhciBuLHM9bnQ7aWYodC5hYmJyPWUsbnVsbCE9c3RbZV0pVChcImRlZmluZUxvY2FsZU92ZXJyaWRlXCIsXCJ1c2UgbW9tZW50LnVwZGF0ZUxvY2FsZShsb2NhbGVOYW1lLCBjb25maWcpIHRvIGNoYW5nZSBhbiBleGlzdGluZyBsb2NhbGUuIG1vbWVudC5kZWZpbmVMb2NhbGUobG9jYWxlTmFtZSwgY29uZmlnKSBzaG91bGQgb25seSBiZSB1c2VkIGZvciBjcmVhdGluZyBhIG5ldyBsb2NhbGUgU2VlIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvZGVmaW5lLWxvY2FsZS8gZm9yIG1vcmUgaW5mby5cIikscz1zdFtlXS5fY29uZmlnO2Vsc2UgaWYobnVsbCE9dC5wYXJlbnRMb2NhbGUpaWYobnVsbCE9c3RbdC5wYXJlbnRMb2NhbGVdKXM9c3RbdC5wYXJlbnRMb2NhbGVdLl9jb25maWc7ZWxzZXtpZihudWxsPT0obj1hdCh0LnBhcmVudExvY2FsZSkpKXJldHVybiBpdFt0LnBhcmVudExvY2FsZV18fChpdFt0LnBhcmVudExvY2FsZV09W10pLGl0W3QucGFyZW50TG9jYWxlXS5wdXNoKHtuYW1lOmUsY29uZmlnOnR9KSxudWxsO3M9bi5fY29uZmlnfXJldHVybiBzdFtlXT1uZXcgUChiKHMsdCkpLGl0W2VdJiZpdFtlXS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3V0KGUubmFtZSxlLmNvbmZpZyl9KSxvdChlKSxzdFtlXX1yZXR1cm4gZGVsZXRlIHN0W2VdLG51bGx9ZnVuY3Rpb24gbHQoZSl7dmFyIHQ7aWYoZSYmZS5fbG9jYWxlJiZlLl9sb2NhbGUuX2FiYnImJihlPWUuX2xvY2FsZS5fYWJiciksIWUpcmV0dXJuIGV0O2lmKCFvKGUpKXtpZih0PWF0KGUpKXJldHVybiB0O2U9W2VdfXJldHVybiBmdW5jdGlvbihlKXtmb3IodmFyIHQsbixzLGkscj0wO3I8ZS5sZW5ndGg7KXtmb3IodD0oaT1ydChlW3JdKS5zcGxpdChcIi1cIikpLmxlbmd0aCxuPShuPXJ0KGVbcisxXSkpP24uc3BsaXQoXCItXCIpOm51bGw7MDx0Oyl7aWYocz1hdChpLnNsaWNlKDAsdCkuam9pbihcIi1cIikpKXJldHVybiBzO2lmKG4mJm4ubGVuZ3RoPj10JiZhKGksbiwhMCk+PXQtMSlicmVhazt0LS19cisrfXJldHVybiBldH0oZSl9ZnVuY3Rpb24gZHQoZSl7dmFyIHQsbj1lLl9hO3JldHVybiBuJiYtMj09PWcoZSkub3ZlcmZsb3cmJih0PW5bX2VdPDB8fDExPG5bX2VdP19lOm5beWVdPDF8fG5beWVdPlBlKG5bbWVdLG5bX2VdKT95ZTpuW2dlXTwwfHwyNDxuW2dlXXx8MjQ9PT1uW2dlXSYmKDAhPT1uW3BlXXx8MCE9PW5bdmVdfHwwIT09blt3ZV0pP2dlOm5bcGVdPDB8fDU5PG5bcGVdP3BlOm5bdmVdPDB8fDU5PG5bdmVdP3ZlOm5bd2VdPDB8fDk5OTxuW3dlXT93ZTotMSxnKGUpLl9vdmVyZmxvd0RheU9mWWVhciYmKHQ8bWV8fHllPHQpJiYodD15ZSksZyhlKS5fb3ZlcmZsb3dXZWVrcyYmLTE9PT10JiYodD1NZSksZyhlKS5fb3ZlcmZsb3dXZWVrZGF5JiYtMT09PXQmJih0PVNlKSxnKGUpLm92ZXJmbG93PXQpLGV9ZnVuY3Rpb24gaHQoZSx0LG4pe3JldHVybiBudWxsIT1lP2U6bnVsbCE9dD90Om59ZnVuY3Rpb24gY3QoZSl7dmFyIHQsbixzLGkscixhPVtdO2lmKCFlLl9kKXt2YXIgbyx1O2ZvcihvPWUsdT1uZXcgRGF0ZShjLm5vdygpKSxzPW8uX3VzZVVUQz9bdS5nZXRVVENGdWxsWWVhcigpLHUuZ2V0VVRDTW9udGgoKSx1LmdldFVUQ0RhdGUoKV06W3UuZ2V0RnVsbFllYXIoKSx1LmdldE1vbnRoKCksdS5nZXREYXRlKCldLGUuX3cmJm51bGw9PWUuX2FbeWVdJiZudWxsPT1lLl9hW19lXSYmZnVuY3Rpb24oZSl7dmFyIHQsbixzLGkscixhLG8sdTtpZihudWxsIT0odD1lLl93KS5HR3x8bnVsbCE9dC5XfHxudWxsIT10LkUpcj0xLGE9NCxuPWh0KHQuR0csZS5fYVttZV0sSWUoVHQoKSwxLDQpLnllYXIpLHM9aHQodC5XLDEpLCgoaT1odCh0LkUsMSkpPDF8fDc8aSkmJih1PSEwKTtlbHNle3I9ZS5fbG9jYWxlLl93ZWVrLmRvdyxhPWUuX2xvY2FsZS5fd2Vlay5kb3k7dmFyIGw9SWUoVHQoKSxyLGEpO249aHQodC5nZyxlLl9hW21lXSxsLnllYXIpLHM9aHQodC53LGwud2VlayksbnVsbCE9dC5kPygoaT10LmQpPDB8fDY8aSkmJih1PSEwKTpudWxsIT10LmU/KGk9dC5lK3IsKHQuZTwwfHw2PHQuZSkmJih1PSEwKSk6aT1yfXM8MXx8cz5BZShuLHIsYSk/ZyhlKS5fb3ZlcmZsb3dXZWVrcz0hMDpudWxsIT11P2coZSkuX292ZXJmbG93V2Vla2RheT0hMDoobz1FZShuLHMsaSxyLGEpLGUuX2FbbWVdPW8ueWVhcixlLl9kYXlPZlllYXI9by5kYXlPZlllYXIpfShlKSxudWxsIT1lLl9kYXlPZlllYXImJihyPWh0KGUuX2FbbWVdLHNbbWVdKSwoZS5fZGF5T2ZZZWFyPkRlKHIpfHwwPT09ZS5fZGF5T2ZZZWFyKSYmKGcoZSkuX292ZXJmbG93RGF5T2ZZZWFyPSEwKSxuPUdlKHIsMCxlLl9kYXlPZlllYXIpLGUuX2FbX2VdPW4uZ2V0VVRDTW9udGgoKSxlLl9hW3llXT1uLmdldFVUQ0RhdGUoKSksdD0wO3Q8MyYmbnVsbD09ZS5fYVt0XTsrK3QpZS5fYVt0XT1hW3RdPXNbdF07Zm9yKDt0PDc7dCsrKWUuX2FbdF09YVt0XT1udWxsPT1lLl9hW3RdPzI9PT10PzE6MDplLl9hW3RdOzI0PT09ZS5fYVtnZV0mJjA9PT1lLl9hW3BlXSYmMD09PWUuX2FbdmVdJiYwPT09ZS5fYVt3ZV0mJihlLl9uZXh0RGF5PSEwLGUuX2FbZ2VdPTApLGUuX2Q9KGUuX3VzZVVUQz9HZTpmdW5jdGlvbihlLHQsbixzLGkscixhKXt2YXIgbz1uZXcgRGF0ZShlLHQsbixzLGkscixhKTtyZXR1cm4gZTwxMDAmJjA8PWUmJmlzRmluaXRlKG8uZ2V0RnVsbFllYXIoKSkmJm8uc2V0RnVsbFllYXIoZSksb30pLmFwcGx5KG51bGwsYSksaT1lLl91c2VVVEM/ZS5fZC5nZXRVVENEYXkoKTplLl9kLmdldERheSgpLG51bGwhPWUuX3R6bSYmZS5fZC5zZXRVVENNaW51dGVzKGUuX2QuZ2V0VVRDTWludXRlcygpLWUuX3R6bSksZS5fbmV4dERheSYmKGUuX2FbZ2VdPTI0KSxlLl93JiZ2b2lkIDAhPT1lLl93LmQmJmUuX3cuZCE9PWkmJihnKGUpLndlZWtkYXlNaXNtYXRjaD0hMCl9fXZhciBmdD0vXlxccyooKD86WystXVxcZHs2fXxcXGR7NH0pLSg/OlxcZFxcZC1cXGRcXGR8V1xcZFxcZC1cXGR8V1xcZFxcZHxcXGRcXGRcXGR8XFxkXFxkKSkoPzooVHwgKShcXGRcXGQoPzo6XFxkXFxkKD86OlxcZFxcZCg/OlsuLF1cXGQrKT8pPyk/KShbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sbXQ9L15cXHMqKCg/OlsrLV1cXGR7Nn18XFxkezR9KSg/OlxcZFxcZFxcZFxcZHxXXFxkXFxkXFxkfFdcXGRcXGR8XFxkXFxkXFxkfFxcZFxcZCkpKD86KFR8ICkoXFxkXFxkKD86XFxkXFxkKD86XFxkXFxkKD86Wy4sXVxcZCspPyk/KT8pKFtcXCtcXC1dXFxkXFxkKD86Oj9cXGRcXGQpP3xcXHMqWik/KT8kLyxfdD0vWnxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPy8seXQ9W1tcIllZWVlZWS1NTS1ERFwiLC9bKy1dXFxkezZ9LVxcZFxcZC1cXGRcXGQvXSxbXCJZWVlZLU1NLUREXCIsL1xcZHs0fS1cXGRcXGQtXFxkXFxkL10sW1wiR0dHRy1bV11XVy1FXCIsL1xcZHs0fS1XXFxkXFxkLVxcZC9dLFtcIkdHR0ctW1ddV1dcIiwvXFxkezR9LVdcXGRcXGQvLCExXSxbXCJZWVlZLURERFwiLC9cXGR7NH0tXFxkezN9L10sW1wiWVlZWS1NTVwiLC9cXGR7NH0tXFxkXFxkLywhMV0sW1wiWVlZWVlZTU1ERFwiLC9bKy1dXFxkezEwfS9dLFtcIllZWVlNTUREXCIsL1xcZHs4fS9dLFtcIkdHR0dbV11XV0VcIiwvXFxkezR9V1xcZHszfS9dLFtcIkdHR0dbV11XV1wiLC9cXGR7NH1XXFxkezJ9LywhMV0sW1wiWVlZWURERFwiLC9cXGR7N30vXV0sZ3Q9W1tcIkhIOm1tOnNzLlNTU1NcIiwvXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sW1wiSEg6bW06c3MsU1NTU1wiLC9cXGRcXGQ6XFxkXFxkOlxcZFxcZCxcXGQrL10sW1wiSEg6bW06c3NcIiwvXFxkXFxkOlxcZFxcZDpcXGRcXGQvXSxbXCJISDptbVwiLC9cXGRcXGQ6XFxkXFxkL10sW1wiSEhtbXNzLlNTU1NcIiwvXFxkXFxkXFxkXFxkXFxkXFxkXFwuXFxkKy9dLFtcIkhIbW1zcyxTU1NTXCIsL1xcZFxcZFxcZFxcZFxcZFxcZCxcXGQrL10sW1wiSEhtbXNzXCIsL1xcZFxcZFxcZFxcZFxcZFxcZC9dLFtcIkhIbW1cIiwvXFxkXFxkXFxkXFxkL10sW1wiSEhcIiwvXFxkXFxkL11dLHB0PS9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2k7ZnVuY3Rpb24gdnQoZSl7dmFyIHQsbixzLGkscixhLG89ZS5faSx1PWZ0LmV4ZWMobyl8fG10LmV4ZWMobyk7aWYodSl7Zm9yKGcoZSkuaXNvPSEwLHQ9MCxuPXl0Lmxlbmd0aDt0PG47dCsrKWlmKHl0W3RdWzFdLmV4ZWModVsxXSkpe2k9eXRbdF1bMF0scz0hMSE9PXl0W3RdWzJdO2JyZWFrfWlmKG51bGw9PWkpcmV0dXJuIHZvaWQoZS5faXNWYWxpZD0hMSk7aWYodVszXSl7Zm9yKHQ9MCxuPWd0Lmxlbmd0aDt0PG47dCsrKWlmKGd0W3RdWzFdLmV4ZWModVszXSkpe3I9KHVbMl18fFwiIFwiKStndFt0XVswXTticmVha31pZihudWxsPT1yKXJldHVybiB2b2lkKGUuX2lzVmFsaWQ9ITEpfWlmKCFzJiZudWxsIT1yKXJldHVybiB2b2lkKGUuX2lzVmFsaWQ9ITEpO2lmKHVbNF0pe2lmKCFfdC5leGVjKHVbNF0pKXJldHVybiB2b2lkKGUuX2lzVmFsaWQ9ITEpO2E9XCJaXCJ9ZS5fZj1pKyhyfHxcIlwiKSsoYXx8XCJcIiksa3QoZSl9ZWxzZSBlLl9pc1ZhbGlkPSExfXZhciB3dD0vXig/OihNb258VHVlfFdlZHxUaHV8RnJpfFNhdHxTdW4pLD9cXHMpPyhcXGR7MSwyfSlcXHMoSmFufEZlYnxNYXJ8QXByfE1heXxKdW58SnVsfEF1Z3xTZXB8T2N0fE5vdnxEZWMpXFxzKFxcZHsyLDR9KVxccyhcXGRcXGQpOihcXGRcXGQpKD86OihcXGRcXGQpKT9cXHMoPzooVVR8R01UfFtFQ01QXVtTRF1UKXwoW1p6XSl8KFsrLV1cXGR7NH0pKSQvO2Z1bmN0aW9uIE10KGUsdCxuLHMsaSxyKXt2YXIgYT1bZnVuY3Rpb24oZSl7dmFyIHQ9cGFyc2VJbnQoZSwxMCk7e2lmKHQ8PTQ5KXJldHVybiAyZTMrdDtpZih0PD05OTkpcmV0dXJuIDE5MDArdH1yZXR1cm4gdH0oZSksUmUuaW5kZXhPZih0KSxwYXJzZUludChuLDEwKSxwYXJzZUludChzLDEwKSxwYXJzZUludChpLDEwKV07cmV0dXJuIHImJmEucHVzaChwYXJzZUludChyLDEwKSksYX12YXIgU3Q9e1VUOjAsR01UOjAsRURUOi0yNDAsRVNUOi0zMDAsQ0RUOi0zMDAsQ1NUOi0zNjAsTURUOi0zNjAsTVNUOi00MjAsUERUOi00MjAsUFNUOi00ODB9O2Z1bmN0aW9uIER0KGUpe3ZhciB0LG4scyxpPXd0LmV4ZWMoZS5faS5yZXBsYWNlKC9cXChbXildKlxcKXxbXFxuXFx0XS9nLFwiIFwiKS5yZXBsYWNlKC8oXFxzXFxzKykvZyxcIiBcIikucmVwbGFjZSgvXlxcc1xccyovLFwiXCIpLnJlcGxhY2UoL1xcc1xccyokLyxcIlwiKSk7aWYoaSl7dmFyIHI9TXQoaVs0XSxpWzNdLGlbMl0saVs1XSxpWzZdLGlbN10pO2lmKHQ9aVsxXSxuPXIscz1lLHQmJlplLmluZGV4T2YodCkhPT1uZXcgRGF0ZShuWzBdLG5bMV0sblsyXSkuZ2V0RGF5KCkmJihnKHMpLndlZWtkYXlNaXNtYXRjaD0hMCwhKHMuX2lzVmFsaWQ9ITEpKSlyZXR1cm47ZS5fYT1yLGUuX3R6bT1mdW5jdGlvbihlLHQsbil7aWYoZSlyZXR1cm4gU3RbZV07aWYodClyZXR1cm4gMDt2YXIgcz1wYXJzZUludChuLDEwKSxpPXMlMTAwO3JldHVybihzLWkpLzEwMCo2MCtpfShpWzhdLGlbOV0saVsxMF0pLGUuX2Q9R2UuYXBwbHkobnVsbCxlLl9hKSxlLl9kLnNldFVUQ01pbnV0ZXMoZS5fZC5nZXRVVENNaW51dGVzKCktZS5fdHptKSxnKGUpLnJmYzI4MjI9ITB9ZWxzZSBlLl9pc1ZhbGlkPSExfWZ1bmN0aW9uIGt0KGUpe2lmKGUuX2YhPT1jLklTT184NjAxKWlmKGUuX2YhPT1jLlJGQ18yODIyKXtlLl9hPVtdLGcoZSkuZW1wdHk9ITA7dmFyIHQsbixzLGkscixhLG8sdSxsPVwiXCIrZS5faSxkPWwubGVuZ3RoLGg9MDtmb3Iocz1qKGUuX2YsZS5fbG9jYWxlKS5tYXRjaChOKXx8W10sdD0wO3Q8cy5sZW5ndGg7dCsrKWk9c1t0XSwobj0obC5tYXRjaChsZShpLGUpKXx8W10pWzBdKSYmKDA8KHI9bC5zdWJzdHIoMCxsLmluZGV4T2YobikpKS5sZW5ndGgmJmcoZSkudW51c2VkSW5wdXQucHVzaChyKSxsPWwuc2xpY2UobC5pbmRleE9mKG4pK24ubGVuZ3RoKSxoKz1uLmxlbmd0aCksRVtpXT8obj9nKGUpLmVtcHR5PSExOmcoZSkudW51c2VkVG9rZW5zLnB1c2goaSksYT1pLHU9ZSxudWxsIT0obz1uKSYmbShoZSxhKSYmaGVbYV0obyx1Ll9hLHUsYSkpOmUuX3N0cmljdCYmIW4mJmcoZSkudW51c2VkVG9rZW5zLnB1c2goaSk7ZyhlKS5jaGFyc0xlZnRPdmVyPWQtaCwwPGwubGVuZ3RoJiZnKGUpLnVudXNlZElucHV0LnB1c2gobCksZS5fYVtnZV08PTEyJiYhMD09PWcoZSkuYmlnSG91ciYmMDxlLl9hW2dlXSYmKGcoZSkuYmlnSG91cj12b2lkIDApLGcoZSkucGFyc2VkRGF0ZVBhcnRzPWUuX2Euc2xpY2UoMCksZyhlKS5tZXJpZGllbT1lLl9tZXJpZGllbSxlLl9hW2dlXT1mdW5jdGlvbihlLHQsbil7dmFyIHM7aWYobnVsbD09bilyZXR1cm4gdDtyZXR1cm4gbnVsbCE9ZS5tZXJpZGllbUhvdXI/ZS5tZXJpZGllbUhvdXIodCxuKToobnVsbCE9ZS5pc1BNJiYoKHM9ZS5pc1BNKG4pKSYmdDwxMiYmKHQrPTEyKSxzfHwxMiE9PXR8fCh0PTApKSx0KX0oZS5fbG9jYWxlLGUuX2FbZ2VdLGUuX21lcmlkaWVtKSxjdChlKSxkdChlKX1lbHNlIER0KGUpO2Vsc2UgdnQoZSl9ZnVuY3Rpb24gWXQoZSl7dmFyIHQsbixzLGkscj1lLl9pLGE9ZS5fZjtyZXR1cm4gZS5fbG9jYWxlPWUuX2xvY2FsZXx8bHQoZS5fbCksbnVsbD09PXJ8fHZvaWQgMD09PWEmJlwiXCI9PT1yP3Yoe251bGxJbnB1dDohMH0pOihcInN0cmluZ1wiPT10eXBlb2YgciYmKGUuX2k9cj1lLl9sb2NhbGUucHJlcGFyc2UocikpLFMocik/bmV3IE0oZHQocikpOihoKHIpP2UuX2Q9cjpvKGEpP2Z1bmN0aW9uKGUpe3ZhciB0LG4scyxpLHI7aWYoMD09PWUuX2YubGVuZ3RoKXJldHVybiBnKGUpLmludmFsaWRGb3JtYXQ9ITAsZS5fZD1uZXcgRGF0ZShOYU4pO2ZvcihpPTA7aTxlLl9mLmxlbmd0aDtpKyspcj0wLHQ9dyh7fSxlKSxudWxsIT1lLl91c2VVVEMmJih0Ll91c2VVVEM9ZS5fdXNlVVRDKSx0Ll9mPWUuX2ZbaV0sa3QodCkscCh0KSYmKHIrPWcodCkuY2hhcnNMZWZ0T3ZlcixyKz0xMCpnKHQpLnVudXNlZFRva2Vucy5sZW5ndGgsZyh0KS5zY29yZT1yLChudWxsPT1zfHxyPHMpJiYocz1yLG49dCkpO18oZSxufHx0KX0oZSk6YT9rdChlKTpsKG49KHQ9ZSkuX2kpP3QuX2Q9bmV3IERhdGUoYy5ub3coKSk6aChuKT90Ll9kPW5ldyBEYXRlKG4udmFsdWVPZigpKTpcInN0cmluZ1wiPT10eXBlb2Ygbj8ocz10LG51bGw9PT0oaT1wdC5leGVjKHMuX2kpKT8odnQocyksITE9PT1zLl9pc1ZhbGlkJiYoZGVsZXRlIHMuX2lzVmFsaWQsRHQocyksITE9PT1zLl9pc1ZhbGlkJiYoZGVsZXRlIHMuX2lzVmFsaWQsYy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhzKSkpKTpzLl9kPW5ldyBEYXRlKCtpWzFdKSk6byhuKT8odC5fYT1mKG4uc2xpY2UoMCksZnVuY3Rpb24oZSl7cmV0dXJuIHBhcnNlSW50KGUsMTApfSksY3QodCkpOnUobik/ZnVuY3Rpb24oZSl7aWYoIWUuX2Qpe3ZhciB0PUMoZS5faSk7ZS5fYT1mKFt0LnllYXIsdC5tb250aCx0LmRheXx8dC5kYXRlLHQuaG91cix0Lm1pbnV0ZSx0LnNlY29uZCx0Lm1pbGxpc2Vjb25kXSxmdW5jdGlvbihlKXtyZXR1cm4gZSYmcGFyc2VJbnQoZSwxMCl9KSxjdChlKX19KHQpOmQobik/dC5fZD1uZXcgRGF0ZShuKTpjLmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKHQpLHAoZSl8fChlLl9kPW51bGwpLGUpKX1mdW5jdGlvbiBPdChlLHQsbixzLGkpe3ZhciByLGE9e307cmV0dXJuITAhPT1uJiYhMSE9PW58fChzPW4sbj12b2lkIDApLCh1KGUpJiZmdW5jdGlvbihlKXtpZihPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcylyZXR1cm4gMD09PU9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGUpLmxlbmd0aDt2YXIgdDtmb3IodCBpbiBlKWlmKGUuaGFzT3duUHJvcGVydHkodCkpcmV0dXJuITE7cmV0dXJuITB9KGUpfHxvKGUpJiYwPT09ZS5sZW5ndGgpJiYoZT12b2lkIDApLGEuX2lzQU1vbWVudE9iamVjdD0hMCxhLl91c2VVVEM9YS5faXNVVEM9aSxhLl9sPW4sYS5faT1lLGEuX2Y9dCxhLl9zdHJpY3Q9cywocj1uZXcgTShkdChZdChhKSkpKS5fbmV4dERheSYmKHIuYWRkKDEsXCJkXCIpLHIuX25leHREYXk9dm9pZCAwKSxyfWZ1bmN0aW9uIFR0KGUsdCxuLHMpe3JldHVybiBPdChlLHQsbixzLCExKX1jLmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrPW4oXCJ2YWx1ZSBwcm92aWRlZCBpcyBub3QgaW4gYSByZWNvZ25pemVkIFJGQzI4MjIgb3IgSVNPIGZvcm1hdC4gbW9tZW50IGNvbnN0cnVjdGlvbiBmYWxscyBiYWNrIHRvIGpzIERhdGUoKSwgd2hpY2ggaXMgbm90IHJlbGlhYmxlIGFjcm9zcyBhbGwgYnJvd3NlcnMgYW5kIHZlcnNpb25zLiBOb24gUkZDMjgyMi9JU08gZGF0ZSBmb3JtYXRzIGFyZSBkaXNjb3VyYWdlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGFuIHVwY29taW5nIG1ham9yIHJlbGVhc2UuIFBsZWFzZSByZWZlciB0byBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL2pzLWRhdGUvIGZvciBtb3JlIGluZm8uXCIsZnVuY3Rpb24oZSl7ZS5fZD1uZXcgRGF0ZShlLl9pKyhlLl91c2VVVEM/XCIgVVRDXCI6XCJcIikpfSksYy5JU09fODYwMT1mdW5jdGlvbigpe30sYy5SRkNfMjgyMj1mdW5jdGlvbigpe307dmFyIHh0PW4oXCJtb21lbnQoKS5taW4gaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudC5tYXggaW5zdGVhZC4gaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9taW4tbWF4L1wiLGZ1bmN0aW9uKCl7dmFyIGU9VHQuYXBwbHkobnVsbCxhcmd1bWVudHMpO3JldHVybiB0aGlzLmlzVmFsaWQoKSYmZS5pc1ZhbGlkKCk/ZTx0aGlzP3RoaXM6ZTp2KCl9KSxidD1uKFwibW9tZW50KCkubWF4IGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWluIGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvbWluLW1heC9cIixmdW5jdGlvbigpe3ZhciBlPVR0LmFwcGx5KG51bGwsYXJndW1lbnRzKTtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJmUuaXNWYWxpZCgpP3RoaXM8ZT90aGlzOmU6digpfSk7ZnVuY3Rpb24gUHQoZSx0KXt2YXIgbixzO2lmKDE9PT10Lmxlbmd0aCYmbyh0WzBdKSYmKHQ9dFswXSksIXQubGVuZ3RoKXJldHVybiBUdCgpO2ZvcihuPXRbMF0scz0xO3M8dC5sZW5ndGg7KytzKXRbc10uaXNWYWxpZCgpJiYhdFtzXVtlXShuKXx8KG49dFtzXSk7cmV0dXJuIG59dmFyIFd0PVtcInllYXJcIixcInF1YXJ0ZXJcIixcIm1vbnRoXCIsXCJ3ZWVrXCIsXCJkYXlcIixcImhvdXJcIixcIm1pbnV0ZVwiLFwic2Vjb25kXCIsXCJtaWxsaXNlY29uZFwiXTtmdW5jdGlvbiBIdChlKXt2YXIgdD1DKGUpLG49dC55ZWFyfHwwLHM9dC5xdWFydGVyfHwwLGk9dC5tb250aHx8MCxyPXQud2Vla3x8MCxhPXQuZGF5fHwwLG89dC5ob3VyfHwwLHU9dC5taW51dGV8fDAsbD10LnNlY29uZHx8MCxkPXQubWlsbGlzZWNvbmR8fDA7dGhpcy5faXNWYWxpZD1mdW5jdGlvbihlKXtmb3IodmFyIHQgaW4gZSlpZigtMT09PVllLmNhbGwoV3QsdCl8fG51bGwhPWVbdF0mJmlzTmFOKGVbdF0pKXJldHVybiExO2Zvcih2YXIgbj0hMSxzPTA7czxXdC5sZW5ndGg7KytzKWlmKGVbV3Rbc11dKXtpZihuKXJldHVybiExO3BhcnNlRmxvYXQoZVtXdFtzXV0pIT09ayhlW1d0W3NdXSkmJihuPSEwKX1yZXR1cm4hMH0odCksdGhpcy5fbWlsbGlzZWNvbmRzPStkKzFlMypsKzZlNCp1KzFlMypvKjYwKjYwLHRoaXMuX2RheXM9K2ErNypyLHRoaXMuX21vbnRocz0raSszKnMrMTIqbix0aGlzLl9kYXRhPXt9LHRoaXMuX2xvY2FsZT1sdCgpLHRoaXMuX2J1YmJsZSgpfWZ1bmN0aW9uIFJ0KGUpe3JldHVybiBlIGluc3RhbmNlb2YgSHR9ZnVuY3Rpb24gQ3QoZSl7cmV0dXJuIGU8MD8tMSpNYXRoLnJvdW5kKC0xKmUpOk1hdGgucm91bmQoZSl9ZnVuY3Rpb24gRnQoZSxuKXtJKGUsMCwwLGZ1bmN0aW9uKCl7dmFyIGU9dGhpcy51dGNPZmZzZXQoKSx0PVwiK1wiO3JldHVybiBlPDAmJihlPS1lLHQ9XCItXCIpLHQrVSh+fihlLzYwKSwyKStuK1Uofn5lJTYwLDIpfSl9RnQoXCJaXCIsXCI6XCIpLEZ0KFwiWlpcIixcIlwiKSx1ZShcIlpcIixyZSksdWUoXCJaWlwiLHJlKSxjZShbXCJaXCIsXCJaWlwiXSxmdW5jdGlvbihlLHQsbil7bi5fdXNlVVRDPSEwLG4uX3R6bT1VdChyZSxlKX0pO3ZhciBMdD0vKFtcXCtcXC1dfFxcZFxcZCkvZ2k7ZnVuY3Rpb24gVXQoZSx0KXt2YXIgbj0odHx8XCJcIikubWF0Y2goZSk7aWYobnVsbD09PW4pcmV0dXJuIG51bGw7dmFyIHM9KChuW24ubGVuZ3RoLTFdfHxbXSkrXCJcIikubWF0Y2goTHQpfHxbXCItXCIsMCwwXSxpPTYwKnNbMV0rayhzWzJdKTtyZXR1cm4gMD09PWk/MDpcIitcIj09PXNbMF0/aTotaX1mdW5jdGlvbiBOdChlLHQpe3ZhciBuLHM7cmV0dXJuIHQuX2lzVVRDPyhuPXQuY2xvbmUoKSxzPShTKGUpfHxoKGUpP2UudmFsdWVPZigpOlR0KGUpLnZhbHVlT2YoKSktbi52YWx1ZU9mKCksbi5fZC5zZXRUaW1lKG4uX2QudmFsdWVPZigpK3MpLGMudXBkYXRlT2Zmc2V0KG4sITEpLG4pOlR0KGUpLmxvY2FsKCl9ZnVuY3Rpb24gR3QoZSl7cmV0dXJuIDE1Ki1NYXRoLnJvdW5kKGUuX2QuZ2V0VGltZXpvbmVPZmZzZXQoKS8xNSl9ZnVuY3Rpb24gVnQoKXtyZXR1cm4hIXRoaXMuaXNWYWxpZCgpJiYodGhpcy5faXNVVEMmJjA9PT10aGlzLl9vZmZzZXQpfWMudXBkYXRlT2Zmc2V0PWZ1bmN0aW9uKCl7fTt2YXIgRXQ9L14oXFwtfFxcKyk/KD86KFxcZCopWy4gXSk/KFxcZCspXFw6KFxcZCspKD86XFw6KFxcZCspKFxcLlxcZCopPyk/JC8sSXQ9L14oLXxcXCspP1AoPzooWy0rXT9bMC05LC5dKilZKT8oPzooWy0rXT9bMC05LC5dKilNKT8oPzooWy0rXT9bMC05LC5dKilXKT8oPzooWy0rXT9bMC05LC5dKilEKT8oPzpUKD86KFstK10/WzAtOSwuXSopSCk/KD86KFstK10/WzAtOSwuXSopTSk/KD86KFstK10/WzAtOSwuXSopUyk/KT8kLztmdW5jdGlvbiBBdChlLHQpe3ZhciBuLHMsaSxyPWUsYT1udWxsO3JldHVybiBSdChlKT9yPXttczplLl9taWxsaXNlY29uZHMsZDplLl9kYXlzLE06ZS5fbW9udGhzfTpkKGUpPyhyPXt9LHQ/clt0XT1lOnIubWlsbGlzZWNvbmRzPWUpOihhPUV0LmV4ZWMoZSkpPyhuPVwiLVwiPT09YVsxXT8tMToxLHI9e3k6MCxkOmsoYVt5ZV0pKm4saDprKGFbZ2VdKSpuLG06ayhhW3BlXSkqbixzOmsoYVt2ZV0pKm4sbXM6ayhDdCgxZTMqYVt3ZV0pKSpufSk6KGE9SXQuZXhlYyhlKSk/KG49XCItXCI9PT1hWzFdPy0xOihhWzFdLDEpLHI9e3k6anQoYVsyXSxuKSxNOmp0KGFbM10sbiksdzpqdChhWzRdLG4pLGQ6anQoYVs1XSxuKSxoOmp0KGFbNl0sbiksbTpqdChhWzddLG4pLHM6anQoYVs4XSxuKX0pOm51bGw9PXI/cj17fTpcIm9iamVjdFwiPT10eXBlb2YgciYmKFwiZnJvbVwiaW4gcnx8XCJ0b1wiaW4gcikmJihpPWZ1bmN0aW9uKGUsdCl7dmFyIG47aWYoIWUuaXNWYWxpZCgpfHwhdC5pc1ZhbGlkKCkpcmV0dXJue21pbGxpc2Vjb25kczowLG1vbnRoczowfTt0PU50KHQsZSksZS5pc0JlZm9yZSh0KT9uPVp0KGUsdCk6KChuPVp0KHQsZSkpLm1pbGxpc2Vjb25kcz0tbi5taWxsaXNlY29uZHMsbi5tb250aHM9LW4ubW9udGhzKTtyZXR1cm4gbn0oVHQoci5mcm9tKSxUdChyLnRvKSksKHI9e30pLm1zPWkubWlsbGlzZWNvbmRzLHIuTT1pLm1vbnRocykscz1uZXcgSHQociksUnQoZSkmJm0oZSxcIl9sb2NhbGVcIikmJihzLl9sb2NhbGU9ZS5fbG9jYWxlKSxzfWZ1bmN0aW9uIGp0KGUsdCl7dmFyIG49ZSYmcGFyc2VGbG9hdChlLnJlcGxhY2UoXCIsXCIsXCIuXCIpKTtyZXR1cm4oaXNOYU4obik/MDpuKSp0fWZ1bmN0aW9uIFp0KGUsdCl7dmFyIG49e21pbGxpc2Vjb25kczowLG1vbnRoczowfTtyZXR1cm4gbi5tb250aHM9dC5tb250aCgpLWUubW9udGgoKSsxMioodC55ZWFyKCktZS55ZWFyKCkpLGUuY2xvbmUoKS5hZGQobi5tb250aHMsXCJNXCIpLmlzQWZ0ZXIodCkmJi0tbi5tb250aHMsbi5taWxsaXNlY29uZHM9K3QtK2UuY2xvbmUoKS5hZGQobi5tb250aHMsXCJNXCIpLG59ZnVuY3Rpb24genQocyxpKXtyZXR1cm4gZnVuY3Rpb24oZSx0KXt2YXIgbjtyZXR1cm4gbnVsbD09PXR8fGlzTmFOKCt0KXx8KFQoaSxcIm1vbWVudCgpLlwiK2krXCIocGVyaW9kLCBudW1iZXIpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgbW9tZW50KCkuXCIraStcIihudW1iZXIsIHBlcmlvZCkuIFNlZSBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL2FkZC1pbnZlcnRlZC1wYXJhbS8gZm9yIG1vcmUgaW5mby5cIiksbj1lLGU9dCx0PW4pLCR0KHRoaXMsQXQoZT1cInN0cmluZ1wiPT10eXBlb2YgZT8rZTplLHQpLHMpLHRoaXN9fWZ1bmN0aW9uICR0KGUsdCxuLHMpe3ZhciBpPXQuX21pbGxpc2Vjb25kcyxyPUN0KHQuX2RheXMpLGE9Q3QodC5fbW9udGhzKTtlLmlzVmFsaWQoKSYmKHM9bnVsbD09c3x8cyxhJiZDZShlLHhlKGUsXCJNb250aFwiKSthKm4pLHImJmJlKGUsXCJEYXRlXCIseGUoZSxcIkRhdGVcIikrcipuKSxpJiZlLl9kLnNldFRpbWUoZS5fZC52YWx1ZU9mKCkraSpuKSxzJiZjLnVwZGF0ZU9mZnNldChlLHJ8fGEpKX1BdC5mbj1IdC5wcm90b3R5cGUsQXQuaW52YWxpZD1mdW5jdGlvbigpe3JldHVybiBBdChOYU4pfTt2YXIgcXQ9enQoMSxcImFkZFwiKSxKdD16dCgtMSxcInN1YnRyYWN0XCIpO2Z1bmN0aW9uIEJ0KGUsdCl7dmFyIG49MTIqKHQueWVhcigpLWUueWVhcigpKSsodC5tb250aCgpLWUubW9udGgoKSkscz1lLmNsb25lKCkuYWRkKG4sXCJtb250aHNcIik7cmV0dXJuLShuKyh0LXM8MD8odC1zKS8ocy1lLmNsb25lKCkuYWRkKG4tMSxcIm1vbnRoc1wiKSk6KHQtcykvKGUuY2xvbmUoKS5hZGQobisxLFwibW9udGhzXCIpLXMpKSl8fDB9ZnVuY3Rpb24gUXQoZSl7dmFyIHQ7cmV0dXJuIHZvaWQgMD09PWU/dGhpcy5fbG9jYWxlLl9hYmJyOihudWxsIT0odD1sdChlKSkmJih0aGlzLl9sb2NhbGU9dCksdGhpcyl9Yy5kZWZhdWx0Rm9ybWF0PVwiWVlZWS1NTS1ERFRISDptbTpzc1pcIixjLmRlZmF1bHRGb3JtYXRVdGM9XCJZWVlZLU1NLUREVEhIOm1tOnNzW1pdXCI7dmFyIFh0PW4oXCJtb21lbnQoKS5sYW5nKCkgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCwgdXNlIG1vbWVudCgpLmxvY2FsZURhdGEoKSB0byBnZXQgdGhlIGxhbmd1YWdlIGNvbmZpZ3VyYXRpb24uIFVzZSBtb21lbnQoKS5sb2NhbGUoKSB0byBjaGFuZ2UgbGFuZ3VhZ2VzLlwiLGZ1bmN0aW9uKGUpe3JldHVybiB2b2lkIDA9PT1lP3RoaXMubG9jYWxlRGF0YSgpOnRoaXMubG9jYWxlKGUpfSk7ZnVuY3Rpb24gS3QoKXtyZXR1cm4gdGhpcy5fbG9jYWxlfWZ1bmN0aW9uIGVuKGUsdCl7SSgwLFtlLGUubGVuZ3RoXSwwLHQpfWZ1bmN0aW9uIHRuKGUsdCxuLHMsaSl7dmFyIHI7cmV0dXJuIG51bGw9PWU/SWUodGhpcyxzLGkpLnllYXI6KChyPUFlKGUscyxpKSk8dCYmKHQ9ciksZnVuY3Rpb24oZSx0LG4scyxpKXt2YXIgcj1FZShlLHQsbixzLGkpLGE9R2Uoci55ZWFyLDAsci5kYXlPZlllYXIpO3JldHVybiB0aGlzLnllYXIoYS5nZXRVVENGdWxsWWVhcigpKSx0aGlzLm1vbnRoKGEuZ2V0VVRDTW9udGgoKSksdGhpcy5kYXRlKGEuZ2V0VVRDRGF0ZSgpKSx0aGlzfS5jYWxsKHRoaXMsZSx0LG4scyxpKSl9SSgwLFtcImdnXCIsMl0sMCxmdW5jdGlvbigpe3JldHVybiB0aGlzLndlZWtZZWFyKCklMTAwfSksSSgwLFtcIkdHXCIsMl0sMCxmdW5jdGlvbigpe3JldHVybiB0aGlzLmlzb1dlZWtZZWFyKCklMTAwfSksZW4oXCJnZ2dnXCIsXCJ3ZWVrWWVhclwiKSxlbihcImdnZ2dnXCIsXCJ3ZWVrWWVhclwiKSxlbihcIkdHR0dcIixcImlzb1dlZWtZZWFyXCIpLGVuKFwiR0dHR0dcIixcImlzb1dlZWtZZWFyXCIpLEgoXCJ3ZWVrWWVhclwiLFwiZ2dcIiksSChcImlzb1dlZWtZZWFyXCIsXCJHR1wiKSxMKFwid2Vla1llYXJcIiwxKSxMKFwiaXNvV2Vla1llYXJcIiwxKSx1ZShcIkdcIixzZSksdWUoXCJnXCIsc2UpLHVlKFwiR0dcIixCLHopLHVlKFwiZ2dcIixCLHopLHVlKFwiR0dHR1wiLGVlLHEpLHVlKFwiZ2dnZ1wiLGVlLHEpLHVlKFwiR0dHR0dcIix0ZSxKKSx1ZShcImdnZ2dnXCIsdGUsSiksZmUoW1wiZ2dnZ1wiLFwiZ2dnZ2dcIixcIkdHR0dcIixcIkdHR0dHXCJdLGZ1bmN0aW9uKGUsdCxuLHMpe3Rbcy5zdWJzdHIoMCwyKV09ayhlKX0pLGZlKFtcImdnXCIsXCJHR1wiXSxmdW5jdGlvbihlLHQsbixzKXt0W3NdPWMucGFyc2VUd29EaWdpdFllYXIoZSl9KSxJKFwiUVwiLDAsXCJRb1wiLFwicXVhcnRlclwiKSxIKFwicXVhcnRlclwiLFwiUVwiKSxMKFwicXVhcnRlclwiLDcpLHVlKFwiUVwiLFopLGNlKFwiUVwiLGZ1bmN0aW9uKGUsdCl7dFtfZV09MyooayhlKS0xKX0pLEkoXCJEXCIsW1wiRERcIiwyXSxcIkRvXCIsXCJkYXRlXCIpLEgoXCJkYXRlXCIsXCJEXCIpLEwoXCJkYXRlXCIsOSksdWUoXCJEXCIsQiksdWUoXCJERFwiLEIseiksdWUoXCJEb1wiLGZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/dC5fZGF5T2ZNb250aE9yZGluYWxQYXJzZXx8dC5fb3JkaW5hbFBhcnNlOnQuX2RheU9mTW9udGhPcmRpbmFsUGFyc2VMZW5pZW50fSksY2UoW1wiRFwiLFwiRERcIl0seWUpLGNlKFwiRG9cIixmdW5jdGlvbihlLHQpe3RbeWVdPWsoZS5tYXRjaChCKVswXSl9KTt2YXIgbm49VGUoXCJEYXRlXCIsITApO0koXCJERERcIixbXCJEREREXCIsM10sXCJERERvXCIsXCJkYXlPZlllYXJcIiksSChcImRheU9mWWVhclwiLFwiREREXCIpLEwoXCJkYXlPZlllYXJcIiw0KSx1ZShcIkRERFwiLEspLHVlKFwiRERERFwiLCQpLGNlKFtcIkRERFwiLFwiRERERFwiXSxmdW5jdGlvbihlLHQsbil7bi5fZGF5T2ZZZWFyPWsoZSl9KSxJKFwibVwiLFtcIm1tXCIsMl0sMCxcIm1pbnV0ZVwiKSxIKFwibWludXRlXCIsXCJtXCIpLEwoXCJtaW51dGVcIiwxNCksdWUoXCJtXCIsQiksdWUoXCJtbVwiLEIseiksY2UoW1wibVwiLFwibW1cIl0scGUpO3ZhciBzbj1UZShcIk1pbnV0ZXNcIiwhMSk7SShcInNcIixbXCJzc1wiLDJdLDAsXCJzZWNvbmRcIiksSChcInNlY29uZFwiLFwic1wiKSxMKFwic2Vjb25kXCIsMTUpLHVlKFwic1wiLEIpLHVlKFwic3NcIixCLHopLGNlKFtcInNcIixcInNzXCJdLHZlKTt2YXIgcm4sYW49VGUoXCJTZWNvbmRzXCIsITEpO2ZvcihJKFwiU1wiLDAsMCxmdW5jdGlvbigpe3JldHVybn5+KHRoaXMubWlsbGlzZWNvbmQoKS8xMDApfSksSSgwLFtcIlNTXCIsMl0sMCxmdW5jdGlvbigpe3JldHVybn5+KHRoaXMubWlsbGlzZWNvbmQoKS8xMCl9KSxJKDAsW1wiU1NTXCIsM10sMCxcIm1pbGxpc2Vjb25kXCIpLEkoMCxbXCJTU1NTXCIsNF0sMCxmdW5jdGlvbigpe3JldHVybiAxMCp0aGlzLm1pbGxpc2Vjb25kKCl9KSxJKDAsW1wiU1NTU1NcIiw1XSwwLGZ1bmN0aW9uKCl7cmV0dXJuIDEwMCp0aGlzLm1pbGxpc2Vjb25kKCl9KSxJKDAsW1wiU1NTU1NTXCIsNl0sMCxmdW5jdGlvbigpe3JldHVybiAxZTMqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1NcIiw3XSwwLGZ1bmN0aW9uKCl7cmV0dXJuIDFlNCp0aGlzLm1pbGxpc2Vjb25kKCl9KSxJKDAsW1wiU1NTU1NTU1NcIiw4XSwwLGZ1bmN0aW9uKCl7cmV0dXJuIDFlNSp0aGlzLm1pbGxpc2Vjb25kKCl9KSxJKDAsW1wiU1NTU1NTU1NTXCIsOV0sMCxmdW5jdGlvbigpe3JldHVybiAxZTYqdGhpcy5taWxsaXNlY29uZCgpfSksSChcIm1pbGxpc2Vjb25kXCIsXCJtc1wiKSxMKFwibWlsbGlzZWNvbmRcIiwxNiksdWUoXCJTXCIsSyxaKSx1ZShcIlNTXCIsSyx6KSx1ZShcIlNTU1wiLEssJCkscm49XCJTU1NTXCI7cm4ubGVuZ3RoPD05O3JuKz1cIlNcIil1ZShybixuZSk7ZnVuY3Rpb24gb24oZSx0KXt0W3dlXT1rKDFlMyooXCIwLlwiK2UpKX1mb3Iocm49XCJTXCI7cm4ubGVuZ3RoPD05O3JuKz1cIlNcIiljZShybixvbik7dmFyIHVuPVRlKFwiTWlsbGlzZWNvbmRzXCIsITEpO0koXCJ6XCIsMCwwLFwiem9uZUFiYnJcIiksSShcInp6XCIsMCwwLFwiem9uZU5hbWVcIik7dmFyIGxuPU0ucHJvdG90eXBlO2Z1bmN0aW9uIGRuKGUpe3JldHVybiBlfWxuLmFkZD1xdCxsbi5jYWxlbmRhcj1mdW5jdGlvbihlLHQpe3ZhciBuPWV8fFR0KCkscz1OdChuLHRoaXMpLnN0YXJ0T2YoXCJkYXlcIiksaT1jLmNhbGVuZGFyRm9ybWF0KHRoaXMscyl8fFwic2FtZUVsc2VcIixyPXQmJih4KHRbaV0pP3RbaV0uY2FsbCh0aGlzLG4pOnRbaV0pO3JldHVybiB0aGlzLmZvcm1hdChyfHx0aGlzLmxvY2FsZURhdGEoKS5jYWxlbmRhcihpLHRoaXMsVHQobikpKX0sbG4uY2xvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE0odGhpcyl9LGxuLmRpZmY9ZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscjtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIE5hTjtpZighKHM9TnQoZSx0aGlzKSkuaXNWYWxpZCgpKXJldHVybiBOYU47c3dpdGNoKGk9NmU0KihzLnV0Y09mZnNldCgpLXRoaXMudXRjT2Zmc2V0KCkpLHQ9Uih0KSl7Y2FzZVwieWVhclwiOnI9QnQodGhpcyxzKS8xMjticmVhaztjYXNlXCJtb250aFwiOnI9QnQodGhpcyxzKTticmVhaztjYXNlXCJxdWFydGVyXCI6cj1CdCh0aGlzLHMpLzM7YnJlYWs7Y2FzZVwic2Vjb25kXCI6cj0odGhpcy1zKS8xZTM7YnJlYWs7Y2FzZVwibWludXRlXCI6cj0odGhpcy1zKS82ZTQ7YnJlYWs7Y2FzZVwiaG91clwiOnI9KHRoaXMtcykvMzZlNTticmVhaztjYXNlXCJkYXlcIjpyPSh0aGlzLXMtaSkvODY0ZTU7YnJlYWs7Y2FzZVwid2Vla1wiOnI9KHRoaXMtcy1pKS82MDQ4ZTU7YnJlYWs7ZGVmYXVsdDpyPXRoaXMtc31yZXR1cm4gbj9yOkQocil9LGxuLmVuZE9mPWZ1bmN0aW9uKGUpe3JldHVybiB2b2lkIDA9PT0oZT1SKGUpKXx8XCJtaWxsaXNlY29uZFwiPT09ZT90aGlzOihcImRhdGVcIj09PWUmJihlPVwiZGF5XCIpLHRoaXMuc3RhcnRPZihlKS5hZGQoMSxcImlzb1dlZWtcIj09PWU/XCJ3ZWVrXCI6ZSkuc3VidHJhY3QoMSxcIm1zXCIpKX0sbG4uZm9ybWF0PWZ1bmN0aW9uKGUpe2V8fChlPXRoaXMuaXNVdGMoKT9jLmRlZmF1bHRGb3JtYXRVdGM6Yy5kZWZhdWx0Rm9ybWF0KTt2YXIgdD1BKHRoaXMsZSk7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQodCl9LGxuLmZyb209ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJihTKGUpJiZlLmlzVmFsaWQoKXx8VHQoZSkuaXNWYWxpZCgpKT9BdCh7dG86dGhpcyxmcm9tOmV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXQpOnRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCl9LGxuLmZyb21Ob3c9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuZnJvbShUdCgpLGUpfSxsbi50bz1mdW5jdGlvbihlLHQpe3JldHVybiB0aGlzLmlzVmFsaWQoKSYmKFMoZSkmJmUuaXNWYWxpZCgpfHxUdChlKS5pc1ZhbGlkKCkpP0F0KHtmcm9tOnRoaXMsdG86ZX0pLmxvY2FsZSh0aGlzLmxvY2FsZSgpKS5odW1hbml6ZSghdCk6dGhpcy5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKX0sbG4udG9Ob3c9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMudG8oVHQoKSxlKX0sbG4uZ2V0PWZ1bmN0aW9uKGUpe3JldHVybiB4KHRoaXNbZT1SKGUpXSk/dGhpc1tlXSgpOnRoaXN9LGxuLmludmFsaWRBdD1mdW5jdGlvbigpe3JldHVybiBnKHRoaXMpLm92ZXJmbG93fSxsbi5pc0FmdGVyPWZ1bmN0aW9uKGUsdCl7dmFyIG49UyhlKT9lOlR0KGUpO3JldHVybiEoIXRoaXMuaXNWYWxpZCgpfHwhbi5pc1ZhbGlkKCkpJiYoXCJtaWxsaXNlY29uZFwiPT09KHQ9UihsKHQpP1wibWlsbGlzZWNvbmRcIjp0KSk/dGhpcy52YWx1ZU9mKCk+bi52YWx1ZU9mKCk6bi52YWx1ZU9mKCk8dGhpcy5jbG9uZSgpLnN0YXJ0T2YodCkudmFsdWVPZigpKX0sbG4uaXNCZWZvcmU9ZnVuY3Rpb24oZSx0KXt2YXIgbj1TKGUpP2U6VHQoZSk7cmV0dXJuISghdGhpcy5pc1ZhbGlkKCl8fCFuLmlzVmFsaWQoKSkmJihcIm1pbGxpc2Vjb25kXCI9PT0odD1SKGwodCk/XCJtaWxsaXNlY29uZFwiOnQpKT90aGlzLnZhbHVlT2YoKTxuLnZhbHVlT2YoKTp0aGlzLmNsb25lKCkuZW5kT2YodCkudmFsdWVPZigpPG4udmFsdWVPZigpKX0sbG4uaXNCZXR3ZWVuPWZ1bmN0aW9uKGUsdCxuLHMpe3JldHVybihcIihcIj09PShzPXN8fFwiKClcIilbMF0/dGhpcy5pc0FmdGVyKGUsbik6IXRoaXMuaXNCZWZvcmUoZSxuKSkmJihcIilcIj09PXNbMV0/dGhpcy5pc0JlZm9yZSh0LG4pOiF0aGlzLmlzQWZ0ZXIodCxuKSl9LGxuLmlzU2FtZT1mdW5jdGlvbihlLHQpe3ZhciBuLHM9UyhlKT9lOlR0KGUpO3JldHVybiEoIXRoaXMuaXNWYWxpZCgpfHwhcy5pc1ZhbGlkKCkpJiYoXCJtaWxsaXNlY29uZFwiPT09KHQ9Uih0fHxcIm1pbGxpc2Vjb25kXCIpKT90aGlzLnZhbHVlT2YoKT09PXMudmFsdWVPZigpOihuPXMudmFsdWVPZigpLHRoaXMuY2xvbmUoKS5zdGFydE9mKHQpLnZhbHVlT2YoKTw9biYmbjw9dGhpcy5jbG9uZSgpLmVuZE9mKHQpLnZhbHVlT2YoKSkpfSxsbi5pc1NhbWVPckFmdGVyPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHRoaXMuaXNTYW1lKGUsdCl8fHRoaXMuaXNBZnRlcihlLHQpfSxsbi5pc1NhbWVPckJlZm9yZT1mdW5jdGlvbihlLHQpe3JldHVybiB0aGlzLmlzU2FtZShlLHQpfHx0aGlzLmlzQmVmb3JlKGUsdCl9LGxuLmlzVmFsaWQ9ZnVuY3Rpb24oKXtyZXR1cm4gcCh0aGlzKX0sbG4ubGFuZz1YdCxsbi5sb2NhbGU9UXQsbG4ubG9jYWxlRGF0YT1LdCxsbi5tYXg9YnQsbG4ubWluPXh0LGxuLnBhcnNpbmdGbGFncz1mdW5jdGlvbigpe3JldHVybiBfKHt9LGcodGhpcykpfSxsbi5zZXQ9ZnVuY3Rpb24oZSx0KXtpZihcIm9iamVjdFwiPT10eXBlb2YgZSlmb3IodmFyIG49ZnVuY3Rpb24oZSl7dmFyIHQ9W107Zm9yKHZhciBuIGluIGUpdC5wdXNoKHt1bml0Om4scHJpb3JpdHk6RltuXX0pO3JldHVybiB0LnNvcnQoZnVuY3Rpb24oZSx0KXtyZXR1cm4gZS5wcmlvcml0eS10LnByaW9yaXR5fSksdH0oZT1DKGUpKSxzPTA7czxuLmxlbmd0aDtzKyspdGhpc1tuW3NdLnVuaXRdKGVbbltzXS51bml0XSk7ZWxzZSBpZih4KHRoaXNbZT1SKGUpXSkpcmV0dXJuIHRoaXNbZV0odCk7cmV0dXJuIHRoaXN9LGxuLnN0YXJ0T2Y9ZnVuY3Rpb24oZSl7c3dpdGNoKGU9UihlKSl7Y2FzZVwieWVhclwiOnRoaXMubW9udGgoMCk7Y2FzZVwicXVhcnRlclwiOmNhc2VcIm1vbnRoXCI6dGhpcy5kYXRlKDEpO2Nhc2VcIndlZWtcIjpjYXNlXCJpc29XZWVrXCI6Y2FzZVwiZGF5XCI6Y2FzZVwiZGF0ZVwiOnRoaXMuaG91cnMoMCk7Y2FzZVwiaG91clwiOnRoaXMubWludXRlcygwKTtjYXNlXCJtaW51dGVcIjp0aGlzLnNlY29uZHMoMCk7Y2FzZVwic2Vjb25kXCI6dGhpcy5taWxsaXNlY29uZHMoMCl9cmV0dXJuXCJ3ZWVrXCI9PT1lJiZ0aGlzLndlZWtkYXkoMCksXCJpc29XZWVrXCI9PT1lJiZ0aGlzLmlzb1dlZWtkYXkoMSksXCJxdWFydGVyXCI9PT1lJiZ0aGlzLm1vbnRoKDMqTWF0aC5mbG9vcih0aGlzLm1vbnRoKCkvMykpLHRoaXN9LGxuLnN1YnRyYWN0PUp0LGxuLnRvQXJyYXk9ZnVuY3Rpb24oKXt2YXIgZT10aGlzO3JldHVybltlLnllYXIoKSxlLm1vbnRoKCksZS5kYXRlKCksZS5ob3VyKCksZS5taW51dGUoKSxlLnNlY29uZCgpLGUubWlsbGlzZWNvbmQoKV19LGxuLnRvT2JqZWN0PWZ1bmN0aW9uKCl7dmFyIGU9dGhpcztyZXR1cm57eWVhcnM6ZS55ZWFyKCksbW9udGhzOmUubW9udGgoKSxkYXRlOmUuZGF0ZSgpLGhvdXJzOmUuaG91cnMoKSxtaW51dGVzOmUubWludXRlcygpLHNlY29uZHM6ZS5zZWNvbmRzKCksbWlsbGlzZWNvbmRzOmUubWlsbGlzZWNvbmRzKCl9fSxsbi50b0RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IERhdGUodGhpcy52YWx1ZU9mKCkpfSxsbi50b0lTT1N0cmluZz1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIG51bGw7dmFyIHQ9ITAhPT1lLG49dD90aGlzLmNsb25lKCkudXRjKCk6dGhpcztyZXR1cm4gbi55ZWFyKCk8MHx8OTk5OTxuLnllYXIoKT9BKG4sdD9cIllZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1taXVwiOlwiWVlZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTWlwiKTp4KERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nKT90P3RoaXMudG9EYXRlKCkudG9JU09TdHJpbmcoKTpuZXcgRGF0ZSh0aGlzLnZhbHVlT2YoKSs2MCp0aGlzLnV0Y09mZnNldCgpKjFlMykudG9JU09TdHJpbmcoKS5yZXBsYWNlKFwiWlwiLEEobixcIlpcIikpOkEobix0P1wiWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1taXVwiOlwiWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1pcIil9LGxuLmluc3BlY3Q9ZnVuY3Rpb24oKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuXCJtb21lbnQuaW52YWxpZCgvKiBcIit0aGlzLl9pK1wiICovKVwiO3ZhciBlPVwibW9tZW50XCIsdD1cIlwiO3RoaXMuaXNMb2NhbCgpfHwoZT0wPT09dGhpcy51dGNPZmZzZXQoKT9cIm1vbWVudC51dGNcIjpcIm1vbWVudC5wYXJzZVpvbmVcIix0PVwiWlwiKTt2YXIgbj1cIltcIitlKycoXCJdJyxzPTA8PXRoaXMueWVhcigpJiZ0aGlzLnllYXIoKTw9OTk5OT9cIllZWVlcIjpcIllZWVlZWVwiLGk9dCsnW1wiKV0nO3JldHVybiB0aGlzLmZvcm1hdChuK3MrXCItTU0tRERbVF1ISDptbTpzcy5TU1NcIitpKX0sbG4udG9KU09OPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNWYWxpZCgpP3RoaXMudG9JU09TdHJpbmcoKTpudWxsfSxsbi50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLmNsb25lKCkubG9jYWxlKFwiZW5cIikuZm9ybWF0KFwiZGRkIE1NTSBERCBZWVlZIEhIOm1tOnNzIFtHTVRdWlpcIil9LGxuLnVuaXg9ZnVuY3Rpb24oKXtyZXR1cm4gTWF0aC5mbG9vcih0aGlzLnZhbHVlT2YoKS8xZTMpfSxsbi52YWx1ZU9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2QudmFsdWVPZigpLTZlNCoodGhpcy5fb2Zmc2V0fHwwKX0sbG4uY3JlYXRpb25EYXRhPWZ1bmN0aW9uKCl7cmV0dXJue2lucHV0OnRoaXMuX2ksZm9ybWF0OnRoaXMuX2YsbG9jYWxlOnRoaXMuX2xvY2FsZSxpc1VUQzp0aGlzLl9pc1VUQyxzdHJpY3Q6dGhpcy5fc3RyaWN0fX0sbG4ueWVhcj1PZSxsbi5pc0xlYXBZZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIGtlKHRoaXMueWVhcigpKX0sbG4ud2Vla1llYXI9ZnVuY3Rpb24oZSl7cmV0dXJuIHRuLmNhbGwodGhpcyxlLHRoaXMud2VlaygpLHRoaXMud2Vla2RheSgpLHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdyx0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3kpfSxsbi5pc29XZWVrWWVhcj1mdW5jdGlvbihlKXtyZXR1cm4gdG4uY2FsbCh0aGlzLGUsdGhpcy5pc29XZWVrKCksdGhpcy5pc29XZWVrZGF5KCksMSw0KX0sbG4ucXVhcnRlcj1sbi5xdWFydGVycz1mdW5jdGlvbihlKXtyZXR1cm4gbnVsbD09ZT9NYXRoLmNlaWwoKHRoaXMubW9udGgoKSsxKS8zKTp0aGlzLm1vbnRoKDMqKGUtMSkrdGhpcy5tb250aCgpJTMpfSxsbi5tb250aD1GZSxsbi5kYXlzSW5Nb250aD1mdW5jdGlvbigpe3JldHVybiBQZSh0aGlzLnllYXIoKSx0aGlzLm1vbnRoKCkpfSxsbi53ZWVrPWxuLndlZWtzPWZ1bmN0aW9uKGUpe3ZhciB0PXRoaXMubG9jYWxlRGF0YSgpLndlZWsodGhpcyk7cmV0dXJuIG51bGw9PWU/dDp0aGlzLmFkZCg3KihlLXQpLFwiZFwiKX0sbG4uaXNvV2Vlaz1sbi5pc29XZWVrcz1mdW5jdGlvbihlKXt2YXIgdD1JZSh0aGlzLDEsNCkud2VlaztyZXR1cm4gbnVsbD09ZT90OnRoaXMuYWRkKDcqKGUtdCksXCJkXCIpfSxsbi53ZWVrc0luWWVhcj1mdW5jdGlvbigpe3ZhciBlPXRoaXMubG9jYWxlRGF0YSgpLl93ZWVrO3JldHVybiBBZSh0aGlzLnllYXIoKSxlLmRvdyxlLmRveSl9LGxuLmlzb1dlZWtzSW5ZZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIEFlKHRoaXMueWVhcigpLDEsNCl9LGxuLmRhdGU9bm4sbG4uZGF5PWxuLmRheXM9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsIT1lP3RoaXM6TmFOO3ZhciB0LG4scz10aGlzLl9pc1VUQz90aGlzLl9kLmdldFVUQ0RheSgpOnRoaXMuX2QuZ2V0RGF5KCk7cmV0dXJuIG51bGwhPWU/KHQ9ZSxuPXRoaXMubG9jYWxlRGF0YSgpLGU9XCJzdHJpbmdcIiE9dHlwZW9mIHQ/dDppc05hTih0KT9cIm51bWJlclwiPT10eXBlb2YodD1uLndlZWtkYXlzUGFyc2UodCkpP3Q6bnVsbDpwYXJzZUludCh0LDEwKSx0aGlzLmFkZChlLXMsXCJkXCIpKTpzfSxsbi53ZWVrZGF5PWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gbnVsbCE9ZT90aGlzOk5hTjt2YXIgdD0odGhpcy5kYXkoKSs3LXRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdyklNztyZXR1cm4gbnVsbD09ZT90OnRoaXMuYWRkKGUtdCxcImRcIil9LGxuLmlzb1dlZWtkYXk9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsIT1lP3RoaXM6TmFOO2lmKG51bGwhPWUpe3ZhciB0PShuPWUscz10aGlzLmxvY2FsZURhdGEoKSxcInN0cmluZ1wiPT10eXBlb2Ygbj9zLndlZWtkYXlzUGFyc2UobiklN3x8Nzppc05hTihuKT9udWxsOm4pO3JldHVybiB0aGlzLmRheSh0aGlzLmRheSgpJTc/dDp0LTcpfXJldHVybiB0aGlzLmRheSgpfHw3O3ZhciBuLHN9LGxuLmRheU9mWWVhcj1mdW5jdGlvbihlKXt2YXIgdD1NYXRoLnJvdW5kKCh0aGlzLmNsb25lKCkuc3RhcnRPZihcImRheVwiKS10aGlzLmNsb25lKCkuc3RhcnRPZihcInllYXJcIikpLzg2NGU1KSsxO3JldHVybiBudWxsPT1lP3Q6dGhpcy5hZGQoZS10LFwiZFwiKX0sbG4uaG91cj1sbi5ob3Vycz10dCxsbi5taW51dGU9bG4ubWludXRlcz1zbixsbi5zZWNvbmQ9bG4uc2Vjb25kcz1hbixsbi5taWxsaXNlY29uZD1sbi5taWxsaXNlY29uZHM9dW4sbG4udXRjT2Zmc2V0PWZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpPXRoaXMuX29mZnNldHx8MDtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIG51bGwhPWU/dGhpczpOYU47aWYobnVsbCE9ZSl7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGUpe2lmKG51bGw9PT0oZT1VdChyZSxlKSkpcmV0dXJuIHRoaXN9ZWxzZSBNYXRoLmFicyhlKTwxNiYmIW4mJihlKj02MCk7cmV0dXJuIXRoaXMuX2lzVVRDJiZ0JiYocz1HdCh0aGlzKSksdGhpcy5fb2Zmc2V0PWUsdGhpcy5faXNVVEM9ITAsbnVsbCE9cyYmdGhpcy5hZGQocyxcIm1cIiksaSE9PWUmJighdHx8dGhpcy5fY2hhbmdlSW5Qcm9ncmVzcz8kdCh0aGlzLEF0KGUtaSxcIm1cIiksMSwhMSk6dGhpcy5fY2hhbmdlSW5Qcm9ncmVzc3x8KHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3M9ITAsYy51cGRhdGVPZmZzZXQodGhpcywhMCksdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcz1udWxsKSksdGhpc31yZXR1cm4gdGhpcy5faXNVVEM/aTpHdCh0aGlzKX0sbG4udXRjPWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLnV0Y09mZnNldCgwLGUpfSxsbi5sb2NhbD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5faXNVVEMmJih0aGlzLnV0Y09mZnNldCgwLGUpLHRoaXMuX2lzVVRDPSExLGUmJnRoaXMuc3VidHJhY3QoR3QodGhpcyksXCJtXCIpKSx0aGlzfSxsbi5wYXJzZVpvbmU9ZnVuY3Rpb24oKXtpZihudWxsIT10aGlzLl90em0pdGhpcy51dGNPZmZzZXQodGhpcy5fdHptLCExLCEwKTtlbHNlIGlmKFwic3RyaW5nXCI9PXR5cGVvZiB0aGlzLl9pKXt2YXIgZT1VdChpZSx0aGlzLl9pKTtudWxsIT1lP3RoaXMudXRjT2Zmc2V0KGUpOnRoaXMudXRjT2Zmc2V0KDAsITApfXJldHVybiB0aGlzfSxsbi5oYXNBbGlnbmVkSG91ck9mZnNldD1mdW5jdGlvbihlKXtyZXR1cm4hIXRoaXMuaXNWYWxpZCgpJiYoZT1lP1R0KGUpLnV0Y09mZnNldCgpOjAsKHRoaXMudXRjT2Zmc2V0KCktZSklNjA9PTApfSxsbi5pc0RTVD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnV0Y09mZnNldCgpPnRoaXMuY2xvbmUoKS5tb250aCgwKS51dGNPZmZzZXQoKXx8dGhpcy51dGNPZmZzZXQoKT50aGlzLmNsb25lKCkubW9udGgoNSkudXRjT2Zmc2V0KCl9LGxuLmlzTG9jYWw9ZnVuY3Rpb24oKXtyZXR1cm4hIXRoaXMuaXNWYWxpZCgpJiYhdGhpcy5faXNVVEN9LGxuLmlzVXRjT2Zmc2V0PWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmdGhpcy5faXNVVEN9LGxuLmlzVXRjPVZ0LGxuLmlzVVRDPVZ0LGxuLnpvbmVBYmJyPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2lzVVRDP1wiVVRDXCI6XCJcIn0sbG4uem9uZU5hbWU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXNVVEM/XCJDb29yZGluYXRlZCBVbml2ZXJzYWwgVGltZVwiOlwiXCJ9LGxuLmRhdGVzPW4oXCJkYXRlcyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgZGF0ZSBpbnN0ZWFkLlwiLG5uKSxsbi5tb250aHM9bihcIm1vbnRocyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgbW9udGggaW5zdGVhZFwiLEZlKSxsbi55ZWFycz1uKFwieWVhcnMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIHllYXIgaW5zdGVhZFwiLE9lKSxsbi56b25lPW4oXCJtb21lbnQoKS56b25lIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQoKS51dGNPZmZzZXQgaW5zdGVhZC4gaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy96b25lL1wiLGZ1bmN0aW9uKGUsdCl7cmV0dXJuIG51bGwhPWU/KFwic3RyaW5nXCIhPXR5cGVvZiBlJiYoZT0tZSksdGhpcy51dGNPZmZzZXQoZSx0KSx0aGlzKTotdGhpcy51dGNPZmZzZXQoKX0pLGxuLmlzRFNUU2hpZnRlZD1uKFwiaXNEU1RTaGlmdGVkIGlzIGRlcHJlY2F0ZWQuIFNlZSBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL2RzdC1zaGlmdGVkLyBmb3IgbW9yZSBpbmZvcm1hdGlvblwiLGZ1bmN0aW9uKCl7aWYoIWwodGhpcy5faXNEU1RTaGlmdGVkKSlyZXR1cm4gdGhpcy5faXNEU1RTaGlmdGVkO3ZhciBlPXt9O2lmKHcoZSx0aGlzKSwoZT1ZdChlKSkuX2Epe3ZhciB0PWUuX2lzVVRDP3koZS5fYSk6VHQoZS5fYSk7dGhpcy5faXNEU1RTaGlmdGVkPXRoaXMuaXNWYWxpZCgpJiYwPGEoZS5fYSx0LnRvQXJyYXkoKSl9ZWxzZSB0aGlzLl9pc0RTVFNoaWZ0ZWQ9ITE7cmV0dXJuIHRoaXMuX2lzRFNUU2hpZnRlZH0pO3ZhciBobj1QLnByb3RvdHlwZTtmdW5jdGlvbiBjbihlLHQsbixzKXt2YXIgaT1sdCgpLHI9eSgpLnNldChzLHQpO3JldHVybiBpW25dKHIsZSl9ZnVuY3Rpb24gZm4oZSx0LG4pe2lmKGQoZSkmJih0PWUsZT12b2lkIDApLGU9ZXx8XCJcIixudWxsIT10KXJldHVybiBjbihlLHQsbixcIm1vbnRoXCIpO3ZhciBzLGk9W107Zm9yKHM9MDtzPDEyO3MrKylpW3NdPWNuKGUscyxuLFwibW9udGhcIik7cmV0dXJuIGl9ZnVuY3Rpb24gbW4oZSx0LG4scyl7XCJib29sZWFuXCI9PXR5cGVvZiBlP2QodCkmJihuPXQsdD12b2lkIDApOih0PWUsZT0hMSxkKG49dCkmJihuPXQsdD12b2lkIDApKSx0PXR8fFwiXCI7dmFyIGkscj1sdCgpLGE9ZT9yLl93ZWVrLmRvdzowO2lmKG51bGwhPW4pcmV0dXJuIGNuKHQsKG4rYSklNyxzLFwiZGF5XCIpO3ZhciBvPVtdO2ZvcihpPTA7aTw3O2krKylvW2ldPWNuKHQsKGkrYSklNyxzLFwiZGF5XCIpO3JldHVybiBvfWhuLmNhbGVuZGFyPWZ1bmN0aW9uKGUsdCxuKXt2YXIgcz10aGlzLl9jYWxlbmRhcltlXXx8dGhpcy5fY2FsZW5kYXIuc2FtZUVsc2U7cmV0dXJuIHgocyk/cy5jYWxsKHQsbik6c30saG4ubG9uZ0RhdGVGb3JtYXQ9ZnVuY3Rpb24oZSl7dmFyIHQ9dGhpcy5fbG9uZ0RhdGVGb3JtYXRbZV0sbj10aGlzLl9sb25nRGF0ZUZvcm1hdFtlLnRvVXBwZXJDYXNlKCldO3JldHVybiB0fHwhbj90Oih0aGlzLl9sb25nRGF0ZUZvcm1hdFtlXT1uLnJlcGxhY2UoL01NTU18TU18RER8ZGRkZC9nLGZ1bmN0aW9uKGUpe3JldHVybiBlLnNsaWNlKDEpfSksdGhpcy5fbG9uZ0RhdGVGb3JtYXRbZV0pfSxobi5pbnZhbGlkRGF0ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pbnZhbGlkRGF0ZX0saG4ub3JkaW5hbD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fb3JkaW5hbC5yZXBsYWNlKFwiJWRcIixlKX0saG4ucHJlcGFyc2U9ZG4saG4ucG9zdGZvcm1hdD1kbixobi5yZWxhdGl2ZVRpbWU9ZnVuY3Rpb24oZSx0LG4scyl7dmFyIGk9dGhpcy5fcmVsYXRpdmVUaW1lW25dO3JldHVybiB4KGkpP2koZSx0LG4scyk6aS5yZXBsYWNlKC8lZC9pLGUpfSxobi5wYXN0RnV0dXJlPWZ1bmN0aW9uKGUsdCl7dmFyIG49dGhpcy5fcmVsYXRpdmVUaW1lWzA8ZT9cImZ1dHVyZVwiOlwicGFzdFwiXTtyZXR1cm4geChuKT9uKHQpOm4ucmVwbGFjZSgvJXMvaSx0KX0saG4uc2V0PWZ1bmN0aW9uKGUpe3ZhciB0LG47Zm9yKG4gaW4gZSl4KHQ9ZVtuXSk/dGhpc1tuXT10OnRoaXNbXCJfXCIrbl09dDt0aGlzLl9jb25maWc9ZSx0aGlzLl9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlTGVuaWVudD1uZXcgUmVnRXhwKCh0aGlzLl9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlLnNvdXJjZXx8dGhpcy5fb3JkaW5hbFBhcnNlLnNvdXJjZSkrXCJ8XCIrL1xcZHsxLDJ9Ly5zb3VyY2UpfSxobi5tb250aHM9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZT9vKHRoaXMuX21vbnRocyk/dGhpcy5fbW9udGhzW2UubW9udGgoKV06dGhpcy5fbW9udGhzWyh0aGlzLl9tb250aHMuaXNGb3JtYXR8fFdlKS50ZXN0KHQpP1wiZm9ybWF0XCI6XCJzdGFuZGFsb25lXCJdW2UubW9udGgoKV06byh0aGlzLl9tb250aHMpP3RoaXMuX21vbnRoczp0aGlzLl9tb250aHMuc3RhbmRhbG9uZX0saG4ubW9udGhzU2hvcnQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZT9vKHRoaXMuX21vbnRoc1Nob3J0KT90aGlzLl9tb250aHNTaG9ydFtlLm1vbnRoKCldOnRoaXMuX21vbnRoc1Nob3J0W1dlLnRlc3QodCk/XCJmb3JtYXRcIjpcInN0YW5kYWxvbmVcIl1bZS5tb250aCgpXTpvKHRoaXMuX21vbnRoc1Nob3J0KT90aGlzLl9tb250aHNTaG9ydDp0aGlzLl9tb250aHNTaG9ydC5zdGFuZGFsb25lfSxobi5tb250aHNQYXJzZT1mdW5jdGlvbihlLHQsbil7dmFyIHMsaSxyO2lmKHRoaXMuX21vbnRoc1BhcnNlRXhhY3QpcmV0dXJuIGZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpLHIsYT1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7aWYoIXRoaXMuX21vbnRoc1BhcnNlKWZvcih0aGlzLl9tb250aHNQYXJzZT1bXSx0aGlzLl9sb25nTW9udGhzUGFyc2U9W10sdGhpcy5fc2hvcnRNb250aHNQYXJzZT1bXSxzPTA7czwxMjsrK3Mpcj15KFsyZTMsc10pLHRoaXMuX3Nob3J0TW9udGhzUGFyc2Vbc109dGhpcy5tb250aHNTaG9ydChyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCksdGhpcy5fbG9uZ01vbnRoc1BhcnNlW3NdPXRoaXMubW9udGhzKHIsXCJcIikudG9Mb2NhbGVMb3dlckNhc2UoKTtyZXR1cm4gbj9cIk1NTVwiPT09dD8tMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRNb250aHNQYXJzZSxhKSk/aTpudWxsOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9sb25nTW9udGhzUGFyc2UsYSkpP2k6bnVsbDpcIk1NTVwiPT09dD8tMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRNb250aHNQYXJzZSxhKSk/aTotMSE9PShpPVllLmNhbGwodGhpcy5fbG9uZ01vbnRoc1BhcnNlLGEpKT9pOm51bGw6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX2xvbmdNb250aHNQYXJzZSxhKSk/aTotMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRNb250aHNQYXJzZSxhKSk/aTpudWxsfS5jYWxsKHRoaXMsZSx0LG4pO2Zvcih0aGlzLl9tb250aHNQYXJzZXx8KHRoaXMuX21vbnRoc1BhcnNlPVtdLHRoaXMuX2xvbmdNb250aHNQYXJzZT1bXSx0aGlzLl9zaG9ydE1vbnRoc1BhcnNlPVtdKSxzPTA7czwxMjtzKyspe2lmKGk9eShbMmUzLHNdKSxuJiYhdGhpcy5fbG9uZ01vbnRoc1BhcnNlW3NdJiYodGhpcy5fbG9uZ01vbnRoc1BhcnNlW3NdPW5ldyBSZWdFeHAoXCJeXCIrdGhpcy5tb250aHMoaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXCIpK1wiJFwiLFwiaVwiKSx0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW3NdPW5ldyBSZWdFeHAoXCJeXCIrdGhpcy5tb250aHNTaG9ydChpLFwiXCIpLnJlcGxhY2UoXCIuXCIsXCJcIikrXCIkXCIsXCJpXCIpKSxufHx0aGlzLl9tb250aHNQYXJzZVtzXXx8KHI9XCJeXCIrdGhpcy5tb250aHMoaSxcIlwiKStcInxeXCIrdGhpcy5tb250aHNTaG9ydChpLFwiXCIpLHRoaXMuX21vbnRoc1BhcnNlW3NdPW5ldyBSZWdFeHAoci5yZXBsYWNlKFwiLlwiLFwiXCIpLFwiaVwiKSksbiYmXCJNTU1NXCI9PT10JiZ0aGlzLl9sb25nTW9udGhzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZihuJiZcIk1NTVwiPT09dCYmdGhpcy5fc2hvcnRNb250aHNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzO2lmKCFuJiZ0aGlzLl9tb250aHNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzfX0saG4ubW9udGhzUmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX21vbnRoc1BhcnNlRXhhY3Q/KG0odGhpcyxcIl9tb250aHNSZWdleFwiKXx8TmUuY2FsbCh0aGlzKSxlP3RoaXMuX21vbnRoc1N0cmljdFJlZ2V4OnRoaXMuX21vbnRoc1JlZ2V4KToobSh0aGlzLFwiX21vbnRoc1JlZ2V4XCIpfHwodGhpcy5fbW9udGhzUmVnZXg9VWUpLHRoaXMuX21vbnRoc1N0cmljdFJlZ2V4JiZlP3RoaXMuX21vbnRoc1N0cmljdFJlZ2V4OnRoaXMuX21vbnRoc1JlZ2V4KX0saG4ubW9udGhzU2hvcnRSZWdleD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fbW9udGhzUGFyc2VFeGFjdD8obSh0aGlzLFwiX21vbnRoc1JlZ2V4XCIpfHxOZS5jYWxsKHRoaXMpLGU/dGhpcy5fbW9udGhzU2hvcnRTdHJpY3RSZWdleDp0aGlzLl9tb250aHNTaG9ydFJlZ2V4KToobSh0aGlzLFwiX21vbnRoc1Nob3J0UmVnZXhcIil8fCh0aGlzLl9tb250aHNTaG9ydFJlZ2V4PUxlKSx0aGlzLl9tb250aHNTaG9ydFN0cmljdFJlZ2V4JiZlP3RoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXg6dGhpcy5fbW9udGhzU2hvcnRSZWdleCl9LGhuLndlZWs9ZnVuY3Rpb24oZSl7cmV0dXJuIEllKGUsdGhpcy5fd2Vlay5kb3csdGhpcy5fd2Vlay5kb3kpLndlZWt9LGhuLmZpcnN0RGF5T2ZZZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3dlZWsuZG95fSxobi5maXJzdERheU9mV2Vlaz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl93ZWVrLmRvd30saG4ud2Vla2RheXM9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZT9vKHRoaXMuX3dlZWtkYXlzKT90aGlzLl93ZWVrZGF5c1tlLmRheSgpXTp0aGlzLl93ZWVrZGF5c1t0aGlzLl93ZWVrZGF5cy5pc0Zvcm1hdC50ZXN0KHQpP1wiZm9ybWF0XCI6XCJzdGFuZGFsb25lXCJdW2UuZGF5KCldOm8odGhpcy5fd2Vla2RheXMpP3RoaXMuX3dlZWtkYXlzOnRoaXMuX3dlZWtkYXlzLnN0YW5kYWxvbmV9LGhuLndlZWtkYXlzTWluPWZ1bmN0aW9uKGUpe3JldHVybiBlP3RoaXMuX3dlZWtkYXlzTWluW2UuZGF5KCldOnRoaXMuX3dlZWtkYXlzTWlufSxobi53ZWVrZGF5c1Nob3J0PWZ1bmN0aW9uKGUpe3JldHVybiBlP3RoaXMuX3dlZWtkYXlzU2hvcnRbZS5kYXkoKV06dGhpcy5fd2Vla2RheXNTaG9ydH0saG4ud2Vla2RheXNQYXJzZT1mdW5jdGlvbihlLHQsbil7dmFyIHMsaSxyO2lmKHRoaXMuX3dlZWtkYXlzUGFyc2VFeGFjdClyZXR1cm4gZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscixhPWUudG9Mb2NhbGVMb3dlckNhc2UoKTtpZighdGhpcy5fd2Vla2RheXNQYXJzZSlmb3IodGhpcy5fd2Vla2RheXNQYXJzZT1bXSx0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2U9W10sdGhpcy5fbWluV2Vla2RheXNQYXJzZT1bXSxzPTA7czw3OysrcylyPXkoWzJlMywxXSkuZGF5KHMpLHRoaXMuX21pbldlZWtkYXlzUGFyc2Vbc109dGhpcy53ZWVrZGF5c01pbihyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCksdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlW3NdPXRoaXMud2Vla2RheXNTaG9ydChyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCksdGhpcy5fd2Vla2RheXNQYXJzZVtzXT10aGlzLndlZWtkYXlzKHIsXCJcIikudG9Mb2NhbGVMb3dlckNhc2UoKTtyZXR1cm4gbj9cImRkZGRcIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsYSkpP2k6bnVsbDpcImRkZFwiPT09dD8tMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6bnVsbDpcImRkZGRcIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSxhKSk/aTotMSE9PShpPVllLmNhbGwodGhpcy5fbWluV2Vla2RheXNQYXJzZSxhKSk/aTpudWxsOlwiZGRkXCI9PT10Py0xIT09KGk9WWUuY2FsbCh0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6bnVsbDotMSE9PShpPVllLmNhbGwodGhpcy5fbWluV2Vla2RheXNQYXJzZSxhKSk/aTotMSE9PShpPVllLmNhbGwodGhpcy5fd2Vla2RheXNQYXJzZSxhKSk/aTotMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLGEpKT9pOm51bGx9LmNhbGwodGhpcyxlLHQsbik7Zm9yKHRoaXMuX3dlZWtkYXlzUGFyc2V8fCh0aGlzLl93ZWVrZGF5c1BhcnNlPVtdLHRoaXMuX21pbldlZWtkYXlzUGFyc2U9W10sdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlPVtdLHRoaXMuX2Z1bGxXZWVrZGF5c1BhcnNlPVtdKSxzPTA7czw3O3MrKyl7aWYoaT15KFsyZTMsMV0pLmRheShzKSxuJiYhdGhpcy5fZnVsbFdlZWtkYXlzUGFyc2Vbc10mJih0aGlzLl9mdWxsV2Vla2RheXNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMud2Vla2RheXMoaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXFxcXC4/XCIpK1wiJFwiLFwiaVwiKSx0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2Vbc109bmV3IFJlZ0V4cChcIl5cIit0aGlzLndlZWtkYXlzU2hvcnQoaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXFxcXC4/XCIpK1wiJFwiLFwiaVwiKSx0aGlzLl9taW5XZWVrZGF5c1BhcnNlW3NdPW5ldyBSZWdFeHAoXCJeXCIrdGhpcy53ZWVrZGF5c01pbihpLFwiXCIpLnJlcGxhY2UoXCIuXCIsXCJcXFxcLj9cIikrXCIkXCIsXCJpXCIpKSx0aGlzLl93ZWVrZGF5c1BhcnNlW3NdfHwocj1cIl5cIit0aGlzLndlZWtkYXlzKGksXCJcIikrXCJ8XlwiK3RoaXMud2Vla2RheXNTaG9ydChpLFwiXCIpK1wifF5cIit0aGlzLndlZWtkYXlzTWluKGksXCJcIiksdGhpcy5fd2Vla2RheXNQYXJzZVtzXT1uZXcgUmVnRXhwKHIucmVwbGFjZShcIi5cIixcIlwiKSxcImlcIikpLG4mJlwiZGRkZFwiPT09dCYmdGhpcy5fZnVsbFdlZWtkYXlzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZihuJiZcImRkZFwiPT09dCYmdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHM7aWYobiYmXCJkZFwiPT09dCYmdGhpcy5fbWluV2Vla2RheXNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzO2lmKCFuJiZ0aGlzLl93ZWVrZGF5c1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHN9fSxobi53ZWVrZGF5c1JlZ2V4PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3Q/KG0odGhpcyxcIl93ZWVrZGF5c1JlZ2V4XCIpfHxCZS5jYWxsKHRoaXMpLGU/dGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c1JlZ2V4KToobSh0aGlzLFwiX3dlZWtkYXlzUmVnZXhcIil8fCh0aGlzLl93ZWVrZGF5c1JlZ2V4PSRlKSx0aGlzLl93ZWVrZGF5c1N0cmljdFJlZ2V4JiZlP3RoaXMuX3dlZWtkYXlzU3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNSZWdleCl9LGhuLndlZWtkYXlzU2hvcnRSZWdleD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fd2Vla2RheXNQYXJzZUV4YWN0PyhtKHRoaXMsXCJfd2Vla2RheXNSZWdleFwiKXx8QmUuY2FsbCh0aGlzKSxlP3RoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXgpOihtKHRoaXMsXCJfd2Vla2RheXNTaG9ydFJlZ2V4XCIpfHwodGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4PXFlKSx0aGlzLl93ZWVrZGF5c1Nob3J0U3RyaWN0UmVnZXgmJmU/dGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4OnRoaXMuX3dlZWtkYXlzU2hvcnRSZWdleCl9LGhuLndlZWtkYXlzTWluUmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX3dlZWtkYXlzUGFyc2VFeGFjdD8obSh0aGlzLFwiX3dlZWtkYXlzUmVnZXhcIil8fEJlLmNhbGwodGhpcyksZT90aGlzLl93ZWVrZGF5c01pblN0cmljdFJlZ2V4OnRoaXMuX3dlZWtkYXlzTWluUmVnZXgpOihtKHRoaXMsXCJfd2Vla2RheXNNaW5SZWdleFwiKXx8KHRoaXMuX3dlZWtkYXlzTWluUmVnZXg9SmUpLHRoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXgmJmU/dGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c01pblJlZ2V4KX0saG4uaXNQTT1mdW5jdGlvbihlKXtyZXR1cm5cInBcIj09PShlK1wiXCIpLnRvTG93ZXJDYXNlKCkuY2hhckF0KDApfSxobi5tZXJpZGllbT1mdW5jdGlvbihlLHQsbil7cmV0dXJuIDExPGU/bj9cInBtXCI6XCJQTVwiOm4/XCJhbVwiOlwiQU1cIn0sb3QoXCJlblwiLHtkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOi9cXGR7MSwyfSh0aHxzdHxuZHxyZCkvLG9yZGluYWw6ZnVuY3Rpb24oZSl7dmFyIHQ9ZSUxMDtyZXR1cm4gZSsoMT09PWsoZSUxMDAvMTApP1widGhcIjoxPT09dD9cInN0XCI6Mj09PXQ/XCJuZFwiOjM9PT10P1wicmRcIjpcInRoXCIpfX0pLGMubGFuZz1uKFwibW9tZW50LmxhbmcgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbWVudC5sb2NhbGUgaW5zdGVhZC5cIixvdCksYy5sYW5nRGF0YT1uKFwibW9tZW50LmxhbmdEYXRhIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlRGF0YSBpbnN0ZWFkLlwiLGx0KTt2YXIgX249TWF0aC5hYnM7ZnVuY3Rpb24geW4oZSx0LG4scyl7dmFyIGk9QXQodCxuKTtyZXR1cm4gZS5fbWlsbGlzZWNvbmRzKz1zKmkuX21pbGxpc2Vjb25kcyxlLl9kYXlzKz1zKmkuX2RheXMsZS5fbW9udGhzKz1zKmkuX21vbnRocyxlLl9idWJibGUoKX1mdW5jdGlvbiBnbihlKXtyZXR1cm4gZTwwP01hdGguZmxvb3IoZSk6TWF0aC5jZWlsKGUpfWZ1bmN0aW9uIHBuKGUpe3JldHVybiA0ODAwKmUvMTQ2MDk3fWZ1bmN0aW9uIHZuKGUpe3JldHVybiAxNDYwOTcqZS80ODAwfWZ1bmN0aW9uIHduKGUpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiB0aGlzLmFzKGUpfX12YXIgTW49d24oXCJtc1wiKSxTbj13bihcInNcIiksRG49d24oXCJtXCIpLGtuPXduKFwiaFwiKSxZbj13bihcImRcIiksT249d24oXCJ3XCIpLFRuPXduKFwiTVwiKSx4bj13bihcInlcIik7ZnVuY3Rpb24gYm4oZSl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNWYWxpZCgpP3RoaXMuX2RhdGFbZV06TmFOfX12YXIgUG49Ym4oXCJtaWxsaXNlY29uZHNcIiksV249Ym4oXCJzZWNvbmRzXCIpLEhuPWJuKFwibWludXRlc1wiKSxSbj1ibihcImhvdXJzXCIpLENuPWJuKFwiZGF5c1wiKSxGbj1ibihcIm1vbnRoc1wiKSxMbj1ibihcInllYXJzXCIpO3ZhciBVbj1NYXRoLnJvdW5kLE5uPXtzczo0NCxzOjQ1LG06NDUsaDoyMixkOjI2LE06MTF9O3ZhciBHbj1NYXRoLmFicztmdW5jdGlvbiBWbihlKXtyZXR1cm4oMDxlKS0oZTwwKXx8K2V9ZnVuY3Rpb24gRW4oKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7dmFyIGUsdCxuPUduKHRoaXMuX21pbGxpc2Vjb25kcykvMWUzLHM9R24odGhpcy5fZGF5cyksaT1Hbih0aGlzLl9tb250aHMpO3Q9RCgoZT1EKG4vNjApKS82MCksbiU9NjAsZSU9NjA7dmFyIHI9RChpLzEyKSxhPWklPTEyLG89cyx1PXQsbD1lLGQ9bj9uLnRvRml4ZWQoMykucmVwbGFjZSgvXFwuPzArJC8sXCJcIik6XCJcIixoPXRoaXMuYXNTZWNvbmRzKCk7aWYoIWgpcmV0dXJuXCJQMERcIjt2YXIgYz1oPDA/XCItXCI6XCJcIixmPVZuKHRoaXMuX21vbnRocykhPT1WbihoKT9cIi1cIjpcIlwiLG09Vm4odGhpcy5fZGF5cykhPT1WbihoKT9cIi1cIjpcIlwiLF89Vm4odGhpcy5fbWlsbGlzZWNvbmRzKSE9PVZuKGgpP1wiLVwiOlwiXCI7cmV0dXJuIGMrXCJQXCIrKHI/ZityK1wiWVwiOlwiXCIpKyhhP2YrYStcIk1cIjpcIlwiKSsobz9tK28rXCJEXCI6XCJcIikrKHV8fGx8fGQ/XCJUXCI6XCJcIikrKHU/Xyt1K1wiSFwiOlwiXCIpKyhsP18rbCtcIk1cIjpcIlwiKSsoZD9fK2QrXCJTXCI6XCJcIil9dmFyIEluPUh0LnByb3RvdHlwZTtyZXR1cm4gSW4uaXNWYWxpZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pc1ZhbGlkfSxJbi5hYnM9ZnVuY3Rpb24oKXt2YXIgZT10aGlzLl9kYXRhO3JldHVybiB0aGlzLl9taWxsaXNlY29uZHM9X24odGhpcy5fbWlsbGlzZWNvbmRzKSx0aGlzLl9kYXlzPV9uKHRoaXMuX2RheXMpLHRoaXMuX21vbnRocz1fbih0aGlzLl9tb250aHMpLGUubWlsbGlzZWNvbmRzPV9uKGUubWlsbGlzZWNvbmRzKSxlLnNlY29uZHM9X24oZS5zZWNvbmRzKSxlLm1pbnV0ZXM9X24oZS5taW51dGVzKSxlLmhvdXJzPV9uKGUuaG91cnMpLGUubW9udGhzPV9uKGUubW9udGhzKSxlLnllYXJzPV9uKGUueWVhcnMpLHRoaXN9LEluLmFkZD1mdW5jdGlvbihlLHQpe3JldHVybiB5bih0aGlzLGUsdCwxKX0sSW4uc3VidHJhY3Q9ZnVuY3Rpb24oZSx0KXtyZXR1cm4geW4odGhpcyxlLHQsLTEpfSxJbi5hcz1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIE5hTjt2YXIgdCxuLHM9dGhpcy5fbWlsbGlzZWNvbmRzO2lmKFwibW9udGhcIj09PShlPVIoZSkpfHxcInllYXJcIj09PWUpcmV0dXJuIHQ9dGhpcy5fZGF5cytzLzg2NGU1LG49dGhpcy5fbW9udGhzK3BuKHQpLFwibW9udGhcIj09PWU/bjpuLzEyO3N3aXRjaCh0PXRoaXMuX2RheXMrTWF0aC5yb3VuZCh2bih0aGlzLl9tb250aHMpKSxlKXtjYXNlXCJ3ZWVrXCI6cmV0dXJuIHQvNytzLzYwNDhlNTtjYXNlXCJkYXlcIjpyZXR1cm4gdCtzLzg2NGU1O2Nhc2VcImhvdXJcIjpyZXR1cm4gMjQqdCtzLzM2ZTU7Y2FzZVwibWludXRlXCI6cmV0dXJuIDE0NDAqdCtzLzZlNDtjYXNlXCJzZWNvbmRcIjpyZXR1cm4gODY0MDAqdCtzLzFlMztjYXNlXCJtaWxsaXNlY29uZFwiOnJldHVybiBNYXRoLmZsb29yKDg2NGU1KnQpK3M7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHVuaXQgXCIrZSl9fSxJbi5hc01pbGxpc2Vjb25kcz1NbixJbi5hc1NlY29uZHM9U24sSW4uYXNNaW51dGVzPURuLEluLmFzSG91cnM9a24sSW4uYXNEYXlzPVluLEluLmFzV2Vla3M9T24sSW4uYXNNb250aHM9VG4sSW4uYXNZZWFycz14bixJbi52YWx1ZU9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNWYWxpZCgpP3RoaXMuX21pbGxpc2Vjb25kcys4NjRlNSp0aGlzLl9kYXlzK3RoaXMuX21vbnRocyUxMioyNTkyZTYrMzE1MzZlNiprKHRoaXMuX21vbnRocy8xMik6TmFOfSxJbi5fYnViYmxlPWZ1bmN0aW9uKCl7dmFyIGUsdCxuLHMsaSxyPXRoaXMuX21pbGxpc2Vjb25kcyxhPXRoaXMuX2RheXMsbz10aGlzLl9tb250aHMsdT10aGlzLl9kYXRhO3JldHVybiAwPD1yJiYwPD1hJiYwPD1vfHxyPD0wJiZhPD0wJiZvPD0wfHwocis9ODY0ZTUqZ24odm4obykrYSksbz1hPTApLHUubWlsbGlzZWNvbmRzPXIlMWUzLGU9RChyLzFlMyksdS5zZWNvbmRzPWUlNjAsdD1EKGUvNjApLHUubWludXRlcz10JTYwLG49RCh0LzYwKSx1LmhvdXJzPW4lMjQsbys9aT1EKHBuKGErPUQobi8yNCkpKSxhLT1nbih2bihpKSkscz1EKG8vMTIpLG8lPTEyLHUuZGF5cz1hLHUubW9udGhzPW8sdS55ZWFycz1zLHRoaXN9LEluLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIEF0KHRoaXMpfSxJbi5nZXQ9ZnVuY3Rpb24oZSl7cmV0dXJuIGU9UihlKSx0aGlzLmlzVmFsaWQoKT90aGlzW2UrXCJzXCJdKCk6TmFOfSxJbi5taWxsaXNlY29uZHM9UG4sSW4uc2Vjb25kcz1XbixJbi5taW51dGVzPUhuLEluLmhvdXJzPVJuLEluLmRheXM9Q24sSW4ud2Vla3M9ZnVuY3Rpb24oKXtyZXR1cm4gRCh0aGlzLmRheXMoKS83KX0sSW4ubW9udGhzPUZuLEluLnllYXJzPUxuLEluLmh1bWFuaXplPWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKTt2YXIgdCxuLHMsaSxyLGEsbyx1LGwsZCxoLGM9dGhpcy5sb2NhbGVEYXRhKCksZj0obj0hZSxzPWMsaT1BdCh0PXRoaXMpLmFicygpLHI9VW4oaS5hcyhcInNcIikpLGE9VW4oaS5hcyhcIm1cIikpLG89VW4oaS5hcyhcImhcIikpLHU9VW4oaS5hcyhcImRcIikpLGw9VW4oaS5hcyhcIk1cIikpLGQ9VW4oaS5hcyhcInlcIikpLChoPXI8PU5uLnNzJiZbXCJzXCIscl18fHI8Tm4ucyYmW1wic3NcIixyXXx8YTw9MSYmW1wibVwiXXx8YTxObi5tJiZbXCJtbVwiLGFdfHxvPD0xJiZbXCJoXCJdfHxvPE5uLmgmJltcImhoXCIsb118fHU8PTEmJltcImRcIl18fHU8Tm4uZCYmW1wiZGRcIix1XXx8bDw9MSYmW1wiTVwiXXx8bDxObi5NJiZbXCJNTVwiLGxdfHxkPD0xJiZbXCJ5XCJdfHxbXCJ5eVwiLGRdKVsyXT1uLGhbM109MDwrdCxoWzRdPXMsZnVuY3Rpb24oZSx0LG4scyxpKXtyZXR1cm4gaS5yZWxhdGl2ZVRpbWUodHx8MSwhIW4sZSxzKX0uYXBwbHkobnVsbCxoKSk7cmV0dXJuIGUmJihmPWMucGFzdEZ1dHVyZSgrdGhpcyxmKSksYy5wb3N0Zm9ybWF0KGYpfSxJbi50b0lTT1N0cmluZz1FbixJbi50b1N0cmluZz1FbixJbi50b0pTT049RW4sSW4ubG9jYWxlPVF0LEluLmxvY2FsZURhdGE9S3QsSW4udG9Jc29TdHJpbmc9bihcInRvSXNvU3RyaW5nKCkgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSB0b0lTT1N0cmluZygpIGluc3RlYWQgKG5vdGljZSB0aGUgY2FwaXRhbHMpXCIsRW4pLEluLmxhbmc9WHQsSShcIlhcIiwwLDAsXCJ1bml4XCIpLEkoXCJ4XCIsMCwwLFwidmFsdWVPZlwiKSx1ZShcInhcIixzZSksdWUoXCJYXCIsL1srLV0/XFxkKyhcXC5cXGR7MSwzfSk/LyksY2UoXCJYXCIsZnVuY3Rpb24oZSx0LG4pe24uX2Q9bmV3IERhdGUoMWUzKnBhcnNlRmxvYXQoZSwxMCkpfSksY2UoXCJ4XCIsZnVuY3Rpb24oZSx0LG4pe24uX2Q9bmV3IERhdGUoayhlKSl9KSxjLnZlcnNpb249XCIyLjIyLjJcIixlPVR0LGMuZm49bG4sYy5taW49ZnVuY3Rpb24oKXtyZXR1cm4gUHQoXCJpc0JlZm9yZVwiLFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKX0sYy5tYXg9ZnVuY3Rpb24oKXtyZXR1cm4gUHQoXCJpc0FmdGVyXCIsW10uc2xpY2UuY2FsbChhcmd1bWVudHMsMCkpfSxjLm5vdz1mdW5jdGlvbigpe3JldHVybiBEYXRlLm5vdz9EYXRlLm5vdygpOituZXcgRGF0ZX0sYy51dGM9eSxjLnVuaXg9ZnVuY3Rpb24oZSl7cmV0dXJuIFR0KDFlMyplKX0sYy5tb250aHM9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZm4oZSx0LFwibW9udGhzXCIpfSxjLmlzRGF0ZT1oLGMubG9jYWxlPW90LGMuaW52YWxpZD12LGMuZHVyYXRpb249QXQsYy5pc01vbWVudD1TLGMud2Vla2RheXM9ZnVuY3Rpb24oZSx0LG4pe3JldHVybiBtbihlLHQsbixcIndlZWtkYXlzXCIpfSxjLnBhcnNlWm9uZT1mdW5jdGlvbigpe3JldHVybiBUdC5hcHBseShudWxsLGFyZ3VtZW50cykucGFyc2Vab25lKCl9LGMubG9jYWxlRGF0YT1sdCxjLmlzRHVyYXRpb249UnQsYy5tb250aHNTaG9ydD1mdW5jdGlvbihlLHQpe3JldHVybiBmbihlLHQsXCJtb250aHNTaG9ydFwiKX0sYy53ZWVrZGF5c01pbj1mdW5jdGlvbihlLHQsbil7cmV0dXJuIG1uKGUsdCxuLFwid2Vla2RheXNNaW5cIil9LGMuZGVmaW5lTG9jYWxlPXV0LGMudXBkYXRlTG9jYWxlPWZ1bmN0aW9uKGUsdCl7aWYobnVsbCE9dCl7dmFyIG4scyxpPW50O251bGwhPShzPWF0KGUpKSYmKGk9cy5fY29uZmlnKSwobj1uZXcgUCh0PWIoaSx0KSkpLnBhcmVudExvY2FsZT1zdFtlXSxzdFtlXT1uLG90KGUpfWVsc2UgbnVsbCE9c3RbZV0mJihudWxsIT1zdFtlXS5wYXJlbnRMb2NhbGU/c3RbZV09c3RbZV0ucGFyZW50TG9jYWxlOm51bGwhPXN0W2VdJiZkZWxldGUgc3RbZV0pO3JldHVybiBzdFtlXX0sYy5sb2NhbGVzPWZ1bmN0aW9uKCl7cmV0dXJuIHMoc3QpfSxjLndlZWtkYXlzU2hvcnQ9ZnVuY3Rpb24oZSx0LG4pe3JldHVybiBtbihlLHQsbixcIndlZWtkYXlzU2hvcnRcIil9LGMubm9ybWFsaXplVW5pdHM9UixjLnJlbGF0aXZlVGltZVJvdW5kaW5nPWZ1bmN0aW9uKGUpe3JldHVybiB2b2lkIDA9PT1lP1VuOlwiZnVuY3Rpb25cIj09dHlwZW9mIGUmJihVbj1lLCEwKX0sYy5yZWxhdGl2ZVRpbWVUaHJlc2hvbGQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdm9pZCAwIT09Tm5bZV0mJih2b2lkIDA9PT10P05uW2VdOihObltlXT10LFwic1wiPT09ZSYmKE5uLnNzPXQtMSksITApKX0sYy5jYWxlbmRhckZvcm1hdD1mdW5jdGlvbihlLHQpe3ZhciBuPWUuZGlmZih0LFwiZGF5c1wiLCEwKTtyZXR1cm4gbjwtNj9cInNhbWVFbHNlXCI6bjwtMT9cImxhc3RXZWVrXCI6bjwwP1wibGFzdERheVwiOm48MT9cInNhbWVEYXlcIjpuPDI/XCJuZXh0RGF5XCI6bjw3P1wibmV4dFdlZWtcIjpcInNhbWVFbHNlXCJ9LGMucHJvdG90eXBlPWxuLGMuSFRNTDVfRk1UPXtEQVRFVElNRV9MT0NBTDpcIllZWVktTU0tRERUSEg6bW1cIixEQVRFVElNRV9MT0NBTF9TRUNPTkRTOlwiWVlZWS1NTS1ERFRISDptbTpzc1wiLERBVEVUSU1FX0xPQ0FMX01TOlwiWVlZWS1NTS1ERFRISDptbTpzcy5TU1NcIixEQVRFOlwiWVlZWS1NTS1ERFwiLFRJTUU6XCJISDptbVwiLFRJTUVfU0VDT05EUzpcIkhIOm1tOnNzXCIsVElNRV9NUzpcIkhIOm1tOnNzLlNTU1wiLFdFRUs6XCJZWVlZLVtXXVdXXCIsTU9OVEg6XCJZWVlZLU1NXCJ9LGN9KTsiLCIvKipcbiAqIFJlZ2lzdGVyIHNlcnZpY2Ugd29ya2VyXG4gKi9cblxucmVnaXN0ZXJTZXJ2aWNlV29ya2VyID0gKCkgPT4ge1xuICAgIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHJldHVybjtcblxuICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKCcvc3cuanMnKS50aGVuKHJlZyA9PiB7XG4gICAgICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIpIHJldHVybjtcblxuICAgICAgaWYgKHJlZy53YWl0aW5nKSB7XG4gICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVnLmluc3RhbGxpbmcpIHtcbiAgICAgICAgdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZWcuYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlZm91bmQnLCAoKSA9PiB0cmFja0luc3RhbGxpbmcocmVnLmluc3RhbGxpbmcpKTtcbiAgICB9KTtcblxuICAgIGxldCByZWZyZXNoaW5nO1xuICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRyb2xsZXJjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpZihyZWZyZXNoaW5nKSByZXR1cm47XG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICByZWZyZXNoaW5nID0gdHJ1ZTtcbiAgICB9KVxufVxuXG51cGRhdGVSZWFkeSA9ICh3b3JrZXIpID0+IHtcbiAgY29uc3QgdG9hc3QgPSBUb2FzdC5jcmVhdGUoe1xuICAgIHRleHQ6IFwiTmV3IHZlcnNpb24gYXZhaWxhYmxlLlwiLFxuICAgIGJ1dHRvbjogXCJSZWZyZXNoXCIsXG4gICAgY2FsbGJhY2s6IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB3b3JrZXIucG9zdE1lc3NhZ2Uoe2FjdGlvbjogJ3NraXBXYWl0aW5nJ30pO1xuICAgIH1cbiAgfSk7XG59XG5cbnRyYWNrSW5zdGFsbGluZyA9ICh3b3JrZXIpID0+IHtcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBpZiAod29ya2VyLnN0YXRlID09PSAnaW5zdGFsbGVkJykge1xuICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xuICAgICAgfVxuICAgIH0pO1xufSIsIi8qKlxuICogQGF1dGhvciBodHRwczovL2dpdGh1Yi5jb20vQWxleEt2YXpvcy9WYW5pbGxhVG9hc3RzL2Jsb2IvbWFzdGVyL3ZhbmlsbGF0b2FzdHMuanNcbiAqL1xuXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIHRyeSB7XG4gICAgLy8gY29tbW9uanNcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICAvLyBnbG9iYWxcbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdC5Ub2FzdCA9IGZhY3RvcnkoKTtcbiAgICB9XG4gIH0gY2F0Y2goZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZygnSXNvbW9ycGhpYyBjb21wYXRpYmlsaXR5IGlzIG5vdCBzdXBwb3J0ZWQgYXQgdGhpcyB0aW1lIGZvciBUb2FzdC4nKVxuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpIHtcblxuICAvLyBXZSBuZWVkIERPTSB0byBiZSByZWFkeVxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgIGluaXQoKTtcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGluaXQpO1xuICB9XG5cbiAgLy8gQ3JlYXRlIFRvYXN0IG9iamVjdFxuICBUb2FzdCA9IHtcbiAgICAvLyBJbiBjYXNlIHRvYXN0IGNyZWF0aW9uIGlzIGF0dGVtcHRlZCBiZWZvcmUgZG9tIGhhcyBmaW5pc2hlZCBsb2FkaW5nIVxuICAgIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFtcbiAgICAgICAgJ0RPTSBoYXMgbm90IGZpbmlzaGVkIGxvYWRpbmcuJyxcbiAgICAgICAgJ1xcdEludm9rZSBjcmVhdGUgbWV0aG9kIHdoZW4gRE9NXFxzIHJlYWR5U3RhdGUgaXMgY29tcGxldGUnXG4gICAgICBdLmpvaW4oJ1xcbicpKVxuICAgIH0sXG4gICAgLy9mdW5jdGlvbiB0byBtYW51YWxseSBzZXQgdGltZW91dCBhZnRlciBjcmVhdGVcbiAgICBzZXRUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoW1xuICAgICAgICAnRE9NIGhhcyBub3QgZmluaXNoZWQgbG9hZGluZy4nLFxuICAgICAgICAnXFx0SW52b2tlIGNyZWF0ZSBtZXRob2Qgd2hlbiBET01cXHMgcmVhZHlTdGF0ZSBpcyBjb21wbGV0ZSdcbiAgICAgIF0uam9pbignXFxuJykpXG4gICAgfSxcbiAgICB0b2FzdHM6IHt9IC8vc3RvcmUgdG9hc3RzIHRvIG1vZGlmeSBsYXRlclxuICB9O1xuICB2YXIgYXV0b2luY3JlbWVudCA9IDA7XG5cbiAgLy8gSW5pdGlhbGl6ZSBsaWJyYXJ5XG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gVG9hc3QgY29udGFpbmVyXG4gICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnRhaW5lci5pZCA9ICd0b2FzdC1jb250YWluZXInO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcblxuICAgIC8vIEBPdmVycmlkZVxuICAgIC8vIFJlcGxhY2UgY3JlYXRlIG1ldGhvZCB3aGVuIERPTSBoYXMgZmluaXNoZWQgbG9hZGluZ1xuICAgIFRvYXN0LmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHZhciB0b2FzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdG9hc3QuaWQgPSArK2F1dG9pbmNyZW1lbnQ7XG4gICAgICB0b2FzdC5pZCA9ICd0b2FzdC0nICsgdG9hc3QuaWQ7XG4gICAgICB0b2FzdC5jbGFzc05hbWUgPSAndG9hc3QnO1xuXG4gICAgICAvLyB0aXRsZVxuICAgICAgaWYgKG9wdGlvbnMudGl0bGUpIHtcbiAgICAgICAgdmFyIGg0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgICAgICAgaDQuY2xhc3NOYW1lID0gJ3RvYXN0LXRpdGxlJztcbiAgICAgICAgaDQuaW5uZXJIVE1MID0gb3B0aW9ucy50aXRsZTtcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoaDQpO1xuICAgICAgfVxuXG4gICAgICAvLyB0ZXh0XG4gICAgICBpZiAob3B0aW9ucy50ZXh0KSB7XG4gICAgICAgIHZhciBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICBwLmNsYXNzTmFtZSA9ICd0b2FzdC10ZXh0JztcbiAgICAgICAgcC5pbm5lckhUTUwgPSBvcHRpb25zLnRleHQ7XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKHApO1xuICAgICAgfVxuXG4gICAgICAvLyBpY29uXG4gICAgICBpZiAob3B0aW9ucy5pY29uKSB7XG4gICAgICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICAgICAgaW1nLnNyYyA9IG9wdGlvbnMuaWNvbjtcbiAgICAgICAgaW1nLmNsYXNzTmFtZSA9ICd0b2FzdC1pY29uJztcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgICAgIH1cblxuICAgICAgLy8gYnV0dG9uXG4gICAgICBpZiAob3B0aW9ucy5idXR0b24pIHtcbiAgICAgICAgdmFyIGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICBidXR0b24uY2xhc3NOYW1lID0gJ3RvYXN0LWJ1dHRvbic7XG4gICAgICAgIGJ1dHRvbi5pbm5lckhUTUwgPSBvcHRpb25zLmJ1dHRvbjtcbiAgICAgICAgdG9hc3QuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gY2xpY2sgY2FsbGJhY2tcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0b2FzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG9wdGlvbnMuY2FsbGJhY2spO1xuICAgICAgfVxuXG4gICAgICAvLyB0b2FzdCBhcGlcbiAgICAgIHRvYXN0LmhpZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdG9hc3QuY2xhc3NOYW1lICs9ICcgdG9hc3QtZmFkZW91dCc7XG4gICAgICAgIHRvYXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbmVuZCcsIHJlbW92ZVRvYXN0LCBmYWxzZSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBhdXRvaGlkZVxuICAgICAgaWYgKG9wdGlvbnMudGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KHRvYXN0LmhpZGUsIG9wdGlvbnMudGltZW91dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLnR5cGUpIHtcbiAgICAgICAgdG9hc3QuY2xhc3NOYW1lICs9ICcgdG9hc3QtJyArIG9wdGlvbnMudHlwZTtcbiAgICAgIH1cblxuICAgICAgdG9hc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0b2FzdC5oaWRlKTtcblxuXG4gICAgICBmdW5jdGlvbiByZW1vdmVUb2FzdCgpIHtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvYXN0LWNvbnRhaW5lcicpLnJlbW92ZUNoaWxkKHRvYXN0KTtcbiAgICAgICAgZGVsZXRlIFRvYXN0LnRvYXN0c1t0b2FzdC5pZF07ICAvL3JlbW92ZSB0b2FzdCBmcm9tIG9iamVjdFxuICAgICAgfVxuXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9hc3QtY29udGFpbmVyJykuYXBwZW5kQ2hpbGQodG9hc3QpO1xuXG4gICAgICAvL2FkZCB0b2FzdCB0byBvYmplY3Qgc28gaXRzIGVhc2lseSBnZXR0YWJsZSBieSBpdHMgaWRcbiAgICAgIFRvYXN0LnRvYXN0c1t0b2FzdC5pZF0gPSB0b2FzdDtcblxuICAgICAgcmV0dXJuIHRvYXN0O1xuICAgIH1cblxuICAgIC8qXG4gICAgY3VzdG9tIGZ1bmN0aW9uIHRvIG1hbnVhbGx5IGluaXRpYXRlIHRpbWVvdXQgb2ZcbiAgICB0aGUgdG9hc3QuICBVc2VmdWwgaWYgdG9hc3QgaXMgY3JlYXRlZCBhcyBwZXJzaXN0YW50XG4gICAgYmVjYXVzZSB3ZSBkb24ndCB3YW50IGl0IHRvIHN0YXJ0IHRvIHRpbWVvdXQgdW50aWxcbiAgICB3ZSB0ZWxsIGl0IHRvXG4gICAgKi9cbiAgICBUb2FzdC5zZXRUaW1lb3V0ID0gZnVuY3Rpb24odG9hc3RpZCwgdmFsKSB7XG4gICAgICBpZihUb2FzdC50b2FzdHNbdG9hc3RpZF0pe1xuICAgICAgICBzZXRUaW1lb3V0KFRvYXN0LnRvYXN0c1t0b2FzdGlkXS5oaWRlLCB2YWwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBUb2FzdDtcblxufSk7Il19
