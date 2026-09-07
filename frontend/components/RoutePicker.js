import { useEffect, useState } from "react";

const stops = 
[
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.105396,
              41.123082
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4007",
      "name": "Abbey Drive",
      "code": "ABBEY",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f3a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.100966,
              41.115726
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4003",
      "name": "Building H",
      "code": "BLDG-H",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f2a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.958Z",
      "updatedAt": "2025-11-15T21:21:42.958Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.103135,
              41.114744
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4004",
      "name": "Cole Clubhouse",
      "code": "CLUB",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f2a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.958Z",
      "updatedAt": "2025-11-15T21:21:42.958Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1038529,
              41.1150437
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4002",
      "name": "Development Office",
      "code": "DEV-OFF",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f2a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.958Z",
      "updatedAt": "2025-11-15T21:21:42.958Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1026322,
              41.1087394
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4010",
      "name": "Doermer School of Business",
      "code": "DOERMER",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f4a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1127894,
              41.1152741
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4008",
      "name": "Kettler Hall",
      "code": "KETTLER",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f4a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1084837,
              41.120201
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4009",
      "name": "Music Center",
      "code": "MUSIC",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f4a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1079407,
              41.1250653
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4006",
      "name": "Stonehedge Blvd",
      "code": "STONE",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f3a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.108039,
              41.117554
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4001",
      "name": "Walb Union",
      "code": "WALB",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f2a",
          "60d5ec49f1b2c72b8c8e4f3a",
          "60d5ec49f1b2c72b8c8e4f4a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.957Z",
      "updatedAt": "2025-11-15T21:21:42.957Z"
  },
  {
      "location": {
          "type": "Point",
          "coordinates": [
              -85.1055979,
              41.1289203
          ]
      },
      "_id": "60d5ec49f1b2c72b8c8e4005",
      "name": "Woodshire Drive",
      "code": "WOOD",
      "routeIds": [
          "60d5ec49f1b2c72b8c8e4f3a"
      ],
      "__v": 0,
      "createdAt": "2025-11-15T21:21:42.959Z",
      "updatedAt": "2025-11-15T21:21:42.959Z"
  }
]

export default function RoutePicker({ selected, setSelected, setCoordinates, setRouteId }) {
  let [activeStops, setActiveStops] = useState([]);
  const [pickup, setPickup] = useState([]);
  const [dropoff, setDropoff] = useState([]); 
  const [allActiveRoutes, setAllActiveRoutes] = useState([]);
  const [activeStopsUpdated, setActiveStopsUpdated] = useState(false);

  useEffect(() => {
    if(selected)
    {
      if(selected.pickup.name !== "Walb Union")
        setRouteId(selected.pickup.routeIds[0]);
      else
        setRouteId(selected.dropoff.routeIds[0]);
    }
  }, [selected]);
  useEffect(() =>
  {
    if(!activeStopsUpdated)
      updateActiveStops(setActiveStops, setActiveStopsUpdated);
    else if(activeStopsUpdated)
    {
      // How the pickup and dropoff selectors are initially
      const initial = handleSelection(activeStops[0], activeStops);
      setPickup(activeStops);
      setDropoff(activeStops);
      setSelected({pickup: activeStops[0], dropoff: initial[0]})
      setCoordinates([activeStops[0].location.coordinates, initial[0].location.coordinates]);
    }

  }, [activeStopsUpdated]);


  return (
    selected && 
    <>
        <div className="flex flex-col">
          <label className="text-black">Pickup</label>
          <select
              id="pickup"
              value={selected.pickup.name}
              onChange={(e) => {
                
                handleChange("pickup", activeStops, e.target.value, selected, setSelected, setDropoff, setPickup, setCoordinates)
              }}
              className="bg-red-500 rounded-md border border-red-500 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              aria-label="Select route"
            >
              {pickup.map((stop) => (
                <option
                  key={`Pickup ${stop.name}`}
                  value={stop.name}
                  className="bg-gray-900 text-white"
                >
                  {stop.name}
                </option>
              ))}
            </select>
          </div>


        <div className="flex flex-col">
          <label className="text-black">Dropoff</label>
          <select
          id="dropoff"
          value={selected.dropoff.name}
          onChange={(e) => {
            
            handleChange("dropoff", activeStops, e.target.value, selected, setSelected, setDropoff, setPickup, setCoordinates)}
          }
            className="w-fit bg-green-500 rounded-md border border-green-500 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            aria-label="Select route"
          >
            {dropoff.map((stop) => (
              <option
                key={`Dropoff ${stop.name}`}
                value={stop.name}
                className="bg-gray-900 text-white"
              >
                {stop.name}
              </option>
            ))}
          </select>
        </div>
    </>
  );
}


async function fetchAllActiveRoutes()
{
    const response = await fetch("http://localhost:5000/api/routes");
    const json = await response.json();
    const allActiveRoutes = json.data;

    return allActiveRoutes;
}

async function updateActiveStops(setActiveStops, setActiveStopsUpdated)
{
  const allActiveRoutes = await fetchAllActiveRoutes();
  const activeRouteIds = allActiveRoutes.map((route) => route._id);
  
  const activeStops = stops.filter((stop) => stop.routeIds.some((routeId) => activeRouteIds.includes(routeId)))
  // Need to fix the coordinates in the db for dev office
  // if(activeStops[2].name === "Development Office")
  //   activeStops[2]["location"]["coordinates"] = [-85.10282732527182, 41.1160012729476]; // corrected lat lng

  setActiveStops(activeStops);
  setActiveStopsUpdated(true);
}

function handleChange(selector, activeStops, value, selected, setSelected, setDropoff, setPickup, setCoordinates)
{
  const selectedStop = activeStops.find((stop) => stop.name === value);
  const otherSelectorStops = handleSelection(selectedStop, activeStops);

  if(selector === "pickup")
  {
    setDropoff(activeStops);
    if(sameRoute(selectedStop, selected.dropoff))
    {
      setSelected({...selected, pickup: selectedStop});
      setCoordinates([selectedStop.location.coordinates, selected.dropoff.location.coordinates]);
    }
    else
    {
      setSelected({pickup: selectedStop, dropoff: otherSelectorStops[0]});
      setCoordinates([selectedStop.location.coordinates, otherSelectorStops[0].location.coordinates]);
    }
  }
  else if(selector === "dropoff")
  {
    setPickup(activeStops);
    if(sameRoute(selectedStop, selected.pickup))
    {
      setSelected({...selected, dropoff: selectedStop});
      setCoordinates([selected.pickup.location.coordinates, selectedStop.location.coordinates]);
    }
    else
    {
      setSelected({pickup: otherSelectorStops[0], dropoff: selectedStop});
      setCoordinates([otherSelectorStops[0].location.coordinates, selectedStop.location.coordinates]);
    }
  }
}

/*
When a user selects either the pickup or dropoff, the other selector will only show the stops that are in the
same route as the stop that the user selected and the other selector will not include the stop which the user
selected.
*/
function handleSelection(value, activeStops)
{
  return activeStops.filter((stop) => {
    if(stop.routeIds.length === 1 && value.routeIds.length === 1)
      return stop.routeIds[0] === value.routeIds[0] && stop.name !== value.name;
    else if(value.routeIds.length === 3)
      return stop.name !== "Walb Union";
    else if(stop.routeIds.length === 3)
      return true;
  });
}

function sameRoute(first, second)
{
  if(first.name === second.name)
    return false;
  if(first.routeIds.length === 1 && second.routeIds.length === 1)
    return first.routeIds[0] === second.routeIds[0];
  else if(first.routeIds.length === 3 && second.routeIds.length === 1)
    return first.routeIds.includes(second.routeIds[0]); 
  else if(second.routeIds.length === 3 && first.routeIds.length === 1)
    return second.routeIds.includes(first.routeIds[0]);
}