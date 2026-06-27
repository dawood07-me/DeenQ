/**
 * DeenQ - Main Application Script
 * Orchestrates routing, theme management, common data models, and main page interactions.
 */

// Global state container
const appState = {
  theme: 'light', // light, dark, system
  currentView: 'home',
  userLocation: {
    lat: 19.0760, // Default to Mumbai
    lng: 72.8777,
    city: 'Mumbai, India',
    isAutoDetected: false
  },
  settings: {
    translation: 'en.sahih',
    fontSize: 24, // px
    calcMethod: 3, // Muslim World League
    madhab: 0, // Shafi'i/Standard
    alarms: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true
    }
  }
};

// Unified local storage keys
const STORAGE_KEYS = {
  SETTINGS: 'deenq_settings',
  LOCATION: 'deenq_location',
  THEME: 'deenq_theme',
  TASBEEH_HISTORY: 'deenq_tasbeeh_history',
  BOOKMARKS: 'deenq_bookmarks',
  LAST_READ: 'deenq_last_read',
  MUSHAF_LAST_PAGE: 'deenq_mushaf_last_page',
  MUSHAF_LAST_DATE: 'deenq_mushaf_last_date',
  MUSHAF_STREAK: 'deenq_mushaf_streak',
  MUSHAF_LAST_TIME: 'deenq_mushaf_last_time',
  MUSHAF_BOOKMARKS: 'deenq_mushaf_bookmarks',
  MUSHAF_LINE_Y: 'deenq_mushaf_line_y',
  MUSHAF_BOOKMARK_PAGE: 'deenq_mushaf_bookmark_page'
};

// Local Daily Content Rotation Data
const LOCAL_VERSES = [
  { ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", en: "Indeed, with hardship [will be] ease.", ref: "Surah Ash-Sharh 94:6" },
  { ar: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", en: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", ref: "Surah Al-Baqarah 2:152" },
  { ar: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", en: "And when My servants ask you, [O Muhammad], concerning Me - indeed I am near.", ref: "Surah Al-Baqarah 2:186" },
  { ar: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا", en: "Our Lord, let not our hearts deviate after You have guided us.", ref: "Surah Ali 'Imran 3:8" },
  { ar: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", en: "Indeed, Allah is with the patient.", ref: "Surah Al-Baqarah 2:153" },
  { ar: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ ۚ وَمَا تُقَدِّمُوا لِأَنْفُسِكُمْ مِنْ خَيْرٍ تَجِدُوهُ عِنْدَ اللَّهِ", en: "And establish prayer and give zakah, and whatever good you put forward for yourselves - you will find it with Allah.", ref: "Surah Al-Baqarah 2:110" },
  { ar: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", en: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.", ref: "Surah Al-Baqarah 2:255" }
];

const LOCAL_HADITHS = [
  { text: "\"The best among you are those who have the best manners and character.\"", ref: "Sahih al-Bukhari" },
  { text: "\"Cleanliness is half of faith (Iman).\"", ref: "Sahih Muslim" },
  { text: "\"The strong man is not the one who can wrestle, but the one who can control his anger when angry.\"", ref: "Sahih al-Bukhari" },
  { text: "\"A Muslim is the one from whose tongue and hands other Muslims are safe.\"", ref: "Sahih al-Bukhari" },
  { text: "\"Do not show lethargy in seeking knowledge, for learning is an obligation on every Muslim.\"", ref: "Sunan Ibn Majah" },
  { text: "\"He who does not show mercy to our young ones and respect to our old ones is not of us.\"", ref: "Sunan at-Tirmidhi" },
  { text: "\"Verify, actions are judged by intentions.\"", ref: "Sahih al-Bukhari" }
];

// Router Class
class Router {
  constructor() {
    this.routes = {};
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  register(viewId, onActivateCallback) {
    this.routes[viewId] = onActivateCallback;
  }

  navigate(viewId) {
    window.location.hash = viewId;
  }

  handleHashChange() {
    const rawHash = window.location.hash.substring(1) || 'home';
    const parts = rawHash.split('/');
    const mainView = parts[0];
    const viewElement = document.getElementById(`view-${mainView}`);
    
    if (viewElement) {
      // Toggle CSS Views
      document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
      viewElement.classList.add('active');
      
      // Update Navigation State Active Indicators
      document.querySelectorAll('.desktop-nav-menu a, .mobile-bottom-nav a').forEach(a => {
        if (a.getAttribute('data-view') === mainView) {
          a.classList.add('active');
        } else {
          a.classList.remove('active');
        }
      });
      
      // Scroll Main Window to Top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      appState.currentView = mainView;

      // Close Mobile Menu Drawer if open
      Drawer.close();

      // Automatically close Quran reader modal if not on reader subroute
      if (mainView !== 'quran' || parts[1] !== 'reader') {
        if (typeof QuranModule !== 'undefined' && typeof QuranModule.closeReaderUI === 'function') {
          QuranModule.closeReaderUI();
        }
      }

      // Exit Mushaf fullscreen mode if navigating away from quran mushaf fullscreen subroute
      if (mainView !== 'quran' || parts[0] !== 'quran' || parts[1] !== 'mushaf' || parts[2] !== 'fullscreen') {
        if (typeof QuranModule !== 'undefined' && typeof QuranModule.exitFullscreen === 'function') {
          QuranModule.exitFullscreen();
        }
      }

      // Trigger view-specific activation callback if registered
      if (this.routes[mainView]) {
        this.routes[mainView](parts.slice(1));
      }
    }
  }
}

// Drawer Controller for Mobile "More" Tab
const Drawer = {
  backdrop: null,
  panel: null,
  btnMore: null,
  btnClose: null,

  init() {
    this.backdrop = document.getElementById('drawer-backdrop');
    this.panel = document.getElementById('mobile-more-drawer');
    this.btnMore = document.getElementById('mobile-btn-more');
    this.btnClose = document.getElementById('btn-close-drawer');

    if (this.btnMore) {
      this.btnMore.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }

    // Set routing triggers on drawer items
    document.querySelectorAll('.drawer-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        router.navigate(view);
      });
    });
  },

  open() {
    this.panel.classList.add('active');
    this.backdrop.classList.add('active');
    this.btnMore.classList.add('active');
  },

  close() {
    this.panel.classList.remove('active');
    this.backdrop.classList.remove('active');
    if (this.btnMore) this.btnMore.classList.remove('active');
  }
};

// Theme Management
const ThemeManager = {
  themeToggle: null,
  mobileThemeToggle: null,

  init() {
    this.themeToggle = document.getElementById('theme-toggle');
    this.mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    // Load theme setting
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    this.setTheme(savedTheme);

    // Click handler for theme toggle
    const handleToggle = () => {
      const nextTheme = appState.theme === 'light' ? 'dark' : 'light';
      this.setTheme(nextTheme);
    };

    if (this.themeToggle) this.themeToggle.addEventListener('click', handleToggle);
    if (this.mobileThemeToggle) this.mobileThemeToggle.addEventListener('click', handleToggle);
  },

  setTheme(theme) {
    appState.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    if (theme === 'dark') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      this.updateIcons('fa-sun');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      this.updateIcons('fa-moon');
    }
  },

  updateIcons(iconClass) {
    const selector = '#theme-toggle i, #mobile-theme-toggle i';
    document.querySelectorAll(selector).forEach(i => {
      i.className = `fa-solid ${iconClass}`;
    });
  }
};

// Helper to load and save storage state
const StateManager = {
  load() {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        appState.settings = JSON.parse(savedSettings);
      }
      
      const savedLocation = localStorage.getItem(STORAGE_KEYS.LOCATION);
      if (savedLocation) {
        appState.userLocation = JSON.parse(savedLocation);
      }
    } catch (e) {
      console.error("Error reading from LocalStorage:", e);
    }
  },

  saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
  },

  saveLocation() {
    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(appState.userLocation));
  }
};

// Custom Hijri calculations (Umm al-Qura approximation for offline accuracy)
function getOfflineHijriDate(date) {
  // Simple algorithm to approximate Hijri date
  let jd = 0;
  if (date.getMonth() < 2) {
    date.setFullYear(date.getFullYear() - 1);
    date.setMonth(date.getMonth() + 12);
  }
  let a = Math.floor(date.getFullYear() / 100);
  let b = 2 - a + Math.floor(a / 4);
  jd = Math.floor(365.25 * (date.getFullYear() + 4716)) + Math.floor(30.6001 * (date.getMonth() + 2)) + date.getDate() + b - 1524.5;
  
  let epoch = 1948439.5;
  let cycle = 10631;
  let j = Math.floor(jd - epoch);
  let cyc = Math.floor(j / cycle);
  j = j - cyc * cycle;
  let y = Math.floor((j - 1) / 354.36667);
  let yj = Math.floor(y * 354.36667 + 0.5);
  j = j - yj;
  let year = cyc * 30 + y + 1;
  let month = Math.floor((j - 1) / 29.5);
  let mj = Math.floor(month * 29.5 + 0.5);
  j = j - mj;
  let day = j + 1;

  const monthNames = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"
  ];

  return {
    day: Math.round(day),
    month: monthNames[month],
    monthNum: month + 1,
    year: Math.round(year)
  };
}

// Format Gregorian date
function getFormattedGregorianDate(date) {
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Generate Greeting based on time of day
function getGreetingByHour(hour) {
  if (hour >= 4 && hour < 11) {
    return "Sabah Al-Khair (Good Morning)";
  } else if (hour >= 11 && hour < 17) {
    return "Masa'a Al-Khair (Good Afternoon)";
  } else if (hour >= 17 && hour < 21) {
    return "Masa'a Al-Khair (Good Evening)";
  } else {
    return "Assalamu Alaikum";
  }
}

// Rotates Daily Quran Verse & Hadith using Day of Year as index
function initDailyContent() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Rotate verses
  const verseIndex = dayOfYear % LOCAL_VERSES.length;
  const selectedVerse = LOCAL_VERSES[verseIndex];
  
  const vArabic = document.getElementById('daily-verse-arabic');
  const vTranslation = document.getElementById('daily-verse-translation');
  const vRef = document.getElementById('daily-verse-ref');

  if (vArabic) vArabic.textContent = selectedVerse.ar;
  if (vTranslation) vTranslation.textContent = selectedVerse.en;
  if (vRef) vRef.textContent = selectedVerse.ref;

  // Rotate Hadiths
  const hadithIndex = dayOfYear % LOCAL_HADITHS.length;
  const selectedHadith = LOCAL_HADITHS[hadithIndex];

  const hText = document.getElementById('daily-hadith-text');
  const hRef = document.getElementById('daily-hadith-ref');

  if (hText) hText.textContent = selectedHadith.text;
  if (hRef) hRef.textContent = selectedHadith.ref;

  // Share click handlers
  const btnShareVerse = document.getElementById('share-daily-verse');
  if (btnShareVerse) {
    btnShareVerse.addEventListener('click', () => {
      const textToShare = `Daily Quran Verse:\n"${selectedVerse.ar}"\n\nTranslation:\n"${selectedVerse.en}"\n(${selectedVerse.ref}) - via DeenQ App`;
      if (navigator.share) {
        navigator.share({ title: 'Quran Verse of the Day', text: textToShare });
      } else {
        navigator.clipboard.writeText(textToShare);
        alert('Verse copied to clipboard!');
      }
    });
  }

  const btnShareHadith = document.getElementById('share-daily-hadith');
  if (btnShareHadith) {
    btnShareHadith.addEventListener('click', () => {
      const textToShare = `Daily Hadith:\n${selectedHadith.text}\nSource: ${selectedHadith.ref} - via DeenQ App`;
      if (navigator.share) {
        navigator.share({ title: 'Hadith of the Day', text: textToShare });
      } else {
        navigator.clipboard.writeText(textToShare);
        alert('Hadith copied to clipboard!');
      }
    });
  }
}

// Render dates in banner
function renderDashboardHeader() {
  const now = new Date();
  
  // Greeting
  const greetingEl = document.getElementById('home-greeting');
  if (greetingEl) {
    greetingEl.textContent = getGreetingByHour(now.getHours());
  }

  // Hijri Date
  const hijriEl = document.getElementById('home-hijri-date');
  if (hijriEl) {
    const h = getOfflineHijriDate(now);
    hijriEl.textContent = `${h.day} ${h.month} ${h.year} AH`;
  }

  // Gregorian Date
  const gregEl = document.getElementById('home-gregorian-date');
  if (gregEl) {
    gregEl.textContent = getFormattedGregorianDate(now);
  }
}

// Global initialization
const router = new Router();

document.addEventListener('DOMContentLoaded', () => {
  // Load local state
  StateManager.load();

  // Initialize theme
  ThemeManager.init();

  // Initialize drawer menu
  Drawer.init();

  // Initialize Dashboard Dates & Greet
  renderDashboardHeader();

  // Initialize rotate cards
  initDailyContent();

  // Trigger initial routing
  router.handleHashChange();

  // Splash Screen Fade Out after 1.5 seconds
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      // Completely remove it from DOM after transition completes to save resources
      setTimeout(() => {
        splash.remove();

        // Check if first-time permission onboarding is needed
        const isFirstTime = localStorage.getItem('deenq_first_setup_done') !== 'true';
        if (isFirstTime) {
          const onboarding = document.getElementById('permission-onboarding-modal');
          if (onboarding) {
            onboarding.classList.remove('hide');
          }
        }
      }, 600);
    }
  }, 1500);

  // Onboarding permission grant handler
  const btnPermissions = document.getElementById('btn-grant-permissions');
  if (btnPermissions) {
    btnPermissions.addEventListener('click', async () => {
      // 1. Request Compass Sensor Access (Device Orientation)
      if (typeof QiblaModule !== 'undefined' && typeof QiblaModule.requestSensorPermission === 'function') {
        await QiblaModule.requestSensorPermission();
      }

      // 2. Request Location Access
      if (typeof PrayerModule !== 'undefined' && typeof PrayerModule.detectUserLocation === 'function') {
        PrayerModule.detectUserLocation();
      }

      // Save onboarding completion
      localStorage.setItem('deenq_first_setup_done', 'true');

      // Dismiss onboarding modal smoothly
      const onboarding = document.getElementById('permission-onboarding-modal');
      if (onboarding) {
        onboarding.classList.add('hide');
      }
    });
  }

  // Intercept native mobile back button (for Android / Capacitor apps)
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const App = window.Capacitor.Plugins.App;
    App.addListener('backButton', () => {
      const hash = window.location.hash;
      if (!hash || hash === '#home') {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }
});
