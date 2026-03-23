import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { MapPin, Sun, History, Search, Loader2 } from 'lucide-react';
import { searchLocations } from '../services/weatherApi';

export default function Navbar() {
  const { locationName, loading, setLocation, setLocationName } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchLocations(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectLocation = (result) => {
    setLocation({ lat: result.latitude, lon: result.longitude });
    const nameStr = result.admin1 ? `${result.name}, ${result.admin1}` : `${result.name}, ${result.country}`;
    setLocationName(nameStr);
    setQuery('');
    setResults([]);
    setIsDropdownOpen(false);
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-brand">

        <h1>Weather Dashboard</h1>
      </div>

      <div className="navbar-center" ref={dropdownRef}>
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="location-search-input"
            placeholder={loading ? 'Detecting location...' : (locationName || 'Search city...')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />
          {isSearching && <Loader2 size={16} className="search-spinner" />}
        </div>

        {isDropdownOpen && (query.length >= 2 || results.length > 0) && (
          <div className="search-dropdown fade-in-up">
            {results.length > 0 ? (
              results.map((r) => (
                <div
                  key={r.id}
                  className="search-dropdown-item"
                  onClick={() => handleSelectLocation(r)}
                >
                  <MapPin size={14} className="dropdown-icon" />
                  <div className="dropdown-details">
                    <span className="dropdown-name">{r.name}</span>
                    <span className="dropdown-sub">
                      {r.admin1 ? `${r.admin1}, ` : ''}{r.country}
                    </span>
                  </div>
                </div>
              ))
            ) : isSearching ? (
              <div className="search-dropdown-empty">Searching...</div>
            ) : (
              <div className="search-dropdown-empty">No results found for "{query}"</div>
            )}
          </div>
        )}
      </div>

      <div className="navbar-nav" id="main-navigation">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          id="nav-current"
        >
          <Sun size={16} />
          <span className="nav-text">Current</span>
        </NavLink>
        <NavLink
          to="/historical"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          id="nav-historical"
        >
          <History size={16} />
          <span className="nav-text">Historical</span>
        </NavLink>
      </div>
    </nav>
  );
}
