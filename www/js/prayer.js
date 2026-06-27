/**
 * DeenQ - Prayer Module
 * Manages geolocation, manual city selection, fetching prayer times from Aladhan API,
 * live countdown timers, date navigation (swipe/buttons), and Web Audio API alarm chimes.
 */

const ISHA_OFFSET_MINUTES = 4; // Isha adjustment offset in minutes

const PrayerModule = {
  timings: null, // Cached daily timings (for today, used by countdown)
  timerInterval: null,
  audioCtx: null,
  _initialized: false,

  // Date navigation state
  selectedDate: new Date(), // The date currently displayed
  touchStartX: 0,
  touchStartY: 0,
  isSwiping: false,

  async init() {
    if (!this._initialized) {
      this.setupListeners();
      this.setupDateNavigation();
      this._initialized = true;
    }
    this.loadSavedLocation();
    this.selectedDate = new Date(); // Reset to today on init
    this.updateDateDisplay();
    await this.fetchPrayerTimesForDate(this.selectedDate);
    // Also ensure today's timings are cached for countdown
    this.timings = this._lastFetchedTimings;
    this.startCountdownTimer();
  },

  _lastFetchedTimings: null,

  setupListeners() {
    // GPS auto detect button
    const btnGPS = document.getElementById('btn-detect-gps');
    if (btnGPS) {
      btnGPS.addEventListener('click', () => this.detectLocation());
    }

    // City dropdown selection
    const citySelect = document.getElementById('select-city-dropdown');
    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const searchBox = document.getElementById('global-city-search-box');

        if (val === 'custom-global') {
          searchBox.classList.remove('hide');
        } else {
          searchBox.classList.add('hide');
          if (val !== 'custom') {
            this.setPresetCity(val);
          }
        }
      });
    }

    // Global city search button
    const btnGlobalFetch = document.getElementById('btn-global-city-search');
    if (btnGlobalFetch) {
      btnGlobalFetch.addEventListener('click', () => this.fetchGlobalCity());
    }

    // Adhan audio tester
    const btnTestAdhan = document.getElementById('btn-test-adhan');
    if (btnTestAdhan) {
      btnTestAdhan.addEventListener('click', () => this.playTestChime());
    }
  },

  setupDateNavigation() {
    // Prev / Next / Today buttons
    const btnPrev = document.getElementById('btn-prayer-prev-day');
    const btnNext = document.getElementById('btn-prayer-next-day');
    const btnToday = document.getElementById('btn-prayer-today');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.navigateDay(-1));
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => this.navigateDay(1));
    }
    if (btnToday) {
      btnToday.addEventListener('click', () => {
        this.selectedDate = new Date();
        this.updateDateDisplay();
        this.fetchPrayerTimesForDate(this.selectedDate);
      });
    }

    // Touch swipe on the prayer grid area
    const swipeArea = document.getElementById('prayer-swipe-area');
    if (swipeArea) {
      swipeArea.addEventListener('touchstart', (e) => {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isSwiping = false;
      }, { passive: true });

      swipeArea.addEventListener('touchmove', (e) => {
        if (!this.touchStartX) return;
        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;

        // Only count horizontal swipes (dx much larger than dy)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
          this.isSwiping = true;
        }
      }, { passive: true });

      swipeArea.addEventListener('touchend', (e) => {
        if (!this.isSwiping) return;
        const dx = e.changedTouches[0].clientX - this.touchStartX;

        if (Math.abs(dx) > 50) {
          if (dx < 0) {
            // Swipe left → next day
            this.navigateDay(1);
          } else {
            // Swipe right → previous day
            this.navigateDay(-1);
          }
        }

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isSwiping = false;
      }, { passive: true });
    }
  },

  navigateDay(offset) {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    this.selectedDate = newDate;
    this.updateDateDisplay();

    // Add a slide animation
    const grid = document.getElementById('prayer-timings-grid');
    if (grid) {
      const direction = offset > 0 ? 'slide-left' : 'slide-right';
      grid.classList.add(direction);
      setTimeout(() => {
        grid.classList.remove(direction);
      }, 300);
    }

    this.fetchPrayerTimesForDate(this.selectedDate);
  },

  updateDateDisplay() {
    const dateLabel = document.getElementById('prayer-date-label');
    const btnToday = document.getElementById('btn-prayer-today');

    if (!dateLabel) return;

    const today = new Date();
    const sel = this.selectedDate;

    // Check if selected date is today
    const isToday = sel.toDateString() === today.toDateString();

    // Check if tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = sel.toDateString() === tomorrow.toDateString();

    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = sel.toDateString() === yesterday.toDateString();

    let label = '';
    if (isToday) {
      label = 'Today';
    } else if (isTomorrow) {
      label = 'Tomorrow';
    } else if (isYesterday) {
      label = 'Yesterday';
    }

    const dateStr = sel.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    dateLabel.innerHTML = label
      ? `<span class="date-label-tag">${label}</span> <span class="date-label-full">${dateStr}</span>`
      : `<span class="date-label-full">${dateStr}</span>`;

    // Show/hide Today button
    if (btnToday) {
      btnToday.style.display = isToday ? 'none' : 'inline-flex';
    }
  },

  loadSavedLocation() {
    // Loaded by StateManager in app.js. Just update UI displays
    this.updateLocationUIDisplay();
  },

  updateLocationUIDisplay() {
    const cityEl = document.getElementById('prayer-display-city');
    const coordsEl = document.getElementById('prayer-display-coords');
    const widgetLocation = document.getElementById('widget-location-name');
    const mapIframe = document.getElementById('prayer-location-map');

    if (cityEl) cityEl.textContent = appState.userLocation.city;
    if (coordsEl) coordsEl.textContent = `Lat: ${appState.userLocation.lat.toFixed(4)}, Lng: ${appState.userLocation.lng.toFixed(4)}`;
    
    if (widgetLocation) {
      widgetLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${appState.userLocation.city.split(',')[0]}`;
    }

    if (mapIframe) {
      mapIframe.src = `https://maps.google.com/maps?q=${appState.userLocation.lat},${appState.userLocation.lng}&z=15&output=embed`;
    }

    // Sync dropdown selection if preset
    const select = document.getElementById('select-city-dropdown');
    if (select) {
      const match = Array.from(select.options).find(o => {
        const optionName = o.text.split('(')[0].trim().toLowerCase();
        const cityName = appState.userLocation.city.split(',')[0].trim().toLowerCase();
        return optionName === cityName;
      });
      if (match) {
        select.value = match.value;
      } else {
        select.value = 'custom';
      }
    }
  },

  async detectLocation() {
    const widgetLocation = document.getElementById('widget-location-name');
    const btnGPS = document.getElementById('btn-detect-gps');
    const cityEl = document.getElementById('prayer-display-city');
    const coordsEl = document.getElementById('prayer-display-coords');

    // Show loading state on button
    if (btnGPS) {
      btnGPS.disabled = true;
      btnGPS.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting...';
    }
    if (widgetLocation) widgetLocation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...';
    if (cityEl) cityEl.textContent = 'Detecting your location...';

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      this.resetGPSButton(btnGPS);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        appState.userLocation.lat = lat;
        appState.userLocation.lng = lng;
        appState.userLocation.isAutoDetected = true;
        appState.userLocation.city = "Detected Location";

        if (coordsEl) coordsEl.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

        // Reverse geocode with high zoom for precise district/city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            // Priority: city > town > county/district > village > suburb > state_district
            const placeName = addr.city || addr.town || addr.county || addr.district
              || addr.village || addr.suburb || addr.state_district || '';
            const state = addr.state || '';
            const country = addr.country || '';

            // Build a clean location string
            let locationParts = [];
            if (placeName) locationParts.push(placeName);
            if (state && state !== placeName) locationParts.push(state);

            if (locationParts.length > 0) {
              appState.userLocation.city = locationParts.join(', ');
            } else if (country) {
              appState.userLocation.city = country;
            }
          }
        } catch(e) {
          console.log("Nominatim reverse lookup failed, using coordinates.", e);
          appState.userLocation.city = `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        }

        StateManager.saveLocation();
        this.updateLocationUIDisplay();
        this.resetGPSButton(btnGPS);

        // Reset to today and refetch
        this.selectedDate = new Date();
        this.updateDateDisplay();
        await this.fetchPrayerTimesForDate(this.selectedDate);
        this.timings = this._lastFetchedTimings;
        this.startCountdownTimer();

        // Set dropdown to indicate GPS-detected
        const select = document.getElementById('select-city-dropdown');
        if (select) select.value = 'custom';
      },
      (error) => {
        console.error("GPS error:", error);
        let errorMsg = 'Unable to retrieve location.';
        if (error.code === 1) {
          errorMsg = 'Location access was denied. Please allow location permission in your browser settings and try again.';
        } else if (error.code === 2) {
          errorMsg = 'Location unavailable. Please check your GPS/network connection.';
        } else if (error.code === 3) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        alert(errorMsg);
        this.resetGPSButton(btnGPS);
        if (widgetLocation) widgetLocation.innerHTML = '<i class="fa-solid fa-location-dot"></i> GPS Denied';
        if (cityEl) cityEl.textContent = appState.userLocation.city;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  },

  resetGPSButton(btnGPS) {
    if (btnGPS) {
      btnGPS.disabled = false;
      btnGPS.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Auto GPS';
    }
  },

  setPresetCity(cityKey) {
    // Hardcoded coordinates for Indian cities & Tamil Nadu Districts
    const presets = {
      mumbai: { lat: 19.0760, lng: 72.8777, name: "Mumbai, India" },
      delhi: { lat: 28.7041, lng: 77.1025, name: "Delhi, India" },
      bangalore: { lat: 12.9716, lng: 77.5946, name: "Bangalore, India" },
      hyderabad: { lat: 17.3850, lng: 78.4867, name: "Hyderabad, India" },
      chennai: { lat: 13.0827, lng: 80.2707, name: "Chennai, India" },
      kolkata: { lat: 22.5726, lng: 88.3639, name: "Kolkata, India" },
      ahmedabad: { lat: 23.0225, lng: 72.5714, name: "Ahmedabad, India" },
      pune: { lat: 18.5204, lng: 73.8567, name: "Pune, India" },
      lucknow: { lat: 26.8467, lng: 80.9462, name: "Lucknow, India" },
      jaipur: { lat: 26.9124, lng: 75.7873, name: "Jaipur, India" },
      patna: { lat: 25.5941, lng: 85.1376, name: "Patna, India" },
      kochi: { lat: 9.9312, lng: 76.2673, name: "Kochi, India" },
      srinagar: { lat: 34.0837, lng: 74.7973, name: "Srinagar, India" },
      
      // Tamil Nadu Districts
      'tn-ariyalur': { lat: 11.1401, lng: 79.0786, name: "Ariyalur, Tamil Nadu" },
      'tn-chengalpattu': { lat: 12.6841, lng: 79.9836, name: "Chengalpattu, Tamil Nadu" },
      'tn-chennai': { lat: 13.0827, lng: 80.2707, name: "Chennai, Tamil Nadu" },
      'tn-coimbatore': { lat: 11.0168, lng: 76.9558, name: "Coimbatore, Tamil Nadu" },
      'tn-cuddalore': { lat: 11.7480, lng: 79.7714, name: "Cuddalore, Tamil Nadu" },
      'tn-dharmapuri': { lat: 12.1278, lng: 78.1579, name: "Dharmapuri, Tamil Nadu" },
      'tn-dindigul': { lat: 10.3673, lng: 77.9806, name: "Dindigul, Tamil Nadu" },
      'tn-erode': { lat: 11.3410, lng: 77.7172, name: "Erode, Tamil Nadu" },
      'tn-kallakurichi': { lat: 11.7380, lng: 78.9639, name: "Kallakurichi, Tamil Nadu" },
      'tn-kanchipuram': { lat: 12.8342, lng: 79.7036, name: "Kanchipuram, Tamil Nadu" },
      'tn-kanyakumari': { lat: 8.0883, lng: 77.5385, name: "Kanyakumari, Tamil Nadu" },
      'tn-karur': { lat: 10.9601, lng: 78.0766, name: "Karur, Tamil Nadu" },
      'tn-krishnagiri': { lat: 12.5266, lng: 78.2148, name: "Krishnagiri, Tamil Nadu" },
      'tn-madurai': { lat: 9.9252, lng: 78.1198, name: "Madurai, Tamil Nadu" },
      'tn-mayiladuthurai': { lat: 11.1018, lng: 79.6522, name: "Mayiladuthurai, Tamil Nadu" },
      'tn-nagapattinam': { lat: 10.7672, lng: 79.8444, name: "Nagapattinam, Tamil Nadu" },
      'tn-namakkal': { lat: 11.2189, lng: 78.1672, name: "Namakkal, Tamil Nadu" },
      'tn-nilgiris': { lat: 11.4102, lng: 76.6950, name: "Nilgiris (Ooty), Tamil Nadu" },
      'tn-perambalur': { lat: 11.2342, lng: 78.8756, name: "Perambalur, Tamil Nadu" },
      'tn-pudukkottai': { lat: 10.3797, lng: 78.8202, name: "Pudukkottai, Tamil Nadu" },
      'tn-ramanathapuram': { lat: 9.3639, lng: 78.8395, name: "Ramanathapuram, Tamil Nadu" },
      'tn-ranipet': { lat: 12.9272, lng: 79.3331, name: "Ranipet, Tamil Nadu" },
      'tn-salem': { lat: 11.6643, lng: 78.1460, name: "Salem, Tamil Nadu" },
      'tn-sivaganga': { lat: 9.8433, lng: 78.4809, name: "Sivaganga, Tamil Nadu" },
      'tn-tenkasi': { lat: 8.9591, lng: 77.3150, name: "Tenkasi, Tamil Nadu" },
      'tn-thanjavur': { lat: 10.7870, lng: 79.1378, name: "Thanjavur, Tamil Nadu" },
      'tn-theni': { lat: 10.0104, lng: 77.4777, name: "Theni, Tamil Nadu" },
      'tn-thoothukudi': { lat: 8.7973, lng: 78.1348, name: "Thoothukudi, Tamil Nadu" },
      'tn-tiruchirappalli': { lat: 10.7905, lng: 78.7047, name: "Tiruchirappalli, Tamil Nadu" },
      'tn-tirunelveli': { lat: 8.7139, lng: 77.7567, name: "Tirunelveli, Tamil Nadu" },
      'tn-tirupathur': { lat: 12.4926, lng: 78.5678, name: "Tirupathur, Tamil Nadu" },
      'tn-tiruppur': { lat: 11.1085, lng: 77.3411, name: "Tiruppur, Tamil Nadu" },
      'tn-tiruvallur': { lat: 13.1413, lng: 79.9071, name: "Tiruvallur, Tamil Nadu" },
      'tn-tiruvannamalai': { lat: 12.2253, lng: 79.0747, name: "Tiruvannamalai, Tamil Nadu" },
      'tn-tiruvarur': { lat: 10.7661, lng: 79.6344, name: "Tiruvarur, Tamil Nadu" },
      'tn-vellore': { lat: 12.9165, lng: 79.1325, name: "Vellore, Tamil Nadu" },
      'tn-viluppuram': { lat: 11.9401, lng: 79.4861, name: "Viluppuram, Tamil Nadu" },
      'tn-virudhunagar': { lat: 9.5872, lng: 77.9514, name: "Virudhunagar, Tamil Nadu" }
    };

    const choice = presets[cityKey];
    if (choice) {
      appState.userLocation.lat = choice.lat;
      appState.userLocation.lng = choice.lng;
      appState.userLocation.city = choice.name;
      appState.userLocation.isAutoDetected = false;

      StateManager.saveLocation();
      this.updateLocationUIDisplay();

      // Reset to today and refetch
      this.selectedDate = new Date();
      this.updateDateDisplay();
      this.fetchPrayerTimesForDate(this.selectedDate).then(() => {
        this.timings = this._lastFetchedTimings;
        this.startCountdownTimer();
      });
    }
  },

  async fetchGlobalCity() {
    const input = document.getElementById('global-city-input');
    const cityName = input ? input.value.trim() : '';

    if (!cityName) return;

    const btn = document.getElementById('btn-global-city-search');
    btn.textContent = "Fetching...";
    btn.disabled = true;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityName)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        appState.userLocation.lat = parseFloat(place.lat);
        appState.userLocation.lng = parseFloat(place.lon);
        appState.userLocation.city = place.display_name.split(',').slice(0, 3).join(',');
        appState.userLocation.isAutoDetected = false;

        StateManager.saveLocation();
        this.updateLocationUIDisplay();

        this.selectedDate = new Date();
        this.updateDateDisplay();
        await this.fetchPrayerTimesForDate(this.selectedDate);
        this.timings = this._lastFetchedTimings;
        this.startCountdownTimer();
        
        // Clear search box input
        input.value = '';
        document.getElementById('global-city-search-box').classList.add('hide');
      } else {
        alert("City not found. Please try a different query.");
      }
    } catch(err) {
      console.error("Geocoding failed:", err);
      alert("Network error fetching city coordinates.");
    } finally {
      btn.textContent = "Fetch";
      btn.disabled = false;
    }
  },

  /**
   * Fetch prayer times for a specific date and render them.
   * Uses caching. Also stores timings for countdown if it's today.
   */
  async fetchPrayerTimesForDate(date) {
    const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const method = appState.settings.calcMethod || 3;
    const school = appState.settings.madhab || 0;

    // Cache key specific to location, date, calculations
    const cacheKey = `prayers_${appState.userLocation.lat.toFixed(2)}_${appState.userLocation.lng.toFixed(2)}_${method}_${school}_${formattedDate}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      this._lastFetchedTimings = JSON.parse(cached);
      this.renderPrayerTimesForDate(this._lastFetchedTimings);
      return;
    }

    // Show loading state on prayer cards
    const list = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    list.forEach(name => {
      const el = document.getElementById(`time-${name.toLowerCase()}`);
      if (el) el.textContent = '...';
    });

    try {
      const url = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${appState.userLocation.lat}&longitude=${appState.userLocation.lng}&method=${method}&school=${school}`;
      const res = await fetch(url);
      const payload = await res.json();

      if (payload.code === 200 && payload.data && payload.data.timings) {
        this._lastFetchedTimings = payload.data.timings;
        localStorage.setItem(cacheKey, JSON.stringify(payload.data.timings));
        this.renderPrayerTimesForDate(payload.data.timings);
        
        // Sync Hijri calendar on dashboard banner if today
        const today = new Date();
        if (date.toDateString() === today.toDateString() && payload.data.date && payload.data.date.hijri) {
          const hijri = payload.data.date.hijri;
          const hijriEl = document.getElementById('home-hijri-date');
          if (hijriEl) {
            hijriEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
          }
        }
      }
    } catch(err) {
      console.error("Failed fetching prayer timings:", err);
    }
  },

  /**
   * Renders prayer times into the grid cards.
   * This is used for any date (today or navigated date).
   */
  renderPrayerTimesForDate(timingsData) {
    if (!timingsData) return;

    const list = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    list.forEach(name => {
      const el = document.getElementById(`time-${name.toLowerCase()}`);
      if (el) {
        let rawTime = timingsData[name];
        if (name === 'Isha' && rawTime) {
          rawTime = this.addMinutesToTime(rawTime, ISHA_OFFSET_MINUTES);
        }
        if (rawTime) {
          const cleanTime = rawTime.split(' ')[0];
          el.textContent = this.formatTime12Hr(cleanTime);
        }
      }
    });

    // Also render on home page current widget (only if viewing today)
    const today = new Date();
    if (this.selectedDate.toDateString() === today.toDateString()) {
      this.timings = timingsData;
      const homeCurrentTime = document.getElementById('home-current-prayer-time');
      if (homeCurrentTime && timingsData.Fajr) {
        const active = this.getActivePrayer();
        if (active) {
          let activeTime = timingsData[active.current.name];
          if (active.current.name === 'Isha' && activeTime) {
            activeTime = this.addMinutesToTime(activeTime, ISHA_OFFSET_MINUTES);
          }
          homeCurrentTime.textContent = this.formatTime12Hr(activeTime);
        }
      }
    }

    // Highlight active prayer card only for today
    document.querySelectorAll('.prayer-time-card').forEach(c => c.classList.remove('active'));
    if (this.selectedDate.toDateString() === today.toDateString() && this.timings) {
      const activeObj = this.getActivePrayer();
      if (activeObj) {
        const activeCard = document.getElementById(`card-${activeObj.current.name.toLowerCase()}`);
        if (activeCard) activeCard.classList.add('active');
      }
    }
  },

  // Legacy wrapper for backward compatibility
  async fetchPrayerTimes() {
    await this.fetchPrayerTimesForDate(new Date());
    this.timings = this._lastFetchedTimings;
  },

  renderPrayerTimes() {
    if (this.timings) {
      this.renderPrayerTimesForDate(this.timings);
    }
  },

  addMinutesToTime(timeStr, minsToAdd) {
    if (!timeStr) return timeStr;
    const cleanTime = timeStr.split(' ')[0];
    const parts = cleanTime.split(':');
    let hrs = parseInt(parts[0]);
    let mins = parseInt(parts[1]);

    mins += minsToAdd;
    if (mins >= 60) {
      hrs += Math.floor(mins / 60);
      mins = mins % 60;
    }
    if (hrs >= 24) {
      hrs = hrs % 24;
    }

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}`;
  },

  formatTime12Hr(time24) {
    if (!time24) return '--:--';
    const parts = time24.split(':');
    let hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 becomes 12
    return `${hrs}:${mins} ${ampm}`;
  },

  getActivePrayer() {
    if (!this.timings) return null;

    const now = new Date();
    const parseTimeToDate = (timeStr) => {
      const parts = timeStr.split(':');
      const d = new Date(now);
      d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
      return d;
    };

    // Build timeline of prayers
    const prayers = [
      { name: 'Fajr', time: parseTimeToDate(this.timings.Fajr) },
      { name: 'Sunrise', time: parseTimeToDate(this.timings.Sunrise) },
      { name: 'Dhuhr', time: parseTimeToDate(this.timings.Dhuhr) },
      { name: 'Asr', time: parseTimeToDate(this.timings.Asr) },
      { name: 'Maghrib', time: parseTimeToDate(this.timings.Maghrib) },
      { name: 'Isha', time: parseTimeToDate(this.addMinutesToTime(this.timings.Isha, ISHA_OFFSET_MINUTES)) }
    ];

    // Find current active and next active
    let active = null;
    let next = null;

    for (let i = 0; i < prayers.length; i++) {
      if (now >= prayers[i].time) {
        active = prayers[i];
      } else {
        next = prayers[i];
        break;
      }
    }

    // Handle wrap-arounds at night
    if (!active) {
      // It's early morning before Fajr (active is previous day's Isha)
      active = { name: 'Isha', time: new Date(prayers[5].time).setDate(prayers[5].time.getDate() - 1) };
      next = prayers[0]; // Fajr today
    }

    if (!next) {
      // It's after Isha, next is Fajr tomorrow
      active = prayers[5]; // Isha today
      const tomorrowFajr = new Date(prayers[0].time);
      tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
      next = { name: 'Fajr', time: tomorrowFajr };
    }

    return { current: active, next: next };
  },

  startCountdownTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateCountdown = () => {
      if (!this.timings) return;

      const activeObj = this.getActivePrayer();
      if (!activeObj) return;

      const now = new Date();
      const diffMs = activeObj.next.time - now;

      if (diffMs <= 0) {
        // Trigger sound/alert when prayer time hits
        this.triggerAdhanAlarm(activeObj.next.name);
        this.fetchPrayerTimes(); // Refresh
        return;
      }

      // Convert diff to hours, minutes, seconds
      let sec = Math.floor(diffMs / 1000);
      let hrs = Math.floor(sec / 3600);
      sec %= 3600;
      let min = Math.floor(sec / 60);
      sec %= 60;

      const pad = (num) => String(num).padStart(2, '0');
      const timeStr = `${pad(hrs)}:${pad(min)}:${pad(sec)}`;

      // Update Prayer Page Header Countdown
      const pageCountdown = document.getElementById('prayer-countdown-timer');
      const pageCountdownName = document.getElementById('prayer-countdown-name');
      if (pageCountdown) pageCountdown.textContent = timeStr;
      if (pageCountdownName) pageCountdownName.textContent = activeObj.next.name;

      // Update Dashboard Countdown
      const dashboardCountdown = document.getElementById('home-next-prayer-countdown');
      const dashboardCountdownName = document.getElementById('home-next-prayer-name');
      const dashboardCurrentName = document.getElementById('home-current-prayer-name');
      if (dashboardCountdown) dashboardCountdown.textContent = timeStr;
      if (dashboardCountdownName) dashboardCountdownName.textContent = activeObj.next.name;
      if (dashboardCurrentName) dashboardCurrentName.textContent = activeObj.current.name;

      // Highlight active prayer cards (only when viewing today)
      const today = new Date();
      if (this.selectedDate.toDateString() === today.toDateString()) {
        document.querySelectorAll('.prayer-time-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.getElementById(`card-${activeObj.current.name.toLowerCase()}`);
        if (activeCard) activeCard.classList.add('active');
      }
    };

    updateCountdown();
    this.timerInterval = setInterval(updateCountdown, 1000);
  },

  triggerAdhanAlarm(prayerName) {
    if (appState.settings.alarms[prayerName.toLowerCase()]) {
      console.log(`ALARM: It is time for ${prayerName}!`);
      this.playTestChime();
      
      if (Notification.permission === 'granted') {
        new Notification("Prayer Time Alert", {
          body: `It is time for ${prayerName} prayer.`,
          icon: 'assets/star.jpg'
        });
      }
    }
  },

  playTestChime() {
    // Uses browser Web Audio API to synthesize a peaceful, resonant bell tone completely offline!
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.audioCtx = this.audioCtx || new AudioContext();
      
      const playTone = (freq, startTime, duration) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Peaceful volume decay (reverberation)
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play a beautiful, meditative harmonic chord (Root, Fifth, Octave, and Major 3rd)
      const now = this.audioCtx.currentTime;
      
      // Chime sequence
      playTone(261.63, now, 3.5);        // C4
      playTone(392.00, now + 0.15, 3.5); // G4
      playTone(523.25, now + 0.30, 3.5); // C5
      playTone(659.25, now + 0.45, 3.5); // E5

      // Subtly repeat 1.5 seconds later
      playTone(392.00, now + 1.5, 3);
      playTone(523.25, now + 1.65, 3);
      playTone(659.25, now + 1.8, 3);

    } catch (e) {
      console.error("Web Audio API failed to synthesize chime:", e);
    }
  }
};

// Request Notification Permissions on load
if (window.Notification && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Register view trigger
router.register('prayer', () => {
  PrayerModule.init();
});

// Run automatically for Home widget countdowns
setTimeout(() => {
  if (appState.userLocation) {
    PrayerModule.fetchPrayerTimes().then(() => {
      PrayerModule.startCountdownTimer();
    });
  }
}, 100);
