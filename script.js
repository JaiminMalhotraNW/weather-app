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
    var forecastSection = document.getElementById("forecast-section");
    var forecastStrip = document.getElementById("forecast-strip");
    var hourlySection = document.getElementById("hourly-section");
    var hourlyList = document.getElementById("hourly-list");
  
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
  
    function hideForecastAndHourly() {
      if (forecastSection) forecastSection.classList.add("is-hidden");
      if (hourlySection) hourlySection.classList.add("is-hidden");
      if (forecastStrip) forecastStrip.innerHTML = "";
      if (hourlyList) hourlyList.innerHTML = "";
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
        clear: "☀️",
        "partly-cloudy": "⛅",
        fog: "🌫️",
        rain: "🌧️",
        snow: "❄️",
        thunderstorm: "⛈️",
        unknown: "❓",
        };

        return icons[iconType] || icons.unknown;
    }
  
    /* ── Formatting Helpers ──────────────────────────────────── */
  
    function resolveTimezone(timezone) {
      return timezone === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
    }
  
    function getTemperatureClass(temp) {
      if (temp < 15) return "temp-cool";
      if (temp <= 25) return "temp-neutral";
      return "temp-warm";
    }
  
    function formatLocalDate(isoString, timezone) {
      var date = new Date(isoString);
      var validTimezone = resolveTimezone(timezone);
  
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: validTimezone,
      }).format(date);
    }
  
    function formatShortDayName(index, dateString, timezone) {
      if (index === 0) return "Today";
  
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: resolveTimezone(timezone),
      }).format(new Date(dateString + "T12:00:00"));
    }
  
    function formatHourTime(isoString, timezone) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: resolveTimezone(timezone),
      }).format(new Date(isoString));
    }
  
    function findHourlyStartIndex(times, currentTime) {
      var exactIndex = times.indexOf(currentTime);
      if (exactIndex !== -1) return exactIndex;
  
      for (var i = 0; i < times.length; i++) {
        if (times[i] >= currentTime) return i;
      }
  
      return 0;
    }
  
    /* ── Weather Card Rendering ────────────────────────────── */
  
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
  
    /* ── Forecast Strip Rendering ──────────────────────────── */
  
    function renderForecast(dailyData, timezone) {
      if (!forecastStrip || !forecastSection) return;
  
      forecastStrip.innerHTML = "";
  
      for (var i = 0; i < 5; i++) {
        var condition = mapWeatherCode(dailyData.weather_code[i]);
        var dayName = formatShortDayName(i, dailyData.time[i], timezone);
        var high = Math.round(dailyData.temperature_2m_max[i]);
        var low = Math.round(dailyData.temperature_2m_min[i]);
  
        var card = document.createElement("article");
        card.className = "forecast-card" + (i === 0 ? " forecast-card--today" : "");
        card.setAttribute("role", "listitem");
        card.setAttribute("aria-label", dayName + ", high " + high + ", low " + low);
  
        card.innerHTML =
          '<p class="forecast-card__day">' + dayName + "</p>" +
          '<div class="forecast-card__icon" aria-hidden="true">' + getWeatherIconSvg(condition.icon) + "</div>" +
          '<div class="forecast-card__temps">' +
          '<span class="forecast-card__high">' + high + "°</span>" +
          '<span class="forecast-card__low">' + low + "°</span>" +
          "</div>";
  
        forecastStrip.appendChild(card);
      }
  
      forecastSection.classList.remove("is-hidden");
    }
  
    /* ── Hourly Insights Rendering ─────────────────────────── */
  
    function renderHourly(hourlyData, timezone) {
      if (!hourlyList || !hourlySection) return;
  
      var currentTime = document.getElementById("weather-date").getAttribute("datetime");
      var startIndex = findHourlyStartIndex(hourlyData.time, currentTime);
      var slice = hourlyData.time.slice(startIndex, startIndex + 6);
  
      hourlyList.innerHTML = "";
  
      slice.forEach(function (time, index) {
        var dataIndex = startIndex + index;
        var condition = mapWeatherCode(hourlyData.weather_code[dataIndex]);
        var temp = Math.round(hourlyData.temperature_2m[dataIndex]);
  
        var row = document.createElement("li");
        row.className = "hourly-row";
        row.innerHTML =
          '<time class="hourly-row__time" datetime="' + time + '">' + formatHourTime(time, timezone) + "</time>" +
          '<span class="hourly-row__condition">' + condition.label + "</span>" +
          '<span class="hourly-row__temp">' + temp + "°</span>";
  
        hourlyList.appendChild(row);
      });
  
      hourlySection.classList.remove("is-hidden");
    }
  
    /* ── Search Handler ────────────────────────────────────── */
  
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
      hideForecastAndHourly();
  
      try {
        var location = await geocodeCity(query);
        var weatherData = await fetchWeather(
          location.latitude,
          location.longitude,
          location.timezone || "auto"
        );
  
        var timezone = weatherData.timezone || location.timezone || "auto";
  
        hideLoading();
        renderWeatherCard(location, weatherData);
        renderForecast(weatherData.daily, timezone);
        renderHourly(weatherData.hourly, timezone);
      } catch (error) {
        hideLoading();
        hideWeatherCard();
        hideForecastAndHourly();
  
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