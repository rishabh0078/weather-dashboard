const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function fetchCurrentWeather(lat, lon, date) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'uv_index',
      'weather_code'
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
      'weather_code'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'visibility',
      'wind_speed_10m'
    ].join(','),
    timezone: 'auto',
    start_date: date,
    end_date: date
  });

  const res = await fetch(`${WEATHER_BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch weather data');
  return res.json();
}

export async function fetchAirQuality(lat, lon, date) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'european_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide'
    ].join(','),
    hourly: [
      'pm10',
      'pm2_5'
    ].join(','),
    timezone: 'auto',
    start_date: date,
    end_date: date
  });

  const res = await fetch(`${AIR_QUALITY_BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch air quality data');
  return res.json();
}

export async function fetchHistoricalWeather(lat, lon, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      'temperature_2m_mean',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant'
    ].join(','),
    timezone: 'Asia/Kolkata',
    start_date: startDate,
    end_date: endDate
  });

  const res = await fetch(`${HISTORICAL_BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch historical weather data');
  return res.json();
}

export async function fetchHistoricalAirQuality(lat, lon, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: ['pm10', 'pm2_5'].join(','),
    timezone: 'Asia/Kolkata',
    start_date: startDate,
    end_date: endDate
  });

  const res = await fetch(`${AIR_QUALITY_BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch historical air quality');
  return res.json();
}

export function getLocationFromBrowser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 300000 }
    );
  });
}

export function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    56: 'Freezing Drizzle',
    57: 'Dense Freezing Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    66: 'Freezing Rain',
    67: 'Heavy Freezing Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Showers',
    81: 'Moderate Showers',
    82: 'Violent Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Heavy Hail'
  };
  return descriptions[code] || 'Unknown';
}

export function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

export async function searchLocations(query) {
  if (!query || query.length < 2) return [];
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
  if (!res.ok) throw new Error('Failed to search locations');
  const data = await res.json();
  return data.results || [];
}
