let restaurants,neighborhoods,cuisines;var newMap,markers=[];const worker=new Worker("js/worker.js");worker.addEventListener("message",e=>{switch(e.data.cmd){case"fetch_cuisines":if(e.data.error)return void console.log(e.data.error);self.cuisines=e.data.cuisines,fillCuisinesHTML();break;case"fetch_neighborhoods":if(e.data.error)return void console.log(e.data.error);self.neighborhoods=e.data.neighborhoods,fillNeighborhoodsHTML();break;case"fetch_restaurant_cuisine_neighborhood":if(e.data.error)return void console.log(e.data.error);resetRestaurants(e.data.restaurants),fillRestaurantsHTML()}}),document.addEventListener("DOMContentLoaded",e=>{registerServiceWorker(),initMap(),fetchNeighborhoods(),fetchCuisines()}),fetchNeighborhoods=(()=>{worker.postMessage({cmd:"fetch_neighborhoods"})}),fillNeighborhoodsHTML=((e=self.neighborhoods)=>{const t=document.getElementById("neighborhoods-select");e.forEach(e=>{const a=document.createElement("option");a.innerHTML=e,a.value=e,t.append(a)})}),fetchCuisines=(()=>{worker.postMessage({cmd:"fetch_cuisines"})}),fillCuisinesHTML=((e=self.cuisines)=>{const t=document.getElementById("cuisines-select");e.forEach(e=>{const a=document.createElement("option");a.innerHTML=e,a.value=e,t.append(a)})}),initMap=(()=>{self.newMap=L.map("map",{center:[40.722216,-73.987501],zoom:12,scrollWheelZoom:!1}),L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",{mapboxToken:"pk.eyJ1IjoibGVtYSIsImEiOiJjamt0YXVla2MwM3NjM3dvZHQ0NDIwZmVpIn0.pOEFaPY6enCchIG29Lo2SQ",maxZoom:18,attribution:'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',id:"mapbox.streets"}).addTo(newMap),updateRestaurants()}),updateRestaurants=(()=>{const e=document.getElementById("cuisines-select"),t=document.getElementById("neighborhoods-select"),a=e.selectedIndex,r=t.selectedIndex,s=e[a].value,n=t[r].value;worker.postMessage({cmd:"fetch_restaurant_cuisine_neighborhood",cuisine:s,neighborhood:n})}),resetRestaurants=(e=>{self.restaurants=[],document.getElementById("restaurants-list").innerHTML="",self.markers&&self.markers.forEach(e=>e.remove()),self.markers=[],self.restaurants=e}),fillRestaurantsHTML=((e=self.restaurants)=>{const t=document.getElementById("restaurants-list");e.forEach(e=>{t.append(createRestaurantHTML(e))}),addMarkersToMap()}),createRestaurantHTML=(e=>{const t=document.createElement("li"),a=document.createElement("picture");a.className="restaurant-picture",t.append(a);const r=document.createElement("source");r.media="(min-width: 750px)",r.srcset=`${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(e)}-800_large_1x.jpg 1x`,r.srcset+=`,${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(e)}-1200_large_2x.jpg 2x`,a.append(r);const s=document.createElement("source");s.media="(min-width: 500px)",s.srcset=`${DBHelper.imageUrlBasePath}${DBHelper.imageNameForRestaurant(e)}-medium.jpg`,a.append(s);const n=document.createElement("img");n.className="restaurant-img",n.src=DBHelper.imageUrlForRestaurant(e),n.alt="Image of the restaurant "+e.name,a.append(n);const o=document.createElement("div");o.className="restaurant-container",t.append(o);const c=document.createElement("div");c.className="restaurant-container__content",o.append(c);const i=document.createElement("h3");i.innerHTML=e.name,c.append(i);const d=document.createElement("p");d.innerHTML=e.neighborhood,c.append(d);const l=document.createElement("p");l.innerHTML=e.address,c.append(l);const m=document.createElement("a");return m.innerHTML="View Details",m.setAttribute("aria-label","View details of the restaurant "+e.name),m.href=DBHelper.urlForRestaurant(e),o.append(m),t}),addMarkersToMap=((e=self.restaurants)=>{e.forEach(e=>{const t=DBHelper.mapMarkerForRestaurant(e,self.newMap);t.on("click",function(){window.location.href=t.options.url}),self.markers.push(t)})});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsicmVzdGF1cmFudHMiLCJuZWlnaGJvcmhvb2RzIiwiY3Vpc2luZXMiLCJuZXdNYXAiLCJtYXJrZXJzIiwid29ya2VyIiwiZGF0YSIsImNtZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJlIiwiY29uc29sZSIsImVycm9yIiwibG9nIiwic2VsZiIsImZpbGxDdWlzaW5lc0hUTUwiLCJmaWxsTmVpZ2hib3Job29kc0hUTUwiLCJyZXNldFJlc3RhdXJhbnRzIiwiZmlsbFJlc3RhdXJhbnRzSFRNTCIsImRvY3VtZW50IiwiZXZlbnQiLCJyZWdpc3RlclNlcnZpY2VXb3JrZXIiLCJpbml0TWFwIiwiZmV0Y2hOZWlnaGJvcmhvb2RzIiwicG9zdE1lc3NhZ2UiLCJzZWxlY3QiLCJnZXRFbGVtZW50QnlJZCIsIm5laWdoYm9yaG9vZCIsIm9wdGlvbiIsImlubmVySFRNTCIsImZldGNoQ3Vpc2luZXMiLCJmb3JFYWNoIiwiY3Vpc2luZSIsImNyZWF0ZUVsZW1lbnQiLCJMIiwibWFwIiwiY2VudGVyIiwiem9vbSIsInNjcm9sbFdoZWVsWm9vbSIsImF0dHJpYnV0aW9uIiwibWF4Wm9vbSIsInVwZGF0ZVJlc3RhdXJhbnRzIiwiY1NlbGVjdCIsIm5TZWxlY3QiLCJjSW5kZXgiLCJzZWxlY3RlZEluZGV4IiwidmFsdWUiLCJuSW5kZXgiLCJtYXJrZXIiLCJyZW1vdmUiLCJyZXN0YXVyYW50IiwiYWRkTWFya2Vyc1RvTWFwIiwiY3JlYXRlUmVzdGF1cmFudEhUTUwiLCJsaSIsInBpY3R1cmUiLCJjbGFzc05hbWUiLCJzcmMxIiwibWVkaWEiLCJzcmNzZXQiLCJEQkhlbHBlciIsImltYWdlVXJsQmFzZVBhdGgiLCJpbWFnZU5hbWVGb3JSZXN0YXVyYW50IiwiYXBwZW5kIiwic3JjMiIsImltYWdlIiwic3JjIiwiaW1hZ2VVcmxGb3JSZXN0YXVyYW50IiwiYWx0IiwiY29udGFpbmVyIiwibmFtZSIsImNvbnRlbnQiLCJhZGRyZXNzIiwibW9yZSIsInNldEF0dHJpYnV0ZSIsImhyZWYiLCJ1cmxGb3JSZXN0YXVyYW50IiwibWFwTWFya2VyRm9yUmVzdGF1cmFudCIsIm9uIiwid2luZG93IiwibG9jYXRpb24iLCJvcHRpb25zIiwidXJsIiwicHVzaCJdLCJtYXBwaW5ncyI6IkFBQUEsSUFBSUEsWUFHSkMsY0FDQUMsU0FFQSxJQUFBQyxPQUZJQyxRQUFVLEdBT1osTUFBQUMsT0FBU0MsSUFBS0MsT0FBZCxnQkFDRUYsT0FBQUcsaUJBQUssVUFBTEMsSUFDRSxPQUFBQSxFQUFLSCxLQUFEQyxLQUNGRyxJQUFBQSxpQkFDQSxHQUFBRCxFQUFBSCxLQUFBSyxNQUFBLFlBQ0RELFFBQUFFLElBQUFILEVBQUFILEtBQUFLLE9BSURFLEtBQUFYLFNBQUFPLEVBQUFILEtBQUFKLFNBREFZLG1CQUVGLE1BQ0UsSUFBQSxzQkFDRUosR0FBQUEsRUFBQUEsS0FBUUUsTUFFVCxZQURDRixRQUFBRSxJQUFBSCxFQUFBSCxLQUFBSyxPQUlGSSxLQUFBQSxjQUFxQk4sRUFBQUgsS0FBQUwsY0FDckJjLHdCQUFBLE1BQ0YsSUFBSyx3Q0FDSCxHQUFJTixFQUFFSCxLQUFLSyxNQUVULFlBREFELFFBQVFFLElBQUlILEVBQUVILEtBQUtLLE9BSXJCSyxpQkFBaUJQLEVBQUVILEtBQUtOLGFBQ3hCaUIseUJBUU5DLFNBQVNWLGlCQUFpQixtQkFBcUJXLElBQzdDQyx3QkFDQUMsVUFDQUMscUJBQUFBLGtCQU9GQSxtQkFBcUIsTUFBckJBLE9BQUFBLFlBQXFCLENBQ25CakIsSUFBT2tCLDBCQVFUUixzQkFBd0IsRUFBQ2QsRUFBZ0JZLEtBQUtaLGlCQUM1QyxNQUFNdUIsRUFBU04sU0FBU08sZUFBZSx3QkFEekNWLEVBQUFBLFFBQXdCVyxJQUN0QixNQUFNRixFQUFTTixTQUFTTyxjQUFlLFVBQ3ZDeEIsRUFBQUEsVUFBQXlCLEVBQ0VDLEVBQU1BLE1BQVNULEVBQ2ZTLEVBQU9DLE9BQUFBLE9BU1hDLGNBQWdCLE1BQ2R4QixPQUFPa0IsWUFBWSxDQUNqQmhCLElBQUsscUJB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QyxPQWJGdUMsRUFBSzNDLFVBQVksZUFDakIyQyxFQUFLQyxhQUFhLGFBQWMsa0NBQW9DdkIsRUFBV21CLE1BQy9FRyxFQUFLRSxLQUFPZixTQUFTZ0IsaUJBQWlCekIsR0FTeENDLEVBQUFBLE9BQW1CbEQsR0FFZm9ELElBS0NGLGdCQUFBLEVBQUFsRCxFQUFBYSxLQUFBYixlQU5IQSxFQUFZOEIsUUFBUW1CLElBQXBCLE1BQUFGLEVBQUFXLFNBQUFpQix1QkFBQTFCLEVBQUFwQyxLQUFBVixRQURGNEMsRUFBQTZCLEdBQUEsUUFLSSxXQUNFQyxPQUFPQyxTQUFTTCxLQUFPMUIsRUFBT2dDLFFBQVFDLE1BRXhDbkUsS0FBS1QsUUFBUTZFLEtBQUtsQyIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IHJlc3RhdXJhbnRzLFxyXG4gIG5laWdoYm9yaG9vZHMsXHJcbiAgY3Vpc2luZXNcclxudmFyIG5ld01hcFxyXG52YXIgbWFya2VycyA9IFtdXHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSB3b3JrZXJcclxuICovXHJcbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xyXG53b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGUgPT4ge1xyXG4gIHN3aXRjaChlLmRhdGEuY21kKSB7XHJcbiAgICBjYXNlICdmZXRjaF9jdWlzaW5lcyc6XHJcbiAgICAgIGlmIChlLmRhdGEuZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlLmRhdGEuZXJyb3IpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2VsZi5jdWlzaW5lcyA9IGUuZGF0YS5jdWlzaW5lcztcclxuICAgICAgZmlsbEN1aXNpbmVzSFRNTCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2ZldGNoX25laWdoYm9yaG9vZHMnOlxyXG4gICAgICBpZiAoZS5kYXRhLmVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZS5kYXRhLmVycm9yKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHNlbGYubmVpZ2hib3Job29kcyA9IGUuZGF0YS5uZWlnaGJvcmhvb2RzO1xyXG4gICAgICBmaWxsTmVpZ2hib3Job29kc0hUTUwoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdmZXRjaF9yZXN0YXVyYW50X2N1aXNpbmVfbmVpZ2hib3Job29kJzpcclxuICAgICAgaWYgKGUuZGF0YS5lcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGUuZGF0YS5lcnJvcik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXNldFJlc3RhdXJhbnRzKGUuZGF0YS5yZXN0YXVyYW50cyk7XHJcbiAgICAgIGZpbGxSZXN0YXVyYW50c0hUTUwoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBuZWlnaGJvcmhvb2RzIGFuZCBjdWlzaW5lcyBhcyBzb29uIGFzIHRoZSBwYWdlIGlzIGxvYWRlZC5cclxuICovXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoZXZlbnQpID0+IHtcclxuICByZWdpc3RlclNlcnZpY2VXb3JrZXIoKTtcclxuICBpbml0TWFwKCk7IC8vIGFkZGVkIFxyXG4gIGZldGNoTmVpZ2hib3Job29kcygpO1xyXG4gIGZldGNoQ3Vpc2luZXMoKTtcclxufSk7XHJcblxyXG4vKipcclxuICogRmV0Y2ggYWxsIG5laWdoYm9yaG9vZHMgYW5kIHNldCB0aGVpciBIVE1MLlxyXG4gKi9cclxuZmV0Y2hOZWlnaGJvcmhvb2RzID0gKCkgPT4ge1xyXG4gIHdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICBjbWQ6ICdmZXRjaF9uZWlnaGJvcmhvb2RzJyxcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldCBuZWlnaGJvcmhvb2RzIEhUTUwuXHJcbiAqL1xyXG5maWxsTmVpZ2hib3Job29kc0hUTUwgPSAobmVpZ2hib3Job29kcyA9IHNlbGYubmVpZ2hib3Job29kcykgPT4ge1xyXG4gIGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZWlnaGJvcmhvb2RzLXNlbGVjdCcpO1xyXG4gIG5laWdoYm9yaG9vZHMuZm9yRWFjaChuZWlnaGJvcmhvb2QgPT4ge1xyXG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gbmVpZ2hib3Job29kO1xyXG4gICAgb3B0aW9uLnZhbHVlID0gbmVpZ2hib3Job29kO1xyXG4gICAgc2VsZWN0LmFwcGVuZChvcHRpb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogRmV0Y2ggYWxsIGN1aXNpbmVzIGFuZCBzZXQgdGhlaXIgSFRNTC5cclxuICovXHJcbmZldGNoQ3Vpc2luZXMgPSAoKSA9PiB7XHJcbiAgd29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgIGNtZDogJ2ZldGNoX2N1aXNpbmVzJ1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IGN1aXNpbmVzIEhUTUwuXHJcbiAqL1xyXG5maWxsQ3Vpc2luZXNIVE1MID0gKGN1aXNpbmVzID0gc2VsZi5jdWlzaW5lcykgPT4ge1xyXG4gIGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdWlzaW5lcy1zZWxlY3QnKTtcclxuXHJcbiAgY3Vpc2luZXMuZm9yRWFjaChjdWlzaW5lID0+IHtcclxuICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG4gICAgb3B0aW9uLmlubmVySFRNTCA9IGN1aXNpbmU7XHJcbiAgICBvcHRpb24udmFsdWUgPSBjdWlzaW5lO1xyXG4gICAgc2VsZWN0LmFwcGVuZChvcHRpb24pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBsZWFmbGV0IG1hcCwgY2FsbGVkIGZyb20gSFRNTC5cclxuICovXHJcbmluaXRNYXAgPSAoKSA9PiB7XHJcbiAgc2VsZi5uZXdNYXAgPSBMLm1hcCgnbWFwJywge1xyXG4gICAgICAgIGNlbnRlcjogWzQwLjcyMjIxNiwgLTczLjk4NzUwMV0sXHJcbiAgICAgICAgem9vbTogMTIsXHJcbiAgICAgICAgc2Nyb2xsV2hlZWxab29tOiBmYWxzZVxyXG4gICAgICB9KTtcclxuICBMLnRpbGVMYXllcignaHR0cHM6Ly9hcGkudGlsZXMubWFwYm94LmNvbS92NC97aWR9L3t6fS97eH0ve3l9LmpwZzcwP2FjY2Vzc190b2tlbj17bWFwYm94VG9rZW59Jywge1xyXG4gICAgbWFwYm94VG9rZW46ICdway5leUoxSWpvaWJHVnRZU0lzSW1FaU9pSmphbXQwWVhWbGEyTXdNM05qTTNkdlpIUTBOREl3Wm1WcEluMC5wT0VGYVBZNmVuQ2NoSUcyOUxvMlNRJyxcclxuICAgIG1heFpvb206IDE4LFxyXG4gICAgYXR0cmlidXRpb246ICdNYXAgZGF0YSAmY29weTsgPGEgaHJlZj1cImh0dHBzOi8vd3d3Lm9wZW5zdHJlZXRtYXAub3JnL1wiPk9wZW5TdHJlZXRNYXA8L2E+IGNvbnRyaWJ1dG9ycywgJyArXHJcbiAgICAgICc8YSBocmVmPVwiaHR0cHM6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL2xpY2Vuc2VzL2J5LXNhLzIuMC9cIj5DQy1CWS1TQTwvYT4sICcgK1xyXG4gICAgICAnSW1hZ2VyeSDCqSA8YSBocmVmPVwiaHR0cHM6Ly93d3cubWFwYm94LmNvbS9cIj5NYXBib3g8L2E+JyxcclxuICAgIGlkOiAnbWFwYm94LnN0cmVldHMnXHJcbiAgfSkuYWRkVG8obmV3TWFwKTtcclxuXHJcbiAgdXBkYXRlUmVzdGF1cmFudHMoKTtcclxufVxyXG51cGRhdGVSZXN0YXVyYW50cyA9ICgpID0+IHtcclxuICBjb25zdCBjU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG4gIGNvbnN0IG5TZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuXHJcbiAgY29uc3QgY0luZGV4ID0gY1NlbGVjdC5zZWxlY3RlZEluZGV4O1xyXG4gIGNvbnN0IG5JbmRleCA9IG5TZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGNTZWxlY3RbY0luZGV4XS52YWx1ZTtcclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBuU2VsZWN0W25JbmRleF0udmFsdWU7XHJcblxyXG4gIHdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICBjbWQ6IFwiZmV0Y2hfcmVzdGF1cmFudF9jdWlzaW5lX25laWdoYm9yaG9vZFwiLFxyXG4gICAgY3Vpc2luZTogY3Vpc2luZSxcclxuICAgIG5laWdoYm9yaG9vZDogbmVpZ2hib3Job29kXHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhciBjdXJyZW50IHJlc3RhdXJhbnRzLCB0aGVpciBIVE1MIGFuZCByZW1vdmUgdGhlaXIgbWFwIG1hcmtlcnMuXHJcbiAqL1xyXG5yZXNldFJlc3RhdXJhbnRzID0gKHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgLy8gUmVtb3ZlIGFsbCByZXN0YXVyYW50c1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSBbXTtcclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XHJcbiAgdWwuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gIC8vIFJlbW92ZSBhbGwgbWFwIG1hcmtlcnNcclxuICBpZiAoc2VsZi5tYXJrZXJzKSB7XHJcbiAgICBzZWxmLm1hcmtlcnMuZm9yRWFjaChtYXJrZXIgPT4gbWFya2VyLnJlbW92ZSgpKTtcclxuICB9XHJcbiAgc2VsZi5tYXJrZXJzID0gW107XHJcbiAgc2VsZi5yZXN0YXVyYW50cyA9IHJlc3RhdXJhbnRzO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFsbCByZXN0YXVyYW50cyBIVE1MIGFuZCBhZGQgdGhlbSB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmZpbGxSZXN0YXVyYW50c0hUTUwgPSAocmVzdGF1cmFudHMgPSBzZWxmLnJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudHMtbGlzdCcpO1xyXG4gIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICB1bC5hcHBlbmQoY3JlYXRlUmVzdGF1cmFudEhUTUwocmVzdGF1cmFudCkpO1xyXG4gIH0pO1xyXG4gIGFkZE1hcmtlcnNUb01hcCgpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgSFRNTC5cclxuICovXHJcbmNyZWF0ZVJlc3RhdXJhbnRIVE1MID0gKHJlc3RhdXJhbnQpID0+IHtcclxuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gIGNvbnN0IHBpY3R1cmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwaWN0dXJlJyk7XHJcbiAgcGljdHVyZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1waWN0dXJlJztcclxuICBsaS5hcHBlbmQocGljdHVyZSk7XHJcblxyXG4gIGNvbnN0IHNyYzEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzb3VyY2UnKTtcclxuICBzcmMxLm1lZGlhID0gXCIobWluLXdpZHRoOiA3NTBweClcIlxyXG4gIHNyYzEuc3Jjc2V0ID0gYCR7REJIZWxwZXIuaW1hZ2VVcmxCYXNlUGF0aH0ke0RCSGVscGVyLmltYWdlTmFtZUZvclJlc3RhdXJhbnQocmVzdGF1cmFudCl9LTgwMF9sYXJnZV8xeC5qcGcgMXhgO1xyXG4gIHNyYzEuc3Jjc2V0ICs9IGAsJHtEQkhlbHBlci5pbWFnZVVybEJhc2VQYXRofSR7REJIZWxwZXIuaW1hZ2VOYW1lRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KX0tMTIwMF9sYXJnZV8yeC5qcGcgMnhgO1xyXG4gIHBpY3R1cmUuYXBwZW5kKHNyYzEpO1xyXG5cclxuICBjb25zdCBzcmMyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc291cmNlJyk7XHJcbiAgc3JjMi5tZWRpYSA9IFwiKG1pbi13aWR0aDogNTAwcHgpXCJcclxuICBzcmMyLnNyY3NldCA9IGAke0RCSGVscGVyLmltYWdlVXJsQmFzZVBhdGh9JHtEQkhlbHBlci5pbWFnZU5hbWVGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfS1tZWRpdW0uanBnYDtcclxuICBwaWN0dXJlLmFwcGVuZChzcmMyKTtcclxuXHJcbiAgY29uc3QgaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gIGltYWdlLnNyYyA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBpbWFnZS5hbHQgPSBcIkltYWdlIG9mIHRoZSByZXN0YXVyYW50IFwiICsgcmVzdGF1cmFudC5uYW1lO1xyXG4gIHBpY3R1cmUuYXBwZW5kKGltYWdlKTtcclxuXHJcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICdyZXN0YXVyYW50LWNvbnRhaW5lcic7XHJcbiAgbGkuYXBwZW5kKGNvbnRhaW5lcik7XHJcblxyXG4gIGNvbnN0IGNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBjb250ZW50LmNsYXNzTmFtZSA9IFwicmVzdGF1cmFudC1jb250YWluZXJfX2NvbnRlbnRcIjtcclxuICBjb250YWluZXIuYXBwZW5kKGNvbnRlbnQpO1xyXG5cclxuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDMnKTtcclxuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcclxuICBjb250ZW50LmFwcGVuZChuYW1lKTtcclxuXHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIG5laWdoYm9yaG9vZC5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuICBjb250ZW50LmFwcGVuZChuZWlnaGJvcmhvb2QpO1xyXG5cclxuICBjb25zdCBhZGRyZXNzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xyXG4gIGNvbnRlbnQuYXBwZW5kKGFkZHJlc3MpO1xyXG5cclxuICBjb25zdCBtb3JlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xyXG4gIG1vcmUuaW5uZXJIVE1MID0gJ1ZpZXcgRGV0YWlscyc7XHJcbiAgbW9yZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnVmlldyBkZXRhaWxzIG9mIHRoZSByZXN0YXVyYW50ICcgKyByZXN0YXVyYW50Lm5hbWUpO1xyXG4gIG1vcmUuaHJlZiA9IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgY29udGFpbmVyLmFwcGVuZChtb3JlKVxyXG5cclxuICByZXR1cm4gbGlcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCBtYXJrZXJzIGZvciBjdXJyZW50IHJlc3RhdXJhbnRzIHRvIHRoZSBtYXAuXHJcbiAqL1xyXG5hZGRNYXJrZXJzVG9NYXAgPSAocmVzdGF1cmFudHMgPSBzZWxmLnJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgcmVzdGF1cmFudHMuZm9yRWFjaChyZXN0YXVyYW50ID0+IHtcclxuICAgIC8vIEFkZCBtYXJrZXIgdG8gdGhlIG1hcFxyXG4gICAgY29uc3QgbWFya2VyID0gREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBzZWxmLm5ld01hcCk7XHJcbiAgICBtYXJrZXIub24oXCJjbGlja1wiLCBvbkNsaWNrKTtcclxuICAgIGZ1bmN0aW9uIG9uQ2xpY2soKSB7XHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbWFya2VyLm9wdGlvbnMudXJsO1xyXG4gICAgfVxyXG4gICAgc2VsZi5tYXJrZXJzLnB1c2gobWFya2VyKTtcclxuICB9KTtcclxuXHJcbn0gIl19
