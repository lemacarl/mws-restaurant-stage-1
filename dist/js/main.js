let restaurants, neighborhoods, cuisines;
var newMap;
var markers = [];
/**
 * Initialize worker
 */

const worker = new Worker('js/worker.js');
worker.addEventListener('message', e => {
  switch (e.data.cmd) {
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

document.addEventListener('DOMContentLoaded', event => {
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
    cmd: 'fetch_neighborhoods'
  });
};
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
};
/**
 * Fetch all cuisines and set their HTML.
 */


fetchCuisines = () => {
  worker.postMessage({
    cmd: 'fetch_cuisines'
  });
};
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
};
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
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);
  updateRestaurants();
};

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
};
/**
 * Clear current restaurants, their HTML and remove their map markers.
 */


resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = ''; // Remove all map markers

  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }

  self.markers = [];
  self.restaurants = restaurants;
};
/**
 * Create all restaurants HTML and add them to the webpage.
 */


fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};
/**
 * Create restaurant HTML.
 */


createRestaurantHTML = restaurant => {
  const li = document.createElement('li');
  const picture = document.createElement('picture');
  picture.className = 'restaurant-picture';
  li.append(picture);
  const src1 = document.createElement('source');
  src1.media = "(min-width: 750px)";
  src1.srcset = `${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-800_large_1x.jpg 1x`;
  src1.srcset += `,${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-1200_large_2x.jpg 2x`;
  picture.append(src1);
  const src2 = document.createElement('source');
  src2.media = "(min-width: 500px)";
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
  container.append(more);
  return li;
};
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
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsicmVzdGF1cmFudHMiLCJuZWlnaGJvcmhvb2RzIiwiY3Vpc2luZXMiLCJuZXdNYXAiLCJtYXJrZXJzIiwid29ya2VyIiwiV29ya2VyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImUiLCJkYXRhIiwiY21kIiwiZXJyb3IiLCJjb25zb2xlIiwibG9nIiwic2VsZiIsImZpbGxDdWlzaW5lc0hUTUwiLCJmaWxsTmVpZ2hib3Job29kc0hUTUwiLCJyZXNldFJlc3RhdXJhbnRzIiwiZmlsbFJlc3RhdXJhbnRzSFRNTCIsImRvY3VtZW50IiwiZXZlbnQiLCJyZWdpc3RlclNlcnZpY2VXb3JrZXIiLCJpbml0TWFwIiwiZmV0Y2hOZWlnaGJvcmhvb2RzIiwiZmV0Y2hDdWlzaW5lcyIsInBvc3RNZXNzYWdlIiwic2VsZWN0IiwiZ2V0RWxlbWVudEJ5SWQiLCJmb3JFYWNoIiwibmVpZ2hib3Job29kIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsInZhbHVlIiwiYXBwZW5kIiwiY3Vpc2luZSIsIkwiLCJtYXAiLCJjZW50ZXIiLCJ6b29tIiwic2Nyb2xsV2hlZWxab29tIiwidGlsZUxheWVyIiwibWFwYm94VG9rZW4iLCJtYXhab29tIiwiYXR0cmlidXRpb24iLCJpZCIsImFkZFRvIiwidXBkYXRlUmVzdGF1cmFudHMiLCJjU2VsZWN0IiwiblNlbGVjdCIsImNJbmRleCIsInNlbGVjdGVkSW5kZXgiLCJuSW5kZXgiLCJ1bCIsIm1hcmtlciIsInJlbW92ZSIsInJlc3RhdXJhbnQiLCJjcmVhdGVSZXN0YXVyYW50SFRNTCIsImFkZE1hcmtlcnNUb01hcCIsImxpIiwicGljdHVyZSIsImNsYXNzTmFtZSIsInNyYzEiLCJtZWRpYSIsInNyY3NldCIsIkRCSGVscGVyIiwiaW1hZ2VVcmxCYXNlUGF0aCIsImltYWdlTmFtZUZvclJlc3RhdXJhbnQiLCJzcmMyIiwiaW1hZ2UiLCJzcmMiLCJpbWFnZVVybEZvclJlc3RhdXJhbnQiLCJhbHQiLCJuYW1lIiwiY29udGFpbmVyIiwiY29udGVudCIsImFkZHJlc3MiLCJtb3JlIiwic2V0QXR0cmlidXRlIiwiaHJlZiIsInVybEZvclJlc3RhdXJhbnQiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50Iiwib24iLCJvbkNsaWNrIiwid2luZG93IiwibG9jYXRpb24iLCJvcHRpb25zIiwidXJsIiwicHVzaCJdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSUEsV0FBSixFQUNFQyxhQURGLEVBRUVDLFFBRkY7QUFHQSxJQUFJQyxNQUFKO0FBQ0EsSUFBSUMsT0FBTyxHQUFHLEVBQWQ7QUFFQTs7OztBQUdBLE1BQU1DLE1BQU0sR0FBRyxJQUFJQyxNQUFKLENBQVcsY0FBWCxDQUFmO0FBQ0FELE1BQU0sQ0FBQ0UsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUNDLENBQUMsSUFBSTtBQUN0QyxVQUFPQSxDQUFDLENBQUNDLElBQUYsQ0FBT0MsR0FBZDtBQUNFLFNBQUssZ0JBQUw7QUFDRSxVQUFJRixDQUFDLENBQUNDLElBQUYsQ0FBT0UsS0FBWCxFQUFrQjtBQUNoQkMsUUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVlMLENBQUMsQ0FBQ0MsSUFBRixDQUFPRSxLQUFuQjtBQUNBO0FBQ0Q7O0FBRURHLE1BQUFBLElBQUksQ0FBQ1osUUFBTCxHQUFnQk0sQ0FBQyxDQUFDQyxJQUFGLENBQU9QLFFBQXZCO0FBQ0FhLE1BQUFBLGdCQUFnQjtBQUNoQjs7QUFDRixTQUFLLHFCQUFMO0FBQ0UsVUFBSVAsQ0FBQyxDQUFDQyxJQUFGLENBQU9FLEtBQVgsRUFBa0I7QUFDaEJDLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZTCxDQUFDLENBQUNDLElBQUYsQ0FBT0UsS0FBbkI7QUFDQTtBQUNEOztBQUVERyxNQUFBQSxJQUFJLENBQUNiLGFBQUwsR0FBcUJPLENBQUMsQ0FBQ0MsSUFBRixDQUFPUixhQUE1QjtBQUNBZSxNQUFBQSxxQkFBcUI7QUFDckI7O0FBQ0YsU0FBSyx1Q0FBTDtBQUNFLFVBQUlSLENBQUMsQ0FBQ0Ms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Z0JOLElBQWhCLEdBQXVCekIsTUFBTSxDQUFDZ0MsT0FBUCxDQUFlQyxHQUF0QztBQUNEOztBQUNEekUsSUFBQUEsSUFBSSxDQUFDVixPQUFMLENBQWFvRixJQUFiLENBQWtCbEMsTUFBbEI7QUFDRCxHQVJEO0FBVUQsQ0FYRCIsInNvdXJjZXNDb250ZW50IjpbImxldCByZXN0YXVyYW50cyxcclxuICBuZWlnaGJvcmhvb2RzLFxyXG4gIGN1aXNpbmVzXHJcbnZhciBuZXdNYXBcclxudmFyIG1hcmtlcnMgPSBbXVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgd29ya2VyXHJcbiAqL1xyXG5jb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKCdqcy93b3JrZXIuanMnKTtcclxud29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBlID0+IHtcclxuICBzd2l0Y2goZS5kYXRhLmNtZCkge1xyXG4gICAgY2FzZSAnZmV0Y2hfY3Vpc2luZXMnOlxyXG4gICAgICBpZiAoZS5kYXRhLmVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZS5kYXRhLmVycm9yKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNlbGYuY3Vpc2luZXMgPSBlLmRhdGEuY3Vpc2luZXM7XHJcbiAgICAgIGZpbGxDdWlzaW5lc0hUTUwoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdmZXRjaF9uZWlnaGJvcmhvb2RzJzpcclxuICAgICAgaWYgKGUuZGF0YS5lcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGUuZGF0YS5lcnJvcik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBzZWxmLm5laWdoYm9yaG9vZHMgPSBlLmRhdGEubmVpZ2hib3Job29kcztcclxuICAgICAgZmlsbE5laWdoYm9yaG9vZHNIVE1MKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZmV0Y2hfcmVzdGF1cmFudF9jdWlzaW5lX25laWdoYm9yaG9vZCc6XHJcbiAgICAgIGlmIChlLmRhdGEuZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlLmRhdGEuZXJyb3IpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmVzZXRSZXN0YXVyYW50cyhlLmRhdGEucmVzdGF1cmFudHMpO1xyXG4gICAgICBmaWxsUmVzdGF1cmFudHNIVE1MKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxufSk7XHJcblxyXG4vKipcclxuICogRmV0Y2ggbmVpZ2hib3Job29kcyBhbmQgY3Vpc2luZXMgYXMgc29vbiBhcyB0aGUgcGFnZSBpcyBsb2FkZWQuXHJcbiAqL1xyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKGV2ZW50KSA9PiB7XHJcbiAgcmVnaXN0ZXJTZXJ2aWNlV29ya2VyKCk7XHJcbiAgaW5pdE1hcCgpOyAvLyBhZGRlZCBcclxuICBmZXRjaE5laWdoYm9yaG9vZHMoKTtcclxuICBmZXRjaEN1aXNpbmVzKCk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIGFuZCBzZXQgdGhlaXIgSFRNTC5cclxuICovXHJcbmZldGNoTmVpZ2hib3Job29kcyA9ICgpID0+IHtcclxuICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgY21kOiAnZmV0Y2hfbmVpZ2hib3Job29kcycsXHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgbmVpZ2hib3Job29kcyBIVE1MLlxyXG4gKi9cclxuZmlsbE5laWdoYm9yaG9vZHNIVE1MID0gKG5laWdoYm9yaG9vZHMgPSBzZWxmLm5laWdoYm9yaG9vZHMpID0+IHtcclxuICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuICBuZWlnaGJvcmhvb2RzLmZvckVhY2gobmVpZ2hib3Job29kID0+IHtcclxuICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG4gICAgb3B0aW9uLmlubmVySFRNTCA9IG5laWdoYm9yaG9vZDtcclxuICAgIG9wdGlvbi52YWx1ZSA9IG5laWdoYm9yaG9vZDtcclxuICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZldGNoIGFsbCBjdWlzaW5lcyBhbmQgc2V0IHRoZWlyIEhUTUwuXHJcbiAqL1xyXG5mZXRjaEN1aXNpbmVzID0gKCkgPT4ge1xyXG4gIHdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICBjbWQ6ICdmZXRjaF9jdWlzaW5lcydcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCBjdWlzaW5lcyBIVE1MLlxyXG4gKi9cclxuZmlsbEN1aXNpbmVzSFRNTCA9IChjdWlzaW5lcyA9IHNlbGYuY3Vpc2luZXMpID0+IHtcclxuICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vpc2luZXMtc2VsZWN0Jyk7XHJcblxyXG4gIGN1aXNpbmVzLmZvckVhY2goY3Vpc2luZSA9PiB7XHJcbiAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIG9wdGlvbi5pbm5lckhUTUwgPSBjdWlzaW5lO1xyXG4gICAgb3B0aW9uLnZhbHVlID0gY3Vpc2luZTtcclxuICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgbGVhZmxldCBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG5pbml0TWFwID0gKCkgPT4ge1xyXG4gIHNlbGYubmV3TWFwID0gTC5tYXAoJ21hcCcsIHtcclxuICAgICAgICBjZW50ZXI6IFs0MC43MjIyMTYsIC03My45ODc1MDFdLFxyXG4gICAgICAgIHpvb206IDEyLFxyXG4gICAgICAgIHNjcm9sbFdoZWVsWm9vbTogZmFsc2VcclxuICAgICAgfSk7XHJcbiAgTC50aWxlTGF5ZXIoJ2h0dHBzOi8vYXBpLnRpbGVzLm1hcGJveC5jb20vdjQve2lkfS97en0ve3h9L3t5fS5qcGc3MD9hY2Nlc3NfdG9rZW49e21hcGJveFRva2VufScsIHtcclxuICAgIG1hcGJveFRva2VuOiAncGsuZXlKMUlqb2liR1Z0WVNJc0ltRWlPaUpqYW10MFlYVmxhMk13TTNOak0zZHZaSFEwTkRJd1ptVnBJbjAucE9FRmFQWTZlbkNjaElHMjlMbzJTUScsXHJcbiAgICBtYXhab29tOiAxOCxcclxuICAgIGF0dHJpYnV0aW9uOiAnTWFwIGRhdGEgJmNvcHk7IDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPiBjb250cmlidXRvcnMsICcgK1xyXG4gICAgICAnPGEgaHJlZj1cImh0dHBzOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8yLjAvXCI+Q0MtQlktU0E8L2E+LCAnICtcclxuICAgICAgJ0ltYWdlcnkgwqkgPGEgaHJlZj1cImh0dHBzOi8vd3d3Lm1hcGJveC5jb20vXCI+TWFwYm94PC9hPicsXHJcbiAgICBpZDogJ21hcGJveC5zdHJlZXRzJ1xyXG4gIH0pLmFkZFRvKG5ld01hcCk7XHJcblxyXG4gIHVwZGF0ZVJlc3RhdXJhbnRzKCk7XHJcbn1cclxudXBkYXRlUmVzdGF1cmFudHMgPSAoKSA9PiB7XHJcbiAgY29uc3QgY1NlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdWlzaW5lcy1zZWxlY3QnKTtcclxuICBjb25zdCBuU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XHJcblxyXG4gIGNvbnN0IGNJbmRleCA9IGNTZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuICBjb25zdCBuSW5kZXggPSBuU2VsZWN0LnNlbGVjdGVkSW5kZXg7XHJcblxyXG4gIGNvbnN0IGN1aXNpbmUgPSBjU2VsZWN0W2NJbmRleF0udmFsdWU7XHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gblNlbGVjdFtuSW5kZXhdLnZhbHVlO1xyXG5cclxuICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgY21kOiBcImZldGNoX3Jlc3RhdXJhbnRfY3Vpc2luZV9uZWlnaGJvcmhvb2RcIixcclxuICAgIGN1aXNpbmU6IGN1aXNpbmUsXHJcbiAgICBuZWlnaGJvcmhvb2Q6IG5laWdoYm9yaG9vZFxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xlYXIgY3VycmVudCByZXN0YXVyYW50cywgdGhlaXIgSFRNTCBhbmQgcmVtb3ZlIHRoZWlyIG1hcCBtYXJrZXJzLlxyXG4gKi9cclxucmVzZXRSZXN0YXVyYW50cyA9IChyZXN0YXVyYW50cykgPT4ge1xyXG4gIC8vIFJlbW92ZSBhbGwgcmVzdGF1cmFudHNcclxuICBzZWxmLnJlc3RhdXJhbnRzID0gW107XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudHMtbGlzdCcpO1xyXG4gIHVsLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAvLyBSZW1vdmUgYWxsIG1hcCBtYXJrZXJzXHJcbiAgaWYgKHNlbGYubWFya2Vycykge1xyXG4gICAgc2VsZi5tYXJrZXJzLmZvckVhY2gobWFya2VyID0+IG1hcmtlci5yZW1vdmUoKSk7XHJcbiAgfVxyXG4gIHNlbGYubWFya2VycyA9IFtdO1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSByZXN0YXVyYW50cztcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbGwgcmVzdGF1cmFudHMgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudHNIVE1MID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnRzLWxpc3QnKTtcclxuICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgdWwuYXBwZW5kKGNyZWF0ZVJlc3RhdXJhbnRIVE1MKHJlc3RhdXJhbnQpKTtcclxuICB9KTtcclxuICBhZGRNYXJrZXJzVG9NYXAoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwuXHJcbiAqL1xyXG5jcmVhdGVSZXN0YXVyYW50SFRNTCA9IChyZXN0YXVyYW50KSA9PiB7XHJcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG5cclxuICBjb25zdCBwaWN0dXJlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncGljdHVyZScpO1xyXG4gIHBpY3R1cmUuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtcGljdHVyZSc7XHJcbiAgbGkuYXBwZW5kKHBpY3R1cmUpO1xyXG5cclxuICBjb25zdCBzcmMxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc291cmNlJyk7XHJcbiAgc3JjMS5tZWRpYSA9IFwiKG1pbi13aWR0aDogNzUwcHgpXCJcclxuICBzcmMxLnNyY3NldCA9IGAke0RCSGVscGVyLmltYWdlVXJsQmFzZVBhdGh9JHtEQkhlbHBlci5pbWFnZU5hbWVGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfS04MDBfbGFyZ2VfMXguanBnIDF4YDtcclxuICBzcmMxLnNyY3NldCArPSBgLCR7REJIZWxwZXIuaW1hZ2VVcmxCYXNlUGF0aH0ke0RCSGVscGVyLmltYWdlTmFtZUZvclJlc3RhdXJhbnQocmVzdGF1cmFudCl9LTEyMDBfbGFyZ2VfMnguanBnIDJ4YDtcclxuICBwaWN0dXJlLmFwcGVuZChzcmMxKTtcclxuXHJcbiAgY29uc3Qgc3JjMiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NvdXJjZScpO1xyXG4gIHNyYzIubWVkaWEgPSBcIihtaW4td2lkdGg6IDUwMHB4KVwiXHJcbiAgc3JjMi5zcmNzZXQgPSBgJHtEQkhlbHBlci5pbWFnZVVybEJhc2VQYXRofSR7REJIZWxwZXIuaW1hZ2VOYW1lRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KX0tbWVkaXVtLmpwZ2A7XHJcbiAgcGljdHVyZS5hcHBlbmQoc3JjMik7XHJcblxyXG4gIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcclxuICBpbWFnZS5zcmMgPSBEQkhlbHBlci5pbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgaW1hZ2UuYWx0ID0gXCJJbWFnZSBvZiB0aGUgcmVzdGF1cmFudCBcIiArIHJlc3RhdXJhbnQubmFtZTtcclxuICBwaWN0dXJlLmFwcGVuZChpbWFnZSk7XHJcblxyXG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gIGNvbnRhaW5lci5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1jb250YWluZXInO1xyXG4gIGxpLmFwcGVuZChjb250YWluZXIpO1xyXG5cclxuICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgY29udGVudC5jbGFzc05hbWUgPSBcInJlc3RhdXJhbnQtY29udGFpbmVyX19jb250ZW50XCI7XHJcbiAgY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcclxuXHJcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gzJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcbiAgY29udGVudC5hcHBlbmQobmFtZSk7XHJcblxyXG4gIGNvbnN0IG5laWdoYm9yaG9vZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBuZWlnaGJvcmhvb2QuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uZWlnaGJvcmhvb2Q7XHJcbiAgY29udGVudC5hcHBlbmQobmVpZ2hib3Job29kKTtcclxuXHJcbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcclxuICBjb250ZW50LmFwcGVuZChhZGRyZXNzKTtcclxuXHJcbiAgY29uc3QgbW9yZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuICBtb3JlLmlubmVySFRNTCA9ICdWaWV3IERldGFpbHMnO1xyXG4gIG1vcmUuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1ZpZXcgZGV0YWlscyBvZiB0aGUgcmVzdGF1cmFudCAnICsgcmVzdGF1cmFudC5uYW1lKTtcclxuICBtb3JlLmhyZWYgPSBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xyXG4gIGNvbnRhaW5lci5hcHBlbmQobW9yZSlcclxuXHJcbiAgcmV0dXJuIGxpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgbWFya2VycyBmb3IgY3VycmVudCByZXN0YXVyYW50cyB0byB0aGUgbWFwLlxyXG4gKi9cclxuYWRkTWFya2Vyc1RvTWFwID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAvLyBBZGQgbWFya2VyIHRvIHRoZSBtYXBcclxuICAgIGNvbnN0IG1hcmtlciA9IERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQocmVzdGF1cmFudCwgc2VsZi5uZXdNYXApO1xyXG4gICAgbWFya2VyLm9uKFwiY2xpY2tcIiwgb25DbGljayk7XHJcbiAgICBmdW5jdGlvbiBvbkNsaWNrKCkge1xyXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IG1hcmtlci5vcHRpb25zLnVybDtcclxuICAgIH1cclxuICAgIHNlbGYubWFya2Vycy5wdXNoKG1hcmtlcik7XHJcbiAgfSk7XHJcblxyXG59ICJdLCJmaWxlIjoibWFpbi5qcyJ9
