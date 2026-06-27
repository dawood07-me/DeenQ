/**
 * DeenQ - Qibla Compass Module
 * Calculates Qibla angle from user coordinates using mathematical formulas
 * and handles compass sensor tracking with desktop fallback simulation.
 */

const QiblaModule = {
  kaabaLat: 21.4225, // Latitude of Kaaba (Degrees)
  kaabaLng: 39.8262, // Longitude of Kaaba (Degrees)
  qiblaAngle: 0, // Calculated angle relative to North (Clockwise)
  heading: 0, // Current device heading from North
  sensorActive: false,

  init() {
    this.setupListeners();
    this.calculateQibla();
    this.initCompassEvents();
  },

  setupListeners() {
    // Re-request sensor permission
    const btnSensor = document.getElementById('btn-request-compass');
    if (btnSensor) {
      btnSensor.addEventListener('click', () => this.requestSensorPermission());
    }

    // Manual slider for desktop testing
    const slider = document.getElementById('desktop-heading-slider');
    const sliderVal = document.getElementById('slider-heading-val');
    
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (sliderVal) sliderVal.textContent = val;
        
        // Simulating compass heading
        this.heading = val;
        this.updateCompassUI();
      });
    }
  },

  calculateQibla() {
    const lat = appState.userLocation.lat;
    const lng = appState.userLocation.lng;

    // Convert values to radians
    const phi = lat * Math.PI / 180;
    const lambda = lng * Math.PI / 180;
    const phiK = this.kaabaLat * Math.PI / 180;
    const lambdaK = this.kaabaLng * Math.PI / 180;

    const deltaLambda = lambdaK - lambda;

    // Qibla direction formula
    const y = Math.sin(deltaLambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(deltaLambda);
    
    let qiblaRad = Math.atan2(y, x);
    let qiblaDeg = qiblaRad * 180 / Math.PI;

    // Normalize angle between 0 and 360 degrees
    this.qiblaAngle = (qiblaDeg + 360) % 360;

    // Calculate distance to Kaaba using Haversine formula
    const rEarth = 6371; // km
    const dLat = phiK - phi;
    const dLng = lambdaK - lambda;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(phi) * Math.cos(phiK) * 
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = rEarth * c;

    // Update UI elements
    const angleVal = document.getElementById('qibla-angle-val');
    const distVal = document.getElementById('qibla-distance-val');
    
    if (angleVal) angleVal.textContent = `${this.qiblaAngle.toFixed(1)}°`;
    if (distVal) distVal.textContent = `${Math.round(distance).toLocaleString()} km`;

    // Position Qibla arrow inside dial relative to North
    const pointer = document.getElementById('qibla-pointer');
    if (pointer) {
      pointer.style.transform = `rotate(${this.qiblaAngle}deg)`;
    }
  },

  initCompassEvents() {
    // Check if Absolute Orientation is supported
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', (e) => this.handleCompassChange(e), true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', (e) => this.handleCompassChange(e), true);
    }
  },

  async requestSensorPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          this.initCompassEvents();
          this.setAccuracyState(true, "Sensor access granted. Hold device flat.");
        } else {
          this.setAccuracyState(false, "Permission denied. Using manual slider override.");
        }
      } catch (err) {
        console.error("Sensor request failed:", err);
        this.setAccuracyState(false, "Sensor request failed. Using manual slider override.");
      }
    } else {
      this.setAccuracyState(false, "Browser sensors not supported. Move slider to rotate compass.");
    }
  },

  handleCompassChange(event) {
    let heading = 0;

    // iOS check
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
      this.setAccuracyState(true, "Sensor Lock (iOS Compass Active)");
    } 
    // Android check
    else if (event.alpha !== null) {
      // Android alpha is counter-clockwise, let's convert to clockwise
      heading = (360 - event.alpha) % 360;
      this.setAccuracyState(true, "Sensor Lock (Android Compass Active)");
    } else {
      // No sensor readings
      return;
    }

    this.heading = heading;
    this.updateCompassUI();
  },

  updateCompassUI() {
    const dial = document.getElementById('compass-dial');
    if (dial) {
      // Rotate dial counter to heading so North (N) stays pointing at the real North
      dial.style.transform = `rotate(${-this.heading}deg)`;
    }
  },

  setAccuracyState(active, message) {
    this.sensorActive = active;
    const bar = document.getElementById('qibla-accuracy-bar');
    const text = document.getElementById('qibla-accuracy-text');

    if (bar && text) {
      text.textContent = message;
      if (active) {
        bar.className = 'accuracy-badge success';
        bar.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span id="qibla-accuracy-text">${message}</span>`;
      } else {
        bar.className = 'accuracy-badge warning';
        bar.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span id="qibla-accuracy-text">${message}</span>`;
      }
    }
  }
};

// Register route
router.register('qibla', () => {
  QiblaModule.init();
});
