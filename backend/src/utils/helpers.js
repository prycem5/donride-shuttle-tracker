export const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };
  
  export const formatETA = (seconds) => {
    if (seconds < 60) {
      return '< 1 min';
    }
    const minutes = Math.round(seconds / 60);
    return `${minutes} min${minutes > 1 ? 's' : ''}`;
  };
  
  export const validateCoordinates = (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };