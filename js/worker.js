importScripts('libs.js');

self.addEventListener('message', e => {
	switch(e.data.cmd) {
        case 'fetch_reviews':
            DBHelper.fetchRestaurantReviewsById(e.data.id, (error, reviews) => {
                if (error) {
                    postMessage({
                        cmd: e.data.cmd,
                        error: error,
                    });
                } 
                else {
                    postMessage({
                        cmd: e.data.cmd,
                        error: null,
                        reviews: reviews
                    });
                }
            });
            break;
        case 'sync_reviews':
            DBHelper.syncReviews();
            break;
		case 'fetch_cuisines':
            DBHelper.fetchCuisines((error, cuisines) => {
                if (error) {
                    postMessage({
                        cmd: e.data.cmd,
                        error: error,
                    });
                } 
                else {
                    postMessage({
                        cmd: e.data.cmd,
                        error: null,
                        cuisines: cuisines
                    });
                }
            });
            break;
		case 'fetch_restaurant_cuisine_neighborhood':
			DBHelper.fetchRestaurantByCuisineAndNeighborhood(e.data.cuisine, e.data.neighborhood, (error, restaurants) => {
		    	if (error) {
			      	postMessage({
			      		cmd: e.data.cmd,
			      		error: error,
			      	});
		    	} 
		    	else {
					postMessage({
						cmd: e.data.cmd,
						error: null,
						restaurants: restaurants
					});
		    	}
			});
		break;
		case 'fetch_neighborhoods':
			DBHelper.fetchNeighborhoods((error, neighborhoods) => {
		    	if (error) {
			      	postMessage({
			      		cmd: e.data.cmd,
			      		error: error,
			      	});
		    	} 
		    	else {
					postMessage({
						cmd: e.data.cmd,
						error: null,
						neighborhoods: neighborhoods
					});
		    	}
	  		});
			break;
		case 'fetch_restaurant':
		    DBHelper.fetchRestaurantById(e.data.id, (error, restaurant) => {
		      if (!restaurant) {
		      	postMessage({
		      		cmd: e.data.cmd,
		      		error: error,
		      	});
		      }
		      
		      postMessage({
		      	cmd: e.data.cmd,
		      	error: null,
		      	restaurant: restaurant
		      });
		    });
			break;
	}
});