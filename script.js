(function () {
    "use strict";
  
    /* ── Constants & Elements ──────────────────────────────── */
  
    var STORAGE_KEY = "weather-app-theme";
    var STORAGE_CITY_KEY = "weather-app-last-city";
    var THEME_LIGHT = "light";
    var THEME_DARK = "dark";
  
    var root = document.documentElement;
    var toggleButton = document.getElementById("theme-toggle");
    var searchForm = document.getElementById("search-form");
    var cityInput = document.getElementById("city-search");
    var resetButton = document.getElementById("search-reset");
    var loadingContainer = document.getElementById("loading-container");
    var errorBanner = document.getElementById("error-banner");
    var errorMessage = document.getElementById("error-message");
    var weatherCard = document.getElementById("weather-card");
    var forecastSection = document.getElementById("forecast-section");
    var forecastStrip = document.getElementById("forecast-strip");
    var hourlySection = document.getElementById("hourly-section");
    var hourlyList = document.getElementById("hourly-list");
  
    /* ── Theme Logic ────────────────────────────────────────── */
  
    function getStoredTheme() {
      try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }
  
    function saveTheme(theme) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
  
    function getPreferredTheme() {
      var stored = getStoredTheme();
      if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME_DARK : THEME_LIGHT;
    }
  
    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      if (!toggleButton) return;
      var isDark = theme === THEME_DARK;
      toggleButton.setAttribute("aria-pressed", String(isDark));
      toggleButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
  
    applyTheme(getPreferredTheme());
    if (toggleButton) {
      toggleButton.addEventListener("click", function() {
        var current = root.getAttribute("data-theme");
        var next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        applyTheme(next);
        saveTheme(next);
      });
    }
  
    /* ── UI Helpers ─────────────────────────────────────────── */
  
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
      errorBanner.classList.add("is-hidden");
    }
  
    function hideWeatherCard() { if (weatherCard) weatherCard.classList.add("is-hidden"); }
    function showWeatherCard() { if (weatherCard) weatherCard.classList.remove("is-hidden"); }
  
    function hideForecastAndHourly() {
      if (forecastSection) forecastSection.classList.add("is-hidden");
      if (hourlySection) hourlySection.classList.add("is-hidden");
      forecastStrip.innerHTML = "";
      hourlyList.innerHTML = "";
    }
  
    function resetApp() {
      if (cityInput) cityInput.value = "";
      localStorage.removeItem(STORAGE_CITY_KEY);
      hideError();
      hideLoading();
      hideWeatherCard();
      hideForecastAndHourly();
    }
  
    /* ── Data & Mapping ─────────────────────────────────────── */
  
    function mapWeatherCode(code) {
      if (code === 0) return { label: "Clear Sky", icon: "clear" };
      if (code >= 1 && code <= 3) return { label: "Partly Cloudy", icon: "partly-cloudy" };
      if (code >= 45 && code <= 48) return { label: "Fog", icon: "fog" };
      if (code >= 51 && code <= 67) return { label: "Rain", icon: "rain" };
      if (code >= 71 && code <= 77) return { label: "Snow", icon: "snow" };
      if (code >= 95 && code <= 99) return { label: "Thunderstorm", icon: "thunderstorm" };
      return { label: "Unknown", icon: "unknown" };
    }
  
    function getWeatherEmoji(iconType) {
      var icons = {
        clear: "☀️", "partly-cloudy": "⛅", fog: "🌫️",
        rain: "🌧️", snow: "❄️", thunderstorm: "⛈️", unknown: "❓"
      };
      return icons[iconType] || icons.unknown;
    }
  
    function resolveTimezone(tz) { return tz === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz; }
  
    function getHumidityColor(h) { return h > 80 ? "var(--color-temp-cool)" : "var(--color-text)"; }
  
    /* ── Renderers ──────────────────────────────────────────── */
  
    function renderWeatherCard(location, weatherData) {
      var current = weatherData.current;
      var units = weatherData.current_units;
      var timezone = weatherData.timezone || location.timezone || "auto";
  
      document.getElementById("weather-city").textContent = location.name;
      document.getElementById("weather-country").textContent = location.country;
      
      var dateEl = document.getElementById("weather-date");
      dateEl.textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: resolveTimezone(timezone) }).format(new Date(current.time));
      dateEl.setAttribute("datetime", current.time);
  
      var tempEl = document.getElementById("weather-temperature");
      var temp = Math.round(current.temperature_2m);
      tempEl.textContent = temp + (units.temperature_2m || "°C");
      tempEl.className = "weather-card__temperature " + (temp < 15 ? "temp-cool" : temp <= 25 ? "temp-neutral" : "temp-warm");
  
      document.getElementById("weather-condition").textContent = mapWeatherCode(current.weather_code).label;
      document.getElementById("weather-icon").textContent = getWeatherEmoji(mapWeatherCode(current.weather_code).icon);
  
      var humEl = document.getElementById("weather-humidity");
      humEl.textContent = Math.round(current.relative_humidity_2m) + (units.relative_humidity_2m || "%");
      humEl.style.color = getHumidityColor(current.relative_humidity_2m);
  
      document.getElementById("weather-wind").textContent = current.wind_speed_10m + " " + (units.wind_speed_10m || "km/h");
      document.getElementById("weather-pressure").textContent = current.surface_pressure ? Math.round(current.surface_pressure) + " " + (units.surface_pressure || "hPa") : "—";
  
      showWeatherCard();
    }
  
    function renderForecast(dailyData, timezone) {
      forecastStrip.innerHTML = "";
      for (var i = 0; i < 5; i++) {
        var code = dailyData.weather_code[i];
        var info = mapWeatherCode(code);
        var high = Math.round(dailyData.temperature_2m_max[i]);
        var low = Math.round(dailyData.temperature_2m_min[i]);
        var day = i === 0 ? "Today" : new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: resolveTimezone(timezone) }).format(new Date(dailyData.time[i] + "T12:00:00"));
  
        forecastStrip.insertAdjacentHTML("beforeend", 
          '<article class="forecast-card' + (i === 0 ? " forecast-card--today" : "") + '" role="listitem">' +
            '<p class="forecast-card__day">' + day + '</p>' +
            '<div class="forecast-card__icon">' + getWeatherEmoji(info.icon) + '</div>' +
            '<div class="forecast-card__temps"><span class="forecast-card__high">' + high + '°</span><span class="forecast-card__low">' + low + '°</span></div>' +
          '</article>');
      }
      forecastSection.classList.remove("is-hidden");
    }
  
    function renderHourly(hourlyData, timezone) {
      hourlyList.innerHTML = "";
      var currentTime = document.getElementById("weather-date").getAttribute("datetime");
      var startIndex = hourlyData.time.findIndex(function(t) { return t >= currentTime; }) || 0;
  
      hourlyData.time.slice(startIndex, startIndex + 6).forEach(function (time, i) {
        var idx = startIndex + i;
        var info = mapWeatherCode(hourlyData.weather_code[idx]);
        hourlyList.insertAdjacentHTML("beforeend", 
          '<li class="hourly-row">' +
            '<time class="hourly-row__time">' + new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: resolveTimezone(timezone) }).format(new Date(time)) + '</time>' +
            '<div class="hourly-row__details"><span class="hourly-row__icon">' + getWeatherEmoji(info.icon) + '</span><span class="hourly-row__condition">' + info.label + '</span></div>' +
            '<span class="hourly-row__temp">' + Math.round(hourlyData.temperature_2m[idx]) + '°</span>' +
          '</li>');
      });
      hourlySection.classList.remove("is-hidden");
    }
  
    /* ── App Execution ─────────────────────────────────────── */
  
    async function fetchWeatherForQuery(query) {
      if (!query) return;
      showLoading(); hideError(); hideWeatherCard(); hideForecastAndHourly();
      try {
        var res = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=1&format=json");
        var data = await res.json();
        if (!data.results) throw new Error("CITY_NOT_FOUND");
        var loc = data.results[0];
        
        var weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + loc.latitude + "&longitude=" + loc.longitude + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=" + (loc.timezone || "auto"));
        var weatherData = await weatherRes.json();
  
        hideLoading();
        renderWeatherCard(loc, weatherData);
        renderForecast(weatherData.daily, weatherData.timezone);
        renderHourly(weatherData.hourly, weatherData.timezone);
        weatherCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        hideLoading(); showError("City not found or network error.");
      }
    }
  
    searchForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var q = cityInput.value.trim();
      if(q) {
          fetchWeatherForQuery(q);
          localStorage.setItem(STORAGE_CITY_KEY, q);
      }
    });
  
    if (resetButton) resetButton.addEventListener("click", resetApp);
  
    var lastCity = localStorage.getItem(STORAGE_CITY_KEY);
    if (lastCity) {
      cityInput.value = lastCity;
      fetchWeatherForQuery(lastCity);
    }
  
  })();