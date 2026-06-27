/**
 * DeenQ - Settings Module
 * Binds UI inputs to global appState preferences and manages caching flush.
 */

const SettingsModule = {
  init() {
    this.syncUIWithState();
    this.setupListeners();
  },

  syncUIWithState() {
    // Theme
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) themeSelect.value = appState.theme;

    // Font size
    const slider = document.getElementById('settings-font-slider');
    const readout = document.getElementById('settings-font-readout');
    if (slider) slider.value = appState.settings.fontSize;
    if (readout) readout.textContent = `${appState.settings.fontSize}px`;

    // Calc method
    const calcMethodSelect = document.getElementById('settings-calc-method');
    if (calcMethodSelect) calcMethodSelect.value = appState.settings.calcMethod;

    // Madhab
    const madhabSelect = document.getElementById('settings-madhab');
    if (madhabSelect) madhabSelect.value = appState.settings.madhab;

    // Translation
    const transSelect = document.getElementById('settings-translation-select');
    if (transSelect) transSelect.value = appState.settings.translation;

    // Alarm toggles
    const list = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    list.forEach(name => {
      const toggle = document.getElementById(`alarm-${name}`);
      if (toggle) toggle.checked = appState.settings.alarms[name];
    });
  },

  setupListeners() {
    // Theme Select
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        ThemeManager.setTheme(e.target.value);
      });
    }

    // Font Size Slider
    const slider = document.getElementById('settings-font-slider');
    const readout = document.getElementById('settings-font-readout');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (readout) readout.textContent = `${val}px`;
        appState.settings.fontSize = val;
        
        // Sync indicator in reader header just in case
        const readerInd = document.getElementById('reader-font-size-indicator');
        if (readerInd) readerInd.textContent = `${val}px`;

        StateManager.saveSettings();
      });
    }

    // Calculation Method
    const calcMethodSelect = document.getElementById('settings-calc-method');
    if (calcMethodSelect) {
      calcMethodSelect.addEventListener('change', async (e) => {
        appState.settings.calcMethod = parseInt(e.target.value);
        StateManager.saveSettings();
        
        // Refetch prayer timings
        await PrayerModule.fetchPrayerTimes();
        PrayerModule.startCountdownTimer();
      });
    }

    // Madhab
    const madhabSelect = document.getElementById('settings-madhab');
    if (madhabSelect) {
      madhabSelect.addEventListener('change', async (e) => {
        appState.settings.madhab = parseInt(e.target.value);
        StateManager.saveSettings();
        
        // Refetch prayer timings
        await PrayerModule.fetchPrayerTimes();
        PrayerModule.startCountdownTimer();
      });
    }

    // Translation Select
    const transSelect = document.getElementById('settings-translation-select');
    if (transSelect) {
      transSelect.addEventListener('change', (e) => {
        appState.settings.translation = e.target.value;
        StateManager.saveSettings();
        
        // Clear cached translations in QuranModule if needed,
        // so reader fetches newly selected translation on next load
        QuranModule.currentTranslationData = null;
      });
    }

    // Alarms
    const list = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    list.forEach(name => {
      const toggle = document.getElementById(`alarm-${name}`);
      if (toggle) {
        toggle.addEventListener('change', (e) => {
          appState.settings.alarms[name] = e.target.checked;
          StateManager.saveSettings();
        });
      }
    });
  }
};

// Register route
router.register('settings', () => {
  SettingsModule.init();
});
