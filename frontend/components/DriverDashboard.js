/*DriverDashboard.js*/

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  handleLocationSharing,
  handleRouteChange,
  handleStatusChange,
} from "./DriverAPIHandlers";
/*For convinence, I decided to combine DriverControls-Panel into one component.
controlOptions[0-2] hold up to 3 destinations a driver would usually take. E.g. the
housing shuttle usually goes to Walb (0), and the Housing building(1).*/

/*panelOptions[0-1] hold the shuttle name and status respectively, which is changed to reflect
the changes made from driverControls and eventually to the student portal.*/

export default function DriverDashboard({ controlOptions, shuttle }) {
  const [selectedRoute, setSelectedRoute] = useState(controlOptions[0]);
  const [driverStatus, setDriverStatus] = useState("Idle");
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const { getToken } = useUser();

  {
    /*Since we're using clerk, useUser should allow me to grab the username
        from signin and display it. If there is no first name, it defaults to
        "driver".*/
  }
  const { user } = useUser();
  let name;

  if (!user) {
    name = user?.username || "Driver";
  } else {
    name = user.firstName;
  }

  return (
    <div className="md:w-full max-w-md mx-auto py-4 px-4 bg-white shadow-md rounded-md md:max-w-2xl md:py-3 md:px-0">
      {/*Driver Status Pannel*/}

      <div className="bg-white rounded-md flex flex-col gap-4 p-4 md:gap-3 md:p-6">
        {/*name will be retrieved possibly form an api call. Passed in during the
    auth/login process.*/}
        <h1 className="text-2xl font-bold text-black mb-2 md:text-3xl md:mb-6">
          Welcome, {name}.
        </h1>
        <h1 className="text-black font-bold text-lg md:text-base">
          Driver Status
        </h1>

        <div className="py-4 border-t border-gray-200 md:pt-3 md:pb-3">
          <p className="text-gray-600 text-sm font-semibold">Shuttle</p>
          <p className="text-black font-bold text-lg md:text-base">{shuttle}</p>
        </div>

        <div className="py-4 md:pt-3 md:pb-3">
          <p className="text-gray-600 text-sm font-semibold">Status</p>
          <p
            className={`font-bold text-lg md:text-base ${
              driverStatus === "Active"
                ? "text-green-400"
                : driverStatus === "Idle"
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {driverStatus} ●
          </p>
        </div>
      </div>

      {/*Driver Controls*/}
      <div className="bg-white rounded-md flex flex-col gap-4 p-4 md:gap-3 md:p-6">
        <h1 className="text-black font-bold text-lg md:text-base">
          Driver Controls
        </h1>

        <div className="py-4 border-t border-gray-200 md:pt-3 md:pb-3">
          <button
            id="share_location_button"
            onClick={handleLocationSharing(
              getToken,
              sharingEnabled,
              setSharingEnabled
            )}
            className={`w-full text-black font-semibold px-6 py-4 rounded-md text-base md:py-3 ${
              sharingEnabled
                ? "bg-green-500 hover:bg-green-400"
                : "bg-red-500 hover:bg-red-400"
            }`}
          >
            {sharingEnabled
              ? "Location Sharing Enabled"
              : "Enable Location Sharing"}
          </button>
        </div>

        <div className="py-4 md:pt-3 md:pb-3">
          <p className="text-gray-600 text-sm font-semibold mb-3 md:mb-2">
            Current Route
          </p>
          <select
            value={selectedRoute}
            onChange={(e) =>
              handleRouteChange(setSelectedRoute, e.target.value)
            }
            className="w-full px-4 py-3 mb-6 border border-gray-300 rounded-md bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base md:py-2 md:mb-4"
          >
            {controlOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <p className="text-gray-600 text-sm font-semibold mb-3 md:mb-2">
            Driver Status
          </p>
          <select
            value={driverStatus}
            onChange={(e) =>
              handleStatusChange(
                getToken,
                sharingEnabled,
                setDriverStatus,
                e.target.value
              )
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="Onroute">Onroute</option>
            <option value="Idle">Idle</option>
            <option value="Break">On Break</option>
          </select>
        </div>
      </div>
    </div>
  );
}
