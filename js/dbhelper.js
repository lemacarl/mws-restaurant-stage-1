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
          fetch("http://localhost:1337/restaurants")
          .then(response => response.json())
          .then(restaurants => {
            if (restaurants) {
              store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
              restaurants.forEach(restaurant => {
                store.put(restaurant, restaurant['id'])
              });
              callback(null, restaurants);
            }
          })
          .catch(error => {
            callback(error, null)
          })
        }
        else {
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
      store.get(id).then(restaurant => {
        if (!restaurant) {
          fetch(`http://localhost:1337/restaurants/${id}`)
          .then(response => response.json())
          .then(restaurant => {
            if (restaurant) {
              store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
              store.put(restaurant, id);
              callback(null, restaurant);
            }
          })
          .catch(error => {
            callback(error, "Restaurant does not exist")
          })
        }
        else {
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
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${DBHelper.imageNameForRestaurant(restaurant)}-small.jpg`);
  }

  /**
   * Restaurant image name.
   */
  static imageNameForRestaurant(restaurant) {
    if (restaurant.photograph)
      return restaurant.photograph;
    return 'default';
  }


  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

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

