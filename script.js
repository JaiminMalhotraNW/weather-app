(function () {
    "use strict";
  
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
        /* localStorage unavailable — theme still applies for this session */
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
  
      if (!toggleButton) {
        return;
      }
  
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
  })();