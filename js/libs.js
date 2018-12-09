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
  /**
   * Favorite a restaurant
   */


  static favoriteRestaurant(restaurant) {
    openDatabase().then(db => {
      let store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      store.put(restaurant, restaurant.id);
      fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`, {
        method: 'PUT'
      }).then(response => response.json()).then(restaurant => {
        store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
        store.put(restaurant, restaurant.id);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyLmpzIiwiaWRiLmpzIiwibW9tZW50Lm1pbi5qcyIsInNlcnZpY2Utd29ya2VyLmpzIiwidG9hc3QuanMiXSwibmFtZXMiOlsiREJIZWxwZXIiLCJmZXRjaFJlc3RhdXJhbnRzIiwiY2FsbGJhY2siLCJvcGVuRGF0YWJhc2UiLCJ0aGVuIiwiZGIiLCJzdG9yZSIsInRyYW5zYWN0aW9uIiwib2JqZWN0U3RvcmUiLCJnZXRBbGwiLCJyZXN0YXVyYW50cyIsImxlbmd0aCIsImZldGNoIiwicmVzcG9uc2UiLCJqc29uIiwiZm9yRWFjaCIsInJlc3RhdXJhbnQiLCJwdXQiLCJjYXRjaCIsImVycm9yIiwiZmV0Y2hSZXN0YXVyYW50QnlJZCIsImlkIiwicGFyc2VJbnQiLCJnZXQiLCJmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmUiLCJjdWlzaW5lIiwicmVzdWx0cyIsImZpbHRlciIsInIiLCJjdWlzaW5lX3R5cGUiLCJmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZCIsIm5laWdoYm9yaG9vZCIsImZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZCIsImZldGNoTmVpZ2hib3Job29kcyIsIm5laWdoYm9yaG9vZHMiLCJtYXAiLCJ2IiwiaSIsInVuaXF1ZU5laWdoYm9yaG9vZHMiLCJpbmRleE9mIiwiZmV0Y2hDdWlzaW5lcyIsImN1aXNpbmVzIiwidW5pcXVlQ3Vpc2luZXMiLCJ1cmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VVcmxGb3JSZXN0YXVyYW50IiwiaW1hZ2VOYW1lRm9yUmVzdGF1cmFudCIsInBob3RvZ3JhcGgiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50IiwibWFya2VyIiwiTCIsImxhdGxuZyIsImxhdCIsImxuZyIsInRpdGxlIiwibmFtZSIsImFsdCIsInVybCIsImFkZFRvIiwibmV3TWFwIiwidXBkYXRlUmVzdGF1cmFudFJldmlld3MiLCJzeW5jUmV2aWV3cyIsInJldmlld3MiLCJyZXZpZXciLCJzeW5jZWQiLCJzeW5jUmV2aWV3IiwicmVzdGF1cmFudF9pZCIsIm1ldGhvZCIsImhlYWRlcnMiLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsInJhdGluZyIsImNvbW1lbnRzIiwiZmV0Y2hSZXN0YXVyYW50UmV2aWV3c0J5SWQiLCJyZXZpZXdzQXJyYXkiLCJwdXNoIiwiZGF0ZSIsIm1vbWVudCIsImNyZWF0ZWRBdCIsImZvcm1hdCIsImZhdm9yaXRlUmVzdGF1cmFudCIsImlzX2Zhdm9yaXRlIiwiaW1hZ2VVcmxCYXNlUGF0aCIsImlkYiIsIm9wZW4iLCJ1cGdyYWRlREIiLCJjcmVhdGVPYmplY3RTdG9yZSIsInRvQXJyYXkiLCJhcnIiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsInByb21pc2lmeVJlcXVlc3QiLCJyZXF1ZXN0IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvbnN1Y2Nlc3MiLCJyZXN1bHQiLCJvbmVycm9yIiwicHJvbWlzaWZ5UmVxdWVzdENhbGwiLCJvYmoiLCJhcmdzIiwicCIsImFwcGx5IiwicHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwiLCJ2YWx1ZSIsIkN1cnNvciIsInByb3h5UHJvcGVydGllcyIsIlByb3h5Q2xhc3MiLCJ0YXJnZXRQcm9wIiwicHJvcGVydGllcyIsInByb3AiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsInNldCIsInZhbCIsInByb3h5UmVxdWVzdE1ldGhvZHMiLCJDb25zdHJ1Y3RvciIsImFyZ3VtZW50cyIsInByb3h5TWV0aG9kcyIsInByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMiLCJJbmRleCIsImluZGV4IiwiX2luZGV4IiwiSURCSW5kZXgiLCJjdXJzb3IiLCJfY3Vyc29yIiwiX3JlcXVlc3QiLCJJREJDdXJzb3IiLCJtZXRob2ROYW1lIiwiT2JqZWN0U3RvcmUiLCJfc3RvcmUiLCJjcmVhdGVJbmRleCIsIklEQk9iamVjdFN0b3JlIiwiVHJhbnNhY3Rpb24iLCJpZGJUcmFuc2FjdGlvbiIsIl90eCIsImNvbXBsZXRlIiwib25jb21wbGV0ZSIsIm9uYWJvcnQiLCJJREJUcmFuc2FjdGlvbiIsIlVwZ3JhZGVEQiIsIm9sZFZlcnNpb24iLCJfZGIiLCJJREJEYXRhYmFzZSIsIkRCIiwiZnVuY05hbWUiLCJyZXBsYWNlIiwibmF0aXZlT2JqZWN0IiwicXVlcnkiLCJjb3VudCIsImluc3RhbmNlIiwiaXRlbXMiLCJpdGVyYXRlQ3Vyc29yIiwidW5kZWZpbmVkIiwiY29udGludWUiLCJleHAiLCJ2ZXJzaW9uIiwidXBncmFkZUNhbGxiYWNrIiwiaW5kZXhlZERCIiwib251cGdyYWRlbmVlZGVkIiwiZXZlbnQiLCJkZWxldGUiLCJtb2R1bGUiLCJleHBvcnRzIiwiZGVmYXVsdCIsInNlbGYiLCJlIiwidCIsImRlZmluZSIsImFtZCIsImMiLCJvIiwidG9TdHJpbmciLCJ1IiwibCIsImQiLCJoIiwiRGF0ZSIsImYiLCJuIiwicyIsIm0iLCJoYXNPd25Qcm9wZXJ0eSIsIl8iLCJ2YWx1ZU9mIiwieSIsIk90IiwidXRjIiwiZyIsIl9wZiIsImVtcHR5IiwidW51c2VkVG9rZW5zIiwidW51c2VkSW5wdXQiLCJvdmVyZmxvdyIsImNoYXJzTGVmdE92ZXIiLCJudWxsSW5wdXQiLCJpbnZhbGlkTW9udGgiLCJpbnZhbGlkRm9ybWF0IiwidXNlckludmFsaWRhdGVkIiwiaXNvIiwicGFyc2VkRGF0ZVBhcnRzIiwibWVyaWRpZW0iLCJyZmMyODIyIiwid2Vla2RheU1pc21hdGNoIiwiX2lzVmFsaWQiLCJpc05hTiIsIl9kIiwiZ2V0VGltZSIsImludmFsaWRXZWVrZGF5IiwiX3N0cmljdCIsImJpZ0hvdXIiLCJpc0Zyb3plbiIsIk5hTiIsInNvbWUiLCJtb21lbnRQcm9wZXJ0aWVzIiwidyIsIl9pc0FNb21lbnRPYmplY3QiLCJfaSIsIl9mIiwiX2wiLCJfdHptIiwiX2lzVVRDIiwiX29mZnNldCIsIl9sb2NhbGUiLCJNIiwiaXNWYWxpZCIsInVwZGF0ZU9mZnNldCIsIlMiLCJEIiwiTWF0aCIsImNlaWwiLCJmbG9vciIsImsiLCJpc0Zpbml0ZSIsImEiLCJtaW4iLCJhYnMiLCJZIiwic3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzIiwiY29uc29sZSIsIndhcm4iLCJkZXByZWNhdGlvbkhhbmRsZXIiLCJqb2luIiwiRXJyb3IiLCJzdGFjayIsIk8iLCJUIiwieCIsIkZ1bmN0aW9uIiwiYiIsIlAiLCJrZXlzIiwiVyIsIkgiLCJ0b0xvd2VyQ2FzZSIsIlIiLCJDIiwiRiIsIlUiLCJwb3ciLCJtYXgiLCJzdWJzdHIiLCJOIiwiRyIsIlYiLCJFIiwiSSIsImxvY2FsZURhdGEiLCJvcmRpbmFsIiwiQSIsImoiLCJtYXRjaCIsImludmFsaWREYXRlIiwibG9uZ0RhdGVGb3JtYXQiLCJsYXN0SW5kZXgiLCJ0ZXN0IiwiWiIsInoiLCIkIiwicSIsIkoiLCJCIiwiUSIsIlgiLCJLIiwiZWUiLCJ0ZSIsIm5lIiwic2UiLCJpZSIsInJlIiwiYWUiLCJvZSIsInVlIiwibGUiLCJSZWdFeHAiLCJkZSIsImhlIiwiY2UiLCJmZSIsIl93IiwibWUiLCJfZSIsInllIiwiZ2UiLCJwZSIsInZlIiwid2UiLCJNZSIsIlNlIiwiRGUiLCJrZSIsInllYXIiLCJwYXJzZVR3b0RpZ2l0WWVhciIsIlllIiwiT2UiLCJUZSIsImJlIiwieGUiLCJtb250aCIsIlBlIiwibW9udGhzU2hvcnQiLCJtb250aHMiLCJtb250aHNTaG9ydFJlZ2V4IiwibW9udGhzUmVnZXgiLCJtb250aHNQYXJzZSIsIldlIiwiSGUiLCJzcGxpdCIsIlJlIiwiQ2UiLCJGZSIsIkxlIiwiVWUiLCJOZSIsInNvcnQiLCJfbW9udGhzUmVnZXgiLCJfbW9udGhzU2hvcnRSZWdleCIsIl9tb250aHNTdHJpY3RSZWdleCIsIl9tb250aHNTaG9ydFN0cmljdFJlZ2V4IiwiR2UiLCJVVEMiLCJnZXRVVENGdWxsWWVhciIsInNldFVUQ0Z1bGxZZWFyIiwiVmUiLCJnZXRVVENEYXkiLCJFZSIsImRheU9mWWVhciIsIkllIiwiQWUiLCJ3ZWVrIiwid2Vla2RheXNNaW4iLCJ3ZWVrZGF5c1Nob3J0Iiwid2Vla2RheXMiLCJ3ZWVrZGF5c01pblJlZ2V4Iiwid2Vla2RheXNTaG9ydFJlZ2V4Iiwid2Vla2RheXNSZWdleCIsIndlZWtkYXlzUGFyc2UiLCJqZSIsIlplIiwiemUiLCIkZSIsInFlIiwiSmUiLCJCZSIsImRheSIsIl93ZWVrZGF5c1JlZ2V4IiwiX3dlZWtkYXlzU2hvcnRSZWdleCIsIl93ZWVrZGF5c01pblJlZ2V4IiwiX3dlZWtkYXlzU3RyaWN0UmVnZXgiLCJfd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4IiwiX3dlZWtkYXlzTWluU3RyaWN0UmVnZXgiLCJRZSIsImhvdXJzIiwiWGUiLCJtaW51dGVzIiwiS2UiLCJfbWVyaWRpZW1QYXJzZSIsInNlY29uZHMiLCJfaXNQbSIsImlzUE0iLCJfbWVyaWRpZW0iLCJldCIsInR0IiwibnQiLCJjYWxlbmRhciIsInNhbWVEYXkiLCJuZXh0RGF5IiwibmV4dFdlZWsiLCJsYXN0RGF5IiwibGFzdFdlZWsiLCJzYW1lRWxzZSIsIkxUUyIsIkxUIiwiTEwiLCJMTEwiLCJMTExMIiwiZGF5T2ZNb250aE9yZGluYWxQYXJzZSIsInJlbGF0aXZlVGltZSIsImZ1dHVyZSIsInBhc3QiLCJzcyIsIm1tIiwiaGgiLCJkZCIsIk1NIiwieXkiLCJkb3ciLCJkb3kiLCJtZXJpZGllbVBhcnNlIiwic3QiLCJpdCIsInJ0IiwiYXQiLCJfYWJiciIsInJlcXVpcmUiLCJvdCIsImx0IiwidXQiLCJhYmJyIiwiX2NvbmZpZyIsInBhcmVudExvY2FsZSIsImNvbmZpZyIsImR0IiwiX2EiLCJfb3ZlcmZsb3dEYXlPZlllYXIiLCJfb3ZlcmZsb3dXZWVrcyIsIl9vdmVyZmxvd1dlZWtkYXkiLCJodCIsImN0Iiwibm93IiwiX3VzZVVUQyIsImdldFVUQ01vbnRoIiwiZ2V0VVRDRGF0ZSIsImdldEZ1bGxZZWFyIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiR0ciLCJUdCIsIl93ZWVrIiwiZ2ciLCJfZGF5T2ZZZWFyIiwiX25leHREYXkiLCJzZXRGdWxsWWVhciIsImdldERheSIsInNldFVUQ01pbnV0ZXMiLCJnZXRVVENNaW51dGVzIiwiZnQiLCJtdCIsIl90IiwieXQiLCJndCIsInB0IiwidnQiLCJleGVjIiwia3QiLCJ3dCIsIk10IiwiU3QiLCJVVCIsIkdNVCIsIkVEVCIsIkVTVCIsIkNEVCIsIkNTVCIsIk1EVCIsIk1TVCIsIlBEVCIsIlBTVCIsIkR0IiwiSVNPXzg2MDEiLCJSRkNfMjgyMiIsIm1lcmlkaWVtSG91ciIsIll0IiwicHJlcGFyc2UiLCJzY29yZSIsImNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrIiwiaG91ciIsIm1pbnV0ZSIsInNlY29uZCIsIm1pbGxpc2Vjb25kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImFkZCIsInh0IiwiYnQiLCJQdCIsIld0IiwiSHQiLCJxdWFydGVyIiwicGFyc2VGbG9hdCIsIl9taWxsaXNlY29uZHMiLCJfZGF5cyIsIl9tb250aHMiLCJfZGF0YSIsIl9idWJibGUiLCJSdCIsIkN0Iiwicm91bmQiLCJGdCIsInV0Y09mZnNldCIsIlV0IiwiTHQiLCJOdCIsImNsb25lIiwic2V0VGltZSIsImxvY2FsIiwiR3QiLCJnZXRUaW1lem9uZU9mZnNldCIsIlZ0IiwiRXQiLCJJdCIsIkF0IiwibXMiLCJtaWxsaXNlY29uZHMiLCJqdCIsImlzQmVmb3JlIiwiWnQiLCJmcm9tIiwidG8iLCJpc0FmdGVyIiwienQiLCIkdCIsImZuIiwiaW52YWxpZCIsInF0IiwiSnQiLCJCdCIsIlF0IiwiZGVmYXVsdEZvcm1hdCIsImRlZmF1bHRGb3JtYXRVdGMiLCJYdCIsImxvY2FsZSIsIkt0IiwiZW4iLCJ0biIsIndlZWtZZWFyIiwiaXNvV2Vla1llYXIiLCJfZGF5T2ZNb250aE9yZGluYWxQYXJzZSIsIl9vcmRpbmFsUGFyc2UiLCJfZGF5T2ZNb250aE9yZGluYWxQYXJzZUxlbmllbnQiLCJubiIsInNuIiwicm4iLCJhbiIsIm9uIiwidW4iLCJsbiIsImRuIiwic3RhcnRPZiIsImNhbGVuZGFyRm9ybWF0IiwiZGlmZiIsImVuZE9mIiwic3VidHJhY3QiLCJpc1V0YyIsInBvc3Rmb3JtYXQiLCJodW1hbml6ZSIsImZyb21Ob3ciLCJ0b05vdyIsImludmFsaWRBdCIsImlzQmV0d2VlbiIsImlzU2FtZSIsImlzU2FtZU9yQWZ0ZXIiLCJpc1NhbWVPckJlZm9yZSIsImxhbmciLCJwYXJzaW5nRmxhZ3MiLCJ1bml0IiwicHJpb3JpdHkiLCJ3ZWVrZGF5IiwiaXNvV2Vla2RheSIsInRvT2JqZWN0IiwieWVhcnMiLCJ0b0RhdGUiLCJ0b0lTT1N0cmluZyIsImluc3BlY3QiLCJpc0xvY2FsIiwidG9KU09OIiwidW5peCIsImNyZWF0aW9uRGF0YSIsImlucHV0IiwiaXNVVEMiLCJzdHJpY3QiLCJpc0xlYXBZZWFyIiwiaXNvV2VlayIsInF1YXJ0ZXJzIiwiZGF5c0luTW9udGgiLCJ3ZWVrcyIsImlzb1dlZWtzIiwid2Vla3NJblllYXIiLCJpc29XZWVrc0luWWVhciIsImRheXMiLCJfY2hhbmdlSW5Qcm9ncmVzcyIsInBhcnNlWm9uZSIsImhhc0FsaWduZWRIb3VyT2Zmc2V0IiwiaXNEU1QiLCJpc1V0Y09mZnNldCIsInpvbmVBYmJyIiwiem9uZU5hbWUiLCJkYXRlcyIsInpvbmUiLCJpc0RTVFNoaWZ0ZWQiLCJfaXNEU1RTaGlmdGVkIiwiaG4iLCJjbiIsIm1uIiwiX2NhbGVuZGFyIiwiX2xvbmdEYXRlRm9ybWF0IiwidG9VcHBlckNhc2UiLCJfaW52YWxpZERhdGUiLCJfb3JkaW5hbCIsIl9yZWxhdGl2ZVRpbWUiLCJwYXN0RnV0dXJlIiwic291cmNlIiwiaXNGb3JtYXQiLCJzdGFuZGFsb25lIiwiX21vbnRoc1Nob3J0IiwiX21vbnRoc1BhcnNlRXhhY3QiLCJ0b0xvY2FsZUxvd2VyQ2FzZSIsIl9tb250aHNQYXJzZSIsIl9sb25nTW9udGhzUGFyc2UiLCJfc2hvcnRNb250aHNQYXJzZSIsImZpcnN0RGF5T2ZZZWFyIiwiZmlyc3REYXlPZldlZWsiLCJfd2Vla2RheXMiLCJfd2Vla2RheXNNaW4iLCJfd2Vla2RheXNTaG9ydCIsIl93ZWVrZGF5c1BhcnNlRXhhY3QiLCJfd2Vla2RheXNQYXJzZSIsIl9zaG9ydFdlZWtkYXlzUGFyc2UiLCJfbWluV2Vla2RheXNQYXJzZSIsIl9mdWxsV2Vla2RheXNQYXJzZSIsImNoYXJBdCIsImxhbmdEYXRhIiwiX24iLCJ5biIsImduIiwicG4iLCJ2biIsInduIiwiYXMiLCJNbiIsIlNuIiwiRG4iLCJrbiIsIlluIiwiT24iLCJUbiIsInhuIiwiYm4iLCJQbiIsIlduIiwiSG4iLCJSbiIsIkNuIiwiRm4iLCJMbiIsIlVuIiwiTm4iLCJHbiIsIlZuIiwiRW4iLCJ0b0ZpeGVkIiwiYXNTZWNvbmRzIiwiSW4iLCJhc01pbGxpc2Vjb25kcyIsImFzTWludXRlcyIsImFzSG91cnMiLCJhc0RheXMiLCJhc1dlZWtzIiwiYXNNb250aHMiLCJhc1llYXJzIiwidG9Jc29TdHJpbmciLCJpc0RhdGUiLCJkdXJhdGlvbiIsImlzTW9tZW50IiwiaXNEdXJhdGlvbiIsImRlZmluZUxvY2FsZSIsInVwZGF0ZUxvY2FsZSIsImxvY2FsZXMiLCJub3JtYWxpemVVbml0cyIsInJlbGF0aXZlVGltZVJvdW5kaW5nIiwicmVsYXRpdmVUaW1lVGhyZXNob2xkIiwiSFRNTDVfRk1UIiwiREFURVRJTUVfTE9DQUwiLCJEQVRFVElNRV9MT0NBTF9TRUNPTkRTIiwiREFURVRJTUVfTE9DQUxfTVMiLCJEQVRFIiwiVElNRSIsIlRJTUVfU0VDT05EUyIsIlRJTUVfTVMiLCJXRUVLIiwiTU9OVEgiLCJyZWdpc3RlclNlcnZpY2VXb3JrZXIiLCJuYXZpZ2F0b3IiLCJzZXJ2aWNlV29ya2VyIiwicmVnaXN0ZXIiLCJyZWciLCJjb250cm9sbGVyIiwid2FpdGluZyIsInVwZGF0ZVJlYWR5IiwiaW5zdGFsbGluZyIsInRyYWNrSW5zdGFsbGluZyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZWZyZXNoaW5nIiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJ3b3JrZXIiLCJ0b2FzdCIsIlRvYXN0IiwiY3JlYXRlIiwidGV4dCIsImJ1dHRvbiIsInByZXZlbnREZWZhdWx0IiwicG9zdE1lc3NhZ2UiLCJhY3Rpb24iLCJzdGF0ZSIsInJvb3QiLCJmYWN0b3J5IiwibG9nIiwiZG9jdW1lbnQiLCJyZWFkeVN0YXRlIiwiaW5pdCIsInNldFRpbWVvdXQiLCJ0b2FzdHMiLCJhdXRvaW5jcmVtZW50IiwiY29udGFpbmVyIiwiY3JlYXRlRWxlbWVudCIsImFwcGVuZENoaWxkIiwib3B0aW9ucyIsImNsYXNzTmFtZSIsImg0IiwiaW5uZXJIVE1MIiwiaWNvbiIsImltZyIsInNyYyIsImhpZGUiLCJyZW1vdmVUb2FzdCIsInRpbWVvdXQiLCJ0eXBlIiwiZ2V0RWxlbWVudEJ5SWQiLCJyZW1vdmVDaGlsZCIsInRvYXN0aWQiXSwibWFwcGluZ3MiOiJBQUFBOzs7QUFHQSxNQUFNQSxRQUFOLENBQWU7QUFFYjs7O0FBR0EsU0FBT0MsZ0JBQVAsQ0FBd0JDLFFBQXhCLEVBQWtDO0FBQ2hDQyxJQUFBQSxZQUFZLEdBQUdDLElBQWYsQ0FBb0JDLEVBQUUsSUFBSTtBQUN4QixVQUFJQyxLQUFLLEdBQUdELEVBQUUsQ0FBQ0UsV0FBSCxDQUFlLGFBQWYsRUFBOEJDLFdBQTlCLENBQTBDLGFBQTFDLENBQVo7QUFDQUYsTUFBQUEsS0FBSyxDQUFDRyxNQUFOLEdBQWVMLElBQWYsQ0FBb0JNLFdBQVcsSUFBSTtBQUNqQyxZQUFJQSxXQUFXLENBQUNDLE1BQVosSUFBc0IsQ0FBMUIsRUFBNkI7QUFDM0JDLFVBQUFBLEtBQUssQ0FBQyxtQ0FBRCxDQUFMLENBQ0NSLElBREQsQ0FDTVMsUUFBUSxJQUFJQSxRQUFRLENBQUNDLElBQVQsRUFEbEIsRUFFQ1YsSUFGRCxDQUVNTSxXQUFXLElBQUk7QUFDbkIsZ0JBQUlBLFdBQUosRUFBaUI7QUFDZkosY0FBQUEsS0FBSyxHQUFHRCxFQUFFLENBQUNFLFdBQUgsQ0FBZSxhQUFmLEVBQThCLFdBQTlCLEVBQTJDQyxXQUEzQyxDQUF1RCxhQUF2RCxDQUFSO0FBQ0FFLGNBQUFBLFdBQVcsQ0FBQ0ssT0FBWixDQUFvQkMsVUFBVSxJQUFJO0FBQ2hDVixnQkFBQUEsS0FBSyxDQUFD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Q1MsT0FBckIsQ0FBVjtBQUNEOztBQUVELFVBQUlULE9BQU8sQ0FBQ1UsSUFBWixFQUFrQjtBQUNoQi9CLFFBQUFBLEtBQUssQ0FBQ3NCLFNBQU4sSUFBbUIsWUFBWUQsT0FBTyxDQUFDVSxJQUF2QztBQUNEOztBQUVEL0IsTUFBQUEsS0FBSyxDQUFDTixnQkFBTixDQUF1QixPQUF2QixFQUFnQ00sS0FBSyxDQUFDNEIsSUFBdEM7O0FBR0EsZUFBU0MsV0FBVCxHQUF1QjtBQUNyQmpCLFFBQUFBLFFBQVEsQ0FBQ29CLGNBQVQsQ0FBd0IsaUJBQXhCLEVBQTJDQyxXQUEzQyxDQUF1RGpDLEtBQXZEO0FBQ0EsZUFBT0MsS0FBSyxDQUFDZSxNQUFOLENBQWFoQixLQUFLLENBQUNqckIsRUFBbkIsQ0FBUCxDQUZxQixDQUVXO0FBQ2pDOztBQUVENnJCLE1BQUFBLFFBQVEsQ0FBQ29CLGNBQVQsQ0FBd0IsaUJBQXhCLEVBQTJDWixXQUEzQyxDQUF1RHBCLEtBQXZELEVBbEUrQixDQW9FL0I7O0FBQ0FDLE1BQUFBLEtBQUssQ0FBQ2UsTUFBTixDQUFhaEIsS0FBSyxDQUFDanJCLEVBQW5CLElBQXlCaXJCLEtBQXpCO0FBRUEsYUFBT0EsS0FBUDtBQUNELEtBeEVEO0FBMEVBOzs7Ozs7OztBQU1BQyxJQUFBQSxLQUFLLENBQUNjLFVBQU4sR0FBbUIsVUFBU21CLE9BQVQsRUFBa0JubkIsR0FBbEIsRUFBdUI7QUFDeEMsVUFBR2tsQixLQUFLLENBQUNlLE1BQU4sQ0FBYWtCLE9BQWIsQ0FBSCxFQUF5QjtBQUN2Qm5CLFFBQUFBLFVBQVUsQ0FBQ2QsS0FBSyxDQUFDZSxNQUFOLENBQWFrQixPQUFiLEVBQXNCTixJQUF2QixFQUE2QjdtQixHQUE3QixDQUFWO0FBQ0Q7QUFDRixLQUpEO0FBS0Q7O0FBRUQsU0FBT2tsQixLQUFQO0FBRUQsQ0EzSUQiLCJmaWxlIjoibGlicy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDb21tb24gZGF0YWJhc2UgaGVscGVyIGZ1bmN0aW9ucy5cclxuICovXHJcbmNsYXNzIERCSGVscGVyIHtcclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIHJlc3RhdXJhbnRzLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRzKGNhbGxiYWNrKSB7XHJcbiAgICBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIHN0b3JlLmdldEFsbCgpLnRoZW4ocmVzdGF1cmFudHMgPT4ge1xyXG4gICAgICAgIGlmIChyZXN0YXVyYW50cy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgZmV0Y2goXCJodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHNcIilcclxuICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgIC50aGVuKHJlc3RhdXJhbnRzID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlc3RhdXJhbnRzKSB7XHJcbiAgICAgICAgICAgICAgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgICAgICAgICAgcmVzdGF1cmFudHMuZm9yRWFjaChyZXN0YXVyYW50ID0+IHtcclxuICAgICAgICAgICAgICAgIHN0b3JlLnB1dChyZXN0YXVyYW50LCByZXN0YXVyYW50WydpZCddKVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBmZXRjaCBhbGwgcmVzdGF1cmFudHMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQpO1xyXG4gICAgICBzdG9yZS5nZXQoaWQpLnRoZW4ocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgICBmZXRjaChgaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jlc3RhdXJhbnRzLyR7aWR9YClcclxuICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgIC50aGVuKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzdGF1cmFudCkge1xyXG4gICAgICAgICAgICAgIHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICAgICAgICAgIHN0b3JlLnB1dChyZXN0YXVyYW50LCBpZCk7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgXCJSZXN0YXVyYW50IGRvZXMgbm90IGV4aXN0XCIpO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgdHlwZSB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lKGN1aXNpbmUsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHMgIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZpbHRlciByZXN0YXVyYW50cyB0byBoYXZlIG9ubHkgZ2l2ZW4gY3Vpc2luZSB0eXBlXHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3RhdXJhbnRzLmZpbHRlcihyID0+IHIuY3Vpc2luZV90eXBlID09IGN1aXNpbmUpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZChuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRmlsdGVyIHJlc3RhdXJhbnRzIHRvIGhhdmUgb25seSBnaXZlbiBuZWlnaGJvcmhvb2RcclxuICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzdGF1cmFudHMuZmlsdGVyKHIgPT4gci5uZWlnaGJvcmhvb2QgPT0gbmVpZ2hib3Job29kKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgYW5kIGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QoY3Vpc2luZSwgbmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByZXN1bHRzID0gcmVzdGF1cmFudHNcclxuICAgICAgICBpZiAoY3Vpc2luZSAhPSAnYWxsJykgeyAvLyBmaWx0ZXIgYnkgY3Vpc2luZVxyXG4gICAgICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5jdWlzaW5lX3R5cGUgPT0gY3Vpc2luZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvcmhvb2QgIT0gJ2FsbCcpIHsgLy8gZmlsdGVyIGJ5IG5laWdoYm9yaG9vZFxyXG4gICAgICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5uZWlnaGJvcmhvb2QgPT0gbmVpZ2hib3Job29kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIG5laWdoYm9yaG9vZHMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoTmVpZ2hib3Job29kcyhjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBhbGwgbmVpZ2hib3Job29kcyBmcm9tIGFsbCByZXN0YXVyYW50c1xyXG4gICAgICAgIGNvbnN0IG5laWdoYm9yaG9vZHMgPSByZXN0YXVyYW50cy5tYXAoKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLm5laWdoYm9yaG9vZClcclxuICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIG5laWdoYm9yaG9vZHNcclxuICAgICAgICBjb25zdCB1bmlxdWVOZWlnaGJvcmhvb2RzID0gbmVpZ2hib3Job29kcy5maWx0ZXIoKHYsIGkpID0+IG5laWdoYm9yaG9vZHMuaW5kZXhPZih2KSA9PSBpKVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZU5laWdoYm9yaG9vZHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBjdWlzaW5lcyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hDdWlzaW5lcyhjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEdldCBhbGwgY3Vpc2luZXMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBjdWlzaW5lcyA9IHJlc3RhdXJhbnRzLm1hcCgodiwgaSkgPT4gcmVzdGF1cmFudHNbaV0uY3Vpc2luZV90eXBlKVxyXG4gICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGZyb20gY3Vpc2luZXNcclxuICAgICAgICBjb25zdCB1bmlxdWVDdWlzaW5lcyA9IGN1aXNpbmVzLmZpbHRlcigodiwgaSkgPT4gY3Vpc2luZXMuaW5kZXhPZih2KSA9PSBpKVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHVuaXF1ZUN1aXNpbmVzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IHBhZ2UgVVJMLlxyXG4gICAqL1xyXG4gIHN0YXRpYyB1cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC4vcmVzdGF1cmFudC5odG1sP2lkPSR7cmVzdGF1cmFudC5pZH1gKTtcclxuICB9XHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAvaW1nLyR7REJIZWxwZXIuaW1hZ2VOYW1lRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KX0tc21hbGwuanBnYCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIG5hbWUuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlTmFtZUZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgaWYgKHJlc3RhdXJhbnQucGhvdG9ncmFwaClcclxuICAgICAgcmV0dXJuIHJlc3RhdXJhbnQucGhvdG9ncmFwaDtcclxuICAgIHJldHVybiAnZGVmYXVsdCc7XHJcbiAgfVxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogTWFwIG1hcmtlciBmb3IgYSByZXN0YXVyYW50LlxyXG4gICAqL1xyXG4gICBzdGF0aWMgbWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBtYXApIHtcclxuICAgIC8vIGh0dHBzOi8vbGVhZmxldGpzLmNvbS9yZWZlcmVuY2UtMS4zLjAuaHRtbCNtYXJrZXIgIFxyXG4gICAgY29uc3QgbWFya2VyID0gbmV3IEwubWFya2VyKFtyZXN0YXVyYW50LmxhdGxuZy5sYXQsIHJlc3RhdXJhbnQubGF0bG5nLmxuZ10sXHJcbiAgICAgIHt0aXRsZTogcmVzdGF1cmFudC5uYW1lLFxyXG4gICAgICBhbHQ6IHJlc3RhdXJhbnQubmFtZSxcclxuICAgICAgdXJsOiBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpXHJcbiAgICAgIH0pXHJcbiAgICAgIG1hcmtlci5hZGRUbyhuZXdNYXApO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9IFxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgcmVzdGF1cmFudFxyXG4gICAqL1xyXG4gIHN0YXRpYyB1cGRhdGVSZXN0YXVyYW50UmV2aWV3cyhyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gb3BlbkRhdGFiYXNlKCkudGhlbihkYiA9PiB7XHJcbiAgICAgIGxldCBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgc3RvcmUucHV0KHJlc3RhdXJhbnQsIHJlc3RhdXJhbnQuaWQpO1xyXG4gICAgICBEQkhlbHBlci5zeW5jUmV2aWV3cygpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3luYyByZXZpZXdzIHdpdGggYmFja2VuZFxyXG4gICAqL1xyXG4gIHN0YXRpYyBzeW5jUmV2aWV3cygpIHtcclxuICAgIG9wZW5EYXRhYmFzZSgpLnRoZW4oZGIgPT4ge1xyXG4gICAgICBsZXQgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIHN0b3JlLmdldEFsbCgpLnRoZW4ocmVzdGF1cmFudHMgPT4ge1xyXG4gICAgICAgIGlmIChyZXN0YXVyYW50cy5sZW5ndGggPT09IDApIHJldHVybjtcclxuICAgICAgICBcclxuICAgICAgICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgICAgaWYgKCFyZXN0YXVyYW50LnJldmlld3MpIHJldHVybjtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXN0YXVyYW50LnJldmlld3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IHJldmlldyA9IHJlc3RhdXJhbnQucmV2aWV3c1tpXTsgICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKHJldmlldy5zeW5jZWQgPT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIERCSGVscGVyLnN5bmNSZXZpZXcocmVzdGF1cmFudC5pZCwgcmV2aWV3KS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgICAgICAgcmVzdGF1cmFudC5yZXZpZXdzW2ldLnN5bmNlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKS5wdXQocmVzdGF1cmFudCwgcmVzdGF1cmFudC5pZCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3luYyBhIHJldmlld1xyXG4gICAqL1xyXG4gIHN0YXRpYyBzeW5jUmV2aWV3KHJlc3RhdXJhbnRfaWQsIHJldmlldykge1xyXG4gICAgcmV0dXJuIGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cy8nLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHJlc3RhdXJhbnRfaWQ6IHJlc3RhdXJhbnRfaWQsXHJcbiAgICAgICAgICBuYW1lOiByZXZpZXcubmFtZSxcclxuICAgICAgICAgIHJhdGluZzogcmV2aWV3LnJhdGluZyxcclxuICAgICAgICAgIGNvbW1lbnRzOiByZXZpZXcuY29tbWVudHNcclxuICAgICAgICB9KVxyXG4gICAgICB9KVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50IHJldmlld3NcclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50UmV2aWV3c0J5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICBvcGVuRGF0YWJhc2UoKS50aGVuKGRiID0+IHtcclxuICAgICAgbGV0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQpO1xyXG4gICAgICBzdG9yZS5nZXQoaWQpLnRoZW4ocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXN0YXVyYW50LnJldmlld3MpIHtcclxuICAgICAgICAgIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cy8/cmVzdGF1cmFudF9pZD0ke2lkfWApXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgICAgLnRoZW4ocmV2aWV3cyA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmV2aWV3c0FycmF5ID0gW11cclxuICAgICAgICAgICAgICAgIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICByZXZpZXdzQXJyYXkucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogcmV2aWV3Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmF0aW5nOiByZXZpZXcucmF0aW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzOiByZXZpZXcuY29tbWVudHMsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogbW9tZW50KHJldmlldy5jcmVhdGVkQXQpLmZvcm1hdCgnTU1NTSBELCBZWVlZJylcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJlc3RhdXJhbnQucmV2aWV3cyA9IHJldmlld3NBcnJheTtcclxuICAgICAgICAgICAgICAgIHN0b3JlID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWR3cml0ZScpLm9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpO1xyXG4gICAgICAgICAgICAgICAgc3RvcmUucHV0KHJlc3RhdXJhbnQsIGlkKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJldmlld3NBcnJheSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIFwiRmFpbGVkIHRvIGZldGNoIHJldmlld3NcIik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQucmV2aWV3cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmF2b3JpdGUgYSByZXN0YXVyYW50XHJcbiAgICovXHJcbiAgc3RhdGljIGZhdm9yaXRlUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcblxyXG4gICAgb3BlbkRhdGFiYXNlKCkudGhlbihkYiA9PiB7XHJcblxyXG4gICAgICBsZXQgc3RvcmUgPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJykub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIHN0b3JlLnB1dChyZXN0YXVyYW50LCByZXN0YXVyYW50LmlkKTtcclxuXHJcbiAgICAgIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHMvJHtyZXN0YXVyYW50LmlkfS8/aXNfZmF2b3JpdGU9JHtyZXN0YXVyYW50LmlzX2Zhdm9yaXRlfWAsIHtcclxuICAgICAgICBtZXRob2Q6ICdQVVQnXHJcbiAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgIC50aGVuKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgICAgICBzdG9yZSA9IGRiLnRyYW5zYWN0aW9uKCdyZXN0YXVyYW50cycsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZSgncmVzdGF1cmFudHMnKTtcclxuICAgICAgICAgICAgc3RvcmUucHV0KHJlc3RhdXJhbnQsIHJlc3RhdXJhbnQuaWQpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXN0YXVyYW50IGltYWdlIGJhc2UgcGF0aC5cclxuICovXHJcbkRCSGVscGVyLmltYWdlVXJsQmFzZVBhdGggPSAnL2ltZy8nO1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBJbmRleGVkREJcclxuICovXHJcbmZ1bmN0aW9uIG9wZW5EYXRhYmFzZSgpIHtcclxuICAvLyBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgcmV0dXJuIGlkYi5vcGVuKCdtd3MtcmVzdGF1cmFudHMnLCAxLCB1cGdyYWRlREIgPT4gdXBncmFkZURCLmNyZWF0ZU9iamVjdFN0b3JlKCdyZXN0YXVyYW50cycpKTtcclxufVxyXG5cclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIC8vIERvbid0IGNyZWF0ZSBpdGVyYXRlS2V5Q3Vyc29yIGlmIG9wZW5LZXlDdXJzb3IgZG9lc24ndCBleGlzdC5cbiAgICAgIGlmICghKGZ1bmNOYW1lIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcblxuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIGlmIChyZXF1ZXN0KSB7XG4gICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAodXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbihkYikge1xuICAgICAgICByZXR1cm4gbmV3IERCKGRiKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwoaW5kZXhlZERCLCAnZGVsZXRlRGF0YWJhc2UnLCBbbmFtZV0pO1xuICAgIH1cbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cDtcbiAgICBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHM7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7IiwiIWZ1bmN0aW9uKGUsdCl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9dCgpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUodCk6ZS5tb21lbnQ9dCgpfSh0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIGUsaTtmdW5jdGlvbiBjKCl7cmV0dXJuIGUuYXBwbHkobnVsbCxhcmd1bWVudHMpfWZ1bmN0aW9uIG8oZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBBcnJheXx8XCJbb2JqZWN0IEFycmF5XVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIHUoZSl7cmV0dXJuIG51bGwhPWUmJlwiW29iamVjdCBPYmplY3RdXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZSl9ZnVuY3Rpb24gbChlKXtyZXR1cm4gdm9pZCAwPT09ZX1mdW5jdGlvbiBkKGUpe3JldHVyblwibnVtYmVyXCI9PXR5cGVvZiBlfHxcIltvYmplY3QgTnVtYmVyXVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIGgoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBEYXRlfHxcIltvYmplY3QgRGF0ZV1cIj09PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlKX1mdW5jdGlvbiBmKGUsdCl7dmFyIG4scz1bXTtmb3Iobj0wO248ZS5sZW5ndGg7KytuKXMucHVzaCh0KGVbbl0sbikpO3JldHVybiBzfWZ1bmN0aW9uIG0oZSx0KXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGUsdCl9ZnVuY3Rpb24gXyhlLHQpe2Zvcih2YXIgbiBpbiB0KW0odCxuKSYmKGVbbl09dFtuXSk7cmV0dXJuIG0odCxcInRvU3RyaW5nXCIpJiYoZS50b1N0cmluZz10LnRvU3RyaW5nKSxtKHQsXCJ2YWx1ZU9mXCIpJiYoZS52YWx1ZU9mPXQudmFsdWVPZiksZX1mdW5jdGlvbiB5KGUsdCxuLHMpe3JldHVybiBPdChlLHQsbixzLCEwKS51dGMoKX1mdW5jdGlvbiBnKGUpe3JldHVybiBudWxsPT1lLl9wZiYmKGUuX3BmPXtlbXB0eTohMSx1bnVzZWRUb2tlbnM6W10sdW51c2VkSW5wdXQ6W10sb3ZlcmZsb3c6LTIsY2hhcnNMZWZ0T3ZlcjowLG51bGxJbnB1dDohMSxpbnZhbGlkTW9udGg6bnVsbCxpbnZhbGlkRm9ybWF0OiExLHVzZXJJbnZhbGlkYXRlZDohMSxpc286ITEscGFyc2VkRGF0ZVBhcnRzOltdLG1lcmlkaWVtOm51bGwscmZjMjgyMjohMSx3ZWVrZGF5TWlzbWF0Y2g6ITF9KSxlLl9wZn1mdW5jdGlvbiBwKGUpe2lmKG51bGw9PWUuX2lzVmFsaWQpe3ZhciB0PWcoZSksbj1pLmNhbGwodC5wYXJzZWREYXRlUGFydHMsZnVuY3Rpb24oZSl7cmV0dXJuIG51bGwhPWV9KSxzPSFpc05hTihlLl9kLmdldFRpbWUoKSkmJnQub3ZlcmZsb3c8MCYmIXQuZW1wdHkmJiF0LmludmFsaWRNb250aCYmIXQuaW52YWxpZFdlZWtkYXkmJiF0LndlZWtkYXlNaXNtYXRjaCYmIXQubnVsbElucHV0JiYhdC5pbnZhbGlkRm9ybWF0JiYhdC51c2VySW52YWxpZGF0ZWQmJighdC5tZXJpZGllbXx8dC5tZXJpZGllbSYmbik7aWYoZS5fc3RyaWN0JiYocz1zJiYwPT09dC5jaGFyc0xlZnRPdmVyJiYwPT09dC51bnVzZWRUb2tlbnMubGVuZ3RoJiZ2b2lkIDA9PT10LmJpZ0hvdXIpLG51bGwhPU9iamVjdC5pc0Zyb3plbiYmT2JqZWN0LmlzRnJvemVuKGUpKXJldHVybiBzO2UuX2lzVmFsaWQ9c31yZXR1cm4gZS5faXNWYWxpZH1mdW5jdGlvbiB2KGUpe3ZhciB0PXkoTmFOKTtyZXR1cm4gbnVsbCE9ZT9fKGcodCksZSk6Zyh0KS51c2VySW52YWxpZGF0ZWQ9ITAsdH1pPUFycmF5LnByb3RvdHlwZS5zb21lP0FycmF5LnByb3RvdHlwZS5zb21lOmZ1bmN0aW9uKGUpe2Zvcih2YXIgdD1PYmplY3QodGhpcyksbj10Lmxlbmd0aD4+PjAscz0wO3M8bjtzKyspaWYocyBpbiB0JiZlLmNhbGwodGhpcyx0W3NdLHMsdCkpcmV0dXJuITA7cmV0dXJuITF9O3ZhciByPWMubW9tZW50UHJvcGVydGllcz1bXTtmdW5jdGlvbiB3KGUsdCl7dmFyIG4scyxpO2lmKGwodC5faXNBTW9tZW50T2JqZWN0KXx8KGUuX2lzQU1vbWVudE9iamVjdD10Ll9pc0FNb21lbnRPYmplY3QpLGwodC5faSl8fChlLl9pPXQuX2kpLGwodC5fZil8fChlLl9mPXQuX2YpLGwodC5fbCl8fChlLl9sPXQuX2wpLGwodC5fc3RyaWN0KXx8KGUuX3N0cmljdD10Ll9zdHJpY3QpLGwodC5fdHptKXx8KGUuX3R6bT10Ll90em0pLGwodC5faXNVVEMpfHwoZS5faXNVVEM9dC5faXNVVEMpLGwodC5fb2Zmc2V0KXx8KGUuX29mZnNldD10Ll9vZmZzZXQpLGwodC5fcGYpfHwoZS5fcGY9Zyh0KSksbCh0Ll9sb2NhbGUpfHwoZS5fbG9jYWxlPXQuX2xvY2FsZSksMDxyLmxlbmd0aClmb3Iobj0wO248ci5sZW5ndGg7bisrKWwoaT10W3M9cltuXV0pfHwoZVtzXT1pKTtyZXR1cm4gZX12YXIgdD0hMTtmdW5jdGlvbiBNKGUpe3codGhpcyxlKSx0aGlzLl9kPW5ldyBEYXRlKG51bGwhPWUuX2Q/ZS5fZC5nZXRUaW1lKCk6TmFOKSx0aGlzLmlzVmFsaWQoKXx8KHRoaXMuX2Q9bmV3IERhdGUoTmFOKSksITE9PT10JiYodD0hMCxjLnVwZGF0ZU9mZnNldCh0aGlzKSx0PSExKX1mdW5jdGlvbiBTKGUpe3JldHVybiBlIGluc3RhbmNlb2YgTXx8bnVsbCE9ZSYmbnVsbCE9ZS5faXNBTW9tZW50T2JqZWN0fWZ1bmN0aW9uIEQoZSl7cmV0dXJuIGU8MD9NYXRoLmNlaWwoZSl8fDA6TWF0aC5mbG9vcihlKX1mdW5jdGlvbiBrKGUpe3ZhciB0PStlLG49MDtyZXR1cm4gMCE9PXQmJmlzRmluaXRlKHQpJiYobj1EKHQpKSxufWZ1bmN0aW9uIGEoZSx0LG4pe3ZhciBzLGk9TWF0aC5taW4oZS5sZW5ndGgsdC5sZW5ndGgpLHI9TWF0aC5hYnMoZS5sZW5ndGgtdC5sZW5ndGgpLGE9MDtmb3Iocz0wO3M8aTtzKyspKG4mJmVbc10hPT10W3NdfHwhbiYmayhlW3NdKSE9PWsodFtzXSkpJiZhKys7cmV0dXJuIGErcn1mdW5jdGlvbiBZKGUpeyExPT09Yy5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIkRlcHJlY2F0aW9uIHdhcm5pbmc6IFwiK2UpfWZ1bmN0aW9uIG4oaSxyKXt2YXIgYT0hMDtyZXR1cm4gXyhmdW5jdGlvbigpe2lmKG51bGwhPWMuZGVwcmVjYXRpb25IYW5kbGVyJiZjLmRlcHJlY2F0aW9uSGFuZGxlcihudWxsLGkpLGEpe2Zvcih2YXIgZSx0PVtdLG49MDtuPGFyZ3VtZW50cy5sZW5ndGg7bisrKXtpZihlPVwiXCIsXCJvYmplY3RcIj09dHlwZW9mIGFyZ3VtZW50c1tuXSl7Zm9yKHZhciBzIGluIGUrPVwiXFxuW1wiK24rXCJdIFwiLGFyZ3VtZW50c1swXSllKz1zK1wiOiBcIithcmd1bWVudHNbMF1bc10rXCIsIFwiO2U9ZS5zbGljZSgwLC0yKX1lbHNlIGU9YXJndW1lbnRzW25dO3QucHVzaChlKX1ZKGkrXCJcXG5Bcmd1bWVudHM6IFwiK0FycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHQpLmpvaW4oXCJcIikrXCJcXG5cIisobmV3IEVycm9yKS5zdGFjayksYT0hMX1yZXR1cm4gci5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LHIpfXZhciBzLE89e307ZnVuY3Rpb24gVChlLHQpe251bGwhPWMuZGVwcmVjYXRpb25IYW5kbGVyJiZjLmRlcHJlY2F0aW9uSGFuZGxlcihlLHQpLE9bZV18fChZKHQpLE9bZV09ITApfWZ1bmN0aW9uIHgoZSl7cmV0dXJuIGUgaW5zdGFuY2VvZiBGdW5jdGlvbnx8XCJbb2JqZWN0IEZ1bmN0aW9uXVwiPT09T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGUpfWZ1bmN0aW9uIGIoZSx0KXt2YXIgbixzPV8oe30sZSk7Zm9yKG4gaW4gdCltKHQsbikmJih1KGVbbl0pJiZ1KHRbbl0pPyhzW25dPXt9LF8oc1tuXSxlW25dKSxfKHNbbl0sdFtuXSkpOm51bGwhPXRbbl0/c1tuXT10W25dOmRlbGV0ZSBzW25dKTtmb3IobiBpbiBlKW0oZSxuKSYmIW0odCxuKSYmdShlW25dKSYmKHNbbl09Xyh7fSxzW25dKSk7cmV0dXJuIHN9ZnVuY3Rpb24gUChlKXtudWxsIT1lJiZ0aGlzLnNldChlKX1jLnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncz0hMSxjLmRlcHJlY2F0aW9uSGFuZGxlcj1udWxsLHM9T2JqZWN0LmtleXM/T2JqZWN0LmtleXM6ZnVuY3Rpb24oZSl7dmFyIHQsbj1bXTtmb3IodCBpbiBlKW0oZSx0KSYmbi5wdXNoKHQpO3JldHVybiBufTt2YXIgVz17fTtmdW5jdGlvbiBIKGUsdCl7dmFyIG49ZS50b0xvd2VyQ2FzZSgpO1dbbl09V1tuK1wic1wiXT1XW3RdPWV9ZnVuY3Rpb24gUihlKXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgZT9XW2VdfHxXW2UudG9Mb3dlckNhc2UoKV06dm9pZCAwfWZ1bmN0aW9uIEMoZSl7dmFyIHQsbixzPXt9O2ZvcihuIGluIGUpbShlLG4pJiYodD1SKG4pKSYmKHNbdF09ZVtuXSk7cmV0dXJuIHN9dmFyIEY9e307ZnVuY3Rpb24gTChlLHQpe0ZbZV09dH1mdW5jdGlvbiBVKGUsdCxuKXt2YXIgcz1cIlwiK01hdGguYWJzKGUpLGk9dC1zLmxlbmd0aDtyZXR1cm4oMDw9ZT9uP1wiK1wiOlwiXCI6XCItXCIpK01hdGgucG93KDEwLE1hdGgubWF4KDAsaSkpLnRvU3RyaW5nKCkuc3Vic3RyKDEpK3N9dmFyIE49LyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KFtIaF1tbShzcyk/fE1vfE1NP00/TT98RG98REREb3xERD9EP0Q/fGRkZD9kP3xkbz98d1tvfHddP3xXW298V10/fFFvP3xZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xraz98bW0/fHNzP3xTezEsOX18eHxYfHp6P3xaWj98LikvZyxHPS8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhMVFN8TFR8TEw/TD9MP3xsezEsNH0pL2csVj17fSxFPXt9O2Z1bmN0aW9uIEkoZSx0LG4scyl7dmFyIGk9cztcInN0cmluZ1wiPT10eXBlb2YgcyYmKGk9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc1tzXSgpfSksZSYmKEVbZV09aSksdCYmKEVbdFswXV09ZnVuY3Rpb24oKXtyZXR1cm4gVShpLmFwcGx5KHRoaXMsYXJndW1lbnRzKSx0WzFdLHRbMl0pfSksbiYmKEVbbl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkub3JkaW5hbChpLmFwcGx5KHRoaXMsYXJndW1lbnRzKSxlKX0pfWZ1bmN0aW9uIEEoZSx0KXtyZXR1cm4gZS5pc1ZhbGlkKCk/KHQ9aih0LGUubG9jYWxlRGF0YSgpKSxWW3RdPVZbdF18fGZ1bmN0aW9uKHMpe3ZhciBlLGksdCxyPXMubWF0Y2goTik7Zm9yKGU9MCxpPXIubGVuZ3RoO2U8aTtlKyspRVtyW2VdXT9yW2VdPUVbcltlXV06cltlXT0odD1yW2VdKS5tYXRjaCgvXFxbW1xcc1xcU10vKT90LnJlcGxhY2UoL15cXFt8XFxdJC9nLFwiXCIpOnQucmVwbGFjZSgvXFxcXC9nLFwiXCIpO3JldHVybiBmdW5jdGlvbihlKXt2YXIgdCxuPVwiXCI7Zm9yKHQ9MDt0PGk7dCsrKW4rPXgoclt0XSk/clt0XS5jYWxsKGUscyk6clt0XTtyZXR1cm4gbn19KHQpLFZbdF0oZSkpOmUubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCl9ZnVuY3Rpb24gaihlLHQpe3ZhciBuPTU7ZnVuY3Rpb24gcyhlKXtyZXR1cm4gdC5sb25nRGF0ZUZvcm1hdChlKXx8ZX1mb3IoRy5sYXN0SW5kZXg9MDswPD1uJiZHLnRlc3QoZSk7KWU9ZS5yZXBsYWNlKEcscyksRy5sYXN0SW5kZXg9MCxuLT0xO3JldHVybiBlfXZhciBaPS9cXGQvLHo9L1xcZFxcZC8sJD0vXFxkezN9LyxxPS9cXGR7NH0vLEo9L1srLV0/XFxkezZ9LyxCPS9cXGRcXGQ/LyxRPS9cXGRcXGRcXGRcXGQ/LyxYPS9cXGRcXGRcXGRcXGRcXGRcXGQ/LyxLPS9cXGR7MSwzfS8sZWU9L1xcZHsxLDR9Lyx0ZT0vWystXT9cXGR7MSw2fS8sbmU9L1xcZCsvLHNlPS9bKy1dP1xcZCsvLGllPS9afFsrLV1cXGRcXGQ6P1xcZFxcZC9naSxyZT0vWnxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPy9naSxhZT0vWzAtOV17MCwyNTZ9WydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGMDdcXHVGRjEwLVxcdUZGRUZdezEsMjU2fXxbXFx1MDYwMC1cXHUwNkZGXFwvXXsxLDI1Nn0oXFxzKj9bXFx1MDYwMC1cXHUwNkZGXXsxLDI1Nn0pezEsMn0vaSxvZT17fTtmdW5jdGlvbiB1ZShlLG4scyl7b2VbZV09eChuKT9uOmZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUmJnM/czpufX1mdW5jdGlvbiBsZShlLHQpe3JldHVybiBtKG9lLGUpP29lW2VdKHQuX3N0cmljdCx0Ll9sb2NhbGUpOm5ldyBSZWdFeHAoZGUoZS5yZXBsYWNlKFwiXFxcXFwiLFwiXCIpLnJlcGxhY2UoL1xcXFwoXFxbKXxcXFxcKFxcXSl8XFxbKFteXFxdXFxbXSopXFxdfFxcXFwoLikvZyxmdW5jdGlvbihlLHQsbixzLGkpe3JldHVybiB0fHxufHxzfHxpfSkpKX1mdW5jdGlvbiBkZShlKXtyZXR1cm4gZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csXCJcXFxcJCZcIil9dmFyIGhlPXt9O2Z1bmN0aW9uIGNlKGUsbil7dmFyIHQscz1uO2ZvcihcInN0cmluZ1wiPT10eXBlb2YgZSYmKGU9W2VdKSxkKG4pJiYocz1mdW5jdGlvbihlLHQpe3Rbbl09ayhlKX0pLHQ9MDt0PGUubGVuZ3RoO3QrKyloZVtlW3RdXT1zfWZ1bmN0aW9uIGZlKGUsaSl7Y2UoZSxmdW5jdGlvbihlLHQsbixzKXtuLl93PW4uX3d8fHt9LGkoZSxuLl93LG4scyl9KX12YXIgbWU9MCxfZT0xLHllPTIsZ2U9MyxwZT00LHZlPTUsd2U9NixNZT03LFNlPTg7ZnVuY3Rpb24gRGUoZSl7cmV0dXJuIGtlKGUpPzM2NjozNjV9ZnVuY3Rpb24ga2UoZSl7cmV0dXJuIGUlND09MCYmZSUxMDAhPTB8fGUlNDAwPT0wfUkoXCJZXCIsMCwwLGZ1bmN0aW9uKCl7dmFyIGU9dGhpcy55ZWFyKCk7cmV0dXJuIGU8PTk5OTk/XCJcIitlOlwiK1wiK2V9KSxJKDAsW1wiWVlcIiwyXSwwLGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMueWVhcigpJTEwMH0pLEkoMCxbXCJZWVlZXCIsNF0sMCxcInllYXJcIiksSSgwLFtcIllZWVlZXCIsNV0sMCxcInllYXJcIiksSSgwLFtcIllZWVlZWVwiLDYsITBdLDAsXCJ5ZWFyXCIpLEgoXCJ5ZWFyXCIsXCJ5XCIpLEwoXCJ5ZWFyXCIsMSksdWUoXCJZXCIsc2UpLHVlKFwiWVlcIixCLHopLHVlKFwiWVlZWVwiLGVlLHEpLHVlKFwiWVlZWVlcIix0ZSxKKSx1ZShcIllZWVlZWVwiLHRlLEopLGNlKFtcIllZWVlZXCIsXCJZWVlZWVlcIl0sbWUpLGNlKFwiWVlZWVwiLGZ1bmN0aW9uKGUsdCl7dFttZV09Mj09PWUubGVuZ3RoP2MucGFyc2VUd29EaWdpdFllYXIoZSk6ayhlKX0pLGNlKFwiWVlcIixmdW5jdGlvbihlLHQpe3RbbWVdPWMucGFyc2VUd29EaWdpdFllYXIoZSl9KSxjZShcIllcIixmdW5jdGlvbihlLHQpe3RbbWVdPXBhcnNlSW50KGUsMTApfSksYy5wYXJzZVR3b0RpZ2l0WWVhcj1mdW5jdGlvbihlKXtyZXR1cm4gayhlKSsoNjg8ayhlKT8xOTAwOjJlMyl9O3ZhciBZZSxPZT1UZShcIkZ1bGxZZWFyXCIsITApO2Z1bmN0aW9uIFRlKHQsbil7cmV0dXJuIGZ1bmN0aW9uKGUpe3JldHVybiBudWxsIT1lPyhiZSh0aGlzLHQsZSksYy51cGRhdGVPZmZzZXQodGhpcyxuKSx0aGlzKTp4ZSh0aGlzLHQpfX1mdW5jdGlvbiB4ZShlLHQpe3JldHVybiBlLmlzVmFsaWQoKT9lLl9kW1wiZ2V0XCIrKGUuX2lzVVRDP1wiVVRDXCI6XCJcIikrdF0oKTpOYU59ZnVuY3Rpb24gYmUoZSx0LG4pe2UuaXNWYWxpZCgpJiYhaXNOYU4obikmJihcIkZ1bGxZZWFyXCI9PT10JiZrZShlLnllYXIoKSkmJjE9PT1lLm1vbnRoKCkmJjI5PT09ZS5kYXRlKCk/ZS5fZFtcInNldFwiKyhlLl9pc1VUQz9cIlVUQ1wiOlwiXCIpK3RdKG4sZS5tb250aCgpLFBlKG4sZS5tb250aCgpKSk6ZS5fZFtcInNldFwiKyhlLl9pc1VUQz9cIlVUQ1wiOlwiXCIpK3RdKG4pKX1mdW5jdGlvbiBQZShlLHQpe2lmKGlzTmFOKGUpfHxpc05hTih0KSlyZXR1cm4gTmFOO3ZhciBuLHM9KHQlKG49MTIpK24pJW47cmV0dXJuIGUrPSh0LXMpLzEyLDE9PT1zP2tlKGUpPzI5OjI4OjMxLXMlNyUyfVllPUFycmF5LnByb3RvdHlwZS5pbmRleE9mP0FycmF5LnByb3RvdHlwZS5pbmRleE9mOmZ1bmN0aW9uKGUpe3ZhciB0O2Zvcih0PTA7dDx0aGlzLmxlbmd0aDsrK3QpaWYodGhpc1t0XT09PWUpcmV0dXJuIHQ7cmV0dXJuLTF9LEkoXCJNXCIsW1wiTU1cIiwyXSxcIk1vXCIsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tb250aCgpKzF9KSxJKFwiTU1NXCIsMCwwLGZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHNTaG9ydCh0aGlzLGUpfSksSShcIk1NTU1cIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLm1vbnRocyh0aGlzLGUpfSksSChcIm1vbnRoXCIsXCJNXCIpLEwoXCJtb250aFwiLDgpLHVlKFwiTVwiLEIpLHVlKFwiTU1cIixCLHopLHVlKFwiTU1NXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC5tb250aHNTaG9ydFJlZ2V4KGUpfSksdWUoXCJNTU1NXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC5tb250aHNSZWdleChlKX0pLGNlKFtcIk1cIixcIk1NXCJdLGZ1bmN0aW9uKGUsdCl7dFtfZV09ayhlKS0xfSksY2UoW1wiTU1NXCIsXCJNTU1NXCJdLGZ1bmN0aW9uKGUsdCxuLHMpe3ZhciBpPW4uX2xvY2FsZS5tb250aHNQYXJzZShlLHMsbi5fc3RyaWN0KTtudWxsIT1pP3RbX2VdPWk6ZyhuKS5pbnZhbGlkTW9udGg9ZX0pO3ZhciBXZT0vRFtvRF0/KFxcW1teXFxbXFxdXSpcXF18XFxzKStNTU1NPy8sSGU9XCJKYW51YXJ5X0ZlYnJ1YXJ5X01hcmNoX0FwcmlsX01heV9KdW5lX0p1bHlfQXVndXN0X1NlcHRlbWJlcl9PY3RvYmVyX05vdmVtYmVyX0RlY2VtYmVyXCIuc3BsaXQoXCJfXCIpO3ZhciBSZT1cIkphbl9GZWJfTWFyX0Fwcl9NYXlfSnVuX0p1bF9BdWdfU2VwX09jdF9Ob3ZfRGVjXCIuc3BsaXQoXCJfXCIpO2Z1bmN0aW9uIENlKGUsdCl7dmFyIG47aWYoIWUuaXNWYWxpZCgpKXJldHVybiBlO2lmKFwic3RyaW5nXCI9PXR5cGVvZiB0KWlmKC9eXFxkKyQvLnRlc3QodCkpdD1rKHQpO2Vsc2UgaWYoIWQodD1lLmxvY2FsZURhdGEoKS5tb250aHNQYXJzZSh0KSkpcmV0dXJuIGU7cmV0dXJuIG49TWF0aC5taW4oZS5kYXRlKCksUGUoZS55ZWFyKCksdCkpLGUuX2RbXCJzZXRcIisoZS5faXNVVEM/XCJVVENcIjpcIlwiKStcIk1vbnRoXCJdKHQsbiksZX1mdW5jdGlvbiBGZShlKXtyZXR1cm4gbnVsbCE9ZT8oQ2UodGhpcyxlKSxjLnVwZGF0ZU9mZnNldCh0aGlzLCEwKSx0aGlzKTp4ZSh0aGlzLFwiTW9udGhcIil9dmFyIExlPWFlO3ZhciBVZT1hZTtmdW5jdGlvbiBOZSgpe2Z1bmN0aW9uIGUoZSx0KXtyZXR1cm4gdC5sZW5ndGgtZS5sZW5ndGh9dmFyIHQsbixzPVtdLGk9W10scj1bXTtmb3IodD0wO3Q8MTI7dCsrKW49eShbMmUzLHRdKSxzLnB1c2godGhpcy5tb250aHNTaG9ydChuLFwiXCIpKSxpLnB1c2godGhpcy5tb250aHMobixcIlwiKSksci5wdXNoKHRoaXMubW9udGhzKG4sXCJcIikpLHIucHVzaCh0aGlzLm1vbnRoc1Nob3J0KG4sXCJcIikpO2ZvcihzLnNvcnQoZSksaS5zb3J0KGUpLHIuc29ydChlKSx0PTA7dDwxMjt0Kyspc1t0XT1kZShzW3RdKSxpW3RdPWRlKGlbdF0pO2Zvcih0PTA7dDwyNDt0Kyspclt0XT1kZShyW3RdKTt0aGlzLl9tb250aHNSZWdleD1uZXcgUmVnRXhwKFwiXihcIityLmpvaW4oXCJ8XCIpK1wiKVwiLFwiaVwiKSx0aGlzLl9tb250aHNTaG9ydFJlZ2V4PXRoaXMuX21vbnRoc1JlZ2V4LHRoaXMuX21vbnRoc1N0cmljdFJlZ2V4PW5ldyBSZWdFeHAoXCJeKFwiK2kuam9pbihcInxcIikrXCIpXCIsXCJpXCIpLHRoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrcy5qb2luKFwifFwiKStcIilcIixcImlcIil9ZnVuY3Rpb24gR2UoZSl7dmFyIHQ9bmV3IERhdGUoRGF0ZS5VVEMuYXBwbHkobnVsbCxhcmd1bWVudHMpKTtyZXR1cm4gZTwxMDAmJjA8PWUmJmlzRmluaXRlKHQuZ2V0VVRDRnVsbFllYXIoKSkmJnQuc2V0VVRDRnVsbFllYXIoZSksdH1mdW5jdGlvbiBWZShlLHQsbil7dmFyIHM9Nyt0LW47cmV0dXJuLSgoNytHZShlLDAscykuZ2V0VVRDRGF5KCktdCklNykrcy0xfWZ1bmN0aW9uIEVlKGUsdCxuLHMsaSl7dmFyIHIsYSxvPTErNyoodC0xKSsoNytuLXMpJTcrVmUoZSxzLGkpO3JldHVybiBvPD0wP2E9RGUocj1lLTEpK286bz5EZShlKT8ocj1lKzEsYT1vLURlKGUpKToocj1lLGE9bykse3llYXI6cixkYXlPZlllYXI6YX19ZnVuY3Rpb24gSWUoZSx0LG4pe3ZhciBzLGkscj1WZShlLnllYXIoKSx0LG4pLGE9TWF0aC5mbG9vcigoZS5kYXlPZlllYXIoKS1yLTEpLzcpKzE7cmV0dXJuIGE8MT9zPWErQWUoaT1lLnllYXIoKS0xLHQsbik6YT5BZShlLnllYXIoKSx0LG4pPyhzPWEtQWUoZS55ZWFyKCksdCxuKSxpPWUueWVhcigpKzEpOihpPWUueWVhcigpLHM9YSkse3dlZWs6cyx5ZWFyOml9fWZ1bmN0aW9uIEFlKGUsdCxuKXt2YXIgcz1WZShlLHQsbiksaT1WZShlKzEsdCxuKTtyZXR1cm4oRGUoZSktcytpKS83fUkoXCJ3XCIsW1wid3dcIiwyXSxcIndvXCIsXCJ3ZWVrXCIpLEkoXCJXXCIsW1wiV1dcIiwyXSxcIldvXCIsXCJpc29XZWVrXCIpLEgoXCJ3ZWVrXCIsXCJ3XCIpLEgoXCJpc29XZWVrXCIsXCJXXCIpLEwoXCJ3ZWVrXCIsNSksTChcImlzb1dlZWtcIiw1KSx1ZShcIndcIixCKSx1ZShcInd3XCIsQix6KSx1ZShcIldcIixCKSx1ZShcIldXXCIsQix6KSxmZShbXCJ3XCIsXCJ3d1wiLFwiV1wiLFwiV1dcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzLnN1YnN0cigwLDEpXT1rKGUpfSk7SShcImRcIiwwLFwiZG9cIixcImRheVwiKSxJKFwiZGRcIiwwLDAsZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLndlZWtkYXlzTWluKHRoaXMsZSl9KSxJKFwiZGRkXCIsMCwwLGZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsZSl9KSxJKFwiZGRkZFwiLDAsMCxmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXModGhpcyxlKX0pLEkoXCJlXCIsMCwwLFwid2Vla2RheVwiKSxJKFwiRVwiLDAsMCxcImlzb1dlZWtkYXlcIiksSChcImRheVwiLFwiZFwiKSxIKFwid2Vla2RheVwiLFwiZVwiKSxIKFwiaXNvV2Vla2RheVwiLFwiRVwiKSxMKFwiZGF5XCIsMTEpLEwoXCJ3ZWVrZGF5XCIsMTEpLEwoXCJpc29XZWVrZGF5XCIsMTEpLHVlKFwiZFwiLEIpLHVlKFwiZVwiLEIpLHVlKFwiRVwiLEIpLHVlKFwiZGRcIixmdW5jdGlvbihlLHQpe3JldHVybiB0LndlZWtkYXlzTWluUmVnZXgoZSl9KSx1ZShcImRkZFwiLGZ1bmN0aW9uKGUsdCl7cmV0dXJuIHQud2Vla2RheXNTaG9ydFJlZ2V4KGUpfSksdWUoXCJkZGRkXCIsZnVuY3Rpb24oZSx0KXtyZXR1cm4gdC53ZWVrZGF5c1JlZ2V4KGUpfSksZmUoW1wiZGRcIixcImRkZFwiLFwiZGRkZFwiXSxmdW5jdGlvbihlLHQsbixzKXt2YXIgaT1uLl9sb2NhbGUud2Vla2RheXNQYXJzZShlLHMsbi5fc3RyaWN0KTtudWxsIT1pP3QuZD1pOmcobikuaW52YWxpZFdlZWtkYXk9ZX0pLGZlKFtcImRcIixcImVcIixcIkVcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzXT1rKGUpfSk7dmFyIGplPVwiU3VuZGF5X01vbmRheV9UdWVzZGF5X1dlZG5lc2RheV9UaHVyc2RheV9GcmlkYXlfU2F0dXJkYXlcIi5zcGxpdChcIl9cIik7dmFyIFplPVwiU3VuX01vbl9UdWVfV2VkX1RodV9GcmlfU2F0XCIuc3BsaXQoXCJfXCIpO3ZhciB6ZT1cIlN1X01vX1R1X1dlX1RoX0ZyX1NhXCIuc3BsaXQoXCJfXCIpO3ZhciAkZT1hZTt2YXIgcWU9YWU7dmFyIEplPWFlO2Z1bmN0aW9uIEJlKCl7ZnVuY3Rpb24gZShlLHQpe3JldHVybiB0Lmxlbmd0aC1lLmxlbmd0aH12YXIgdCxuLHMsaSxyLGE9W10sbz1bXSx1PVtdLGw9W107Zm9yKHQ9MDt0PDc7dCsrKW49eShbMmUzLDFdKS5kYXkodCkscz10aGlzLndlZWtkYXlzTWluKG4sXCJcIiksaT10aGlzLndlZWtkYXlzU2hvcnQobixcIlwiKSxyPXRoaXMud2Vla2RheXMobixcIlwiKSxhLnB1c2gocyksby5wdXNoKGkpLHUucHVzaChyKSxsLnB1c2gocyksbC5wdXNoKGkpLGwucHVzaChyKTtmb3IoYS5zb3J0KGUpLG8uc29ydChlKSx1LnNvcnQoZSksbC5zb3J0KGUpLHQ9MDt0PDc7dCsrKW9bdF09ZGUob1t0XSksdVt0XT1kZSh1W3RdKSxsW3RdPWRlKGxbdF0pO3RoaXMuX3dlZWtkYXlzUmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrbC5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4PXRoaXMuX3dlZWtkYXlzUmVnZXgsdGhpcy5fd2Vla2RheXNNaW5SZWdleD10aGlzLl93ZWVrZGF5c1JlZ2V4LHRoaXMuX3dlZWtkYXlzU3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrdS5qb2luKFwifFwiKStcIilcIixcImlcIiksdGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4PW5ldyBSZWdFeHAoXCJeKFwiK28uam9pbihcInxcIikrXCIpXCIsXCJpXCIpLHRoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXg9bmV3IFJlZ0V4cChcIl4oXCIrYS5qb2luKFwifFwiKStcIilcIixcImlcIil9ZnVuY3Rpb24gUWUoKXtyZXR1cm4gdGhpcy5ob3VycygpJTEyfHwxMn1mdW5jdGlvbiBYZShlLHQpe0koZSwwLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLHRoaXMubWludXRlcygpLHQpfSl9ZnVuY3Rpb24gS2UoZSx0KXtyZXR1cm4gdC5fbWVyaWRpZW1QYXJzZX1JKFwiSFwiLFtcIkhIXCIsMl0sMCxcImhvdXJcIiksSShcImhcIixbXCJoaFwiLDJdLDAsUWUpLEkoXCJrXCIsW1wia2tcIiwyXSwwLGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaG91cnMoKXx8MjR9KSxJKFwiaG1tXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIitRZS5hcHBseSh0aGlzKStVKHRoaXMubWludXRlcygpLDIpfSksSShcImhtbXNzXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIitRZS5hcHBseSh0aGlzKStVKHRoaXMubWludXRlcygpLDIpK1UodGhpcy5zZWNvbmRzKCksMil9KSxJKFwiSG1tXCIsMCwwLGZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzLmhvdXJzKCkrVSh0aGlzLm1pbnV0ZXMoKSwyKX0pLEkoXCJIbW1zc1wiLDAsMCxmdW5jdGlvbigpe3JldHVyblwiXCIrdGhpcy5ob3VycygpK1UodGhpcy5taW51dGVzKCksMikrVSh0aGlzLnNlY29uZHMoKSwyKX0pLFhlKFwiYVwiLCEwKSxYZShcIkFcIiwhMSksSChcImhvdXJcIixcImhcIiksTChcImhvdXJcIiwxMyksdWUoXCJhXCIsS2UpLHVlKFwiQVwiLEtlKSx1ZShcIkhcIixCKSx1ZShcImhcIixCKSx1ZShcImtcIixCKSx1ZShcIkhIXCIsQix6KSx1ZShcImhoXCIsQix6KSx1ZShcImtrXCIsQix6KSx1ZShcImhtbVwiLFEpLHVlKFwiaG1tc3NcIixYKSx1ZShcIkhtbVwiLFEpLHVlKFwiSG1tc3NcIixYKSxjZShbXCJIXCIsXCJISFwiXSxnZSksY2UoW1wia1wiLFwia2tcIl0sZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWsoZSk7dFtnZV09MjQ9PT1zPzA6c30pLGNlKFtcImFcIixcIkFcIl0sZnVuY3Rpb24oZSx0LG4pe24uX2lzUG09bi5fbG9jYWxlLmlzUE0oZSksbi5fbWVyaWRpZW09ZX0pLGNlKFtcImhcIixcImhoXCJdLGZ1bmN0aW9uKGUsdCxuKXt0W2dlXT1rKGUpLGcobikuYmlnSG91cj0hMH0pLGNlKFwiaG1tXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTI7dFtnZV09ayhlLnN1YnN0cigwLHMpKSx0W3BlXT1rKGUuc3Vic3RyKHMpKSxnKG4pLmJpZ0hvdXI9ITB9KSxjZShcImhtbXNzXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTQsaT1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzLDIpKSx0W3ZlXT1rKGUuc3Vic3RyKGkpKSxnKG4pLmJpZ0hvdXI9ITB9KSxjZShcIkhtbVwiLGZ1bmN0aW9uKGUsdCxuKXt2YXIgcz1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzKSl9KSxjZShcIkhtbXNzXCIsZnVuY3Rpb24oZSx0LG4pe3ZhciBzPWUubGVuZ3RoLTQsaT1lLmxlbmd0aC0yO3RbZ2VdPWsoZS5zdWJzdHIoMCxzKSksdFtwZV09ayhlLnN1YnN0cihzLDIpKSx0W3ZlXT1rKGUuc3Vic3RyKGkpKX0pO3ZhciBldCx0dD1UZShcIkhvdXJzXCIsITApLG50PXtjYWxlbmRhcjp7c2FtZURheTpcIltUb2RheSBhdF0gTFRcIixuZXh0RGF5OlwiW1RvbW9ycm93IGF0XSBMVFwiLG5leHRXZWVrOlwiZGRkZCBbYXRdIExUXCIsbGFzdERheTpcIltZZXN0ZXJkYXkgYXRdIExUXCIsbGFzdFdlZWs6XCJbTGFzdF0gZGRkZCBbYXRdIExUXCIsc2FtZUVsc2U6XCJMXCJ9LGxvbmdEYXRlRm9ybWF0OntMVFM6XCJoOm1tOnNzIEFcIixMVDpcImg6bW0gQVwiLEw6XCJNTS9ERC9ZWVlZXCIsTEw6XCJNTU1NIEQsIFlZWVlcIixMTEw6XCJNTU1NIEQsIFlZWVkgaDptbSBBXCIsTExMTDpcImRkZGQsIE1NTU0gRCwgWVlZWSBoOm1tIEFcIn0saW52YWxpZERhdGU6XCJJbnZhbGlkIGRhdGVcIixvcmRpbmFsOlwiJWRcIixkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOi9cXGR7MSwyfS8scmVsYXRpdmVUaW1lOntmdXR1cmU6XCJpbiAlc1wiLHBhc3Q6XCIlcyBhZ29cIixzOlwiYSBmZXcgc2Vjb25kc1wiLHNzOlwiJWQgc2Vjb25kc1wiLG06XCJhIG1pbnV0ZVwiLG1tOlwiJWQgbWludXRlc1wiLGg6XCJhbiBob3VyXCIsaGg6XCIlZCBob3Vyc1wiLGQ6XCJhIGRheVwiLGRkOlwiJWQgZGF5c1wiLE06XCJhIG1vbnRoXCIsTU06XCIlZCBtb250aHNcIix5OlwiYSB5ZWFyXCIseXk6XCIlZCB5ZWFyc1wifSxtb250aHM6SGUsbW9udGhzU2hvcnQ6UmUsd2Vlazp7ZG93OjAsZG95OjZ9LHdlZWtkYXlzOmplLHdlZWtkYXlzTWluOnplLHdlZWtkYXlzU2hvcnQ6WmUsbWVyaWRpZW1QYXJzZTovW2FwXVxcLj9tP1xcLj8vaX0sc3Q9e30saXQ9e307ZnVuY3Rpb24gcnQoZSl7cmV0dXJuIGU/ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoXCJfXCIsXCItXCIpOmV9ZnVuY3Rpb24gYXQoZSl7dmFyIHQ9bnVsbDtpZighc3RbZV0mJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJm1vZHVsZSYmbW9kdWxlLmV4cG9ydHMpdHJ5e3Q9ZXQuX2FiYnIscmVxdWlyZShcIi4vbG9jYWxlL1wiK2UpLG90KHQpfWNhdGNoKGUpe31yZXR1cm4gc3RbZV19ZnVuY3Rpb24gb3QoZSx0KXt2YXIgbjtyZXR1cm4gZSYmKChuPWwodCk/bHQoZSk6dXQoZSx0KSk/ZXQ9bjpcInVuZGVmaW5lZFwiIT10eXBlb2YgY29uc29sZSYmY29uc29sZS53YXJuJiZjb25zb2xlLndhcm4oXCJMb2NhbGUgXCIrZStcIiBub3QgZm91bmQuIERpZCB5b3UgZm9yZ2V0IHRvIGxvYWQgaXQ/XCIpKSxldC5fYWJicn1mdW5jdGlvbiB1dChlLHQpe2lmKG51bGwhPT10KXt2YXIgbixzPW50O2lmKHQuYWJicj1lLG51bGwhPXN0W2VdKVQoXCJkZWZpbmVMb2NhbGVPdmVycmlkZVwiLFwidXNlIG1vbWVudC51cGRhdGVMb2NhbGUobG9jYWxlTmFtZSwgY29uZmlnKSB0byBjaGFuZ2UgYW4gZXhpc3RpbmcgbG9jYWxlLiBtb21lbnQuZGVmaW5lTG9jYWxlKGxvY2FsZU5hbWUsIGNvbmZpZykgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgY3JlYXRpbmcgYSBuZXcgbG9jYWxlIFNlZSBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL2RlZmluZS1sb2NhbGUvIGZvciBtb3JlIGluZm8uXCIpLHM9c3RbZV0uX2NvbmZpZztlbHNlIGlmKG51bGwhPXQucGFyZW50TG9jYWxlKWlmKG51bGwhPXN0W3QucGFyZW50TG9jYWxlXSlzPXN0W3QucGFyZW50TG9jYWxlXS5fY29uZmlnO2Vsc2V7aWYobnVsbD09KG49YXQodC5wYXJlbnRMb2NhbGUpKSlyZXR1cm4gaXRbdC5wYXJlbnRMb2NhbGVdfHwoaXRbdC5wYXJlbnRMb2NhbGVdPVtdKSxpdFt0LnBhcmVudExvY2FsZV0ucHVzaCh7bmFtZTplLGNvbmZpZzp0fSksbnVsbDtzPW4uX2NvbmZpZ31yZXR1cm4gc3RbZV09bmV3IFAoYihzLHQpKSxpdFtlXSYmaXRbZV0uZm9yRWFjaChmdW5jdGlvbihlKXt1dChlLm5hbWUsZS5jb25maWcpfSksb3QoZSksc3RbZV19cmV0dXJuIGRlbGV0ZSBzdFtlXSxudWxsfWZ1bmN0aW9uIGx0KGUpe3ZhciB0O2lmKGUmJmUuX2xvY2FsZSYmZS5fbG9jYWxlLl9hYmJyJiYoZT1lLl9sb2NhbGUuX2FiYnIpLCFlKXJldHVybiBldDtpZighbyhlKSl7aWYodD1hdChlKSlyZXR1cm4gdDtlPVtlXX1yZXR1cm4gZnVuY3Rpb24oZSl7Zm9yKHZhciB0LG4scyxpLHI9MDtyPGUubGVuZ3RoOyl7Zm9yKHQ9KGk9cnQoZVtyXSkuc3BsaXQoXCItXCIpKS5sZW5ndGgsbj0obj1ydChlW3IrMV0pKT9uLnNwbGl0KFwiLVwiKTpudWxsOzA8dDspe2lmKHM9YXQoaS5zbGljZSgwLHQpLmpvaW4oXCItXCIpKSlyZXR1cm4gcztpZihuJiZuLmxlbmd0aD49dCYmYShpLG4sITApPj10LTEpYnJlYWs7dC0tfXIrK31yZXR1cm4gZXR9KGUpfWZ1bmN0aW9uIGR0KGUpe3ZhciB0LG49ZS5fYTtyZXR1cm4gbiYmLTI9PT1nKGUpLm92ZXJmbG93JiYodD1uW19lXTwwfHwxMTxuW19lXT9fZTpuW3llXTwxfHxuW3llXT5QZShuW21lXSxuW19lXSk/eWU6bltnZV08MHx8MjQ8bltnZV18fDI0PT09bltnZV0mJigwIT09bltwZV18fDAhPT1uW3ZlXXx8MCE9PW5bd2VdKT9nZTpuW3BlXTwwfHw1OTxuW3BlXT9wZTpuW3ZlXTwwfHw1OTxuW3ZlXT92ZTpuW3dlXTwwfHw5OTk8blt3ZV0/d2U6LTEsZyhlKS5fb3ZlcmZsb3dEYXlPZlllYXImJih0PG1lfHx5ZTx0KSYmKHQ9eWUpLGcoZSkuX292ZXJmbG93V2Vla3MmJi0xPT09dCYmKHQ9TWUpLGcoZSkuX292ZXJmbG93V2Vla2RheSYmLTE9PT10JiYodD1TZSksZyhlKS5vdmVyZmxvdz10KSxlfWZ1bmN0aW9uIGh0KGUsdCxuKXtyZXR1cm4gbnVsbCE9ZT9lOm51bGwhPXQ/dDpufWZ1bmN0aW9uIGN0KGUpe3ZhciB0LG4scyxpLHIsYT1bXTtpZighZS5fZCl7dmFyIG8sdTtmb3Iobz1lLHU9bmV3IERhdGUoYy5ub3coKSkscz1vLl91c2VVVEM/W3UuZ2V0VVRDRnVsbFllYXIoKSx1LmdldFVUQ01vbnRoKCksdS5nZXRVVENEYXRlKCldOlt1LmdldEZ1bGxZZWFyKCksdS5nZXRNb250aCgpLHUuZ2V0RGF0ZSgpXSxlLl93JiZudWxsPT1lLl9hW3llXSYmbnVsbD09ZS5fYVtfZV0mJmZ1bmN0aW9uKGUpe3ZhciB0LG4scyxpLHIsYSxvLHU7aWYobnVsbCE9KHQ9ZS5fdykuR0d8fG51bGwhPXQuV3x8bnVsbCE9dC5FKXI9MSxhPTQsbj1odCh0LkdHLGUuX2FbbWVdLEllKFR0KCksMSw0KS55ZWFyKSxzPWh0KHQuVywxKSwoKGk9aHQodC5FLDEpKTwxfHw3PGkpJiYodT0hMCk7ZWxzZXtyPWUuX2xvY2FsZS5fd2Vlay5kb3csYT1lLl9sb2NhbGUuX3dlZWsuZG95O3ZhciBsPUllKFR0KCkscixhKTtuPWh0KHQuZ2csZS5fYVttZV0sbC55ZWFyKSxzPWh0KHQudyxsLndlZWspLG51bGwhPXQuZD8oKGk9dC5kKTwwfHw2PGkpJiYodT0hMCk6bnVsbCE9dC5lPyhpPXQuZStyLCh0LmU8MHx8Njx0LmUpJiYodT0hMCkpOmk9cn1zPDF8fHM+QWUobixyLGEpP2coZSkuX292ZXJmbG93V2Vla3M9ITA6bnVsbCE9dT9nKGUpLl9vdmVyZmxvd1dlZWtkYXk9ITA6KG89RWUobixzLGkscixhKSxlLl9hW21lXT1vLnllYXIsZS5fZGF5T2ZZZWFyPW8uZGF5T2ZZZWFyKX0oZSksbnVsbCE9ZS5fZGF5T2ZZZWFyJiYocj1odChlLl9hW21lXSxzW21lXSksKGUuX2RheU9mWWVhcj5EZShyKXx8MD09PWUuX2RheU9mWWVhcikmJihnKGUpLl9vdmVyZmxvd0RheU9mWWVhcj0hMCksbj1HZShyLDAsZS5fZGF5T2ZZZWFyKSxlLl9hW19lXT1uLmdldFVUQ01vbnRoKCksZS5fYVt5ZV09bi5nZXRVVENEYXRlKCkpLHQ9MDt0PDMmJm51bGw9PWUuX2FbdF07Kyt0KWUuX2FbdF09YVt0XT1zW3RdO2Zvcig7dDw3O3QrKyllLl9hW3RdPWFbdF09bnVsbD09ZS5fYVt0XT8yPT09dD8xOjA6ZS5fYVt0XTsyND09PWUuX2FbZ2VdJiYwPT09ZS5fYVtwZV0mJjA9PT1lLl9hW3ZlXSYmMD09PWUuX2Fbd2VdJiYoZS5fbmV4dERheT0hMCxlLl9hW2dlXT0wKSxlLl9kPShlLl91c2VVVEM/R2U6ZnVuY3Rpb24oZSx0LG4scyxpLHIsYSl7dmFyIG89bmV3IERhdGUoZSx0LG4scyxpLHIsYSk7cmV0dXJuIGU8MTAwJiYwPD1lJiZpc0Zpbml0ZShvLmdldEZ1bGxZZWFyKCkpJiZvLnNldEZ1bGxZZWFyKGUpLG99KS5hcHBseShudWxsLGEpLGk9ZS5fdXNlVVRDP2UuX2QuZ2V0VVRDRGF5KCk6ZS5fZC5nZXREYXkoKSxudWxsIT1lLl90em0mJmUuX2Quc2V0VVRDTWludXRlcyhlLl9kLmdldFVUQ01pbnV0ZXMoKS1lLl90em0pLGUuX25leHREYXkmJihlLl9hW2dlXT0yNCksZS5fdyYmdm9pZCAwIT09ZS5fdy5kJiZlLl93LmQhPT1pJiYoZyhlKS53ZWVrZGF5TWlzbWF0Y2g9ITApfX12YXIgZnQ9L15cXHMqKCg/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzpcXGRcXGQtXFxkXFxkfFdcXGRcXGQtXFxkfFdcXGRcXGR8XFxkXFxkXFxkfFxcZFxcZCkpKD86KFR8ICkoXFxkXFxkKD86OlxcZFxcZCg/OjpcXGRcXGQoPzpbLixdXFxkKyk/KT8pPykoW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvLG10PS9eXFxzKigoPzpbKy1dXFxkezZ9fFxcZHs0fSkoPzpcXGRcXGRcXGRcXGR8V1xcZFxcZFxcZHxXXFxkXFxkfFxcZFxcZFxcZHxcXGRcXGQpKSg/OihUfCApKFxcZFxcZCg/OlxcZFxcZCg/OlxcZFxcZCg/OlsuLF1cXGQrKT8pPyk/KShbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sX3Q9L1p8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8vLHl0PVtbXCJZWVlZWVktTU0tRERcIiwvWystXVxcZHs2fS1cXGRcXGQtXFxkXFxkL10sW1wiWVlZWS1NTS1ERFwiLC9cXGR7NH0tXFxkXFxkLVxcZFxcZC9dLFtcIkdHR0ctW1ddV1ctRVwiLC9cXGR7NH0tV1xcZFxcZC1cXGQvXSxbXCJHR0dHLVtXXVdXXCIsL1xcZHs0fS1XXFxkXFxkLywhMV0sW1wiWVlZWS1ERERcIiwvXFxkezR9LVxcZHszfS9dLFtcIllZWVktTU1cIiwvXFxkezR9LVxcZFxcZC8sITFdLFtcIllZWVlZWU1NRERcIiwvWystXVxcZHsxMH0vXSxbXCJZWVlZTU1ERFwiLC9cXGR7OH0vXSxbXCJHR0dHW1ddV1dFXCIsL1xcZHs0fVdcXGR7M30vXSxbXCJHR0dHW1ddV1dcIiwvXFxkezR9V1xcZHsyfS8sITFdLFtcIllZWVlERERcIiwvXFxkezd9L11dLGd0PVtbXCJISDptbTpzcy5TU1NTXCIsL1xcZFxcZDpcXGRcXGQ6XFxkXFxkXFwuXFxkKy9dLFtcIkhIOm1tOnNzLFNTU1NcIiwvXFxkXFxkOlxcZFxcZDpcXGRcXGQsXFxkKy9dLFtcIkhIOm1tOnNzXCIsL1xcZFxcZDpcXGRcXGQ6XFxkXFxkL10sW1wiSEg6bW1cIiwvXFxkXFxkOlxcZFxcZC9dLFtcIkhIbW1zcy5TU1NTXCIsL1xcZFxcZFxcZFxcZFxcZFxcZFxcLlxcZCsvXSxbXCJISG1tc3MsU1NTU1wiLC9cXGRcXGRcXGRcXGRcXGRcXGQsXFxkKy9dLFtcIkhIbW1zc1wiLC9cXGRcXGRcXGRcXGRcXGRcXGQvXSxbXCJISG1tXCIsL1xcZFxcZFxcZFxcZC9dLFtcIkhIXCIsL1xcZFxcZC9dXSxwdD0vXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pO2Z1bmN0aW9uIHZ0KGUpe3ZhciB0LG4scyxpLHIsYSxvPWUuX2ksdT1mdC5leGVjKG8pfHxtdC5leGVjKG8pO2lmKHUpe2ZvcihnKGUpLmlzbz0hMCx0PTAsbj15dC5sZW5ndGg7dDxuO3QrKylpZih5dFt0XVsxXS5leGVjKHVbMV0pKXtpPXl0W3RdWzBdLHM9ITEhPT15dFt0XVsyXTticmVha31pZihudWxsPT1pKXJldHVybiB2b2lkKGUuX2lzVmFsaWQ9ITEpO2lmKHVbM10pe2Zvcih0PTAsbj1ndC5sZW5ndGg7dDxuO3QrKylpZihndFt0XVsxXS5leGVjKHVbM10pKXtyPSh1WzJdfHxcIiBcIikrZ3RbdF1bMF07YnJlYWt9aWYobnVsbD09cilyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKX1pZighcyYmbnVsbCE9cilyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKTtpZih1WzRdKXtpZighX3QuZXhlYyh1WzRdKSlyZXR1cm4gdm9pZChlLl9pc1ZhbGlkPSExKTthPVwiWlwifWUuX2Y9aSsocnx8XCJcIikrKGF8fFwiXCIpLGt0KGUpfWVsc2UgZS5faXNWYWxpZD0hMX12YXIgd3Q9L14oPzooTW9ufFR1ZXxXZWR8VGh1fEZyaXxTYXR8U3VuKSw/XFxzKT8oXFxkezEsMn0pXFxzKEphbnxGZWJ8TWFyfEFwcnxNYXl8SnVufEp1bHxBdWd8U2VwfE9jdHxOb3Z8RGVjKVxccyhcXGR7Miw0fSlcXHMoXFxkXFxkKTooXFxkXFxkKSg/OjooXFxkXFxkKSk/XFxzKD86KFVUfEdNVHxbRUNNUF1bU0RdVCl8KFtael0pfChbKy1dXFxkezR9KSkkLztmdW5jdGlvbiBNdChlLHQsbixzLGkscil7dmFyIGE9W2Z1bmN0aW9uKGUpe3ZhciB0PXBhcnNlSW50KGUsMTApO3tpZih0PD00OSlyZXR1cm4gMmUzK3Q7aWYodDw9OTk5KXJldHVybiAxOTAwK3R9cmV0dXJuIHR9KGUpLFJlLmluZGV4T2YodCkscGFyc2VJbnQobiwxMCkscGFyc2VJbnQocywxMCkscGFyc2VJbnQoaSwxMCldO3JldHVybiByJiZhLnB1c2gocGFyc2VJbnQociwxMCkpLGF9dmFyIFN0PXtVVDowLEdNVDowLEVEVDotMjQwLEVTVDotMzAwLENEVDotMzAwLENTVDotMzYwLE1EVDotMzYwLE1TVDotNDIwLFBEVDotNDIwLFBTVDotNDgwfTtmdW5jdGlvbiBEdChlKXt2YXIgdCxuLHMsaT13dC5leGVjKGUuX2kucmVwbGFjZSgvXFwoW14pXSpcXCl8W1xcblxcdF0vZyxcIiBcIikucmVwbGFjZSgvKFxcc1xccyspL2csXCIgXCIpLnJlcGxhY2UoL15cXHNcXHMqLyxcIlwiKS5yZXBsYWNlKC9cXHNcXHMqJC8sXCJcIikpO2lmKGkpe3ZhciByPU10KGlbNF0saVszXSxpWzJdLGlbNV0saVs2XSxpWzddKTtpZih0PWlbMV0sbj1yLHM9ZSx0JiZaZS5pbmRleE9mKHQpIT09bmV3IERhdGUoblswXSxuWzFdLG5bMl0pLmdldERheSgpJiYoZyhzKS53ZWVrZGF5TWlzbWF0Y2g9ITAsIShzLl9pc1ZhbGlkPSExKSkpcmV0dXJuO2UuX2E9cixlLl90em09ZnVuY3Rpb24oZSx0LG4pe2lmKGUpcmV0dXJuIFN0W2VdO2lmKHQpcmV0dXJuIDA7dmFyIHM9cGFyc2VJbnQobiwxMCksaT1zJTEwMDtyZXR1cm4ocy1pKS8xMDAqNjAraX0oaVs4XSxpWzldLGlbMTBdKSxlLl9kPUdlLmFwcGx5KG51bGwsZS5fYSksZS5fZC5zZXRVVENNaW51dGVzKGUuX2QuZ2V0VVRDTWludXRlcygpLWUuX3R6bSksZyhlKS5yZmMyODIyPSEwfWVsc2UgZS5faXNWYWxpZD0hMX1mdW5jdGlvbiBrdChlKXtpZihlLl9mIT09Yy5JU09fODYwMSlpZihlLl9mIT09Yy5SRkNfMjgyMil7ZS5fYT1bXSxnKGUpLmVtcHR5PSEwO3ZhciB0LG4scyxpLHIsYSxvLHUsbD1cIlwiK2UuX2ksZD1sLmxlbmd0aCxoPTA7Zm9yKHM9aihlLl9mLGUuX2xvY2FsZSkubWF0Y2goTil8fFtdLHQ9MDt0PHMubGVuZ3RoO3QrKylpPXNbdF0sKG49KGwubWF0Y2gobGUoaSxlKSl8fFtdKVswXSkmJigwPChyPWwuc3Vic3RyKDAsbC5pbmRleE9mKG4pKSkubGVuZ3RoJiZnKGUpLnVudXNlZElucHV0LnB1c2gociksbD1sLnNsaWNlKGwuaW5kZXhPZihuKStuLmxlbmd0aCksaCs9bi5sZW5ndGgpLEVbaV0/KG4/ZyhlKS5lbXB0eT0hMTpnKGUpLnVudXNlZFRva2Vucy5wdXNoKGkpLGE9aSx1PWUsbnVsbCE9KG89bikmJm0oaGUsYSkmJmhlW2FdKG8sdS5fYSx1LGEpKTplLl9zdHJpY3QmJiFuJiZnKGUpLnVudXNlZFRva2Vucy5wdXNoKGkpO2coZSkuY2hhcnNMZWZ0T3Zlcj1kLWgsMDxsLmxlbmd0aCYmZyhlKS51bnVzZWRJbnB1dC5wdXNoKGwpLGUuX2FbZ2VdPD0xMiYmITA9PT1nKGUpLmJpZ0hvdXImJjA8ZS5fYVtnZV0mJihnKGUpLmJpZ0hvdXI9dm9pZCAwKSxnKGUpLnBhcnNlZERhdGVQYXJ0cz1lLl9hLnNsaWNlKDApLGcoZSkubWVyaWRpZW09ZS5fbWVyaWRpZW0sZS5fYVtnZV09ZnVuY3Rpb24oZSx0LG4pe3ZhciBzO2lmKG51bGw9PW4pcmV0dXJuIHQ7cmV0dXJuIG51bGwhPWUubWVyaWRpZW1Ib3VyP2UubWVyaWRpZW1Ib3VyKHQsbik6KG51bGwhPWUuaXNQTSYmKChzPWUuaXNQTShuKSkmJnQ8MTImJih0Kz0xMiksc3x8MTIhPT10fHwodD0wKSksdCl9KGUuX2xvY2FsZSxlLl9hW2dlXSxlLl9tZXJpZGllbSksY3QoZSksZHQoZSl9ZWxzZSBEdChlKTtlbHNlIHZ0KGUpfWZ1bmN0aW9uIFl0KGUpe3ZhciB0LG4scyxpLHI9ZS5faSxhPWUuX2Y7cmV0dXJuIGUuX2xvY2FsZT1lLl9sb2NhbGV8fGx0KGUuX2wpLG51bGw9PT1yfHx2b2lkIDA9PT1hJiZcIlwiPT09cj92KHtudWxsSW5wdXQ6ITB9KTooXCJzdHJpbmdcIj09dHlwZW9mIHImJihlLl9pPXI9ZS5fbG9jYWxlLnByZXBhcnNlKHIpKSxTKHIpP25ldyBNKGR0KHIpKTooaChyKT9lLl9kPXI6byhhKT9mdW5jdGlvbihlKXt2YXIgdCxuLHMsaSxyO2lmKDA9PT1lLl9mLmxlbmd0aClyZXR1cm4gZyhlKS5pbnZhbGlkRm9ybWF0PSEwLGUuX2Q9bmV3IERhdGUoTmFOKTtmb3IoaT0wO2k8ZS5fZi5sZW5ndGg7aSsrKXI9MCx0PXcoe30sZSksbnVsbCE9ZS5fdXNlVVRDJiYodC5fdXNlVVRDPWUuX3VzZVVUQyksdC5fZj1lLl9mW2ldLGt0KHQpLHAodCkmJihyKz1nKHQpLmNoYXJzTGVmdE92ZXIscis9MTAqZyh0KS51bnVzZWRUb2tlbnMubGVuZ3RoLGcodCkuc2NvcmU9ciwobnVsbD09c3x8cjxzKSYmKHM9cixuPXQpKTtfKGUsbnx8dCl9KGUpOmE/a3QoZSk6bChuPSh0PWUpLl9pKT90Ll9kPW5ldyBEYXRlKGMubm93KCkpOmgobik/dC5fZD1uZXcgRGF0ZShuLnZhbHVlT2YoKSk6XCJzdHJpbmdcIj09dHlwZW9mIG4/KHM9dCxudWxsPT09KGk9cHQuZXhlYyhzLl9pKSk/KHZ0KHMpLCExPT09cy5faXNWYWxpZCYmKGRlbGV0ZSBzLl9pc1ZhbGlkLER0KHMpLCExPT09cy5faXNWYWxpZCYmKGRlbGV0ZSBzLl9pc1ZhbGlkLGMuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2socykpKSk6cy5fZD1uZXcgRGF0ZSgraVsxXSkpOm8obik/KHQuX2E9ZihuLnNsaWNlKDApLGZ1bmN0aW9uKGUpe3JldHVybiBwYXJzZUludChlLDEwKX0pLGN0KHQpKTp1KG4pP2Z1bmN0aW9uKGUpe2lmKCFlLl9kKXt2YXIgdD1DKGUuX2kpO2UuX2E9ZihbdC55ZWFyLHQubW9udGgsdC5kYXl8fHQuZGF0ZSx0LmhvdXIsdC5taW51dGUsdC5zZWNvbmQsdC5taWxsaXNlY29uZF0sZnVuY3Rpb24oZSl7cmV0dXJuIGUmJnBhcnNlSW50KGUsMTApfSksY3QoZSl9fSh0KTpkKG4pP3QuX2Q9bmV3IERhdGUobik6Yy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayh0KSxwKGUpfHwoZS5fZD1udWxsKSxlKSl9ZnVuY3Rpb24gT3QoZSx0LG4scyxpKXt2YXIgcixhPXt9O3JldHVybiEwIT09biYmITEhPT1ufHwocz1uLG49dm9pZCAwKSwodShlKSYmZnVuY3Rpb24oZSl7aWYoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMpcmV0dXJuIDA9PT1PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhlKS5sZW5ndGg7dmFyIHQ7Zm9yKHQgaW4gZSlpZihlLmhhc093blByb3BlcnR5KHQpKXJldHVybiExO3JldHVybiEwfShlKXx8byhlKSYmMD09PWUubGVuZ3RoKSYmKGU9dm9pZCAwKSxhLl9pc0FNb21lbnRPYmplY3Q9ITAsYS5fdXNlVVRDPWEuX2lzVVRDPWksYS5fbD1uLGEuX2k9ZSxhLl9mPXQsYS5fc3RyaWN0PXMsKHI9bmV3IE0oZHQoWXQoYSkpKSkuX25leHREYXkmJihyLmFkZCgxLFwiZFwiKSxyLl9uZXh0RGF5PXZvaWQgMCkscn1mdW5jdGlvbiBUdChlLHQsbixzKXtyZXR1cm4gT3QoZSx0LG4scywhMSl9Yy5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjaz1uKFwidmFsdWUgcHJvdmlkZWQgaXMgbm90IGluIGEgcmVjb2duaXplZCBSRkMyODIyIG9yIElTTyBmb3JtYXQuIG1vbWVudCBjb25zdHJ1Y3Rpb24gZmFsbHMgYmFjayB0byBqcyBEYXRlKCksIHdoaWNoIGlzIG5vdCByZWxpYWJsZSBhY3Jvc3MgYWxsIGJyb3dzZXJzIGFuZCB2ZXJzaW9ucy4gTm9uIFJGQzI4MjIvSVNPIGRhdGUgZm9ybWF0cyBhcmUgZGlzY291cmFnZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyBtYWpvciByZWxlYXNlLiBQbGVhc2UgcmVmZXIgdG8gaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9qcy1kYXRlLyBmb3IgbW9yZSBpbmZvLlwiLGZ1bmN0aW9uKGUpe2UuX2Q9bmV3IERhdGUoZS5faSsoZS5fdXNlVVRDP1wiIFVUQ1wiOlwiXCIpKX0pLGMuSVNPXzg2MDE9ZnVuY3Rpb24oKXt9LGMuUkZDXzI4MjI9ZnVuY3Rpb24oKXt9O3ZhciB4dD1uKFwibW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3MvbWluLW1heC9cIixmdW5jdGlvbigpe3ZhciBlPVR0LmFwcGx5KG51bGwsYXJndW1lbnRzKTtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJmUuaXNWYWxpZCgpP2U8dGhpcz90aGlzOmU6digpfSksYnQ9bihcIm1vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwOi8vbW9tZW50anMuY29tL2d1aWRlcy8jL3dhcm5pbmdzL21pbi1tYXgvXCIsZnVuY3Rpb24oKXt2YXIgZT1UdC5hcHBseShudWxsLGFyZ3VtZW50cyk7cmV0dXJuIHRoaXMuaXNWYWxpZCgpJiZlLmlzVmFsaWQoKT90aGlzPGU/dGhpczplOnYoKX0pO2Z1bmN0aW9uIFB0KGUsdCl7dmFyIG4scztpZigxPT09dC5sZW5ndGgmJm8odFswXSkmJih0PXRbMF0pLCF0Lmxlbmd0aClyZXR1cm4gVHQoKTtmb3Iobj10WzBdLHM9MTtzPHQubGVuZ3RoOysrcyl0W3NdLmlzVmFsaWQoKSYmIXRbc11bZV0obil8fChuPXRbc10pO3JldHVybiBufXZhciBXdD1bXCJ5ZWFyXCIsXCJxdWFydGVyXCIsXCJtb250aFwiLFwid2Vla1wiLFwiZGF5XCIsXCJob3VyXCIsXCJtaW51dGVcIixcInNlY29uZFwiLFwibWlsbGlzZWNvbmRcIl07ZnVuY3Rpb24gSHQoZSl7dmFyIHQ9QyhlKSxuPXQueWVhcnx8MCxzPXQucXVhcnRlcnx8MCxpPXQubW9udGh8fDAscj10LndlZWt8fDAsYT10LmRheXx8MCxvPXQuaG91cnx8MCx1PXQubWludXRlfHwwLGw9dC5zZWNvbmR8fDAsZD10Lm1pbGxpc2Vjb25kfHwwO3RoaXMuX2lzVmFsaWQ9ZnVuY3Rpb24oZSl7Zm9yKHZhciB0IGluIGUpaWYoLTE9PT1ZZS5jYWxsKFd0LHQpfHxudWxsIT1lW3RdJiZpc05hTihlW3RdKSlyZXR1cm4hMTtmb3IodmFyIG49ITEscz0wO3M8V3QubGVuZ3RoOysrcylpZihlW1d0W3NdXSl7aWYobilyZXR1cm4hMTtwYXJzZUZsb2F0KGVbV3Rbc11dKSE9PWsoZVtXdFtzXV0pJiYobj0hMCl9cmV0dXJuITB9KHQpLHRoaXMuX21pbGxpc2Vjb25kcz0rZCsxZTMqbCs2ZTQqdSsxZTMqbyo2MCo2MCx0aGlzLl9kYXlzPSthKzcqcix0aGlzLl9tb250aHM9K2krMypzKzEyKm4sdGhpcy5fZGF0YT17fSx0aGlzLl9sb2NhbGU9bHQoKSx0aGlzLl9idWJibGUoKX1mdW5jdGlvbiBSdChlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEh0fWZ1bmN0aW9uIEN0KGUpe3JldHVybiBlPDA/LTEqTWF0aC5yb3VuZCgtMSplKTpNYXRoLnJvdW5kKGUpfWZ1bmN0aW9uIEZ0KGUsbil7SShlLDAsMCxmdW5jdGlvbigpe3ZhciBlPXRoaXMudXRjT2Zmc2V0KCksdD1cIitcIjtyZXR1cm4gZTwwJiYoZT0tZSx0PVwiLVwiKSx0K1Uofn4oZS82MCksMikrbitVKH5+ZSU2MCwyKX0pfUZ0KFwiWlwiLFwiOlwiKSxGdChcIlpaXCIsXCJcIiksdWUoXCJaXCIscmUpLHVlKFwiWlpcIixyZSksY2UoW1wiWlwiLFwiWlpcIl0sZnVuY3Rpb24oZSx0LG4pe24uX3VzZVVUQz0hMCxuLl90em09VXQocmUsZSl9KTt2YXIgTHQ9LyhbXFwrXFwtXXxcXGRcXGQpL2dpO2Z1bmN0aW9uIFV0KGUsdCl7dmFyIG49KHR8fFwiXCIpLm1hdGNoKGUpO2lmKG51bGw9PT1uKXJldHVybiBudWxsO3ZhciBzPSgobltuLmxlbmd0aC0xXXx8W10pK1wiXCIpLm1hdGNoKEx0KXx8W1wiLVwiLDAsMF0saT02MCpzWzFdK2soc1syXSk7cmV0dXJuIDA9PT1pPzA6XCIrXCI9PT1zWzBdP2k6LWl9ZnVuY3Rpb24gTnQoZSx0KXt2YXIgbixzO3JldHVybiB0Ll9pc1VUQz8obj10LmNsb25lKCkscz0oUyhlKXx8aChlKT9lLnZhbHVlT2YoKTpUdChlKS52YWx1ZU9mKCkpLW4udmFsdWVPZigpLG4uX2Quc2V0VGltZShuLl9kLnZhbHVlT2YoKStzKSxjLnVwZGF0ZU9mZnNldChuLCExKSxuKTpUdChlKS5sb2NhbCgpfWZ1bmN0aW9uIEd0KGUpe3JldHVybiAxNSotTWF0aC5yb3VuZChlLl9kLmdldFRpbWV6b25lT2Zmc2V0KCkvMTUpfWZ1bmN0aW9uIFZ0KCl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmKHRoaXMuX2lzVVRDJiYwPT09dGhpcy5fb2Zmc2V0KX1jLnVwZGF0ZU9mZnNldD1mdW5jdGlvbigpe307dmFyIEV0PS9eKFxcLXxcXCspPyg/OihcXGQqKVsuIF0pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKShcXC5cXGQqKT8pPyQvLEl0PS9eKC18XFwrKT9QKD86KFstK10/WzAtOSwuXSopWSk/KD86KFstK10/WzAtOSwuXSopTSk/KD86KFstK10/WzAtOSwuXSopVyk/KD86KFstK10/WzAtOSwuXSopRCk/KD86VCg/OihbLStdP1swLTksLl0qKUgpPyg/OihbLStdP1swLTksLl0qKU0pPyg/OihbLStdP1swLTksLl0qKVMpPyk/JC87ZnVuY3Rpb24gQXQoZSx0KXt2YXIgbixzLGkscj1lLGE9bnVsbDtyZXR1cm4gUnQoZSk/cj17bXM6ZS5fbWlsbGlzZWNvbmRzLGQ6ZS5fZGF5cyxNOmUuX21vbnRoc306ZChlKT8ocj17fSx0P3JbdF09ZTpyLm1pbGxpc2Vjb25kcz1lKTooYT1FdC5leGVjKGUpKT8obj1cIi1cIj09PWFbMV0/LTE6MSxyPXt5OjAsZDprKGFbeWVdKSpuLGg6ayhhW2dlXSkqbixtOmsoYVtwZV0pKm4sczprKGFbdmVdKSpuLG1zOmsoQ3QoMWUzKmFbd2VdKSkqbn0pOihhPUl0LmV4ZWMoZSkpPyhuPVwiLVwiPT09YVsxXT8tMTooYVsxXSwxKSxyPXt5Omp0KGFbMl0sbiksTTpqdChhWzNdLG4pLHc6anQoYVs0XSxuKSxkOmp0KGFbNV0sbiksaDpqdChhWzZdLG4pLG06anQoYVs3XSxuKSxzOmp0KGFbOF0sbil9KTpudWxsPT1yP3I9e306XCJvYmplY3RcIj09dHlwZW9mIHImJihcImZyb21cImluIHJ8fFwidG9cImluIHIpJiYoaT1mdW5jdGlvbihlLHQpe3ZhciBuO2lmKCFlLmlzVmFsaWQoKXx8IXQuaXNWYWxpZCgpKXJldHVybnttaWxsaXNlY29uZHM6MCxtb250aHM6MH07dD1OdCh0LGUpLGUuaXNCZWZvcmUodCk/bj1adChlLHQpOigobj1adCh0LGUpKS5taWxsaXNlY29uZHM9LW4ubWlsbGlzZWNvbmRzLG4ubW9udGhzPS1uLm1vbnRocyk7cmV0dXJuIG59KFR0KHIuZnJvbSksVHQoci50bykpLChyPXt9KS5tcz1pLm1pbGxpc2Vjb25kcyxyLk09aS5tb250aHMpLHM9bmV3IEh0KHIpLFJ0KGUpJiZtKGUsXCJfbG9jYWxlXCIpJiYocy5fbG9jYWxlPWUuX2xvY2FsZSksc31mdW5jdGlvbiBqdChlLHQpe3ZhciBuPWUmJnBhcnNlRmxvYXQoZS5yZXBsYWNlKFwiLFwiLFwiLlwiKSk7cmV0dXJuKGlzTmFOKG4pPzA6bikqdH1mdW5jdGlvbiBadChlLHQpe3ZhciBuPXttaWxsaXNlY29uZHM6MCxtb250aHM6MH07cmV0dXJuIG4ubW9udGhzPXQubW9udGgoKS1lLm1vbnRoKCkrMTIqKHQueWVhcigpLWUueWVhcigpKSxlLmNsb25lKCkuYWRkKG4ubW9udGhzLFwiTVwiKS5pc0FmdGVyKHQpJiYtLW4ubW9udGhzLG4ubWlsbGlzZWNvbmRzPSt0LStlLmNsb25lKCkuYWRkKG4ubW9udGhzLFwiTVwiKSxufWZ1bmN0aW9uIHp0KHMsaSl7cmV0dXJuIGZ1bmN0aW9uKGUsdCl7dmFyIG47cmV0dXJuIG51bGw9PT10fHxpc05hTigrdCl8fChUKGksXCJtb21lbnQoKS5cIitpK1wiKHBlcmlvZCwgbnVtYmVyKSBpcyBkZXByZWNhdGVkLiBQbGVhc2UgdXNlIG1vbWVudCgpLlwiK2krXCIobnVtYmVyLCBwZXJpb2QpLiBTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9hZGQtaW52ZXJ0ZWQtcGFyYW0vIGZvciBtb3JlIGluZm8uXCIpLG49ZSxlPXQsdD1uKSwkdCh0aGlzLEF0KGU9XCJzdHJpbmdcIj09dHlwZW9mIGU/K2U6ZSx0KSxzKSx0aGlzfX1mdW5jdGlvbiAkdChlLHQsbixzKXt2YXIgaT10Ll9taWxsaXNlY29uZHMscj1DdCh0Ll9kYXlzKSxhPUN0KHQuX21vbnRocyk7ZS5pc1ZhbGlkKCkmJihzPW51bGw9PXN8fHMsYSYmQ2UoZSx4ZShlLFwiTW9udGhcIikrYSpuKSxyJiZiZShlLFwiRGF0ZVwiLHhlKGUsXCJEYXRlXCIpK3IqbiksaSYmZS5fZC5zZXRUaW1lKGUuX2QudmFsdWVPZigpK2kqbikscyYmYy51cGRhdGVPZmZzZXQoZSxyfHxhKSl9QXQuZm49SHQucHJvdG90eXBlLEF0LmludmFsaWQ9ZnVuY3Rpb24oKXtyZXR1cm4gQXQoTmFOKX07dmFyIHF0PXp0KDEsXCJhZGRcIiksSnQ9enQoLTEsXCJzdWJ0cmFjdFwiKTtmdW5jdGlvbiBCdChlLHQpe3ZhciBuPTEyKih0LnllYXIoKS1lLnllYXIoKSkrKHQubW9udGgoKS1lLm1vbnRoKCkpLHM9ZS5jbG9uZSgpLmFkZChuLFwibW9udGhzXCIpO3JldHVybi0obisodC1zPDA/KHQtcykvKHMtZS5jbG9uZSgpLmFkZChuLTEsXCJtb250aHNcIikpOih0LXMpLyhlLmNsb25lKCkuYWRkKG4rMSxcIm1vbnRoc1wiKS1zKSkpfHwwfWZ1bmN0aW9uIFF0KGUpe3ZhciB0O3JldHVybiB2b2lkIDA9PT1lP3RoaXMuX2xvY2FsZS5fYWJicjoobnVsbCE9KHQ9bHQoZSkpJiYodGhpcy5fbG9jYWxlPXQpLHRoaXMpfWMuZGVmYXVsdEZvcm1hdD1cIllZWVktTU0tRERUSEg6bW06c3NaXCIsYy5kZWZhdWx0Rm9ybWF0VXRjPVwiWVlZWS1NTS1ERFRISDptbTpzc1taXVwiO3ZhciBYdD1uKFwibW9tZW50KCkubGFuZygpIGlzIGRlcHJlY2F0ZWQuIEluc3RlYWQsIHVzZSBtb21lbnQoKS5sb2NhbGVEYXRhKCkgdG8gZ2V0IHRoZSBsYW5ndWFnZSBjb25maWd1cmF0aW9uLiBVc2UgbW9tZW50KCkubG9jYWxlKCkgdG8gY2hhbmdlIGxhbmd1YWdlcy5cIixmdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09ZT90aGlzLmxvY2FsZURhdGEoKTp0aGlzLmxvY2FsZShlKX0pO2Z1bmN0aW9uIEt0KCl7cmV0dXJuIHRoaXMuX2xvY2FsZX1mdW5jdGlvbiBlbihlLHQpe0koMCxbZSxlLmxlbmd0aF0sMCx0KX1mdW5jdGlvbiB0bihlLHQsbixzLGkpe3ZhciByO3JldHVybiBudWxsPT1lP0llKHRoaXMscyxpKS55ZWFyOigocj1BZShlLHMsaSkpPHQmJih0PXIpLGZ1bmN0aW9uKGUsdCxuLHMsaSl7dmFyIHI9RWUoZSx0LG4scyxpKSxhPUdlKHIueWVhciwwLHIuZGF5T2ZZZWFyKTtyZXR1cm4gdGhpcy55ZWFyKGEuZ2V0VVRDRnVsbFllYXIoKSksdGhpcy5tb250aChhLmdldFVUQ01vbnRoKCkpLHRoaXMuZGF0ZShhLmdldFVUQ0RhdGUoKSksdGhpc30uY2FsbCh0aGlzLGUsdCxuLHMsaSkpfUkoMCxbXCJnZ1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy53ZWVrWWVhcigpJTEwMH0pLEkoMCxbXCJHR1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc29XZWVrWWVhcigpJTEwMH0pLGVuKFwiZ2dnZ1wiLFwid2Vla1llYXJcIiksZW4oXCJnZ2dnZ1wiLFwid2Vla1llYXJcIiksZW4oXCJHR0dHXCIsXCJpc29XZWVrWWVhclwiKSxlbihcIkdHR0dHXCIsXCJpc29XZWVrWWVhclwiKSxIKFwid2Vla1llYXJcIixcImdnXCIpLEgoXCJpc29XZWVrWWVhclwiLFwiR0dcIiksTChcIndlZWtZZWFyXCIsMSksTChcImlzb1dlZWtZZWFyXCIsMSksdWUoXCJHXCIsc2UpLHVlKFwiZ1wiLHNlKSx1ZShcIkdHXCIsQix6KSx1ZShcImdnXCIsQix6KSx1ZShcIkdHR0dcIixlZSxxKSx1ZShcImdnZ2dcIixlZSxxKSx1ZShcIkdHR0dHXCIsdGUsSiksdWUoXCJnZ2dnZ1wiLHRlLEopLGZlKFtcImdnZ2dcIixcImdnZ2dnXCIsXCJHR0dHXCIsXCJHR0dHR1wiXSxmdW5jdGlvbihlLHQsbixzKXt0W3Muc3Vic3RyKDAsMildPWsoZSl9KSxmZShbXCJnZ1wiLFwiR0dcIl0sZnVuY3Rpb24oZSx0LG4scyl7dFtzXT1jLnBhcnNlVHdvRGlnaXRZZWFyKGUpfSksSShcIlFcIiwwLFwiUW9cIixcInF1YXJ0ZXJcIiksSChcInF1YXJ0ZXJcIixcIlFcIiksTChcInF1YXJ0ZXJcIiw3KSx1ZShcIlFcIixaKSxjZShcIlFcIixmdW5jdGlvbihlLHQpe3RbX2VdPTMqKGsoZSktMSl9KSxJKFwiRFwiLFtcIkREXCIsMl0sXCJEb1wiLFwiZGF0ZVwiKSxIKFwiZGF0ZVwiLFwiRFwiKSxMKFwiZGF0ZVwiLDkpLHVlKFwiRFwiLEIpLHVlKFwiRERcIixCLHopLHVlKFwiRG9cIixmdW5jdGlvbihlLHQpe3JldHVybiBlP3QuX2RheU9mTW9udGhPcmRpbmFsUGFyc2V8fHQuX29yZGluYWxQYXJzZTp0Ll9kYXlPZk1vbnRoT3JkaW5hbFBhcnNlTGVuaWVudH0pLGNlKFtcIkRcIixcIkREXCJdLHllKSxjZShcIkRvXCIsZnVuY3Rpb24oZSx0KXt0W3llXT1rKGUubWF0Y2goQilbMF0pfSk7dmFyIG5uPVRlKFwiRGF0ZVwiLCEwKTtJKFwiREREXCIsW1wiRERERFwiLDNdLFwiREREb1wiLFwiZGF5T2ZZZWFyXCIpLEgoXCJkYXlPZlllYXJcIixcIkRERFwiKSxMKFwiZGF5T2ZZZWFyXCIsNCksdWUoXCJERERcIixLKSx1ZShcIkRERERcIiwkKSxjZShbXCJERERcIixcIkRERERcIl0sZnVuY3Rpb24oZSx0LG4pe24uX2RheU9mWWVhcj1rKGUpfSksSShcIm1cIixbXCJtbVwiLDJdLDAsXCJtaW51dGVcIiksSChcIm1pbnV0ZVwiLFwibVwiKSxMKFwibWludXRlXCIsMTQpLHVlKFwibVwiLEIpLHVlKFwibW1cIixCLHopLGNlKFtcIm1cIixcIm1tXCJdLHBlKTt2YXIgc249VGUoXCJNaW51dGVzXCIsITEpO0koXCJzXCIsW1wic3NcIiwyXSwwLFwic2Vjb25kXCIpLEgoXCJzZWNvbmRcIixcInNcIiksTChcInNlY29uZFwiLDE1KSx1ZShcInNcIixCKSx1ZShcInNzXCIsQix6KSxjZShbXCJzXCIsXCJzc1wiXSx2ZSk7dmFyIHJuLGFuPVRlKFwiU2Vjb25kc1wiLCExKTtmb3IoSShcIlNcIiwwLDAsZnVuY3Rpb24oKXtyZXR1cm5+fih0aGlzLm1pbGxpc2Vjb25kKCkvMTAwKX0pLEkoMCxbXCJTU1wiLDJdLDAsZnVuY3Rpb24oKXtyZXR1cm5+fih0aGlzLm1pbGxpc2Vjb25kKCkvMTApfSksSSgwLFtcIlNTU1wiLDNdLDAsXCJtaWxsaXNlY29uZFwiKSxJKDAsW1wiU1NTU1wiLDRdLDAsZnVuY3Rpb24oKXtyZXR1cm4gMTAqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTXCIsNV0sMCxmdW5jdGlvbigpe3JldHVybiAxMDAqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1wiLDZdLDAsZnVuY3Rpb24oKXtyZXR1cm4gMWUzKnRoaXMubWlsbGlzZWNvbmQoKX0pLEkoMCxbXCJTU1NTU1NTXCIsN10sMCxmdW5jdGlvbigpe3JldHVybiAxZTQqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1NTXCIsOF0sMCxmdW5jdGlvbigpe3JldHVybiAxZTUqdGhpcy5taWxsaXNlY29uZCgpfSksSSgwLFtcIlNTU1NTU1NTU1wiLDldLDAsZnVuY3Rpb24oKXtyZXR1cm4gMWU2KnRoaXMubWlsbGlzZWNvbmQoKX0pLEgoXCJtaWxsaXNlY29uZFwiLFwibXNcIiksTChcIm1pbGxpc2Vjb25kXCIsMTYpLHVlKFwiU1wiLEssWiksdWUoXCJTU1wiLEsseiksdWUoXCJTU1NcIixLLCQpLHJuPVwiU1NTU1wiO3JuLmxlbmd0aDw9OTtybis9XCJTXCIpdWUocm4sbmUpO2Z1bmN0aW9uIG9uKGUsdCl7dFt3ZV09aygxZTMqKFwiMC5cIitlKSl9Zm9yKHJuPVwiU1wiO3JuLmxlbmd0aDw9OTtybis9XCJTXCIpY2Uocm4sb24pO3ZhciB1bj1UZShcIk1pbGxpc2Vjb25kc1wiLCExKTtJKFwielwiLDAsMCxcInpvbmVBYmJyXCIpLEkoXCJ6elwiLDAsMCxcInpvbmVOYW1lXCIpO3ZhciBsbj1NLnByb3RvdHlwZTtmdW5jdGlvbiBkbihlKXtyZXR1cm4gZX1sbi5hZGQ9cXQsbG4uY2FsZW5kYXI9ZnVuY3Rpb24oZSx0KXt2YXIgbj1lfHxUdCgpLHM9TnQobix0aGlzKS5zdGFydE9mKFwiZGF5XCIpLGk9Yy5jYWxlbmRhckZvcm1hdCh0aGlzLHMpfHxcInNhbWVFbHNlXCIscj10JiYoeCh0W2ldKT90W2ldLmNhbGwodGhpcyxuKTp0W2ldKTtyZXR1cm4gdGhpcy5mb3JtYXQocnx8dGhpcy5sb2NhbGVEYXRhKCkuY2FsZW5kYXIoaSx0aGlzLFR0KG4pKSl9LGxuLmNsb25lPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBNKHRoaXMpfSxsbi5kaWZmPWZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpLHI7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBOYU47aWYoIShzPU50KGUsdGhpcykpLmlzVmFsaWQoKSlyZXR1cm4gTmFOO3N3aXRjaChpPTZlNCoocy51dGNPZmZzZXQoKS10aGlzLnV0Y09mZnNldCgpKSx0PVIodCkpe2Nhc2VcInllYXJcIjpyPUJ0KHRoaXMscykvMTI7YnJlYWs7Y2FzZVwibW9udGhcIjpyPUJ0KHRoaXMscyk7YnJlYWs7Y2FzZVwicXVhcnRlclwiOnI9QnQodGhpcyxzKS8zO2JyZWFrO2Nhc2VcInNlY29uZFwiOnI9KHRoaXMtcykvMWUzO2JyZWFrO2Nhc2VcIm1pbnV0ZVwiOnI9KHRoaXMtcykvNmU0O2JyZWFrO2Nhc2VcImhvdXJcIjpyPSh0aGlzLXMpLzM2ZTU7YnJlYWs7Y2FzZVwiZGF5XCI6cj0odGhpcy1zLWkpLzg2NGU1O2JyZWFrO2Nhc2VcIndlZWtcIjpyPSh0aGlzLXMtaSkvNjA0OGU1O2JyZWFrO2RlZmF1bHQ6cj10aGlzLXN9cmV0dXJuIG4/cjpEKHIpfSxsbi5lbmRPZj1mdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09KGU9UihlKSl8fFwibWlsbGlzZWNvbmRcIj09PWU/dGhpczooXCJkYXRlXCI9PT1lJiYoZT1cImRheVwiKSx0aGlzLnN0YXJ0T2YoZSkuYWRkKDEsXCJpc29XZWVrXCI9PT1lP1wid2Vla1wiOmUpLnN1YnRyYWN0KDEsXCJtc1wiKSl9LGxuLmZvcm1hdD1mdW5jdGlvbihlKXtlfHwoZT10aGlzLmlzVXRjKCk/Yy5kZWZhdWx0Rm9ybWF0VXRjOmMuZGVmYXVsdEZvcm1hdCk7dmFyIHQ9QSh0aGlzLGUpO3JldHVybiB0aGlzLmxvY2FsZURhdGEoKS5wb3N0Zm9ybWF0KHQpfSxsbi5mcm9tPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHRoaXMuaXNWYWxpZCgpJiYoUyhlKSYmZS5pc1ZhbGlkKCl8fFR0KGUpLmlzVmFsaWQoKSk/QXQoe3RvOnRoaXMsZnJvbTplfSkubG9jYWxlKHRoaXMubG9jYWxlKCkpLmh1bWFuaXplKCF0KTp0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpfSxsbi5mcm9tTm93PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmZyb20oVHQoKSxlKX0sbG4udG89ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdGhpcy5pc1ZhbGlkKCkmJihTKGUpJiZlLmlzVmFsaWQoKXx8VHQoZSkuaXNWYWxpZCgpKT9BdCh7ZnJvbTp0aGlzLHRvOmV9KS5sb2NhbGUodGhpcy5sb2NhbGUoKSkuaHVtYW5pemUoIXQpOnRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCl9LGxuLnRvTm93PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLnRvKFR0KCksZSl9LGxuLmdldD1mdW5jdGlvbihlKXtyZXR1cm4geCh0aGlzW2U9UihlKV0pP3RoaXNbZV0oKTp0aGlzfSxsbi5pbnZhbGlkQXQ9ZnVuY3Rpb24oKXtyZXR1cm4gZyh0aGlzKS5vdmVyZmxvd30sbG4uaXNBZnRlcj1mdW5jdGlvbihlLHQpe3ZhciBuPVMoZSk/ZTpUdChlKTtyZXR1cm4hKCF0aGlzLmlzVmFsaWQoKXx8IW4uaXNWYWxpZCgpKSYmKFwibWlsbGlzZWNvbmRcIj09PSh0PVIobCh0KT9cIm1pbGxpc2Vjb25kXCI6dCkpP3RoaXMudmFsdWVPZigpPm4udmFsdWVPZigpOm4udmFsdWVPZigpPHRoaXMuY2xvbmUoKS5zdGFydE9mKHQpLnZhbHVlT2YoKSl9LGxuLmlzQmVmb3JlPWZ1bmN0aW9uKGUsdCl7dmFyIG49UyhlKT9lOlR0KGUpO3JldHVybiEoIXRoaXMuaXNWYWxpZCgpfHwhbi5pc1ZhbGlkKCkpJiYoXCJtaWxsaXNlY29uZFwiPT09KHQ9UihsKHQpP1wibWlsbGlzZWNvbmRcIjp0KSk/dGhpcy52YWx1ZU9mKCk8bi52YWx1ZU9mKCk6dGhpcy5jbG9uZSgpLmVuZE9mKHQpLnZhbHVlT2YoKTxuLnZhbHVlT2YoKSl9LGxuLmlzQmV0d2Vlbj1mdW5jdGlvbihlLHQsbixzKXtyZXR1cm4oXCIoXCI9PT0ocz1zfHxcIigpXCIpWzBdP3RoaXMuaXNBZnRlcihlLG4pOiF0aGlzLmlzQmVmb3JlKGUsbikpJiYoXCIpXCI9PT1zWzFdP3RoaXMuaXNCZWZvcmUodCxuKTohdGhpcy5pc0FmdGVyKHQsbikpfSxsbi5pc1NhbWU9ZnVuY3Rpb24oZSx0KXt2YXIgbixzPVMoZSk/ZTpUdChlKTtyZXR1cm4hKCF0aGlzLmlzVmFsaWQoKXx8IXMuaXNWYWxpZCgpKSYmKFwibWlsbGlzZWNvbmRcIj09PSh0PVIodHx8XCJtaWxsaXNlY29uZFwiKSk/dGhpcy52YWx1ZU9mKCk9PT1zLnZhbHVlT2YoKToobj1zLnZhbHVlT2YoKSx0aGlzLmNsb25lKCkuc3RhcnRPZih0KS52YWx1ZU9mKCk8PW4mJm48PXRoaXMuY2xvbmUoKS5lbmRPZih0KS52YWx1ZU9mKCkpKX0sbG4uaXNTYW1lT3JBZnRlcj1mdW5jdGlvbihlLHQpe3JldHVybiB0aGlzLmlzU2FtZShlLHQpfHx0aGlzLmlzQWZ0ZXIoZSx0KX0sbG4uaXNTYW1lT3JCZWZvcmU9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gdGhpcy5pc1NhbWUoZSx0KXx8dGhpcy5pc0JlZm9yZShlLHQpfSxsbi5pc1ZhbGlkPWZ1bmN0aW9uKCl7cmV0dXJuIHAodGhpcyl9LGxuLmxhbmc9WHQsbG4ubG9jYWxlPVF0LGxuLmxvY2FsZURhdGE9S3QsbG4ubWF4PWJ0LGxuLm1pbj14dCxsbi5wYXJzaW5nRmxhZ3M9ZnVuY3Rpb24oKXtyZXR1cm4gXyh7fSxnKHRoaXMpKX0sbG4uc2V0PWZ1bmN0aW9uKGUsdCl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGUpZm9yKHZhciBuPWZ1bmN0aW9uKGUpe3ZhciB0PVtdO2Zvcih2YXIgbiBpbiBlKXQucHVzaCh7dW5pdDpuLHByaW9yaXR5OkZbbl19KTtyZXR1cm4gdC5zb3J0KGZ1bmN0aW9uKGUsdCl7cmV0dXJuIGUucHJpb3JpdHktdC5wcmlvcml0eX0pLHR9KGU9QyhlKSkscz0wO3M8bi5sZW5ndGg7cysrKXRoaXNbbltzXS51bml0XShlW25bc10udW5pdF0pO2Vsc2UgaWYoeCh0aGlzW2U9UihlKV0pKXJldHVybiB0aGlzW2VdKHQpO3JldHVybiB0aGlzfSxsbi5zdGFydE9mPWZ1bmN0aW9uKGUpe3N3aXRjaChlPVIoZSkpe2Nhc2VcInllYXJcIjp0aGlzLm1vbnRoKDApO2Nhc2VcInF1YXJ0ZXJcIjpjYXNlXCJtb250aFwiOnRoaXMuZGF0ZSgxKTtjYXNlXCJ3ZWVrXCI6Y2FzZVwiaXNvV2Vla1wiOmNhc2VcImRheVwiOmNhc2VcImRhdGVcIjp0aGlzLmhvdXJzKDApO2Nhc2VcImhvdXJcIjp0aGlzLm1pbnV0ZXMoMCk7Y2FzZVwibWludXRlXCI6dGhpcy5zZWNvbmRzKDApO2Nhc2VcInNlY29uZFwiOnRoaXMubWlsbGlzZWNvbmRzKDApfXJldHVyblwid2Vla1wiPT09ZSYmdGhpcy53ZWVrZGF5KDApLFwiaXNvV2Vla1wiPT09ZSYmdGhpcy5pc29XZWVrZGF5KDEpLFwicXVhcnRlclwiPT09ZSYmdGhpcy5tb250aCgzKk1hdGguZmxvb3IodGhpcy5tb250aCgpLzMpKSx0aGlzfSxsbi5zdWJ0cmFjdD1KdCxsbi50b0FycmF5PWZ1bmN0aW9uKCl7dmFyIGU9dGhpcztyZXR1cm5bZS55ZWFyKCksZS5tb250aCgpLGUuZGF0ZSgpLGUuaG91cigpLGUubWludXRlKCksZS5zZWNvbmQoKSxlLm1pbGxpc2Vjb25kKCldfSxsbi50b09iamVjdD1mdW5jdGlvbigpe3ZhciBlPXRoaXM7cmV0dXJue3llYXJzOmUueWVhcigpLG1vbnRoczplLm1vbnRoKCksZGF0ZTplLmRhdGUoKSxob3VyczplLmhvdXJzKCksbWludXRlczplLm1pbnV0ZXMoKSxzZWNvbmRzOmUuc2Vjb25kcygpLG1pbGxpc2Vjb25kczplLm1pbGxpc2Vjb25kcygpfX0sbG4udG9EYXRlPWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBEYXRlKHRoaXMudmFsdWVPZigpKX0sbG4udG9JU09TdHJpbmc9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsO3ZhciB0PSEwIT09ZSxuPXQ/dGhpcy5jbG9uZSgpLnV0YygpOnRoaXM7cmV0dXJuIG4ueWVhcigpPDB8fDk5OTk8bi55ZWFyKCk/QShuLHQ/XCJZWVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1cIjpcIllZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1pcIik6eChEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZyk/dD90aGlzLnRvRGF0ZSgpLnRvSVNPU3RyaW5nKCk6bmV3IERhdGUodGhpcy52YWx1ZU9mKCkrNjAqdGhpcy51dGNPZmZzZXQoKSoxZTMpLnRvSVNPU3RyaW5nKCkucmVwbGFjZShcIlpcIixBKG4sXCJaXCIpKTpBKG4sdD9cIllZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1cIjpcIllZWVktTU0tRERbVF1ISDptbTpzcy5TU1NaXCIpfSxsbi5pbnNwZWN0PWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVyblwibW9tZW50LmludmFsaWQoLyogXCIrdGhpcy5faStcIiAqLylcIjt2YXIgZT1cIm1vbWVudFwiLHQ9XCJcIjt0aGlzLmlzTG9jYWwoKXx8KGU9MD09PXRoaXMudXRjT2Zmc2V0KCk/XCJtb21lbnQudXRjXCI6XCJtb21lbnQucGFyc2Vab25lXCIsdD1cIlpcIik7dmFyIG49XCJbXCIrZSsnKFwiXScscz0wPD10aGlzLnllYXIoKSYmdGhpcy55ZWFyKCk8PTk5OTk/XCJZWVlZXCI6XCJZWVlZWVlcIixpPXQrJ1tcIildJztyZXR1cm4gdGhpcy5mb3JtYXQobitzK1wiLU1NLUREW1RdSEg6bW06c3MuU1NTXCIraSl9LGxuLnRvSlNPTj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLnRvSVNPU3RyaW5nKCk6bnVsbH0sbG4udG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jbG9uZSgpLmxvY2FsZShcImVuXCIpLmZvcm1hdChcImRkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaXCIpfSxsbi51bml4PWZ1bmN0aW9uKCl7cmV0dXJuIE1hdGguZmxvb3IodGhpcy52YWx1ZU9mKCkvMWUzKX0sbG4udmFsdWVPZj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9kLnZhbHVlT2YoKS02ZTQqKHRoaXMuX29mZnNldHx8MCl9LGxuLmNyZWF0aW9uRGF0YT1mdW5jdGlvbigpe3JldHVybntpbnB1dDp0aGlzLl9pLGZvcm1hdDp0aGlzLl9mLGxvY2FsZTp0aGlzLl9sb2NhbGUsaXNVVEM6dGhpcy5faXNVVEMsc3RyaWN0OnRoaXMuX3N0cmljdH19LGxuLnllYXI9T2UsbG4uaXNMZWFwWWVhcj1mdW5jdGlvbigpe3JldHVybiBrZSh0aGlzLnllYXIoKSl9LGxuLndlZWtZZWFyPWZ1bmN0aW9uKGUpe3JldHVybiB0bi5jYWxsKHRoaXMsZSx0aGlzLndlZWsoKSx0aGlzLndlZWtkYXkoKSx0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3csdGhpcy5sb2NhbGVEYXRhKCkuX3dlZWsuZG95KX0sbG4uaXNvV2Vla1llYXI9ZnVuY3Rpb24oZSl7cmV0dXJuIHRuLmNhbGwodGhpcyxlLHRoaXMuaXNvV2VlaygpLHRoaXMuaXNvV2Vla2RheSgpLDEsNCl9LGxuLnF1YXJ0ZXI9bG4ucXVhcnRlcnM9ZnVuY3Rpb24oZSl7cmV0dXJuIG51bGw9PWU/TWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkrMSkvMyk6dGhpcy5tb250aCgzKihlLTEpK3RoaXMubW9udGgoKSUzKX0sbG4ubW9udGg9RmUsbG4uZGF5c0luTW9udGg9ZnVuY3Rpb24oKXtyZXR1cm4gUGUodGhpcy55ZWFyKCksdGhpcy5tb250aCgpKX0sbG4ud2Vlaz1sbi53ZWVrcz1mdW5jdGlvbihlKXt2YXIgdD10aGlzLmxvY2FsZURhdGEoKS53ZWVrKHRoaXMpO3JldHVybiBudWxsPT1lP3Q6dGhpcy5hZGQoNyooZS10KSxcImRcIil9LGxuLmlzb1dlZWs9bG4uaXNvV2Vla3M9ZnVuY3Rpb24oZSl7dmFyIHQ9SWUodGhpcywxLDQpLndlZWs7cmV0dXJuIG51bGw9PWU/dDp0aGlzLmFkZCg3KihlLXQpLFwiZFwiKX0sbG4ud2Vla3NJblllYXI9ZnVuY3Rpb24oKXt2YXIgZT10aGlzLmxvY2FsZURhdGEoKS5fd2VlaztyZXR1cm4gQWUodGhpcy55ZWFyKCksZS5kb3csZS5kb3kpfSxsbi5pc29XZWVrc0luWWVhcj1mdW5jdGlvbigpe3JldHVybiBBZSh0aGlzLnllYXIoKSwxLDQpfSxsbi5kYXRlPW5uLGxuLmRheT1sbi5kYXlzPWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gbnVsbCE9ZT90aGlzOk5hTjt2YXIgdCxuLHM9dGhpcy5faXNVVEM/dGhpcy5fZC5nZXRVVENEYXkoKTp0aGlzLl9kLmdldERheSgpO3JldHVybiBudWxsIT1lPyh0PWUsbj10aGlzLmxvY2FsZURhdGEoKSxlPVwic3RyaW5nXCIhPXR5cGVvZiB0P3Q6aXNOYU4odCk/XCJudW1iZXJcIj09dHlwZW9mKHQ9bi53ZWVrZGF5c1BhcnNlKHQpKT90Om51bGw6cGFyc2VJbnQodCwxMCksdGhpcy5hZGQoZS1zLFwiZFwiKSk6c30sbG4ud2Vla2RheT1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIG51bGwhPWU/dGhpczpOYU47dmFyIHQ9KHRoaXMuZGF5KCkrNy10aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3cpJTc7cmV0dXJuIG51bGw9PWU/dDp0aGlzLmFkZChlLXQsXCJkXCIpfSxsbi5pc29XZWVrZGF5PWZ1bmN0aW9uKGUpe2lmKCF0aGlzLmlzVmFsaWQoKSlyZXR1cm4gbnVsbCE9ZT90aGlzOk5hTjtpZihudWxsIT1lKXt2YXIgdD0obj1lLHM9dGhpcy5sb2NhbGVEYXRhKCksXCJzdHJpbmdcIj09dHlwZW9mIG4/cy53ZWVrZGF5c1BhcnNlKG4pJTd8fDc6aXNOYU4obik/bnVsbDpuKTtyZXR1cm4gdGhpcy5kYXkodGhpcy5kYXkoKSU3P3Q6dC03KX1yZXR1cm4gdGhpcy5kYXkoKXx8Nzt2YXIgbixzfSxsbi5kYXlPZlllYXI9ZnVuY3Rpb24oZSl7dmFyIHQ9TWF0aC5yb3VuZCgodGhpcy5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIiktdGhpcy5jbG9uZSgpLnN0YXJ0T2YoXCJ5ZWFyXCIpKS84NjRlNSkrMTtyZXR1cm4gbnVsbD09ZT90OnRoaXMuYWRkKGUtdCxcImRcIil9LGxuLmhvdXI9bG4uaG91cnM9dHQsbG4ubWludXRlPWxuLm1pbnV0ZXM9c24sbG4uc2Vjb25kPWxuLnNlY29uZHM9YW4sbG4ubWlsbGlzZWNvbmQ9bG4ubWlsbGlzZWNvbmRzPXVuLGxuLnV0Y09mZnNldD1mdW5jdGlvbihlLHQsbil7dmFyIHMsaT10aGlzLl9vZmZzZXR8fDA7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBudWxsIT1lP3RoaXM6TmFOO2lmKG51bGwhPWUpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiBlKXtpZihudWxsPT09KGU9VXQocmUsZSkpKXJldHVybiB0aGlzfWVsc2UgTWF0aC5hYnMoZSk8MTYmJiFuJiYoZSo9NjApO3JldHVybiF0aGlzLl9pc1VUQyYmdCYmKHM9R3QodGhpcykpLHRoaXMuX29mZnNldD1lLHRoaXMuX2lzVVRDPSEwLG51bGwhPXMmJnRoaXMuYWRkKHMsXCJtXCIpLGkhPT1lJiYoIXR8fHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3M/JHQodGhpcyxBdChlLWksXCJtXCIpLDEsITEpOnRoaXMuX2NoYW5nZUluUHJvZ3Jlc3N8fCh0aGlzLl9jaGFuZ2VJblByb2dyZXNzPSEwLGMudXBkYXRlT2Zmc2V0KHRoaXMsITApLHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3M9bnVsbCkpLHRoaXN9cmV0dXJuIHRoaXMuX2lzVVRDP2k6R3QodGhpcyl9LGxuLnV0Yz1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy51dGNPZmZzZXQoMCxlKX0sbG4ubG9jYWw9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2lzVVRDJiYodGhpcy51dGNPZmZzZXQoMCxlKSx0aGlzLl9pc1VUQz0hMSxlJiZ0aGlzLnN1YnRyYWN0KEd0KHRoaXMpLFwibVwiKSksdGhpc30sbG4ucGFyc2Vab25lPWZ1bmN0aW9uKCl7aWYobnVsbCE9dGhpcy5fdHptKXRoaXMudXRjT2Zmc2V0KHRoaXMuX3R6bSwhMSwhMCk7ZWxzZSBpZihcInN0cmluZ1wiPT10eXBlb2YgdGhpcy5faSl7dmFyIGU9VXQoaWUsdGhpcy5faSk7bnVsbCE9ZT90aGlzLnV0Y09mZnNldChlKTp0aGlzLnV0Y09mZnNldCgwLCEwKX1yZXR1cm4gdGhpc30sbG4uaGFzQWxpZ25lZEhvdXJPZmZzZXQ9ZnVuY3Rpb24oZSl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmKGU9ZT9UdChlKS51dGNPZmZzZXQoKTowLCh0aGlzLnV0Y09mZnNldCgpLWUpJTYwPT0wKX0sbG4uaXNEU1Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51dGNPZmZzZXQoKT50aGlzLmNsb25lKCkubW9udGgoMCkudXRjT2Zmc2V0KCl8fHRoaXMudXRjT2Zmc2V0KCk+dGhpcy5jbG9uZSgpLm1vbnRoKDUpLnV0Y09mZnNldCgpfSxsbi5pc0xvY2FsPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLmlzVmFsaWQoKSYmIXRoaXMuX2lzVVRDfSxsbi5pc1V0Y09mZnNldD1mdW5jdGlvbigpe3JldHVybiEhdGhpcy5pc1ZhbGlkKCkmJnRoaXMuX2lzVVRDfSxsbi5pc1V0Yz1WdCxsbi5pc1VUQz1WdCxsbi56b25lQWJicj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pc1VUQz9cIlVUQ1wiOlwiXCJ9LGxuLnpvbmVOYW1lPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2lzVVRDP1wiQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWVcIjpcIlwifSxsbi5kYXRlcz1uKFwiZGF0ZXMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIGRhdGUgaW5zdGVhZC5cIixubiksbG4ubW9udGhzPW4oXCJtb250aHMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbnRoIGluc3RlYWRcIixGZSksbG4ueWVhcnM9bihcInllYXJzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSB5ZWFyIGluc3RlYWRcIixPZSksbG4uem9uZT1uKFwibW9tZW50KCkuem9uZSBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50KCkudXRjT2Zmc2V0IGluc3RlYWQuIGh0dHA6Ly9tb21lbnRqcy5jb20vZ3VpZGVzLyMvd2FybmluZ3Mvem9uZS9cIixmdW5jdGlvbihlLHQpe3JldHVybiBudWxsIT1lPyhcInN0cmluZ1wiIT10eXBlb2YgZSYmKGU9LWUpLHRoaXMudXRjT2Zmc2V0KGUsdCksdGhpcyk6LXRoaXMudXRjT2Zmc2V0KCl9KSxsbi5pc0RTVFNoaWZ0ZWQ9bihcImlzRFNUU2hpZnRlZCBpcyBkZXByZWNhdGVkLiBTZWUgaHR0cDovL21vbWVudGpzLmNvbS9ndWlkZXMvIy93YXJuaW5ncy9kc3Qtc2hpZnRlZC8gZm9yIG1vcmUgaW5mb3JtYXRpb25cIixmdW5jdGlvbigpe2lmKCFsKHRoaXMuX2lzRFNUU2hpZnRlZCkpcmV0dXJuIHRoaXMuX2lzRFNUU2hpZnRlZDt2YXIgZT17fTtpZih3KGUsdGhpcyksKGU9WXQoZSkpLl9hKXt2YXIgdD1lLl9pc1VUQz95KGUuX2EpOlR0KGUuX2EpO3RoaXMuX2lzRFNUU2hpZnRlZD10aGlzLmlzVmFsaWQoKSYmMDxhKGUuX2EsdC50b0FycmF5KCkpfWVsc2UgdGhpcy5faXNEU1RTaGlmdGVkPSExO3JldHVybiB0aGlzLl9pc0RTVFNoaWZ0ZWR9KTt2YXIgaG49UC5wcm90b3R5cGU7ZnVuY3Rpb24gY24oZSx0LG4scyl7dmFyIGk9bHQoKSxyPXkoKS5zZXQocyx0KTtyZXR1cm4gaVtuXShyLGUpfWZ1bmN0aW9uIGZuKGUsdCxuKXtpZihkKGUpJiYodD1lLGU9dm9pZCAwKSxlPWV8fFwiXCIsbnVsbCE9dClyZXR1cm4gY24oZSx0LG4sXCJtb250aFwiKTt2YXIgcyxpPVtdO2ZvcihzPTA7czwxMjtzKyspaVtzXT1jbihlLHMsbixcIm1vbnRoXCIpO3JldHVybiBpfWZ1bmN0aW9uIG1uKGUsdCxuLHMpe1wiYm9vbGVhblwiPT10eXBlb2YgZT9kKHQpJiYobj10LHQ9dm9pZCAwKToodD1lLGU9ITEsZChuPXQpJiYobj10LHQ9dm9pZCAwKSksdD10fHxcIlwiO3ZhciBpLHI9bHQoKSxhPWU/ci5fd2Vlay5kb3c6MDtpZihudWxsIT1uKXJldHVybiBjbih0LChuK2EpJTcscyxcImRheVwiKTt2YXIgbz1bXTtmb3IoaT0wO2k8NztpKyspb1tpXT1jbih0LChpK2EpJTcscyxcImRheVwiKTtyZXR1cm4gb31obi5jYWxlbmRhcj1mdW5jdGlvbihlLHQsbil7dmFyIHM9dGhpcy5fY2FsZW5kYXJbZV18fHRoaXMuX2NhbGVuZGFyLnNhbWVFbHNlO3JldHVybiB4KHMpP3MuY2FsbCh0LG4pOnN9LGhuLmxvbmdEYXRlRm9ybWF0PWZ1bmN0aW9uKGUpe3ZhciB0PXRoaXMuX2xvbmdEYXRlRm9ybWF0W2VdLG49dGhpcy5fbG9uZ0RhdGVGb3JtYXRbZS50b1VwcGVyQ2FzZSgpXTtyZXR1cm4gdHx8IW4/dDoodGhpcy5fbG9uZ0RhdGVGb3JtYXRbZV09bi5yZXBsYWNlKC9NTU1NfE1NfEREfGRkZGQvZyxmdW5jdGlvbihlKXtyZXR1cm4gZS5zbGljZSgxKX0pLHRoaXMuX2xvbmdEYXRlRm9ybWF0W2VdKX0saG4uaW52YWxpZERhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faW52YWxpZERhdGV9LGhuLm9yZGluYWw9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZShcIiVkXCIsZSl9LGhuLnByZXBhcnNlPWRuLGhuLnBvc3Rmb3JtYXQ9ZG4saG4ucmVsYXRpdmVUaW1lPWZ1bmN0aW9uKGUsdCxuLHMpe3ZhciBpPXRoaXMuX3JlbGF0aXZlVGltZVtuXTtyZXR1cm4geChpKT9pKGUsdCxuLHMpOmkucmVwbGFjZSgvJWQvaSxlKX0saG4ucGFzdEZ1dHVyZT1mdW5jdGlvbihlLHQpe3ZhciBuPXRoaXMuX3JlbGF0aXZlVGltZVswPGU/XCJmdXR1cmVcIjpcInBhc3RcIl07cmV0dXJuIHgobik/bih0KTpuLnJlcGxhY2UoLyVzL2ksdCl9LGhuLnNldD1mdW5jdGlvbihlKXt2YXIgdCxuO2ZvcihuIGluIGUpeCh0PWVbbl0pP3RoaXNbbl09dDp0aGlzW1wiX1wiK25dPXQ7dGhpcy5fY29uZmlnPWUsdGhpcy5fZGF5T2ZNb250aE9yZGluYWxQYXJzZUxlbmllbnQ9bmV3IFJlZ0V4cCgodGhpcy5fZGF5T2ZNb250aE9yZGluYWxQYXJzZS5zb3VyY2V8fHRoaXMuX29yZGluYWxQYXJzZS5zb3VyY2UpK1wifFwiKy9cXGR7MSwyfS8uc291cmNlKX0saG4ubW9udGhzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl9tb250aHMpP3RoaXMuX21vbnRoc1tlLm1vbnRoKCldOnRoaXMuX21vbnRoc1sodGhpcy5fbW9udGhzLmlzRm9ybWF0fHxXZSkudGVzdCh0KT9cImZvcm1hdFwiOlwic3RhbmRhbG9uZVwiXVtlLm1vbnRoKCldOm8odGhpcy5fbW9udGhzKT90aGlzLl9tb250aHM6dGhpcy5fbW9udGhzLnN0YW5kYWxvbmV9LGhuLm1vbnRoc1Nob3J0PWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl9tb250aHNTaG9ydCk/dGhpcy5fbW9udGhzU2hvcnRbZS5tb250aCgpXTp0aGlzLl9tb250aHNTaG9ydFtXZS50ZXN0KHQpP1wiZm9ybWF0XCI6XCJzdGFuZGFsb25lXCJdW2UubW9udGgoKV06byh0aGlzLl9tb250aHNTaG9ydCk/dGhpcy5fbW9udGhzU2hvcnQ6dGhpcy5fbW9udGhzU2hvcnQuc3RhbmRhbG9uZX0saG4ubW9udGhzUGFyc2U9ZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscjtpZih0aGlzLl9tb250aHNQYXJzZUV4YWN0KXJldHVybiBmdW5jdGlvbihlLHQsbil7dmFyIHMsaSxyLGE9ZS50b0xvY2FsZUxvd2VyQ2FzZSgpO2lmKCF0aGlzLl9tb250aHNQYXJzZSlmb3IodGhpcy5fbW9udGhzUGFyc2U9W10sdGhpcy5fbG9uZ01vbnRoc1BhcnNlPVtdLHRoaXMuX3Nob3J0TW9udGhzUGFyc2U9W10scz0wO3M8MTI7KytzKXI9eShbMmUzLHNdKSx0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW3NdPXRoaXMubW9udGhzU2hvcnQocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX2xvbmdNb250aHNQYXJzZVtzXT10aGlzLm1vbnRocyhyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCk7cmV0dXJuIG4/XCJNTU1cIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6bnVsbDotMSE9PShpPVllLmNhbGwodGhpcy5fbG9uZ01vbnRoc1BhcnNlLGEpKT9pOm51bGw6XCJNTU1cIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX2xvbmdNb250aHNQYXJzZSxhKSk/aTpudWxsOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9sb25nTW9udGhzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0TW9udGhzUGFyc2UsYSkpP2k6bnVsbH0uY2FsbCh0aGlzLGUsdCxuKTtmb3IodGhpcy5fbW9udGhzUGFyc2V8fCh0aGlzLl9tb250aHNQYXJzZT1bXSx0aGlzLl9sb25nTW9udGhzUGFyc2U9W10sdGhpcy5fc2hvcnRNb250aHNQYXJzZT1bXSkscz0wO3M8MTI7cysrKXtpZihpPXkoWzJlMyxzXSksbiYmIXRoaXMuX2xvbmdNb250aHNQYXJzZVtzXSYmKHRoaXMuX2xvbmdNb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMubW9udGhzKGksXCJcIikucmVwbGFjZShcIi5cIixcIlwiKStcIiRcIixcImlcIiksdGhpcy5fc2hvcnRNb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMubW9udGhzU2hvcnQoaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXCIpK1wiJFwiLFwiaVwiKSksbnx8dGhpcy5fbW9udGhzUGFyc2Vbc118fChyPVwiXlwiK3RoaXMubW9udGhzKGksXCJcIikrXCJ8XlwiK3RoaXMubW9udGhzU2hvcnQoaSxcIlwiKSx0aGlzLl9tb250aHNQYXJzZVtzXT1uZXcgUmVnRXhwKHIucmVwbGFjZShcIi5cIixcIlwiKSxcImlcIikpLG4mJlwiTU1NTVwiPT09dCYmdGhpcy5fbG9uZ01vbnRoc1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHM7aWYobiYmXCJNTU1cIj09PXQmJnRoaXMuX3Nob3J0TW9udGhzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZighbiYmdGhpcy5fbW9udGhzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gc319LGhuLm1vbnRoc1JlZ2V4PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLl9tb250aHNQYXJzZUV4YWN0PyhtKHRoaXMsXCJfbW9udGhzUmVnZXhcIil8fE5lLmNhbGwodGhpcyksZT90aGlzLl9tb250aHNTdHJpY3RSZWdleDp0aGlzLl9tb250aHNSZWdleCk6KG0odGhpcyxcIl9tb250aHNSZWdleFwiKXx8KHRoaXMuX21vbnRoc1JlZ2V4PVVlKSx0aGlzLl9tb250aHNTdHJpY3RSZWdleCYmZT90aGlzLl9tb250aHNTdHJpY3RSZWdleDp0aGlzLl9tb250aHNSZWdleCl9LGhuLm1vbnRoc1Nob3J0UmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX21vbnRoc1BhcnNlRXhhY3Q/KG0odGhpcyxcIl9tb250aHNSZWdleFwiKXx8TmUuY2FsbCh0aGlzKSxlP3RoaXMuX21vbnRoc1Nob3J0U3RyaWN0UmVnZXg6dGhpcy5fbW9udGhzU2hvcnRSZWdleCk6KG0odGhpcyxcIl9tb250aHNTaG9ydFJlZ2V4XCIpfHwodGhpcy5fbW9udGhzU2hvcnRSZWdleD1MZSksdGhpcy5fbW9udGhzU2hvcnRTdHJpY3RSZWdleCYmZT90aGlzLl9tb250aHNTaG9ydFN0cmljdFJlZ2V4OnRoaXMuX21vbnRoc1Nob3J0UmVnZXgpfSxobi53ZWVrPWZ1bmN0aW9uKGUpe3JldHVybiBJZShlLHRoaXMuX3dlZWsuZG93LHRoaXMuX3dlZWsuZG95KS53ZWVrfSxobi5maXJzdERheU9mWWVhcj1mdW5jdGlvbigpe3JldHVybiB0aGlzLl93ZWVrLmRveX0saG4uZmlyc3REYXlPZldlZWs9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fd2Vlay5kb3d9LGhuLndlZWtkYXlzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU/byh0aGlzLl93ZWVrZGF5cyk/dGhpcy5fd2Vla2RheXNbZS5kYXkoKV06dGhpcy5fd2Vla2RheXNbdGhpcy5fd2Vla2RheXMuaXNGb3JtYXQudGVzdCh0KT9cImZvcm1hdFwiOlwic3RhbmRhbG9uZVwiXVtlLmRheSgpXTpvKHRoaXMuX3dlZWtkYXlzKT90aGlzLl93ZWVrZGF5czp0aGlzLl93ZWVrZGF5cy5zdGFuZGFsb25lfSxobi53ZWVrZGF5c01pbj1mdW5jdGlvbihlKXtyZXR1cm4gZT90aGlzLl93ZWVrZGF5c01pbltlLmRheSgpXTp0aGlzLl93ZWVrZGF5c01pbn0saG4ud2Vla2RheXNTaG9ydD1mdW5jdGlvbihlKXtyZXR1cm4gZT90aGlzLl93ZWVrZGF5c1Nob3J0W2UuZGF5KCldOnRoaXMuX3dlZWtkYXlzU2hvcnR9LGhuLndlZWtkYXlzUGFyc2U9ZnVuY3Rpb24oZSx0LG4pe3ZhciBzLGkscjtpZih0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3QpcmV0dXJuIGZ1bmN0aW9uKGUsdCxuKXt2YXIgcyxpLHIsYT1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7aWYoIXRoaXMuX3dlZWtkYXlzUGFyc2UpZm9yKHRoaXMuX3dlZWtkYXlzUGFyc2U9W10sdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlPVtdLHRoaXMuX21pbldlZWtkYXlzUGFyc2U9W10scz0wO3M8NzsrK3Mpcj15KFsyZTMsMV0pLmRheShzKSx0aGlzLl9taW5XZWVrZGF5c1BhcnNlW3NdPXRoaXMud2Vla2RheXNNaW4ocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZVtzXT10aGlzLndlZWtkYXlzU2hvcnQocixcIlwiKS50b0xvY2FsZUxvd2VyQ2FzZSgpLHRoaXMuX3dlZWtkYXlzUGFyc2Vbc109dGhpcy53ZWVrZGF5cyhyLFwiXCIpLnRvTG9jYWxlTG93ZXJDYXNlKCk7cmV0dXJuIG4/XCJkZGRkXCI9PT10Py0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6XCJkZGRcIj09PXQ/LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSxhKSk/aTpudWxsOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6XCJkZGRkXCI9PT10Py0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9zaG9ydFdlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6bnVsbDpcImRkZFwiPT09dD8tMSE9PShpPVllLmNhbGwodGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl93ZWVrZGF5c1BhcnNlLGEpKT9pOi0xIT09KGk9WWUuY2FsbCh0aGlzLl9taW5XZWVrZGF5c1BhcnNlLGEpKT9pOm51bGw6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX21pbldlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3dlZWtkYXlzUGFyc2UsYSkpP2k6LTEhPT0oaT1ZZS5jYWxsKHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZSxhKSk/aTpudWxsfS5jYWxsKHRoaXMsZSx0LG4pO2Zvcih0aGlzLl93ZWVrZGF5c1BhcnNlfHwodGhpcy5fd2Vla2RheXNQYXJzZT1bXSx0aGlzLl9taW5XZWVrZGF5c1BhcnNlPVtdLHRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZT1bXSx0aGlzLl9mdWxsV2Vla2RheXNQYXJzZT1bXSkscz0wO3M8NztzKyspe2lmKGk9eShbMmUzLDFdKS5kYXkocyksbiYmIXRoaXMuX2Z1bGxXZWVrZGF5c1BhcnNlW3NdJiYodGhpcy5fZnVsbFdlZWtkYXlzUGFyc2Vbc109bmV3IFJlZ0V4cChcIl5cIit0aGlzLndlZWtkYXlzKGksXCJcIikucmVwbGFjZShcIi5cIixcIlxcXFwuP1wiKStcIiRcIixcImlcIiksdGhpcy5fc2hvcnRXZWVrZGF5c1BhcnNlW3NdPW5ldyBSZWdFeHAoXCJeXCIrdGhpcy53ZWVrZGF5c1Nob3J0KGksXCJcIikucmVwbGFjZShcIi5cIixcIlxcXFwuP1wiKStcIiRcIixcImlcIiksdGhpcy5fbWluV2Vla2RheXNQYXJzZVtzXT1uZXcgUmVnRXhwKFwiXlwiK3RoaXMud2Vla2RheXNNaW4oaSxcIlwiKS5yZXBsYWNlKFwiLlwiLFwiXFxcXC4/XCIpK1wiJFwiLFwiaVwiKSksdGhpcy5fd2Vla2RheXNQYXJzZVtzXXx8KHI9XCJeXCIrdGhpcy53ZWVrZGF5cyhpLFwiXCIpK1wifF5cIit0aGlzLndlZWtkYXlzU2hvcnQoaSxcIlwiKStcInxeXCIrdGhpcy53ZWVrZGF5c01pbihpLFwiXCIpLHRoaXMuX3dlZWtkYXlzUGFyc2Vbc109bmV3IFJlZ0V4cChyLnJlcGxhY2UoXCIuXCIsXCJcIiksXCJpXCIpKSxuJiZcImRkZGRcIj09PXQmJnRoaXMuX2Z1bGxXZWVrZGF5c1BhcnNlW3NdLnRlc3QoZSkpcmV0dXJuIHM7aWYobiYmXCJkZGRcIj09PXQmJnRoaXMuX3Nob3J0V2Vla2RheXNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzO2lmKG4mJlwiZGRcIj09PXQmJnRoaXMuX21pbldlZWtkYXlzUGFyc2Vbc10udGVzdChlKSlyZXR1cm4gcztpZighbiYmdGhpcy5fd2Vla2RheXNQYXJzZVtzXS50ZXN0KGUpKXJldHVybiBzfX0saG4ud2Vla2RheXNSZWdleD1mdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fd2Vla2RheXNQYXJzZUV4YWN0PyhtKHRoaXMsXCJfd2Vla2RheXNSZWdleFwiKXx8QmUuY2FsbCh0aGlzKSxlP3RoaXMuX3dlZWtkYXlzU3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNSZWdleCk6KG0odGhpcyxcIl93ZWVrZGF5c1JlZ2V4XCIpfHwodGhpcy5fd2Vla2RheXNSZWdleD0kZSksdGhpcy5fd2Vla2RheXNTdHJpY3RSZWdleCYmZT90aGlzLl93ZWVrZGF5c1N0cmljdFJlZ2V4OnRoaXMuX3dlZWtkYXlzUmVnZXgpfSxobi53ZWVrZGF5c1Nob3J0UmVnZXg9ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX3dlZWtkYXlzUGFyc2VFeGFjdD8obSh0aGlzLFwiX3dlZWtkYXlzUmVnZXhcIil8fEJlLmNhbGwodGhpcyksZT90aGlzLl93ZWVrZGF5c1Nob3J0U3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNTaG9ydFJlZ2V4KToobSh0aGlzLFwiX3dlZWtkYXlzU2hvcnRSZWdleFwiKXx8KHRoaXMuX3dlZWtkYXlzU2hvcnRSZWdleD1xZSksdGhpcy5fd2Vla2RheXNTaG9ydFN0cmljdFJlZ2V4JiZlP3RoaXMuX3dlZWtkYXlzU2hvcnRTdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c1Nob3J0UmVnZXgpfSxobi53ZWVrZGF5c01pblJlZ2V4PWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLl93ZWVrZGF5c1BhcnNlRXhhY3Q/KG0odGhpcyxcIl93ZWVrZGF5c1JlZ2V4XCIpfHxCZS5jYWxsKHRoaXMpLGU/dGhpcy5fd2Vla2RheXNNaW5TdHJpY3RSZWdleDp0aGlzLl93ZWVrZGF5c01pblJlZ2V4KToobSh0aGlzLFwiX3dlZWtkYXlzTWluUmVnZXhcIil8fCh0aGlzLl93ZWVrZGF5c01pblJlZ2V4PUplKSx0aGlzLl93ZWVrZGF5c01pblN0cmljdFJlZ2V4JiZlP3RoaXMuX3dlZWtkYXlzTWluU3RyaWN0UmVnZXg6dGhpcy5fd2Vla2RheXNNaW5SZWdleCl9LGhuLmlzUE09ZnVuY3Rpb24oZSl7cmV0dXJuXCJwXCI9PT0oZStcIlwiKS50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKX0saG4ubWVyaWRpZW09ZnVuY3Rpb24oZSx0LG4pe3JldHVybiAxMTxlP24/XCJwbVwiOlwiUE1cIjpuP1wiYW1cIjpcIkFNXCJ9LG90KFwiZW5cIix7ZGF5T2ZNb250aE9yZGluYWxQYXJzZTovXFxkezEsMn0odGh8c3R8bmR8cmQpLyxvcmRpbmFsOmZ1bmN0aW9uKGUpe3ZhciB0PWUlMTA7cmV0dXJuIGUrKDE9PT1rKGUlMTAwLzEwKT9cInRoXCI6MT09PXQ/XCJzdFwiOjI9PT10P1wibmRcIjozPT09dD9cInJkXCI6XCJ0aFwiKX19KSxjLmxhbmc9bihcIm1vbWVudC5sYW5nIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlIGluc3RlYWQuXCIsb3QpLGMubGFuZ0RhdGE9bihcIm1vbWVudC5sYW5nRGF0YSBpcyBkZXByZWNhdGVkLiBVc2UgbW9tZW50LmxvY2FsZURhdGEgaW5zdGVhZC5cIixsdCk7dmFyIF9uPU1hdGguYWJzO2Z1bmN0aW9uIHluKGUsdCxuLHMpe3ZhciBpPUF0KHQsbik7cmV0dXJuIGUuX21pbGxpc2Vjb25kcys9cyppLl9taWxsaXNlY29uZHMsZS5fZGF5cys9cyppLl9kYXlzLGUuX21vbnRocys9cyppLl9tb250aHMsZS5fYnViYmxlKCl9ZnVuY3Rpb24gZ24oZSl7cmV0dXJuIGU8MD9NYXRoLmZsb29yKGUpOk1hdGguY2VpbChlKX1mdW5jdGlvbiBwbihlKXtyZXR1cm4gNDgwMCplLzE0NjA5N31mdW5jdGlvbiB2bihlKXtyZXR1cm4gMTQ2MDk3KmUvNDgwMH1mdW5jdGlvbiB3bihlKXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5hcyhlKX19dmFyIE1uPXduKFwibXNcIiksU249d24oXCJzXCIpLERuPXduKFwibVwiKSxrbj13bihcImhcIiksWW49d24oXCJkXCIpLE9uPXduKFwid1wiKSxUbj13bihcIk1cIikseG49d24oXCJ5XCIpO2Z1bmN0aW9uIGJuKGUpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLl9kYXRhW2VdOk5hTn19dmFyIFBuPWJuKFwibWlsbGlzZWNvbmRzXCIpLFduPWJuKFwic2Vjb25kc1wiKSxIbj1ibihcIm1pbnV0ZXNcIiksUm49Ym4oXCJob3Vyc1wiKSxDbj1ibihcImRheXNcIiksRm49Ym4oXCJtb250aHNcIiksTG49Ym4oXCJ5ZWFyc1wiKTt2YXIgVW49TWF0aC5yb3VuZCxObj17c3M6NDQsczo0NSxtOjQ1LGg6MjIsZDoyNixNOjExfTt2YXIgR249TWF0aC5hYnM7ZnVuY3Rpb24gVm4oZSl7cmV0dXJuKDA8ZSktKGU8MCl8fCtlfWZ1bmN0aW9uIEVuKCl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5pbnZhbGlkRGF0ZSgpO3ZhciBlLHQsbj1Hbih0aGlzLl9taWxsaXNlY29uZHMpLzFlMyxzPUduKHRoaXMuX2RheXMpLGk9R24odGhpcy5fbW9udGhzKTt0PUQoKGU9RChuLzYwKSkvNjApLG4lPTYwLGUlPTYwO3ZhciByPUQoaS8xMiksYT1pJT0xMixvPXMsdT10LGw9ZSxkPW4/bi50b0ZpeGVkKDMpLnJlcGxhY2UoL1xcLj8wKyQvLFwiXCIpOlwiXCIsaD10aGlzLmFzU2Vjb25kcygpO2lmKCFoKXJldHVyblwiUDBEXCI7dmFyIGM9aDwwP1wiLVwiOlwiXCIsZj1Wbih0aGlzLl9tb250aHMpIT09Vm4oaCk/XCItXCI6XCJcIixtPVZuKHRoaXMuX2RheXMpIT09Vm4oaCk/XCItXCI6XCJcIixfPVZuKHRoaXMuX21pbGxpc2Vjb25kcykhPT1WbihoKT9cIi1cIjpcIlwiO3JldHVybiBjK1wiUFwiKyhyP2YrcitcIllcIjpcIlwiKSsoYT9mK2ErXCJNXCI6XCJcIikrKG8/bStvK1wiRFwiOlwiXCIpKyh1fHxsfHxkP1wiVFwiOlwiXCIpKyh1P18rdStcIkhcIjpcIlwiKSsobD9fK2wrXCJNXCI6XCJcIikrKGQ/XytkK1wiU1wiOlwiXCIpfXZhciBJbj1IdC5wcm90b3R5cGU7cmV0dXJuIEluLmlzVmFsaWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXNWYWxpZH0sSW4uYWJzPWZ1bmN0aW9uKCl7dmFyIGU9dGhpcy5fZGF0YTtyZXR1cm4gdGhpcy5fbWlsbGlzZWNvbmRzPV9uKHRoaXMuX21pbGxpc2Vjb25kcyksdGhpcy5fZGF5cz1fbih0aGlzLl9kYXlzKSx0aGlzLl9tb250aHM9X24odGhpcy5fbW9udGhzKSxlLm1pbGxpc2Vjb25kcz1fbihlLm1pbGxpc2Vjb25kcyksZS5zZWNvbmRzPV9uKGUuc2Vjb25kcyksZS5taW51dGVzPV9uKGUubWludXRlcyksZS5ob3Vycz1fbihlLmhvdXJzKSxlLm1vbnRocz1fbihlLm1vbnRocyksZS55ZWFycz1fbihlLnllYXJzKSx0aGlzfSxJbi5hZGQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4geW4odGhpcyxlLHQsMSl9LEluLnN1YnRyYWN0PWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHluKHRoaXMsZSx0LC0xKX0sSW4uYXM9ZnVuY3Rpb24oZSl7aWYoIXRoaXMuaXNWYWxpZCgpKXJldHVybiBOYU47dmFyIHQsbixzPXRoaXMuX21pbGxpc2Vjb25kcztpZihcIm1vbnRoXCI9PT0oZT1SKGUpKXx8XCJ5ZWFyXCI9PT1lKXJldHVybiB0PXRoaXMuX2RheXMrcy84NjRlNSxuPXRoaXMuX21vbnRocytwbih0KSxcIm1vbnRoXCI9PT1lP246bi8xMjtzd2l0Y2godD10aGlzLl9kYXlzK01hdGgucm91bmQodm4odGhpcy5fbW9udGhzKSksZSl7Y2FzZVwid2Vla1wiOnJldHVybiB0Lzcrcy82MDQ4ZTU7Y2FzZVwiZGF5XCI6cmV0dXJuIHQrcy84NjRlNTtjYXNlXCJob3VyXCI6cmV0dXJuIDI0KnQrcy8zNmU1O2Nhc2VcIm1pbnV0ZVwiOnJldHVybiAxNDQwKnQrcy82ZTQ7Y2FzZVwic2Vjb25kXCI6cmV0dXJuIDg2NDAwKnQrcy8xZTM7Y2FzZVwibWlsbGlzZWNvbmRcIjpyZXR1cm4gTWF0aC5mbG9vcig4NjRlNSp0KStzO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biB1bml0IFwiK2UpfX0sSW4uYXNNaWxsaXNlY29uZHM9TW4sSW4uYXNTZWNvbmRzPVNuLEluLmFzTWludXRlcz1EbixJbi5hc0hvdXJzPWtuLEluLmFzRGF5cz1ZbixJbi5hc1dlZWtzPU9uLEluLmFzTW9udGhzPVRuLEluLmFzWWVhcnM9eG4sSW4udmFsdWVPZj1mdW5jdGlvbigpe3JldHVybiB0aGlzLmlzVmFsaWQoKT90aGlzLl9taWxsaXNlY29uZHMrODY0ZTUqdGhpcy5fZGF5cyt0aGlzLl9tb250aHMlMTIqMjU5MmU2KzMxNTM2ZTYqayh0aGlzLl9tb250aHMvMTIpOk5hTn0sSW4uX2J1YmJsZT1mdW5jdGlvbigpe3ZhciBlLHQsbixzLGkscj10aGlzLl9taWxsaXNlY29uZHMsYT10aGlzLl9kYXlzLG89dGhpcy5fbW9udGhzLHU9dGhpcy5fZGF0YTtyZXR1cm4gMDw9ciYmMDw9YSYmMDw9b3x8cjw9MCYmYTw9MCYmbzw9MHx8KHIrPTg2NGU1KmduKHZuKG8pK2EpLG89YT0wKSx1Lm1pbGxpc2Vjb25kcz1yJTFlMyxlPUQoci8xZTMpLHUuc2Vjb25kcz1lJTYwLHQ9RChlLzYwKSx1Lm1pbnV0ZXM9dCU2MCxuPUQodC82MCksdS5ob3Vycz1uJTI0LG8rPWk9RChwbihhKz1EKG4vMjQpKSksYS09Z24odm4oaSkpLHM9RChvLzEyKSxvJT0xMix1LmRheXM9YSx1Lm1vbnRocz1vLHUueWVhcnM9cyx0aGlzfSxJbi5jbG9uZT1mdW5jdGlvbigpe3JldHVybiBBdCh0aGlzKX0sSW4uZ2V0PWZ1bmN0aW9uKGUpe3JldHVybiBlPVIoZSksdGhpcy5pc1ZhbGlkKCk/dGhpc1tlK1wic1wiXSgpOk5hTn0sSW4ubWlsbGlzZWNvbmRzPVBuLEluLnNlY29uZHM9V24sSW4ubWludXRlcz1IbixJbi5ob3Vycz1SbixJbi5kYXlzPUNuLEluLndlZWtzPWZ1bmN0aW9uKCl7cmV0dXJuIEQodGhpcy5kYXlzKCkvNyl9LEluLm1vbnRocz1GbixJbi55ZWFycz1MbixJbi5odW1hbml6ZT1mdW5jdGlvbihlKXtpZighdGhpcy5pc1ZhbGlkKCkpcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLmludmFsaWREYXRlKCk7dmFyIHQsbixzLGkscixhLG8sdSxsLGQsaCxjPXRoaXMubG9jYWxlRGF0YSgpLGY9KG49IWUscz1jLGk9QXQodD10aGlzKS5hYnMoKSxyPVVuKGkuYXMoXCJzXCIpKSxhPVVuKGkuYXMoXCJtXCIpKSxvPVVuKGkuYXMoXCJoXCIpKSx1PVVuKGkuYXMoXCJkXCIpKSxsPVVuKGkuYXMoXCJNXCIpKSxkPVVuKGkuYXMoXCJ5XCIpKSwoaD1yPD1Obi5zcyYmW1wic1wiLHJdfHxyPE5uLnMmJltcInNzXCIscl18fGE8PTEmJltcIm1cIl18fGE8Tm4ubSYmW1wibW1cIixhXXx8bzw9MSYmW1wiaFwiXXx8bzxObi5oJiZbXCJoaFwiLG9dfHx1PD0xJiZbXCJkXCJdfHx1PE5uLmQmJltcImRkXCIsdV18fGw8PTEmJltcIk1cIl18fGw8Tm4uTSYmW1wiTU1cIixsXXx8ZDw9MSYmW1wieVwiXXx8W1wieXlcIixkXSlbMl09bixoWzNdPTA8K3QsaFs0XT1zLGZ1bmN0aW9uKGUsdCxuLHMsaSl7cmV0dXJuIGkucmVsYXRpdmVUaW1lKHR8fDEsISFuLGUscyl9LmFwcGx5KG51bGwsaCkpO3JldHVybiBlJiYoZj1jLnBhc3RGdXR1cmUoK3RoaXMsZikpLGMucG9zdGZvcm1hdChmKX0sSW4udG9JU09TdHJpbmc9RW4sSW4udG9TdHJpbmc9RW4sSW4udG9KU09OPUVuLEluLmxvY2FsZT1RdCxJbi5sb2NhbGVEYXRhPUt0LEluLnRvSXNvU3RyaW5nPW4oXCJ0b0lzb1N0cmluZygpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgdG9JU09TdHJpbmcoKSBpbnN0ZWFkIChub3RpY2UgdGhlIGNhcGl0YWxzKVwiLEVuKSxJbi5sYW5nPVh0LEkoXCJYXCIsMCwwLFwidW5peFwiKSxJKFwieFwiLDAsMCxcInZhbHVlT2ZcIiksdWUoXCJ4XCIsc2UpLHVlKFwiWFwiLC9bKy1dP1xcZCsoXFwuXFxkezEsM30pPy8pLGNlKFwiWFwiLGZ1bmN0aW9uKGUsdCxuKXtuLl9kPW5ldyBEYXRlKDFlMypwYXJzZUZsb2F0KGUsMTApKX0pLGNlKFwieFwiLGZ1bmN0aW9uKGUsdCxuKXtuLl9kPW5ldyBEYXRlKGsoZSkpfSksYy52ZXJzaW9uPVwiMi4yMi4yXCIsZT1UdCxjLmZuPWxuLGMubWluPWZ1bmN0aW9uKCl7cmV0dXJuIFB0KFwiaXNCZWZvcmVcIixbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKSl9LGMubWF4PWZ1bmN0aW9uKCl7cmV0dXJuIFB0KFwiaXNBZnRlclwiLFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKX0sYy5ub3c9ZnVuY3Rpb24oKXtyZXR1cm4gRGF0ZS5ub3c/RGF0ZS5ub3coKTorbmV3IERhdGV9LGMudXRjPXksYy51bml4PWZ1bmN0aW9uKGUpe3JldHVybiBUdCgxZTMqZSl9LGMubW9udGhzPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGZuKGUsdCxcIm1vbnRoc1wiKX0sYy5pc0RhdGU9aCxjLmxvY2FsZT1vdCxjLmludmFsaWQ9dixjLmR1cmF0aW9uPUF0LGMuaXNNb21lbnQ9UyxjLndlZWtkYXlzPWZ1bmN0aW9uKGUsdCxuKXtyZXR1cm4gbW4oZSx0LG4sXCJ3ZWVrZGF5c1wiKX0sYy5wYXJzZVpvbmU9ZnVuY3Rpb24oKXtyZXR1cm4gVHQuYXBwbHkobnVsbCxhcmd1bWVudHMpLnBhcnNlWm9uZSgpfSxjLmxvY2FsZURhdGE9bHQsYy5pc0R1cmF0aW9uPVJ0LGMubW9udGhzU2hvcnQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZm4oZSx0LFwibW9udGhzU2hvcnRcIil9LGMud2Vla2RheXNNaW49ZnVuY3Rpb24oZSx0LG4pe3JldHVybiBtbihlLHQsbixcIndlZWtkYXlzTWluXCIpfSxjLmRlZmluZUxvY2FsZT11dCxjLnVwZGF0ZUxvY2FsZT1mdW5jdGlvbihlLHQpe2lmKG51bGwhPXQpe3ZhciBuLHMsaT1udDtudWxsIT0ocz1hdChlKSkmJihpPXMuX2NvbmZpZyksKG49bmV3IFAodD1iKGksdCkpKS5wYXJlbnRMb2NhbGU9c3RbZV0sc3RbZV09bixvdChlKX1lbHNlIG51bGwhPXN0W2VdJiYobnVsbCE9c3RbZV0ucGFyZW50TG9jYWxlP3N0W2VdPXN0W2VdLnBhcmVudExvY2FsZTpudWxsIT1zdFtlXSYmZGVsZXRlIHN0W2VdKTtyZXR1cm4gc3RbZV19LGMubG9jYWxlcz1mdW5jdGlvbigpe3JldHVybiBzKHN0KX0sYy53ZWVrZGF5c1Nob3J0PWZ1bmN0aW9uKGUsdCxuKXtyZXR1cm4gbW4oZSx0LG4sXCJ3ZWVrZGF5c1Nob3J0XCIpfSxjLm5vcm1hbGl6ZVVuaXRzPVIsYy5yZWxhdGl2ZVRpbWVSb3VuZGluZz1mdW5jdGlvbihlKXtyZXR1cm4gdm9pZCAwPT09ZT9VbjpcImZ1bmN0aW9uXCI9PXR5cGVvZiBlJiYoVW49ZSwhMCl9LGMucmVsYXRpdmVUaW1lVGhyZXNob2xkPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIHZvaWQgMCE9PU5uW2VdJiYodm9pZCAwPT09dD9ObltlXTooTm5bZV09dCxcInNcIj09PWUmJihObi5zcz10LTEpLCEwKSl9LGMuY2FsZW5kYXJGb3JtYXQ9ZnVuY3Rpb24oZSx0KXt2YXIgbj1lLmRpZmYodCxcImRheXNcIiwhMCk7cmV0dXJuIG48LTY/XCJzYW1lRWxzZVwiOm48LTE/XCJsYXN0V2Vla1wiOm48MD9cImxhc3REYXlcIjpuPDE/XCJzYW1lRGF5XCI6bjwyP1wibmV4dERheVwiOm48Nz9cIm5leHRXZWVrXCI6XCJzYW1lRWxzZVwifSxjLnByb3RvdHlwZT1sbixjLkhUTUw1X0ZNVD17REFURVRJTUVfTE9DQUw6XCJZWVlZLU1NLUREVEhIOm1tXCIsREFURVRJTUVfTE9DQUxfU0VDT05EUzpcIllZWVktTU0tRERUSEg6bW06c3NcIixEQVRFVElNRV9MT0NBTF9NUzpcIllZWVktTU0tRERUSEg6bW06c3MuU1NTXCIsREFURTpcIllZWVktTU0tRERcIixUSU1FOlwiSEg6bW1cIixUSU1FX1NFQ09ORFM6XCJISDptbTpzc1wiLFRJTUVfTVM6XCJISDptbTpzcy5TU1NcIixXRUVLOlwiWVlZWS1bV11XV1wiLE1PTlRIOlwiWVlZWS1NTVwifSxjfSk7IiwiLyoqXG4gKiBSZWdpc3RlciBzZXJ2aWNlIHdvcmtlclxuICovXG5cbnJlZ2lzdGVyU2VydmljZVdvcmtlciA9ICgpID0+IHtcbiAgICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSByZXR1cm47XG5cbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcignL3N3LmpzJykudGhlbihyZWcgPT4ge1xuICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSByZXR1cm47XG5cbiAgICAgIGlmIChyZWcud2FpdGluZykge1xuICAgICAgICB1cGRhdGVSZWFkeShyZWcud2FpdGluZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XG4gICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVnLmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZWZvdW5kJywgKCkgPT4gdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKSk7XG4gICAgfSk7XG5cbiAgICBsZXQgcmVmcmVzaGluZztcbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYocmVmcmVzaGluZykgcmV0dXJuO1xuICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgcmVmcmVzaGluZyA9IHRydWU7XG4gICAgfSlcbn1cblxudXBkYXRlUmVhZHkgPSAod29ya2VyKSA9PiB7XG4gIGNvbnN0IHRvYXN0ID0gVG9hc3QuY3JlYXRlKHtcbiAgICB0ZXh0OiBcIk5ldyB2ZXJzaW9uIGF2YWlsYWJsZS5cIixcbiAgICBidXR0b246IFwiUmVmcmVzaFwiLFxuICAgIGNhbGxiYWNrOiBldmVudCA9PiB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246ICdza2lwV2FpdGluZyd9KTtcbiAgICB9XG4gIH0pO1xufVxuXG50cmFja0luc3RhbGxpbmcgPSAod29ya2VyKSA9PiB7XG4gICAgd29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ3N0YXRlY2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PT0gJ2luc3RhbGxlZCcpIHtcbiAgICAgICAgdXBkYXRlUmVhZHkod29ya2VyKTtcbiAgICAgIH1cbiAgICB9KTtcbn0iLCIvKipcbiAqIEBhdXRob3IgaHR0cHM6Ly9naXRodWIuY29tL0FsZXhLdmF6b3MvVmFuaWxsYVRvYXN0cy9ibG9iL21hc3Rlci92YW5pbGxhdG9hc3RzLmpzXG4gKi9cblxuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICB0cnkge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgLy8gZ2xvYmFsXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvb3QuVG9hc3QgPSBmYWN0b3J5KCk7XG4gICAgfVxuICB9IGNhdGNoKGVycm9yKSB7XG4gICAgY29uc29sZS5sb2coJ0lzb21vcnBoaWMgY29tcGF0aWJpbGl0eSBpcyBub3Qgc3VwcG9ydGVkIGF0IHRoaXMgdGltZSBmb3IgVG9hc3QuJylcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKSB7XG5cbiAgLy8gV2UgbmVlZCBET00gdG8gYmUgcmVhZHlcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICBpbml0KCk7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0KTtcbiAgfVxuXG4gIC8vIENyZWF0ZSBUb2FzdCBvYmplY3RcbiAgVG9hc3QgPSB7XG4gICAgLy8gSW4gY2FzZSB0b2FzdCBjcmVhdGlvbiBpcyBhdHRlbXB0ZWQgYmVmb3JlIGRvbSBoYXMgZmluaXNoZWQgbG9hZGluZyFcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5lcnJvcihbXG4gICAgICAgICdET00gaGFzIG5vdCBmaW5pc2hlZCBsb2FkaW5nLicsXG4gICAgICAgICdcXHRJbnZva2UgY3JlYXRlIG1ldGhvZCB3aGVuIERPTVxccyByZWFkeVN0YXRlIGlzIGNvbXBsZXRlJ1xuICAgICAgXS5qb2luKCdcXG4nKSlcbiAgICB9LFxuICAgIC8vZnVuY3Rpb24gdG8gbWFudWFsbHkgc2V0IHRpbWVvdXQgYWZ0ZXIgY3JlYXRlXG4gICAgc2V0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFtcbiAgICAgICAgJ0RPTSBoYXMgbm90IGZpbmlzaGVkIGxvYWRpbmcuJyxcbiAgICAgICAgJ1xcdEludm9rZSBjcmVhdGUgbWV0aG9kIHdoZW4gRE9NXFxzIHJlYWR5U3RhdGUgaXMgY29tcGxldGUnXG4gICAgICBdLmpvaW4oJ1xcbicpKVxuICAgIH0sXG4gICAgdG9hc3RzOiB7fSAvL3N0b3JlIHRvYXN0cyB0byBtb2RpZnkgbGF0ZXJcbiAgfTtcbiAgdmFyIGF1dG9pbmNyZW1lbnQgPSAwO1xuXG4gIC8vIEluaXRpYWxpemUgbGlicmFyeVxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIC8vIFRvYXN0IGNvbnRhaW5lclxuICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb250YWluZXIuaWQgPSAndG9hc3QtY29udGFpbmVyJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG5cbiAgICAvLyBAT3ZlcnJpZGVcbiAgICAvLyBSZXBsYWNlIGNyZWF0ZSBtZXRob2Qgd2hlbiBET00gaGFzIGZpbmlzaGVkIGxvYWRpbmdcbiAgICBUb2FzdC5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB2YXIgdG9hc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRvYXN0LmlkID0gKythdXRvaW5jcmVtZW50O1xuICAgICAgdG9hc3QuaWQgPSAndG9hc3QtJyArIHRvYXN0LmlkO1xuICAgICAgdG9hc3QuY2xhc3NOYW1lID0gJ3RvYXN0JztcblxuICAgICAgLy8gdGl0bGVcbiAgICAgIGlmIChvcHRpb25zLnRpdGxlKSB7XG4gICAgICAgIHZhciBoNCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2g0Jyk7XG4gICAgICAgIGg0LmNsYXNzTmFtZSA9ICd0b2FzdC10aXRsZSc7XG4gICAgICAgIGg0LmlubmVySFRNTCA9IG9wdGlvbnMudGl0bGU7XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGg0KTtcbiAgICAgIH1cblxuICAgICAgLy8gdGV4dFxuICAgICAgaWYgKG9wdGlvbnMudGV4dCkge1xuICAgICAgICB2YXIgcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICAgICAgcC5jbGFzc05hbWUgPSAndG9hc3QtdGV4dCc7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gb3B0aW9ucy50ZXh0O1xuICAgICAgICB0b2FzdC5hcHBlbmRDaGlsZChwKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWNvblxuICAgICAgaWYgKG9wdGlvbnMuaWNvbikge1xuICAgICAgICB2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgICAgIGltZy5zcmMgPSBvcHRpb25zLmljb247XG4gICAgICAgIGltZy5jbGFzc05hbWUgPSAndG9hc3QtaWNvbic7XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGltZyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGJ1dHRvblxuICAgICAgaWYgKG9wdGlvbnMuYnV0dG9uKSB7XG4gICAgICAgIHZhciBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgYnV0dG9uLmNsYXNzTmFtZSA9ICd0b2FzdC1idXR0b24nO1xuICAgICAgICBidXR0b24uaW5uZXJIVE1MID0gb3B0aW9ucy5idXR0b247XG4gICAgICAgIHRvYXN0LmFwcGVuZENoaWxkKGJ1dHRvbik7XG4gICAgICB9XG5cbiAgICAgIC8vIGNsaWNrIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdG9hc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvcHRpb25zLmNhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgLy8gdG9hc3QgYXBpXG4gICAgICB0b2FzdC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRvYXN0LmNsYXNzTmFtZSArPSAnIHRvYXN0LWZhZGVvdXQnO1xuICAgICAgICB0b2FzdC5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCByZW1vdmVUb2FzdCwgZmFsc2UpO1xuICAgICAgfTtcblxuICAgICAgLy8gYXV0b2hpZGVcbiAgICAgIGlmIChvcHRpb25zLnRpbWVvdXQpIHtcbiAgICAgICAgc2V0VGltZW91dCh0b2FzdC5oaWRlLCBvcHRpb25zLnRpbWVvdXQpO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy50eXBlKSB7XG4gICAgICAgIHRvYXN0LmNsYXNzTmFtZSArPSAnIHRvYXN0LScgKyBvcHRpb25zLnR5cGU7XG4gICAgICB9XG5cbiAgICAgIHRvYXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9hc3QuaGlkZSk7XG5cblxuICAgICAgZnVuY3Rpb24gcmVtb3ZlVG9hc3QoKSB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2FzdC1jb250YWluZXInKS5yZW1vdmVDaGlsZCh0b2FzdCk7XG4gICAgICAgIGRlbGV0ZSBUb2FzdC50b2FzdHNbdG9hc3QuaWRdOyAgLy9yZW1vdmUgdG9hc3QgZnJvbSBvYmplY3RcbiAgICAgIH1cblxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RvYXN0LWNvbnRhaW5lcicpLmFwcGVuZENoaWxkKHRvYXN0KTtcblxuICAgICAgLy9hZGQgdG9hc3QgdG8gb2JqZWN0IHNvIGl0cyBlYXNpbHkgZ2V0dGFibGUgYnkgaXRzIGlkXG4gICAgICBUb2FzdC50b2FzdHNbdG9hc3QuaWRdID0gdG9hc3Q7XG5cbiAgICAgIHJldHVybiB0b2FzdDtcbiAgICB9XG5cbiAgICAvKlxuICAgIGN1c3RvbSBmdW5jdGlvbiB0byBtYW51YWxseSBpbml0aWF0ZSB0aW1lb3V0IG9mXG4gICAgdGhlIHRvYXN0LiAgVXNlZnVsIGlmIHRvYXN0IGlzIGNyZWF0ZWQgYXMgcGVyc2lzdGFudFxuICAgIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCBpdCB0byBzdGFydCB0byB0aW1lb3V0IHVudGlsXG4gICAgd2UgdGVsbCBpdCB0b1xuICAgICovXG4gICAgVG9hc3Quc2V0VGltZW91dCA9IGZ1bmN0aW9uKHRvYXN0aWQsIHZhbCkge1xuICAgICAgaWYoVG9hc3QudG9hc3RzW3RvYXN0aWRdKXtcbiAgICAgICAgc2V0VGltZW91dChUb2FzdC50b2FzdHNbdG9hc3RpZF0uaGlkZSwgdmFsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gVG9hc3Q7XG5cbn0pOyJdfQ==
