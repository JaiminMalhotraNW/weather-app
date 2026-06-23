(function () {
    "use strict";
  
    /* ── Theme ─────────────────────────────────────────────── */
  
    var STORAGE_KEY = "weather-app-theme";
    var THEME_LIGHT = "light";
    var THEME_DARK = "dark";
  
    var root = document.documentElement;
    var toggleButton = document.getElementById("theme-toggle");
  
    function getStoredTheme() {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        return null;
      }
    }
  
    function saveTheme(theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (error) {
        /* localStorage unavailable */
      }
    }
  
    function getPreferredTheme() {
      var stored = getStoredTheme();
      if (stored === THEME_LIGHT || stored === THEME_DARK) {
        return stored;
      }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return THEME_DARK;
      }
      return THEME_LIGHT;
    }
  
    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      if (!toggleButton) return;
      var isDark = theme === THEME_DARK;
      toggleButton.setAttribute("aria-pressed", String(isDark));
      toggleButton.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  
    function toggleTheme() {
      var current = root.getAttribute("data-theme");
      var next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
      applyTheme(next);
      saveTheme(next);
    }
  
    applyTheme(getPreferredTheme());
    if (toggleButton) {
      toggleButton.addEventListener("click", toggleTheme);
    }
  
    /* ── Search & API ──────────────────────────────────────── */
  
    var GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
    var FORECAST_API = "https://api.open-meteo.com/v1/forecast";
  
    var searchForm = document.getElementById("search-form");
    var cityInput = document.getElementById("city-search");
    var loadingContainer = document.getElementById("loading-container");
    var errorBanner = document.getElementById("error-banner");
    var errorMessage = document.getElementById("error-message");
    var weatherCard = document.getElementById("weather-card");
  
    function showLoading() {
      loadingContainer.classList.remove("is-hidden");
      loadingContainer.setAttribute("aria-busy", "true");
    }
  
    function hideLoading() {
      loadingContainer.classList.add("is-hidden");
      loadingContainer.setAttribute("aria-busy", "false");
    }
  
    function showError(message) {
      errorMessage.textContent = message;
      errorBanner.classList.remove("is-hidden");
    }
  
    function hideError() {
      errorMessage.textContent = "";
      errorBanner.classList.add("is-hidden");
    }
  
    function hideWeatherCard() {
      if (weatherCard) {
        weatherCard.classList.add("is-hidden");
      }
    }
  
    function showWeatherCard() {
      if (weatherCard) {
        weatherCard.classList.remove("is-hidden");
      }
    }
  
    function buildUrl(base, params) {
      var url = new URL(base);
      Object.keys(params).forEach(function (key) {
        url.searchParams.set(key, params[key]);
      });
      return url.toString();
    }
  
    async function geocodeCity(cityName) {
      var url = buildUrl(GEOCODING_API, {
        name: cityName,
        count: "1",
        language: "en",
        format: "json",
      });
  
      var response = await fetch(url);
      if (!response.ok) {
        throw new Error("NETWORK_ERROR");
      }
  
      var data = await response.json();
      if (!data.results || data.results.length === 0) {
        throw new Error("CITY_NOT_FOUND");
      }
  
      return data.results[0];
    }
  
    async function fetchWeather(latitude, longitude, timezoneString) {
      var url = buildUrl(FORECAST_API, {
        latitude: String(latitude),
        longitude: String(longitude),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure",
        hourly: "temperature_2m,weather_code",
        daily: "weather_code,temperature_2m_max,temperature_2m_min",
        timezone: timezoneString,
      });
  
      var response = await fetch(url);
      if (!response.ok) {
        throw new Error("NETWORK_ERROR");
      }
  
      return response.json();
    }
  
    /* ── WMO Weather Code Mapping ──────────────────────────── */
  
    function mapWeatherCode(code) {
      if (code === 0) {
        return { label: "Clear Sky", icon: "clear" };
      }
      if (code >= 1 && code <= 3) {
        return { label: "Partly Cloudy", icon: "partly-cloudy" };
      }
      if (code >= 45 && code <= 48) {
        return { label: "Fog", icon: "fog" };
      }
      if (code >= 51 && code <= 67) {
        return { label: "Rain", icon: "rain" };
      }
      if (code >= 71 && code <= 77) {
        return { label: "Snow", icon: "snow" };
      }
      if (code >= 95 && code <= 99) {
        return { label: "Thunderstorm", icon: "thunderstorm" };
      }
      return { label: "Unknown", icon: "unknown" };
    }
  
    function getWeatherIconSvg(iconType) {
      var icons = {
        clear:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2"></path><path d="M12 21v2"></path><path d="M4.22 4.22l1.42 1.42"></path><path d="M18.36 18.36l1.42 1.42"></path><path d="M1 12h2"></path><path d="M21 12h2"></path><path d="M4.22 19.78l1.42-1.42"></path><path d="M18.36 5.64l1.42-1.42"></path></svg>',
        "partly-cloudy":
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07l1.41-1.41"></path><path d="M17.66 6.34l1.41-1.41"></path><circle cx="12" cy="12" r="4"></circle><path d="M18 14a4 4 0 0 0-7.5-1.5"></path></svg>',
        fog:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M4 18h16"></path><path d="M6 14h12"></path></svg>',
        rain:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M8 19v2"></path><path d="M12 19v2"></path><path d="M16 19v2"></path></svg>',
        snow:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M10 20l1-2"></path><path d="M14 20l-1-2"></path><path d="M12 18v-2"></path></svg>',
        thunderstorm:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M13 16l-2 4h3l-2 4"></path></svg>',
        unknown:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>',
      };
  
      return icons[iconType] || icons.unknown;
    }
  
    /* ── Weather Card Rendering ────────────────────────────── */
  
    function getTemperatureClass(temp) {
      if (temp < 15) return "temp-cool";
      if (temp <= 25) return "temp-neutral";
      return "temp-warm";
    }
  
    function formatLocalDate(isoString, timezone) {
      var date = new Date(isoString);
      var validTimezone =
        timezone === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: validTimezone,
      }).format(date);
    }
  
    function renderWeatherCard(location, weatherData) {
      var current = weatherData.current;
      var units = weatherData.current_units;
      var timezone = weatherData.timezone || location.timezone || "auto";
  
      var cityEl = document.getElementById("weather-city");
      var countryEl = document.getElementById("weather-country");
      var dateEl = document.getElementById("weather-date");
      var tempEl = document.getElementById("weather-temperature");
      var conditionEl = document.getElementById("weather-condition");
      var iconEl = document.getElementById("weather-icon");
      var humidityEl = document.getElementById("weather-humidity");
      var windEl = document.getElementById("weather-wind");
      var pressureEl = document.getElementById("weather-pressure");
  
      var condition = mapWeatherCode(current.weather_code);
      var temperature = current.temperature_2m;
      var tempUnit = units.temperature_2m || "°C";
  
      cityEl.textContent = location.name;
      countryEl.textContent = location.country;
  
      dateEl.textContent = formatLocalDate(current.time, timezone);
      dateEl.setAttribute("datetime", current.time);
  
      tempEl.textContent = Math.round(temperature) + tempUnit;
      tempEl.setAttribute("aria-label", "Current temperature " + Math.round(temperature) + " degrees");
  
      tempEl.classList.remove("temp-cool", "temp-neutral", "temp-warm");
      tempEl.classList.add(getTemperatureClass(temperature));
  
      conditionEl.textContent = condition.label;
      iconEl.innerHTML = getWeatherIconSvg(condition.icon);
  
      humidityEl.textContent = current.relative_humidity_2m + (units.relative_humidity_2m || "%");
      windEl.textContent = current.wind_speed_10m + " " + (units.wind_speed_10m || "km/h");
  
      if (current.surface_pressure != null) {
        pressureEl.textContent = Math.round(current.surface_pressure) + " " + (units.surface_pressure || "hPa");
      } else {
        pressureEl.textContent = "—";
      }
  
      showWeatherCard();
    }
  
    async function handleSearch(event) {
      event.preventDefault();
  
      var query = cityInput.value.trim();
      if (!query) {
        showError("Please enter a city or meteorological station name.");
        hideLoading();
        return;
      }
  
      showLoading();
      hideError();
      hideWeatherCard();
  
      try {
        var location = await geocodeCity(query);
        var weatherData = await fetchWeather(
          location.latitude,
          location.longitude,
          location.timezone || "auto"
        );
  
        hideLoading();
        renderWeatherCard(location, weatherData);
      } catch (error) {
        hideLoading();
        hideWeatherCard();
  
        if (error.message === "CITY_NOT_FOUND") {
          showError("City not found. Please check the spelling and try again.");
        } else if (error.message === "NETWORK_ERROR") {
          showError("Unable to reach the weather service. Please check your connection and try again.");
        } else {
          showError("Something went wrong. Please try again.");
        }
      }
    }
  
    if (searchForm) {
      searchForm.addEventListener("submit", handleSearch);
    }
  })();