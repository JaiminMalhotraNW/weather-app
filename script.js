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
          "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
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
  
      try {
        var location = await geocodeCity(query);
        var weatherData = await fetchWeather(
          location.latitude,
          location.longitude,
          location.timezone || "auto"
        );
  
        hideLoading();
  
        console.log("Location:", {
          name: location.name,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone || "auto",
        });
        console.log("Weather data:", weatherData);
      } catch (error) {
        hideLoading();
  
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