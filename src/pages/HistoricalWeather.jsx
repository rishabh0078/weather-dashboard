import { useState, useMemo, useCallback } from 'react';
import { format, subYears, differenceInDays, subDays } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import {
  Thermometer, Sunrise, Sunset, CloudRain, Wind, Compass,
  Activity, ShieldAlert, Search
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { fetchHistoricalWeather, fetchHistoricalAirQuality } from '../services/weatherApi';
import ChartTooltip from '../components/ChartTooltip';

export default function HistoricalWeather() {
  const { location, locationName, loading: locLoading } = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoYearsAgo = format(subYears(new Date(), 2), 'yyyy-MM-dd');
  const oneMonthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(oneMonthAgo);
  const [endDate, setEndDate] = useState(yesterday);
  const [data, setData] = useState(null);
  const [aqData, setAqData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  const daysDiff = useMemo(() => {
    return differenceInDays(new Date(endDate), new Date(startDate));
  }, [startDate, endDate]);

  const isValid = daysDiff >= 0 && daysDiff <= 730;

  const handleFetch = useCallback(async () => {
    if (!location || !isValid) return;
    setLoading(true);
    setError(null);
    try {
      const [weatherData, airData] = await Promise.all([
        fetchHistoricalWeather(location.lat, location.lon, startDate, endDate),
        fetchHistoricalAirQuality(location.lat, location.lon, startDate, endDate)
      ]);
      setData(weatherData);
      setAqData(airData);
      setFetched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, startDate, endDate, isValid]);

  // Transform chart data
  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.time.map((date, i) => {
      const formatDate = daysDiff > 90
        ? format(new Date(date), 'MMM yyyy')
        : format(new Date(date), 'MMM dd');
      return {
        date: formatDate,
        rawDate: date,
        tempMean: data.daily.temperature_2m_mean?.[i],
        tempMax: data.daily.temperature_2m_max?.[i],
        tempMin: data.daily.temperature_2m_min?.[i],
        sunrise: data.daily.sunrise?.[i],
        sunset: data.daily.sunset?.[i],
        sunriseTime: data.daily.sunrise?.[i]
          ? parseTimeToDecimal(data.daily.sunrise[i])
          : null,
        sunsetTime: data.daily.sunset?.[i]
          ? parseTimeToDecimal(data.daily.sunset[i])
          : null,
        precipitation: data.daily.precipitation_sum?.[i],
        windSpeed: data.daily.wind_speed_10m_max?.[i],
        windDirection: data.daily.wind_direction_10m_dominant?.[i],
      };
    });
  }, [data, daysDiff]);

  // Daily aggregated AQ data
  const aqChartData = useMemo(() => {
    if (!aqData?.hourly) return [];
    // Aggregate hourly data to daily averages
    const dailyMap = {};
    aqData.hourly.time.forEach((t, i) => {
      const day = t.substring(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { pm10: [], pm25: [] };
      }
      if (aqData.hourly.pm10[i] != null) dailyMap[day].pm10.push(aqData.hourly.pm10[i]);
      if (aqData.hourly.pm2_5[i] != null) dailyMap[day].pm25.push(aqData.hourly.pm2_5[i]);
    });

    return Object.entries(dailyMap).map(([day, vals]) => {
      const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      const formatDate = daysDiff > 90
        ? format(new Date(day), 'MMM yyyy')
        : format(new Date(day), 'MMM dd');
      return {
        date: formatDate,
        pm10: avg(vals.pm10),
        pm25: avg(vals.pm25),
      };
    });
  }, [aqData, daysDiff]);

  function parseTimeToDecimal(isoString) {
    try {
      const d = new Date(isoString);
      return d.getHours() + d.getMinutes() / 60;
    } catch {
      return null;
    }
  }

  function decimalToTime(decimal) {
    if (decimal == null) return '--';
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function windDirLabel(deg) {
    if (deg == null) return '--';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  if (locLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Detecting location...</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="section-header fade-in-up">
        <h2>
          <span className="section-dot" />
          Historical Weather Data
          {locationName ? ` for ${locationName.split(',')[0]}` : ''}
        </h2>
      </div>

      {/* Date Range Controls */}
      <div className="historical-controls fade-in-up" id="historical-controls">
        <div className="date-picker-wrapper">
          <label>From:</label>
          <input
            type="date"
            className="date-input"
            id="hist-start-date"
            value={startDate}
            min={twoYearsAgo}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="date-picker-wrapper">
          <label>To:</label>
          <input
            type="date"
            className="date-input"
            id="hist-end-date"
            value={endDate}
            min={startDate}
            max={yesterday}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {daysDiff >= 0 ? `${daysDiff} days selected` : 'Invalid range'}
          {daysDiff > 730 && <span style={{ color: 'var(--color-accent-red)', marginLeft: 8 }}>Max 2 years</span>}
        </div>
        <button
          className="fetch-btn"
          id="fetch-historical-btn"
          onClick={handleFetch}
          disabled={!isValid || loading}
        >
          {loading ? 'Loading...' : <><Search size={14} /> Fetch Data</>}
        </button>
      </div>

      {error && (
        <div className="error-banner fade-in-up">
          <ShieldAlert size={16} /> {error}
        </div>
      )}

      {!fetched && !loading && (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div style={{ fontSize: '3rem' }}>📊</div>
          <p className="loading-text">Select a date range and click "Fetch Data" to view historical trends.</p>
        </div>
      )}

      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">Fetching historical data...</p>
        </div>
      )}

      {fetched && !loading && chartData.length > 0 && (
        <div className="charts-grid fade-in-up">
          {/* Temperature Chart */}
          <div className="chart-card" id="hist-chart-temperature">
            <div className="chart-title"><Thermometer size={16} /> Temperature Trends</div>
            <div className="chart-subtitle">Mean, Max, and Min temperatures (°C)</div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)}°C`} />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="tempMax" name="Max" stroke="#fb923c" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tempMean" name="Mean" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tempMin" name="Min" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Brush dataKey="date" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sun Cycle Chart */}
          <div className="chart-card" id="hist-chart-suncycle">
            <div className="chart-title"><Sunrise size={16} /> Sun Cycle</div>
            <div className="chart-subtitle">Sunrise & Sunset times (IST)</div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sunriseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                  <YAxis
                    domain={[4, 20]}
                    tickFormatter={decimalToTime}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<ChartTooltip formatter={decimalToTime} />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Area type="monotone" dataKey="sunriseTime" name="Sunrise" stroke="#fbbf24" fill="url(#sunriseGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="sunsetTime" name="Sunset" stroke="#fb923c" fill="url(#sunsetGrad)" strokeWidth={2} dot={false} />
                  <Brush dataKey="date" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Precipitation Chart */}
          <div className="chart-card" id="hist-chart-precipitation">
            <div className="chart-title"><CloudRain size={16} /> Precipitation</div>
            <div className="chart-subtitle">Daily total precipitation (mm)</div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)} mm`} />} />
                  <Bar dataKey="precipitation" name="Precipitation" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Brush dataKey="date" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Wind Chart */}
          <div className="chart-card" id="hist-chart-wind">
            <div className="chart-title"><Wind size={16} /> Wind Speed & Direction</div>
            <div className="chart-subtitle">Max wind speed (km/h) and dominant direction</div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="windHistGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const ws = payload.find(p => p.dataKey === 'windSpeed');
                      const item = chartData.find(d => d.date === label);
                      return (
                        <div className="custom-tooltip">
                          <div className="tooltip-label">{label}</div>
                          <div className="tooltip-item">
                            <span className="tooltip-dot" style={{ background: '#34d399' }} />
                            Wind: <strong>{ws?.value?.toFixed(1)} km/h</strong>
                          </div>
                          <div className="tooltip-item">
                            <span className="tooltip-dot" style={{ background: '#a78bfa' }} />
                            Direction: <strong>{windDirLabel(item?.windDirection)} ({item?.windDirection}°)</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="windSpeed" name="Wind Speed" stroke="#34d399" fill="url(#windHistGrad)" strokeWidth={2} dot={false} />
                  <Brush dataKey="date" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Air Quality PM10 & PM2.5 */}
          <div className="chart-card" style={{ gridColumn: '1 / -1' }} id="hist-chart-airquality">
            <div className="chart-title"><Activity size={16} /> Air Quality: PM10 & PM2.5 Trends</div>
            <div className="chart-subtitle">Daily average particulate matter (μg/m³)</div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aqChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(aqChartData.length / 12))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v?.toFixed(1)} μg/m³`} />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="pm10" name="PM10" stroke="#f472b6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  <Brush dataKey="date" height={20} stroke="rgba(0,0,0,0.15)" fill="rgba(255,255,255,0.8)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
