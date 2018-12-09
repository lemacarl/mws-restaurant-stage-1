let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  registerServiceWorker();
});

/**
 * Initialize worker
 */
const worker = new Worker('js/worker.js');
worker.addEventListener('message', e => {
  switch(e.data.cmd) {
    case 'fetch_reviews':
      if (e.data.error) {
        console.log(e.data.error);
        return;
      }

      generateReviewsHTML(e.data.reviews);
      break;
    case 'fetch_restaurant':
      if (e.data.error) {
        console.log(e.data.error);
        return;
      }

      self.restaurant = e.data.restaurant;
      fillRestaurantHTML();
      handleRestaurant(null, self.restaurant);
      break;
  }
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL();
}  
 
/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    handleRestaurant(null, self.restaurant)
    return;
  }
  
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    handleRestaurant(error, null);
  } 
  else {
    worker.postMessage({
      cmd: 'fetch_restaurant',
      id: id
    });
  }
}

/**
 * Handle restaurant callback
 */
handleRestaurant = (error, restaurant) => {
  if (error) { // Got an error!
    console.error(error);
  } 
  else {      
    self.newMap = L.map('map', {
      center: [restaurant.latlng.lat, restaurant.latlng.lng],
      zoom: 16,
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
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-picture');
  picture.className = 'restaurant-picture';

  const favButton = document.getElementById('favbutton');
  if (restaurant.is_favorite === 'false') {
    favbutton.className = "heart-inactive"
  }
  else {
    favbutton.className = 'heart-active';
  }

  const src1 = document.getElementById('source-1');
  src1.media = "(min-width: 750px)"
  src1.srcset = `${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-800_large_1x.jpg 1x`;
  src1.srcset += `,${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-1200_large_2x.jpg 2x`;

  const src2 = document.getElementById('source-2');
  src2.media = "(min-width: 500px)"
  src2.srcset = `${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(restaurant)}-medium.jpg`;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "Image of the restaurant " + restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  if (!reviews) {
    worker.postMessage({
      cmd: 'fetch_reviews',
      id: self.restaurant.id
    });
  }
  else {
    generateReviewsHTML(reviews);
  }
}

/**
 * Generate reviews HTML
 */
generateReviewsHTML = reviews => {
  const container = document.getElementById('reviews-container');
  const reviewsMsg = document.getElementById('reviews-message');

  if (!reviews) {
    reviewsMsg.innerHTML = 'No reviews yet!';
    return;
  }

  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';
  reviewsMsg.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const div = document.createElement('div');
  div.className = "review-header";
  li.appendChild(div);

  const name = document.createElement('h3');
  name.innerHTML = review.name;
  div.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = review.date;
  date.className = "review-date";
  div.appendChild(date);

  const body = document.createElement('div');
  body.className = "review-body";
  li.appendChild(body);

  const rating = document.createElement('span');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = "review-rating"
  body.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  body.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Expand add review  
 */
const addReviewButton = document.getElementById('add-review');
addReviewButton.addEventListener('click', e => {
  e.preventDefault();
  const form = document.getElementById('submit-review');
  form.style.display = 'block';
  addReviewButton.setAttribute('aria-expanded', true);
});

/**
 * Post review
 */
const postReviewButton = document.getElementById('post-review');
postReviewButton.addEventListener('click', e => {
  e.preventDefault();
  
  const name = document.getElementById('name');
  const comments = document.getElementById('comments');
  const rating = document.getElementById('rating');

  // Validate review fields
  if (name.value === '' || comments.value === '' || rating.value === '') return;

  const review = {}
  review.name = name.value;
  review.rating = rating.value;
  review.comments = comments.value;
  review.date = moment().format('MMMM D, YYYY');
  review.synced = false;

  // Reset values
  name.value = '';
  comments.value = '';
  rating.value = -1;

  // Fetch restaurant from DB
  DBHelper.fetchRestaurantById(self.restaurant.id, (error, restaurant) => {
    if (restaurant) {
      self.restaurant = restaurant;

      if (Array.isArray(self.restaurant.reviews)) {
        self.restaurant.reviews.push(review);
      }
      else {
        self.restaurant.reviews = [];
        self.restaurant.reviews.push(review);
      }

      DBHelper.updateRestaurantReviews(self.restaurant).then(result => {
        if (result) {
          const form = document.getElementById('submit-review');
          form.style.display = 'none';

          addReviewButton.setAttribute('aria-expanded', false);

          const toast = Toast.create({
            text: "Review submitted."
          });
          Toast.setTimeout(toast.id, 2000);

          fillReviewsHTML();
        }
      });
    }
  });
});

/**
 * Handle favorite button
 */
const favButton = document.getElementById('favbutton');
favbutton.addEventListener('click', e => {
  e.preventDefault();
  if (favbutton.classList.contains('heart-active')) {
    self.restaurant.is_favorite = false;
    favbutton.className = 'heart-inactive';
    DBHelper.favoriteRestaurant(self.restaurant);
  }
  else {
    self.restaurant.is_favorite = true;
    favbutton.className = 'heart-active';
    DBHelper.favoriteRestaurant(self.restaurant);
  }
})

/**
 * Offline event handler
 */
window.addEventListener('offline', () => {
  const toast = Toast.create({
    text: "Unable to connect. Retrying..."
  });

  Toast.setTimeout(toast.id, 5000);
});

/**
 * Online event handler
 */
window.addEventListener('online', () => {
  worker.postMessage({
    cmd: 'sync_reviews'
  });
})