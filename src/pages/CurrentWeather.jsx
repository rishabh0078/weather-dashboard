import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import {
  Thermometer, Droplets, Wind, Sun, Sunrise, Sunset,
  Eye, CloudRain, Gauge, ShieldAlert, Activity
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { fetchCurrentWeather, fetchAirQuality, getWeatherDescription, getWeatherIcon } from '../services/weatherApi';
import ChartTooltip from '../components/ChartTooltip';

export default function CurrentWeather() {
  const { location, locationName, loading: locLoading } = useLocation();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tempUnit, setTempUnit] = useState('C'); // 'C' or 'F'

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const [weatherData, aqData] = await Promise.all([
        fetchCurrentWeather(location.lat, location.lon, selectedDate),
        fetchAirQuality(location.lat, location.lon, selectedDate)
      ]);
      setWeather(weatherData);
      setAirQuality(aqData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toF = (c) => (c * 9) / 5 + 32;
  const formatTemp = useCallback(
    (val) => {
      if (val == null) return '--';
      const v = tempUnit === 'F' ? toF(val) : val;
      return `${v.toFixed(1)}°${tempUnit}`;
    },
    [tempUnit]
  );

  // Build hourly chart data
  const hourlyData = useMemo(() => {
    if (!weather?.hourly) return [];
    return weather.hourly.time.map((t, i) => ({
      time: format(new Date(t), 'HH:mm'),
      hour: format(new Date(t), 'ha'),
      temperature: tempUnit === 'F'
        ? toF(weather.hourly.temperature_2m[i])
        : weather.hourly.temperature_2m[i],
      humidity: weather.hourly.relative_humidity_2m[i],
      precipitation: weather.hourly.precipitation[i],
      visibility: weather.hourly.visibility[i] ? (weather.hourly.visibility[i] / 1000) : null,
      windSpeed: weather.hourly.wind_speed_10m[i],
    }));
  }, [weather, tempUnit]);

  const hourlyAQData = useMemo(() => {
    if (!airQuality?.hourly) return [];
    return airQuality.hourly.time.map((t, i) => ({
      time: format(new Date(t), 'HH:mm'),
      hour: format(new Date(t), 'ha'),
      pm10: airQuality.hourly.pm10[i],
      pm25: airQuality.hourly.pm2_5[i],
    }));
  }, [airQuality]);

  const getAqiLevel = (aqi) => {
    if (aqi == null) return { label: 'N/A', class: '' };
    if (aqi <= 20) return { label: 'Good', class: 'aqi-good' };
    if (aqi <= 40) return { label: 'Fair', class: 'aqi-moderate' };
    if (aqi <= 60) return { label: 'Moderate', class: 'aqi-unhealthy' };
    if (aqi <= 80) return { label: 'Poor', class: 'aqi-very-unhealthy' };
    return { label: 'Very Poor', class: 'aqi-hazardous' };
  };

  if (locLoading || loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Fetching weather data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="error-banner">
          <ShieldAlert size={16} /> {error}
        </div>
      </div>
    );
  }

  const daily = weather?.daily;
  const current = weather?.current;
  const aq = airQuality?.current;

  return (
    <main className="main-content">
      {/* Date Picker */}
      <div className="section-header fade-in-up">
        <h2>
          <span className="section-dot" />
          {isToday ? "Today's Weather" : `Weather for ${format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}`}
          {locationName ? ` in ${locationName.split(',')[0]}` : ''}
        </h2>
        <div className="date-picker-wrapper">
          <input
            type="date"
            className="date-input"
            id="date-selector"
            value={selectedDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-weather fade-in-up">
        <div className="hero-current">
          <div className="weather-emoji">{getWeatherIcon(daily?.weather_code?.[0])}</div>
          {isToday && current ? (
            <div className="temp-main">{formatTemp(current.temperature_2m)}</div>
          ) : (
            <div className="temp-main">
              {formatTemp(daily?.temperature_2m_max?.[0])}
            </div>
          )}
          <p className="weather-desc">{getWeatherDescription(daily?.weather_code?.[0])}</p>
          <div className="temp-range">
            <span className="high">
              ↑ High: {formatTemp(daily?.temperature_2m_max?.[0])}
            </span>
            <span className="low">
              ↓ Low: {formatTemp(daily?.temperature_2m_min?.[0])}
            </span>
          </div>
        </div>

        <div className="hero-details">
          <div className="hero-detail-item">
            <div className="detail-icon card-icon cyan">
              <Droplets size={18} />
            </div>
            <div>
              <div className="detail-label">Humidity</div>
              <div className="detail-value">{current?.relative_humidity_2m ?? '--'}%</div>
            </div>
          </div>
          <div className="hero-detail-item">
            <div className="detail-icon card-icon blue">
              <Wind size={18} />
            </div>
            <div>
              <div className="detail-label">Wind Speed</div>
              <div className="detail-value">{daily?.wind_speed_10m_max?.[0]?.toFixed(1) ?? '--'} km/h</div>
            </div>
          </div>
          <div className="hero-detail-item">
            <div className="detail-icon card-icon orange">
              <Sunrise size={18} />
            </div>
            <div>
              <div className="detail-label">Sunrise</div>
              <div className="detail-value">
                {daily?.sunrise?.[0] ? format(new Date(daily.sunrise[0]), 'hh:mm a') : '--'}
              </div>
            </div>
          </div>
          <div className="hero-detail-item">
            <div className="detail-icon card-icon purple">
              <Sunset size={18} />
            </div>
            <div>
              <div className="detail-label">Sunset</div>
              <div className="detail-value">
                {daily?.sunset?.[0] ? format(new Date(daily.sunset[0]), 'hh:mm a') : '--'}
              </div>
            </div>
          </div>
          <div className="hero-detail-item">
            <div className="detail-icon card-icon green">
              <CloudRain size={18} />
            </div>
            <div>
              <div className="detail-label">Precipitation</div>
              <div className="detail-value">{daily?.precipitation_sum?.[0]?.toFixed(1) ?? '0'} mm</div>
            </div>
          </div>
          <div className="hero-detail-item">
            <div className="detail-icon card-icon yellow">
              <Sun size={18} />
            </div>
            <div>
              <div className="detail-label">UV Index</div>
              <div className="detail-value">{current?.uv_index?.toFixed(1) ?? daily?.uv_index_max?.[0]?.toFixed(1) ?? '--'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Variable Cards */}
      <div className="section-header fade-in-up">
        <h2><span className="section-dot" /> Weather Parameters</h2>
      </div>
      <div className="weather-grid fade-in-up">
        <div className="weather-card" style={{ '--card-accent': 'var(--gradient-warm)' }}>
          <div className="card-icon orange"><Thermometer size={18} /></div>
          <div className="card-label">Max Temperature</div>
          <div className="card-value">{formatTemp(daily?.temperature_2m_max?.[0])}</div>
        </div>
        <div className="weather-card" style={{ '--card-accent': 'var(--gradient-cool)' }}>
          <div className="card-icon cyan"><Thermometer size={18} /></div>
          <div className="card-label">Min Temperature</div>
          <div className="card-value">{formatTemp(daily?.temperature_2m_min?.[0])}</div>
        </div>
        {isToday && current && (
          <div className="weather-card" style={{ '--card-accent': 'var(--gradient-primary)' }}>
            <div className="card-icon blue"><Thermometer size={18} /></div>
            <div className="card-label">Current Temp</div>
            <div className="card-value">{formatTemp(current.temperature_2m)}</div>
          </div>
        )}
        <div className="weather-card">
          <div className="card-icon green"><CloudRain size={18} /></div>
          <div className="card-label">Precipitation</div>
          <div className="card-value">{daily?.precipitation_sum?.[0]?.toFixed(1) ?? '0'}<span className="card-unit">mm</span></div>
        </div>
        <div className="weather-card">
          <div className="card-icon cyan"><Droplets size={18} /></div>
          <div className="card-label">Humidity</div>
          <div className="card-value">{current?.relative_humidity_2m ?? '--'}<span className="card-unit">%</span></div>
        </div>
        <div className="weather-card">
          <div className="card-icon yellow"><Sun size={18} /></div>
          <div className="card-label">UV Index</div>
          <div className="card-value">{current?.uv_index?.toFixed(1) ?? daily?.uv_index_max?.[0]?.toFixed(1) ?? '--'}</div>
        </div>
        <div className="weather-card">
          <div className="card-icon orange"><Sunrise size={18} /></div>
          <div className="card-label">Sunrise</div>
          <div className="card-value" style={{ fontSize: '1.1rem' }}>
            {daily?.sunrise?.[0] ? format(new Date(daily.sunrise[0]), 'hh:mm a') : '--'}
          </div>
        </div>
        <div className="weather-card">
          <div className="card-icon purple"><Sunset size={18} /></div>
          <div className="card-label">Sunset</div>
          <div className="card-value" style={{ fontSize: '1.1rem' }}>
            {daily?.sunset?.[0] ? format(new Date(daily.sunset[0]), 'hh:mm a') : '--'}
          </div>
        </div>
        <div className="weather-card">
          <div className="card-icon blue"><Wind size={18} /></div>
          <div className="card-label">Max Wind Speed</div>
          <div className="card-value">{daily?.wind_speed_10m_max?.[0]?.toFixed(1) ?? '--'}<span className="card-unit">km/h</span></div>
        </div>
        <div className="weather-card">
          <div className="card-icon green"><Gauge size={18} /></div>
          <div className="card-label">Precip. Probability</div>
          <div className="card-value">{daily?.precipitation_probability_max?.[0] ?? '--'}<span className="card-unit">%</span></div>
        </div>
      </div>

      {/* Air Quality Section */}
      <div className="section-header fade-in-up">
        <h2><span className="section-dot" /> Air Quality</h2>
      </div>
      <div className="air-quality-grid fade-in-up">
        <div className="aqi-card">
          <div className="aqi-value">{aq?.european_aqi ?? '--'}</div>
          <div className="aqi-label">Air Quality Index</div>
          {aq?.european_aqi != null && (
            <span className={`aqi-indicator ${getAqiLevel(aq.european_aqi).class}`}>
              {getAqiLevel(aq.european_aqi).label}
            </span>
          )}
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{aq?.pm10?.toFixed(1) ?? '--'}</div>
          <div className="aqi-label">PM10 (μg/m³)</div>
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{aq?.pm2_5?.toFixed(1) ?? '--'}</div>
          <div className="aqi-label">PM2.5 (μg/m³)</div>
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{aq?.carbon_monoxide?.toFixed(0) ?? '--'}</div>
          <div className="aqi-label">CO (μg/m³)</div>
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{'--'}</div>
          <div className="aqi-label">CO₂ (ppm)</div>
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{aq?.nitrogen_dioxide?.toFixed(1) ?? '--'}</div>
          <div className="aqi-label">NO₂ (μg/m³)</div>
        </div>
        <div className="aqi-card">
          <div className="aqi-value">{aq?.sulphur_dioxide?.toFixed(1) ?? '--'}</div>
          <div className="aqi-label">SO₂ (μg/m³)</div>
        </div>
      </div>

      {/* Hourly Charts */}
      <div className="section-header fade-in-up">
        <h2><span className="section-dot" /> Hourly Forecast</h2>
        <div className="section-actions">
          <div className="toggle-group" id="temp-unit-toggle">
            <button
              className={`toggle-btn ${tempUnit === 'C' ? 'active' : ''}`}
              onClick={() => setTempUnit('C')}
            >°C</button>
            <button
              className={`toggle-btn ${tempUnit === 'F' ? 'active' : ''}`}
              onClick={() => setTempUnit('F')}
            >°F</button>
          </div>
        </div>
      </div>

      <div className="charts-grid fade-in-up">
        {/* Temperature Chart */}
        <div className="chart-card" id="chart-temperature">
          <div className="chart-title"><Thermometer size={16} /> Temperature</div>
          <div className="chart-subtitle">Hourly temperature in °{tempUnit}</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)}°${tempUnit}`} />} />
                <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#fb923c" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Humidity Chart */}
        <div className="chart-card" id="chart-humidity">
          <div className="chart-title"><Droplets size={16} /> Relative Humidity</div>
          <div className="chart-subtitle">Hourly humidity percentage</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                <Area type="monotone" dataKey="humidity" name="Humidity" stroke="#22d3ee" fill="url(#humGrad)" strokeWidth={2} dot={false} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Precipitation Chart */}
        <div className="chart-card" id="chart-precipitation">
          <div className="chart-title"><CloudRain size={16} /> Precipitation</div>
          <div className="chart-subtitle">Hourly precipitation in mm</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(2)} mm`} />} />
                <Bar dataKey="precipitation" name="Precipitation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visibility Chart */}
        <div className="chart-card" id="chart-visibility">
          <div className="chart-title"><Eye size={16} /> Visibility</div>
          <div className="chart-subtitle">Hourly visibility in km</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)} km`} />} />
                <Line type="monotone" dataKey="visibility" name="Visibility" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wind Speed Chart */}
        <div className="chart-card" id="chart-windspeed">
          <div className="chart-title"><Wind size={16} /> Wind Speed (10m)</div>
          <div className="chart-subtitle">Hourly wind speed in km/h</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)} km/h`} />} />
                <Area type="monotone" dataKey="windSpeed" name="Wind Speed" stroke="#34d399" fill="url(#windGrad)" strokeWidth={2} dot={false} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PM10 & PM2.5 Combined Chart */}
        <div className="chart-card" id="chart-pm">
          <div className="chart-title"><Activity size={16} /> PM10 & PM2.5</div>
          <div className="chart-subtitle">Hourly particulate matter concentration (μg/m³)</div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={hourlyAQData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)} μg/m³`} />} />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
                />
                <Line type="monotone" dataKey="pm10" name="PM10" stroke="#f472b6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Brush dataKey="hour" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
