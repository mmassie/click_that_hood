/*
 * Click That ’Hood
 *
 * Front-end written (mostly) by Marcin Wichary, Code for America fellow 
 * in the year 2013.
 *
 * Note: This code is really gnarly. It’s been done under a lot of time 
 * pressure and there’s a lot of shortcut and tech debt. It might be improved
 * later if there’s time later.
 */

var HIGHLIGHT_DELAY = 1500;
var NEXT_GUESS_DELAY = 1000;

var MAP_VERT_PADDING = 50;

var EASY_MODE_COUNT = 20;

var MAP_OVERLAY_TILES_COUNT_X = 2;
var MAP_OVERLAY_TILES_COUNT_Y = 2;
var MAP_OVERLAY_OVERLAP_RATIO = .95;
var MAP_OVERLAY_SIZE_THRESHOLD = 400;

var SMALL_NEIGHBORHOOD_THRESHOLD = 8;

var startTime = 0;
var timerIntervalId;

var totalNeighborhoodsCount;
var neighborhoods = [];
var neighborhoodsToBeGuessed = [];
var neighborhoodsGuessed = [];

var mapClickable = false;

var easyMode = false;
var mainMenu = false;

var pixelRatio;

var cityId;

function updateData() {
  loadData();
  updateNav();
  updateCaption();
  window.setTimeout(updateMap, 0);
}

function getCanvasSize() {
  // TODO better const
  canvasWidth = document.querySelector('#map').offsetWidth;
  canvasHeight = 
      document.querySelector('#map').offsetHeight - MAP_VERT_PADDING * 2;
}

function calculateMapSize() {
  var minLat = 99999999;
  var maxLat = -99999999;
  var minLon = 99999999;
  var maxLon = -99999999;

  for (var i in mapData.features) {
    for (var j in mapData.features[i].geometry.coordinates[0]) {
      for (var k in mapData.features[i].geometry.coordinates[0][j]) {
        var lon = mapData.features[i].geometry.coordinates[0][j][k][0];
        var lat = mapData.features[i].geometry.coordinates[0][j][k][1];

        if (lat > maxLat) {
          maxLat = lat;
        }
        if (lat < minLat) {
          minLat = lat;
        }
        if (lon > maxLon) {
          maxLon = lon;
        }
        if (lon < minLon) {
          minLon = lon;
        }
      }
    }
  }

  // TODO no global variables
  centerLat = (minLat + maxLat) / 2;
  centerLon = (minLon + maxLon) / 2;

  latSpread = maxLat - minLat;
  lonSpread = maxLon - minLon;

  var mapWidth = CITY_DATA[cityId].mapSize[0] / 2500000;
  var mapHeight = CITY_DATA[cityId].mapSize[1] / 2500000;

  var mapRatio = mapWidth / mapHeight;

  getCanvasSize();

  var desiredWidth = canvasWidth;
  var desiredHeight = canvasWidth / mapRatio;

  if (desiredHeight > canvasHeight) {
    var desiredHeight = canvasHeight;
    var desiredWidth = canvasHeight * mapRatio;
  }

  var scale = desiredWidth / mapWidth;
  // TODO not top-level variable
  globalScale = scale; 

  mapPath = d3.geo.path().projection(
      d3.geo.mercator().center([centerLon, centerLat]).
      scale(globalScale).translate([canvasWidth / 2, canvasHeight / 2]));
}

function prepareMap() {
  getCanvasSize();

  mapSvg = d3.select('#svg-container').append('svg')
      .attr('width', canvasWidth)
      .attr('height', canvasHeight);    

  if (CITY_DATA[cityId].optDataFile) {
    // Read from local GeoJSON file
    var url = CITY_DATA[cityId].optDataFile;
  } else {
    // Read from CartoDB

    if (!CITY_DATA[cityId].optQuery) {
      // TODO do not require all?
      var query = "SELECT * FROM neighborhoods WHERE city = '" + cityName + "'";
    } else {
      var query = CITY_DATA[cityId].optQuery;
    }

    if (!CITY_DATA[cityId].optCartoDbUser) {
      var site = 'http://cfa.cartodb.com';
    } else {
      var site = 'http://' + CITY_DATA[cityId].optCartoDbUser + '.cartodb.com';
    }

    var url = site + '/api/v2/sql?q=' + encodeURIComponent(query) + 
        ' &format=GeoJSON';
  }

  queue()  
      .defer(d3.json, url)
      .await(mapIsReady);
}

function removeSmallNeighborhoods() {
  var els = document.querySelectorAll('#map .neighborhood');

  someSmallNeighborhoodsRemoved = false;

  for (var i = 0, el; el = els[i]; i++) {
    var boundingBox = el.getBBox();

    if ((boundingBox.width < SMALL_NEIGHBORHOOD_THRESHOLD) || 
        (boundingBox.height < SMALL_NEIGHBORHOOD_THRESHOLD)) {
      var name = el.getAttribute('name');

      neighborhoods.splice(neighborhoods.indexOf(name), 1);

      makeNeighborhoodInactive(name);

      totalNeighborhoodsCount--;

      someSmallNeighborhoodsRemoved = true;
    }
  }

  if (someSmallNeighborhoodsRemoved) {
    document.querySelector('#neighborhoods-removed').classList.add('visible');
  }
}

function updateCount() {
  var els = document.querySelectorAll('.easy-mode-count');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = EASY_MODE_COUNT;
  }

  var els = document.querySelectorAll('.hard-mode-count');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = totalNeighborhoodsCount;
  }
}

function mapIsReady(error, data) {
  mapData = data;

  calculateMapSize();

  prepareMapOverlay();
  resizeMapOverlay();

  prepareNeighborhoods();
  createMap();

  removeSmallNeighborhoods();
  updateCount();

  startIntro();
}

function prepareNeighborhoods() {
  neighborhoods = [];

  for (var i in mapData.features) {
    neighborhoods.push(mapData.features[i].properties.name);
  }

  neighborhoods.sort();

  totalNeighborhoodsCount = neighborhoods.length;
}

function createMap() {
  mapSvg
    .selectAll('path')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('d', mapPath)
    .attr('class', 'neighborhood unguessed')
    .attr('name', function(d) { return d.properties.name; })
    .on('click', function(d) {
      var el = d3.event.target || d3.event.toElement;

      if (!el.getAttribute('inactive')) {      
        handleNeighborhoodClick(el, d.properties.name);
      }
    })
    .on('mousedown', function(d) {
      d3.event.preventDefault();
    })
    .on('mouseover', function(d) {
      // TODO make a function
      var el = d3.event.target || d3.event.toElement;

      if (!el.getAttribute('inactive')) {
        var boundingBox = el.getBBox();

        var hoverEl = document.querySelector('#neighborhood-hover');

        hoverEl.innerHTML = d.properties.name;  

        hoverEl.style.left = (boundingBox.x + boundingBox.width / 2 - hoverEl.offsetWidth / 2) + 'px';
        hoverEl.style.top = (boundingBox.y + boundingBox.height) + 'px';

        hoverEl.classList.add('visible');  
      }
    })
    .on('mouseout', function(d) {
      // TODO use target
      document.querySelector('#neighborhood-hover').classList.remove('visible');  
    });

  onResize();
}

function setMapClickable(newMapClickable) {
  mapClickable = newMapClickable;

  if (mapClickable) {
    document.body.classList.remove('no-hover');
  } else {
    document.body.classList.add('no-hover');    
  }
}

function handleNeighborhoodClick(el, name) {
  if (!mapClickable) {
    return;
  }

  // Assuming accidental click on a neighborhood already guessed
  // TODO does this still work?
  if (neighborhoodsGuessed.indexOf('name') != -1) {
    return;
  }

  setMapClickable(false);

  if (name == neighborhoodToBeGuessedNext) {
    if (el.classList) {
      el.classList.remove('unguessed');
      el.classList.add('guessed');
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      el.style.fill = 'rgba(0, 255, 0, .25)';
      el.style.stroke = 'transparent';
    }

    neighborhoodsGuessed.push(name);

    var no = neighborhoodsToBeGuessed.indexOf(name);

    neighborhoodsToBeGuessed.splice(no, 1);

    updateGameProgress();

    if (neighborhoodsToBeGuessed.length == 0) {
      gameOver();
    } else {
      window.setTimeout(nextGuess, NEXT_GUESS_DELAY);
    }
  } else {
    if (el.classList) {
      el.classList.remove('unguessed');
      el.classList.add('wrong-guess');
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      el.style.fill = 'rgba(255, 0, 0, .7)';
      el.style.stroke = 'white';
      el.id = 'safari-wrong-guess';
    }

    var correctEl = document.querySelector('#map svg [name="' + neighborhoodToBeGuessedNext + '"]');
    if (correctEl.classList) {
      correctEl.classList.add('right-guess');
    } else {
      // Fix for early Safari 6 not supporting classes on SVG objects
      correctEl.style.webkitAnimationName = 'blink';
      correctEl.style.webkitAnimationDuration = '500ms';
      correctEl.style.webkitAnimationIterationCount = 'infinite';
      correctEl.id = 'safari-right-guess';
    }

    window.setTimeout(removeNeighborhoodHighlights, HIGHLIGHT_DELAY);
    window.setTimeout(nextGuess, HIGHLIGHT_DELAY + NEXT_GUESS_DELAY);
  }

  neighborhoodToBeGuessedNext = '';
  updateNeighborhoodDisplay();
}

function updateGameProgress() {
  document.querySelector('#count').innerHTML = 
      neighborhoodsGuessed.length + ' of ' + 
      (neighborhoodsGuessed.length + neighborhoodsToBeGuessed.length);
}

function removeNeighborhoodHighlights() {
  var el = document.querySelector('#map svg .wrong-guess');
  if (el) {
    el.classList.remove('wrong-guess');
    el.classList.add('unguessed');
  }
  var el = document.querySelector('#map svg .right-guess');
  if (el) {
    el.classList.remove('right-guess');
    el.classList.add('unguessed');
  }

  // Fix for early Safari 6 not supporting classes on SVG objects
  var el = document.querySelector('#safari-wrong-guess');
  if (el) {
    el.id = '';
    el.style.stroke = 'white';
    el.style.fill = '';
  }
  var el = document.querySelector('#safari-right-guess');
  if (el) {
    el.id = '';
    el.style.webkitAnimationName = '';
    el.style.stroke = 'white';
    el.style.fill = '';
  }

}

function updateNeighborhoodDisplay() {
  if (neighborhoodToBeGuessedNext) {
    document.querySelector('#neighborhood-guess').classList.add('visible');  
  } else {
    document.querySelector('#neighborhood-guess').classList.remove('visible');      
  }

  document.querySelector('#neighborhood-guess span').innerHTML = 
    neighborhoodToBeGuessedNext;  
}

function nextGuess() {
  setMapClickable(true);

  var pos = Math.floor(Math.random() * neighborhoodsToBeGuessed.length);

  neighborhoodToBeGuessedNext = neighborhoodsToBeGuessed[pos];
  updateNeighborhoodDisplay();
}

function startIntro() {
  document.querySelector('#loading').classList.remove('visible');
  document.querySelector('#intro').classList.add('visible');
}

function makeNeighborhoodInactive(name) {
  var el = document.querySelector('#map svg [name="' + name + '"]');

  el.setAttribute('inactive', true);
}

function removeNeighborhoodsForEasyMode() {
  while (neighborhoodsToBeGuessed.length > EASY_MODE_COUNT) {
    var pos = Math.floor(Math.random() * neighborhoodsToBeGuessed.length);

    var name = neighborhoodsToBeGuessed[pos];

    makeNeighborhoodInactive(name);

    neighborhoodsToBeGuessed.splice(pos, 1);
  }
}

function reloadPage() {
  location.reload();
}

function startGame(useEasyMode) {
  document.querySelector('#intro').classList.remove('visible');  
  document.querySelector('#cover').classList.remove('visible');

  neighborhoodsToBeGuessed = [];
  for (var i in neighborhoods) {
    neighborhoodsToBeGuessed.push(neighborhoods[i]);
  }

  easyMode = useEasyMode;
  if (easyMode) {
    removeNeighborhoodsForEasyMode();
  }

  updateGameProgress();

  startTime = new Date().getTime();
  timerIntervalId = window.setInterval(updateTimer, 100);

  window.setTimeout(nextGuess, NEXT_GUESS_DELAY);
}

function gameOver() {
  window.clearInterval(timerIntervalId);

  document.querySelector('#cover').classList.add('visible');
  document.querySelector(easyMode ? '#congrats-easy' : '#congrats-hard').classList.add('visible');  
}

function updateTimer() {
  var elapsedTime = Math.floor((new Date().getTime() - startTime) / 100);

  var tenthsOfSeconds = elapsedTime % 10;

  var seconds = Math.floor(elapsedTime / 10) % 60;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  var minutes = Math.floor(elapsedTime / 600);

  document.querySelector('#time').innerHTML = 
    minutes + ':' + seconds + '.' + tenthsOfSeconds;
}

function getGoogleMapsUrl(lat, lon, zoom, type) {
  var url = 'http://maps.googleapis.com/maps/api/staticmap' +
      '?center=' + lat + ',' + lon +
      '&zoom=' + zoom + '&size=640x640' +
      '&sensor=false&scale=' + pixelRatio + '&maptype=' + type + '&format=jpg';

  return url;
}

function prepareMapOverlay() {
  for (var x = 0; x < MAP_OVERLAY_TILES_COUNT_X; x++) {
    for (var y = 0; y < MAP_OVERLAY_TILES_COUNT_Y; y++) {
      var imgEl = document.createElement('img');

      document.querySelector('#google-maps-overlay').appendChild(imgEl);
    }
  }
}

function long2tile(lon, zoom) { 
  return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); 
}

function lat2tile(lat, zoom) { 
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 
      1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); 
}

function tile2long(x, zoom) {
  return (x / Math.pow(2, zoom) * 360 - 180);
}

function tile2lat(y, zoom) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return (180 / Math.PI * Math.atan(.5 * (Math.exp(n) - Math.exp(-n))));
}

function resizeMapOverlay() {
  var canvasWidth = document.querySelector('#map').offsetWidth;
  var canvasHeight = document.querySelector('#map').offsetHeight - MAP_VERT_PADDING * 2;

  // TODO unhardcode
  var size = globalScale * 0.0012238683395795992;
  size = size * 0.995 / 2;

  // TODO remove global
  zoom = 12;

  while (size < MAP_OVERLAY_SIZE_THRESHOLD) {
    size *= 2;
    zoom--;
  }

  var tile = lat2tile(centerLat, zoom);

  var longStep = (tile2long(1, zoom) - tile2long(0, zoom)) / 256 * 640;
  var latStep = (tile2lat(tile + 1, zoom) - tile2lat(tile, zoom)) / 256 * 640;

  var lat = centerLat - latStep / 2;
  var lon = centerLon - longStep / 2;

  var offsetX = canvasWidth / 2 - size;
  var offsetY = canvasHeight / 2 - size + 50;

  var els = document.querySelectorAll('#google-maps-overlay img');
  var elCount = 0;
  for (var x = 0; x < MAP_OVERLAY_TILES_COUNT_X; x++) {
    for (var y = 0; y < MAP_OVERLAY_TILES_COUNT_Y; y++) {
      var el = els[elCount];
      elCount++;

      var url = getGoogleMapsUrl(
          lat + y * latStep * MAP_OVERLAY_OVERLAP_RATIO, 
          lon + x * longStep * MAP_OVERLAY_OVERLAP_RATIO, 
          zoom, 
          'satellite');
      el.src = url;

      el.style.width = size + 'px';
      el.style.height = size + 'px';

      el.style.left = (offsetX + size * x * MAP_OVERLAY_OVERLAP_RATIO) + 'px';
      el.style.top = (offsetY + size * y * MAP_OVERLAY_OVERLAP_RATIO) + 'px';
    }
  }
}

function onResize() {
  calculateMapSize();
  resizeMapOverlay();

  mapSvg.attr('width', canvasWidth);
  mapSvg.attr('height', canvasHeight);

  mapSvg
    .selectAll('path')
    .attr('d', mapPath);
}

function capitalizeName(name) {
  return name.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
}

function getCityName() {
  cityId = '';

  var cityMatch = location.href.match(/[\?\&]city=([^&]*)/);

  if (cityMatch && cityMatch[1]) {
    if (CITY_DATA[cityMatch[1]]) {
      cityId = cityMatch[1];
    }
  }      

  if (cityId) {
    cityName = capitalizeName(cityId);
  } else {
    mainMenu = true;
  }
}

function updateFooter() {
  document.querySelector('#data-source').href = CITY_DATA[cityId].dataUrl;
  document.querySelector('#data-source').innerHTML = 
      CITY_DATA[cityId].dataTitle;
}

function prepareLogo() {
  document.querySelector('#city-name').src = 'images/city-name/' + cityId + '.png';

  var els = document.querySelectorAll('.city-name');
  for (var i = 0, el; el = els[i]; i++) {
    el.innerHTML = cityName;
  }
}

function prepareMainMenu() {
  document.body.classList.add('main-menu');

  for (var id in CITY_DATA) {
    var cityData = CITY_DATA[id];

    var el = document.createElement('li');
    el.innerHTML = 
        '<a href="?city=' + id + '">' +
        '<img class="map" src="http://maps.googleapis.com/maps/api/staticmap?center=' + 
        encodeURIComponent(cityData.googleMapsQuery) + 
        '&zoom=11&maptype=terrain&size=200x200&sensor=false&scale=' + pixelRatio + '">' +
        '<img class="name" src="images/city-name/' + id + '.png"></a>';

    document.querySelector('#main-menu .cities').appendChild(el);
  }

  document.querySelector('#main-menu').classList.add('visible');
}

function prepare() {
  pixelRatio = window.devicePixelRatio || 1;
}

function main() {
  prepare();

  getCityName();

  if (mainMenu) {
    prepareMainMenu();
  } else {
    prepareLogo();
    updateFooter();
    document.querySelector('#cover').classList.add('visible');
    document.querySelector('#loading').classList.add('visible');
    prepareMap();
    window.addEventListener('resize', onResize, false);
  }
}
