const searchForm = document.querySelector("[data-searchForm]");
const searchInp = document.querySelector("[data-searchInput]");
const loadingScreen = document.querySelector(".loading-container");
const userInfoContainer = document.querySelector(".user-info-container");
const errorContainer = document.querySelector(".Error");

// ---- Helpers ----
function showLoading(show) {
  loadingScreen.classList.toggle("active", !!show);
}
function showError(show) {
  errorContainer.classList.toggle("active", !!show);
}
function showWeather(show) {
  userInfoContainer.classList.toggle("active", !!show);
}

// Pick the hour closest to "now" from Open-Meteo hourly arrays
function getClosestIndex(times) {
  const now = new Date();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]) - now);
    if (diff < bestDiff) { best = i; bestDiff = diff; }
  }
  return best;
}

// ---- Fetchers ----
async function fetchCoordinates(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const data = await res.json();
  if (!data || !data.results || data.results.length === 0) {
    throw new Error("City not found");
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { lat: latitude, lon: longitude, label: `${name}, ${country ?? ""}`.trim() };
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,surface_pressure&timezone=auto`;
  const res = await fetch(url);
  return res.json();
}

// ---- Render ----
function renderWeatherInfo(weather, label) {
  const { hourly } = weather;
  const idx = getClosestIndex(hourly.time);

  document.querySelector(".city-name").textContent = label;
  document.querySelector(".weather-temp").textContent = `${hourly.temperature_2m[idx]} °C`;
  document.querySelector(".weather-humidity").textContent = `${hourly.relativehumidity_2m[idx]} %`;
  document.querySelector(".weather-wind").textContent = `${hourly.windspeed_10m[idx]} km/h`;
  document.querySelector(".weather-pressure").textContent = `${hourly.surface_pressure[idx]} hPa`;

  showWeather(true);
}

// ---- Events ----
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = (searchInp.value || "").trim();
  if (!city) return;

  try {
    showError(false); showWeather(false); showLoading(true);
    const { lat, lon, label } = await fetchCoordinates(city);
    const weather = await fetchWeather(lat, lon);
    showLoading(false);
    if (!weather || !weather.hourly) throw new Error("No hourly data");
    renderWeatherInfo(weather, label);
  } catch (err) {
    showLoading(false);
    showError(true);
  }
});

// Retry → back to default (Berlin)
document.querySelector(".retry").addEventListener("click", () => {
  showError(false);
  loadDefault();
});

// ---- Default on load (Berlin) ----
async function loadDefault() {
  try {
    showError(false); showWeather(false); showLoading(true);
    const { lat, lon, label } = await fetchCoordinates("Berlin");
    const weather = await fetchWeather(lat, lon);
    showLoading(false);
    if (!weather || !weather.hourly) throw new Error("No hourly data");
    renderWeatherInfo(weather, label);
  } catch {
    showLoading(false);
    showError(true);
  }
}

loadDefault();
