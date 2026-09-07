import { useContext, useEffect, useState, createContext } from "react";
import {APIProvider, AdvancedMarker, Map, Pin, useMapsLibrary, useMap, useAdvancedMarkerRef} from '@vis.gl/react-google-maps';
import { useRouter } from "next/router";

const CENTER = [41.118472, -85.1096774];
const ZOOM = 15;

const MapContext = createContext(null);

export default function MapView({ apiKey, coordinates, recenterButtonId, routeId, mapId })
{
  const [fetched, setFetched] = useState(false);
  const [polylines, setPolylines] = useState();
  const [locations, setLocations] = useState({
    "gotech":
    [
      [41.12316603334189, -85.10610432541819],
      [41.12298154993459, -85.10569836377807],
      [41.12230184118674, -85.10012641846072],
      [41.12185171165873, -85.10015638577222],
      [41.12217581176756, -85.10202810533777],
      [41.1174855882285, -85.10729980211401],
      [41.11748758336144, -85.10808912653641]
    ],
   });
  const [geometryLoaded, setGeometryLoaded] = useState(false);
  const [geometry, setGeometry] = useState();
  const [pickupMarkerRef, pickupMarker] = useAdvancedMarkerRef();
  const [dropoffMarkerRef, dropoffMarker] = useAdvancedMarkerRef();
  const [paths, setPaths]= useState();
  const [currentPath, setCurrentPath] = useState();

  const global = 
  {
    apiKey: apiKey,
    fetched: fetched,
    setFetched: setFetched,
    polylines: polylines,
    setPolylines: setPolylines,
    locations: locations,
    setLocations: setLocations,
    pickupMarker: pickupMarker,
    coordinates: coordinates,
    routeId: routeId,
    currentPath: currentPath,
    setCurrentPath: setCurrentPath, 
    paths: paths, setPaths: setPaths
  }
  return (
    <div className="h-full w-full overflow-hidden rounded-none md:rounded-xl border-0 md:border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{width: '100%', height: '100%'}}
          defaultCenter={{lat: 41.11750079466204, lng: -85.1082542458735}}
          defaultZoom={15}
          gestureHandling='greedy'
          disableDefaultUI
          mapId={mapId}
        >
        
        {coordinates[0] && <AdvancedMarker position={{lat: coordinates[0][1], lng: coordinates[0][0]}} ref={pickupMarkerRef}>
          <Pin
            background={'#FF0000'}
            borderColor={'#FFFFFF'}
            glyphColor={'#FFFFFF'}
          />
        </AdvancedMarker>}
        {coordinates[1] && <AdvancedMarker position={{lat: coordinates[1][1], lng: coordinates[1][0]}} ref={dropoffMarkerRef}>
          <Pin
            background={'#00FF00'}
            borderColor={'#FFFFFF'}
            glyphColor={'#FFFFFF'}
          />
        </AdvancedMarker>}
        </Map>
        <MapContext value={{...global, ...{geometryLoaded: geometryLoaded, setGeometryLoaded: setGeometryLoaded, geometry: geometry, setGeometry: setGeometry}}}>
            <Route />
        </MapContext>
      </APIProvider>
    </div>
  );
}

function Route()
{
  const { paths, polylines, setPolylines, setGeometry, setGeometryLoaded, shuttles, setShuttles } = useContext(MapContext);
  const geometry = useMapsLibrary("geometry");
  const map = useMap();

  useEffect(() => {
    if(geometry)
    {
      setGeometryLoaded(true);
      setGeometry(geometry);
    }
  }, [geometry]);

  useEffect(() => {
    if(map && !polylines)
      setPolylines({"Campus": polylineFactory("#EF4444"), "Canterbury": polylineFactory("#10B981"), "Housing": polylineFactory("#3B82F6")});
  }, [map]);

    useInitializePaths();

    // Set the routes to be drawn
      useSetPath();

      // Draw the routes that have been set
      useDraw();
}

function BindRecenter({ buttonId }) {
  const map = useMap();

  useEffect(() => {
    const el = document.getElementById(buttonId);
    if (!el) return;
    const handler = () => map.setView(CENTER, ZOOM);
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [buttonId, map]);

  return null;
}


function useSetPath()
{
  const { paths, setCurrentPath, setFetched, coordinates } = useContext(MapContext);

  useEffect(() => {
    if(paths)
    {
      const path = fetchPath(paths, coordinates)

      setCurrentPath(path);
      setFetched(true);
    }
  }, [coordinates, paths]);
}


function useDraw()
{
  const { currentPath, polylines, geometryLoaded, geometry, routeId} = useContext(MapContext);
  const map = useMap();

  if(map && geometryLoaded && currentPath && polylines)
  {
    let route = ""
    if(routeId === "60d5ec49f1b2c72b8c8e4f4a")
      route = "Campus";
    else if(routeId === "60d5ec49f1b2c72b8c8e4f3a")
      route = "Canterbury";
    else if(routeId === "60d5ec49f1b2c72b8c8e4f2a")
      route = "Housing";
    
    const keys = Object.keys(polylines);
    keys.forEach((key) => {if(key !== route) polylines[key].setPath([])});
    drawRoute(polylines[route], geometry, currentPath, map);
  }
}

function polylineFactory(color)
{
  return new google.maps.Polyline({path: [], geodesic: true, strokeColor: color, strokeOpacity: 1.0, strokeWeight: 2});
}

function getOptions(apiKey, origin, destination)
{
  const currentPath = 
  {
    "origin":{
      "location":{
        "latLng":{
          "latitude": origin.latitude,
          "longitude": origin.longitude 
        }
      }
    },
    "destination":{
      "location":{
        "latLng":{
          "latitude": destination.latitude,
          "longitude": destination.longitude 
        }
      }
    },
    "travelMode": "DRIVE",
    "routingPreference": "TRAFFIC_UNAWARE",
  }

  const options =
  {
    method: "POST",
    headers:
    {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
    },
    body: JSON.stringify(currentPath)
  }

  return options;
}



// Draw the polyline for each route fetched from google maps routes api
async function drawRoute(polyline, geometry, currentPath, map)
{
  // Check if route data exists
  if (!currentPath) {
    console.warn('No route data available to draw');
    return;
  }

  try {
    polyline.setPath(geometry.encoding.decodePath(currentPath.encodedPolyline));
    polyline.setMap(map);
  } catch (error) {
    console.error('Error drawing route:', error);
  }
}

function fetchPath(paths, coordinates)
{
  return paths.find((p) => p.waypoints.toString() === coordinates.toString() || p.waypoints.toString() === coordinates.reverse().toString())
}

// Fetch a route from google maps routes api
async function fetchPolyline(options)
{
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", options);
      const json = await response.json();
      return json;
}

function useInitializePaths()
{
  const { apiKey, paths, setPaths } = useContext(MapContext);


  const _paths = [
    {
        "name": "Abbey Drive to Stonehedge Blvd",
        "waypoints": [
            [
                -85.105396,
                41.123082
            ],
            [
                -85.1079407,
                41.1250653
            ]
        ]
    },
    {
        "name": "Abbey Drive to Woodshire Drive",
        "waypoints": [
            [
                -85.105396,
                41.123082
            ],
            [
                -85.1055979,
                41.1289203
            ]
        ]
    },
    {
        "name": "Abbey Drive to Walb Union",
        "waypoints": [
            [
                -85.105396,
                41.123082
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Stonehedge Blvd to Woodshire Drive",
        "waypoints": [
            [
                -85.1079407,
                41.1250653
            ],
            [
                -85.1055979,
                41.1289203
            ]
        ]
    },
    {
        "name": "Stonehedge Blvd to Walb Union",
        "waypoints": [
            [
                -85.1079407,
                41.1250653
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Woodshire Drive to Walb Union",
        "waypoints": [
            [
                -85.1055979,
                41.1289203
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Development Office to Building H",
        "waypoints": [
            [
                -85.10282732527182,
                41.1160012729476
            ],
            [
                -85.100966,
                41.115726
            ]
        ]
    },
    {
        "name": "Development Office to Cole Clubhouse",
        "waypoints": [
            [
                -85.10282732527182,
                41.1160012729476
            ],
            [
                -85.103135,
                41.114744
            ]
        ]
    },
    {
        "name": "Development Office to Walb Union",
        "waypoints": [
            [
                -85.10282732527182,
                41.1160012729476
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Building H to Cole Clubhouse",
        "waypoints": [
            [
                -85.100966,
                41.115726
            ],
            [
                -85.103135,
                41.114744
            ]
        ]
    },
    {
        "name": "Building H to Walb Union",
        "waypoints": [
            [
                -85.100966,
                41.115726
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Cole Clubhouse to Walb Union",
        "waypoints": [
            [
                -85.103135,
                41.114744
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Doermer to Walb Union",
        "waypoints": [
            [
                -85.1026322,
                41.1087394
            ],
            [
                -85.108039,
                41.117554
            ]
        ]
    },
    {
        "name": "Doermer to Kettler",
        "waypoints": [
            [
                -85.1026322,
                41.1087394
            ],
            [
                -85.1127894,
                41.1152741
            ]
        ]
    },
    {
        "name": "Doermer to Music Center",
        "waypoints": [
            [
                -85.1026322,
                41.1087394
            ],
            [
                -85.1084837,
                41.120201
            ]
        ]
    },
    {
        "name": "Walb Union to Kettler",
        "waypoints": [
            [
                -85.108039,
                41.117554
            ],
            [
                -85.1127894,
                41.1152741
            ]
        ]
    },
    {
        "name": "Walb Union to Music Center",
        "waypoints": [
            [
                -85.108039,
                41.117554
            ],
            [
                -85.1084837,
                41.120201
            ]
        ]
    },
    {
        "name": "Music Center to Kettler",
        "waypoints": [
            [
                -85.1084837,
                41.120201
            ],
            [
                -85.1127894,
                41.1152741
            ]
        ]
    }
]

  const temp = [];
  const abbey = {latitude: 41.123082, longitude: -85.105396};
  const building = {latitude: 41.115726, longitude: -85.100966};
  const club = {latitude: 41.114744, longitude: -85.103135};
  const dev = {latitude: 41.1160012729476, longitude: -85.10282732527182};
  const doermer = {latitude: 41.1087394, longitude: -85.1026322};
  const kettler = {latitude: 41.1152741, longitude: -85.1127894};
  const music = {latitude: 41.120201, longitude: -85.1084837};
  const stone = {latitude: 41.1250653, longitude: -85.1079407};
  const walb = {latitude: 41.117554, longitude: -85.108039};
  const wood = {latitude: 41.1289203, longitude: -85.1055979};
  const options =
  [
    getOptions(apiKey, abbey, stone), getOptions(apiKey, abbey, wood), getOptions(apiKey, abbey, walb), getOptions(apiKey, stone, wood), getOptions(apiKey, stone, walb), getOptions(apiKey, wood, walb),
    getOptions(apiKey, dev, building), getOptions(apiKey, dev, club), getOptions(apiKey, dev, walb), getOptions(apiKey, building, club), getOptions(apiKey, building, walb), getOptions(apiKey, club, walb),
    getOptions(apiKey, doermer, walb), getOptions(apiKey, doermer, kettler), getOptions(apiKey, doermer, music), getOptions(apiKey, walb, kettler), getOptions(apiKey, walb, music), getOptions(apiKey, music, kettler),
  ];

  useEffect(() => {
    (async () => {

      const data = await Promise.all(options.map((option) => fetchPolyline(option)));
      data.forEach((polyline, index) => {temp.push(
        { name: _paths[0].name, encodedPolyline: polyline.routes[0].polyline.encodedPolyline, waypoints: _paths[index].waypoints}
      )});
      setPaths(temp);
    })();
  }, []);
}
