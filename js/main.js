let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Initialize worker
 */
const worker = new Worker('js/worker.js');
worker.addEventListener('message', e => {
  switch(e.data.cmd) {
    case 'fetch_cuisines':
      if (e.data.error) {
        console.log(e.data.error);
        return;
      }

      self.cuisines = e.data.cuisines;
      fillCuisinesHTML();
      break;
    case 'fetch_neighborhoods':
      if (e.data.error) {
        console.log(e.data.error);
        return;
      }

      self.neighborhoods = e.data.neighborhoods;
      fillNeighborhoodsHTML();
      break;
    case 'fetch_restaurant_cuisine_neighborhood':
      if (e.data.error) {
        console.log(e.data.error);
        return;
      }

      resetRestaurants(e.data.restaurants);
      fillRestaurantsHTML();
      break;
  }
});

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  worker.postMessage({
    cmd: 'fetch_neighborhoods',
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  worker.postMessage({
    cmd: 'fetch_cuisines'
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoibGVtYSIsImEiOiJjamt0YXVla2MwM3NjM3dvZHQ0NDIwZmVpIn0.pOEFaPY6enCchIG29Lo2SQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  worker.postMessage({
    cmd: "fetch_restaurant_cuisine_neighborhood",
    cuisine: cuisine,
    neighborhood: neighborhood
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const picture = document.createElement('picture');
  picture.className = 'restaurant-picture';
  li.append(picture);

  const src1 = document.createElement('source');
  src1.media = "(min-width: 750px)"
  src1.srcset = `${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-800_large_1x.jpg 1x`;
  src1.srcset += `,${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-1200_large_2x.jpg 2x`;
  picture.append(src1);

  const src2 = document.createElement('source');
  src2.media = "(min-width: 500px)"
  src2.srcset = `${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-medium.jpg`;
  picture.append(src2);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "Image of the restaurant " + restaurant.name;
  picture.append(image);

  const container = document.createElement('div');
  container.className = 'restaurant-container';
  li.append(container);

  const content = document.createElement('div');
  content.className = "restaurant-container__content";
  container.append(content);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  content.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  content.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  content.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', 'View details of the restaurant ' + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  container.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 