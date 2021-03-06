var CITY_DATA = {
  'chicago': {
    // TODO unhardcode this
    mapSize: [ 2500, 3850 ],
    optDataFile: 'data/chicago.geojson',
    googleMapsQuery: 'Chicago, IL',
    dataUrl: 'https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Neighborhoods/9wp7-iasj',
    dataTitle: 'City of Chicago Data Portal'
  },
  'lexington': { 
    mapSize: [ 1507, 1507 ],
    googleMapsQuery: 'Lexington, KY',
    dataUrl: 'http://www.zillow.com/howto/api/neighborhood-boundaries.htm',
    dataTitle: 'Zillow'
  },
  'louisville': {
    mapSize: [ 1507, 1196 ],
    googleMapsQuery: 'Louisville, KY',
    dataUrl: 'http://www.zillow.com/howto/api/neighborhood-boundaries.htm',
    dataTitle: 'Zillow'
  },
  'oakland': { 
    mapSize: [ 1507, 1796 ],
    googleMapsQuery: 'Oakland, CA',
    dataUrl: 'http://data.openoakland.org/dataset/zillow-neighborhoods',
    dataTitle: 'OpenOakland'
  },
  'milwaukee': {
    mapSize: [ 2900, 2900 ],
    optDataFile: 'data/milwaukee.geojson',
    googleMapsQuery: 'Milwaukee, WI',
    dataUrl: 'http://city.milwaukee.gov/DownloadMapData3497.htm',
    dataTitle: 'City of Milwaukee Map Data'
  },
  'san-francisco': { 
    mapSize: [ 1207, 1207 ],
    optQuery: 'SELECT * FROM cth_sf_neighborhoods',
    optCartoDbUser: 'mwichary',
    googleMapsQuery: 'San Francisco, CA',
    dataUrl: 'https://data.sfgov.org/Geography/Planning-Neighborhoods/qc6m-r4ih',
    dataTitle: 'San Francisco Data'
  },
  'seattle': { 
    mapSize: [ 2207, 2807 ],
    optDataFile: 'data/seattle.geojson',
    googleMapsQuery: 'Seattle, WA',
    dataUrl: 'https://data.seattle.gov/dataset/Neighborhoods/2mbt-aqqx',
    dataTitle: 'Data.Seattle.Gov'
  },
};
