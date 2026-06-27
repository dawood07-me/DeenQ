/**
 * DeenQ - Quran Module
 * Integrates with api.alquran.cloud for reading Surahs & Juzs.
 * Supports caching, bookmarks, dynamic font resizing, translation toggles, and search.
 */

const QuranModule = {
  surahs: [], // Cached list of all Surahs
  bookmarks: [], // Array of { surahNum, surahName, ayahNum, text }
  mushafBookmarks: [], // Array of { pageNum, name, date } - Mushaf page bookmarks
  lastRead: null, // { surahNum, surahName, ayahNum }
  currentSurahData: null,
  currentTranslationData: null,
  _listenersSetUp: false, // Guard to prevent duplicate event listener stacking
  
  // PDF.js Mushaf State Variables
  pdfDoc: null,
  isPdfLoading: false,
  renderedPages: new Set(),
  observer: null,

  // Script and Translation maps
  editions: {
    indopak: 'quran-simple-enhanced',
    uthmani: 'quran-uthmani',
    en: 'en.sahih',
    ta: 'ta.tamil',
    ur: 'ur.jalandhry'
  },

  // Map of static Juz indices (Juz -> Start Surah & Verse)
  juzData: [
    { num: 1, name: "Alif Lam Mim", start: "Al-Fatihah 1:1" },
    { num: 2, name: "Sayaqul", start: "Al-Baqarah 2:142" },
    { num: 3, name: "Tilkal Rusul", start: "Al-Baqarah 2:253" },
    { num: 4, name: "Lan Tanalu", start: "Ali 'Imran 3:93" },
    { num: 5, name: "Wal Muhsanat", start: "An-Nisa 4:24" },
    { num: 6, name: "La Yuhibbullah", start: "An-Nisa 4:148" },
    { num: 7, name: "Wa Iza Sami'u", start: "Al-Ma'idah 5:82" },
    { num: 8, name: "Wa Lau Annana", start: "Al-An'am 6:111" },
    { num: 9, name: "Qal Al-Mala'u", start: "Al-A'raf 7:88" },
    { num: 10, name: "Wa'lamu", start: "Al-Anfal 8:41" },
    { num: 11, name: "Ya'taziruna", start: "At-Tawbah 9:93" },
    { num: 12, name: "Wa Ma Min Dabbah", start: "Hud 11:6" },
    { num: 13, name: "Wa Ma Ubarri'u", start: "Yusuf 12:53" },
    { num: 14, name: "Alif Lam Ra", start: "Al-Hijr 15:1" },
    { num: 15, name: "Subhana Alladhi", start: "Al-Isra 17:1" },
    { num: 16, name: "Qala Alam", start: "Al-Kahf 18:75" },
    { num: 17, name: "Aqtaraba", start: "Al-Anbiya 21:1" },
    { num: 18, name: "Qad Aflaha", start: "Al-Mu'minun 23:1" },
    { num: 19, name: "Wa Qala Alladhina", start: "Al-Furqan 25:21" },
    { num: 20, name: "Aman Khalaqa", start: "An-Naml 27:60" },
    { num: 21, name: "Utlu Ma Uhiya", start: "Al-'Ankabut 29:46" },
    { num: 22, name: "Wa Man Yaqnut", o: "Al-Ahzab 33:31", start: "Al-Ahzab 33:31" },
    { num: 23, name: "Wa Maliya", start: "Ya-Sin 36:28" },
    { num: 24, name: "Faman Azlam", start: "Az-Zumar 39:32" },
    { num: 25, name: "Ilaihi Yuraddu", start: "Fussilat 41:47" },
    { num: 26, name: "Ha Mim", start: "Al-Ahqaf 46:1" },
    { num: 27, name: "Qala Fama Khatbukum", start: "Adh-Dhariyat 51:31" },
    { num: 28, name: "Qad Sami'allah", start: "Al-Mujadilah 58:1" },
    { num: 29, name: "Tabarak Alladhi", start: "Al-Mulk 67:1" },
    { num: 30, name: "Amma Yatasa'alun", start: "An-Naba 78:1" }
  ],

  async init(args) {
    this.loadBookmarks();
    this.loadMushafBookmarks();
    this.loadLastRead();
    this.setupListeners();
    await this.loadSurahList();
    this.renderJuzList();
    this.updateMushafStats();
    this.updateContinueButton();

    // 1. Handle Reader Modal Routing
    if (args && args[0] === 'reader' && args[1] && args[2]) {
      const type = args[1];
      const id = parseInt(args[2]);
      const highlightAyahNum = args[3] ? parseInt(args[3]) : null;
      this.openReaderUI(type, id, highlightAyahNum);
    } else {
      this.closeReaderUI();
    }

    // 2. Handle Mushaf Fullscreen Routing
    if (args && args[0] === 'mushaf' && args[1] === 'fullscreen') {
      this.toggleFullscreen(true);
    } else {
      this.toggleFullscreen(false);
    }
  },

  jumpToLastRead() {
    const savedPage = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_BOOKMARK_PAGE) || 1);
    const savedLineY = parseFloat(localStorage.getItem(STORAGE_KEYS.MUSHAF_LINE_Y) || 50.0);
    this.jumpToMushafPageAndLine(savedPage, savedLineY);
  },

  toggleMushafFullscreen() {
    const container = document.getElementById('mushaf-viewer-container');
    const isCurrentlyFull = container && container.classList.contains('mushaf-fullscreen-mode');
    router.navigate(isCurrentlyFull ? 'quran' : 'quran/mushaf/fullscreen');
  },

  addMushafBookmark() {
    const container = document.getElementById('mushaf-viewer-container');
    if (!container) {
      alert('Please open the Mushaf (PDF) tab first.');
      return;
    }

    const wrappers = document.querySelectorAll('.mushaf-page-wrapper');
    if (wrappers.length === 0) {
      alert('Please wait for the Mushaf to load before bookmarking.');
      return;
    }

    // Find the page whose center is closest to the center of the visible container
    let targetPage = 1;
    const containerRect = container.getBoundingClientRect();
    const containerMidY = containerRect.top + containerRect.height / 2;
    let minDist = Infinity;
    wrappers.forEach(wrap => {
      const rect = wrap.getBoundingClientRect();
      const pageMidY = rect.top + rect.height / 2;
      const dist = Math.abs(pageMidY - containerMidY);
      if (dist < minDist) {
        minDist = dist;
        targetPage = parseInt(wrap.getAttribute('data-page-num')) || 1;
      }
    });

    const bookmarkName = prompt(
      `Save a bookmark for Page ${targetPage}\n\nEnter a name for this bookmark:`,
      `Page ${targetPage}`
    );
    if (bookmarkName === null) return; // user cancelled

    const cleanName = bookmarkName.trim() || `Page ${targetPage}`;
    this.loadMushafBookmarks();
    this.mushafBookmarks.push({
      pageNum: targetPage,
      name: cleanName,
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    });
    localStorage.setItem(STORAGE_KEYS.MUSHAF_BOOKMARKS, JSON.stringify(this.mushafBookmarks));
    alert(`\u2713 Bookmark "${cleanName}" (Page ${targetPage}) saved!\nGo to the Bookmarks tab to view it.`);
  },

  setupListeners() {
    // Prevent duplicate listener stacking for stable DOM elements
    if (this._listenersSetUp) return;
    this._listenersSetUp = true;

    // Search input filtering
    const searchInput = document.getElementById('quran-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterSurahs(e.target.value));
    }

    // Tabs toggle
    document.querySelectorAll('[data-quran-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('[data-quran-tab]').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const activeTab = e.target.getAttribute('data-quran-tab');
        document.querySelectorAll('.quran-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`quran-${activeTab}-list`).classList.add('active');
        
        if (activeTab === 'bookmarks') {
          this.renderBookmarksList();
        } else if (activeTab === 'mushaf') {
          this.initMushaf();
        }
      });
    });

    // Close reader modal click handler
    const btnCloseReader = document.getElementById('btn-back-quran-list');
    if (btnCloseReader) {
      btnCloseReader.onclick = () => {
        window.history.back();
      };
    }

    // Font size controls
    const btnFontPlus = document.getElementById('btn-reader-font-plus');
    const btnFontMinus = document.getElementById('btn-reader-font-minus');
    const fontIndicator = document.getElementById('reader-font-size-indicator');
    
    if (btnFontPlus) {
      btnFontPlus.addEventListener('click', () => {
        if (appState.settings.fontSize < 46) {
          appState.settings.fontSize += 2;
          fontIndicator.textContent = `${appState.settings.fontSize}px`;
          this.applyFontSize();
          StateManager.saveSettings();
        }
      });
    }
    if (btnFontMinus) {
      btnFontMinus.addEventListener('click', () => {
        if (appState.settings.fontSize > 16) {
          appState.settings.fontSize -= 2;
          fontIndicator.textContent = `${appState.settings.fontSize}px`;
          this.applyFontSize();
          StateManager.saveSettings();
        }
      });
    }

    // Script style selector toggle
    const btnScriptToggle = document.getElementById('btn-reader-script-toggle');
    if (btnScriptToggle) {
      btnScriptToggle.addEventListener('click', () => {
        const isIndopak = btnScriptToggle.classList.contains('active');
        if (isIndopak) {
          btnScriptToggle.classList.remove('active');
          btnScriptToggle.textContent = 'Uthmani';
        } else {
          btnScriptToggle.classList.add('active');
          btnScriptToggle.textContent = 'IndoPak';
        }
        if (this.currentSurahData) {
          // Re-load current surah with newly selected script
          this.loadSurahInReader(this.currentSurahData.number);
        }
      });
    }

    // Continue reading widget trigger
    const continueTrigger = document.getElementById('continue-reading-trigger');
    if (continueTrigger) {
      continueTrigger.addEventListener('click', () => {
        if (this.lastRead) {
          this.openReader('surah', this.lastRead.surahNum, this.lastRead.ayahNum);
        }
      });
    }

    const btnCloseContinue = document.getElementById('close-continue-reading');
    if (btnCloseContinue) {
      btnCloseContinue.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('continue-reading-container').classList.add('hide');
      });
    }


    document.addEventListener('fullscreenchange', () => {
      const container = document.getElementById('mushaf-viewer-container');
      const btn = document.getElementById('btn-mushaf-fullscreen');
      if (container && btn) {
        const isFull = !!document.fullscreenElement;
        if (isFull) {
          container.classList.add('mushaf-fullscreen-mode');
          btn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
          if (window.location.hash !== '#quran/mushaf/fullscreen') {
            router.navigate('quran/mushaf/fullscreen');
          }
        } else {
          container.classList.remove('mushaf-fullscreen-mode');
          btn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
          if (window.location.hash === '#quran/mushaf/fullscreen') {
            router.navigate('quran');
          }
        }
      }
    });
  },

  applyFontSize() {
    document.querySelectorAll('#quran-reader-content .arabic-text').forEach(el => {
      el.style.fontSize = `${appState.settings.fontSize}px`;
    });
  },

  loadBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      this.bookmarks = data ? JSON.parse(data) : [];
    } catch(e) {
      this.bookmarks = [];
    }
  },

  loadMushafBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUSHAF_BOOKMARKS);
      this.mushafBookmarks = data ? JSON.parse(data) : [];
    } catch(e) {
      this.mushafBookmarks = [];
    }
  },

  saveBookmarks() {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(this.bookmarks));
    this.renderBookmarksList();
  },

  loadLastRead() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_READ);
      this.lastRead = data ? JSON.parse(data) : null;
      this.updateContinueReadingBar();
    } catch(e) {
      this.lastRead = null;
    }
  },

  saveLastRead(surahNum, surahName, ayahNum) {
    this.lastRead = { surahNum, surahName, ayahNum };
    localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(this.lastRead));
    this.updateContinueReadingBar();
  },

  updateContinueReadingBar() {
    const bar = document.getElementById('continue-reading-container');
    const label = document.getElementById('continue-reading-text');
    if (bar && label) {
      if (this.lastRead) {
        bar.classList.remove('hide');
        label.textContent = `Surah ${this.lastRead.surahName}, Ayah ${this.lastRead.ayahNum}`;
      } else {
        bar.classList.add('hide');
      }
    }
  },

  async loadSurahList() {
    const cached = localStorage.getItem('quran_surah_list');
    if (cached) {
      this.surahs = JSON.parse(cached);
      this.renderSurahList();
      return;
    }

    try {
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      const payload = await res.json();
      if (payload.code === 200 && payload.data) {
        this.surahs = payload.data;
        localStorage.setItem('quran_surah_list', JSON.stringify(this.surahs));
        this.renderSurahList();
      }
    } catch(err) {
      console.error("Failed fetching Surah List:", err);
      document.getElementById('quran-surah-list').innerHTML = `
        <div class="empty-state text-center grid-span-full">
          <i class="fa-solid fa-triangle-exclamation text-danger"></i>
          <p>Failed loading Surah list. Please check your internet connection.</p>
        </div>`;
    }
  },

  renderSurahList() {
    const container = document.getElementById('quran-surah-list');
    if (!container) return;

    if (this.surahs.length === 0) return;

    container.innerHTML = this.surahs.map(s => `
      <div class="surah-card card" onclick="QuranModule.openReader('surah', ${s.number})">
        <div class="surah-card-left">
          <div class="surah-num-badge">${s.number}</div>
          <div>
            <div class="surah-title-en">${s.englishName}</div>
            <div class="surah-sub-en">${s.revelationType} • ${s.numberOfAyahs} Ayahs</div>
          </div>
        </div>
        <div class="surah-card-right">
          <div class="surah-title-ar">${s.name}</div>
          <div class="surah-sub-en">${s.englishNameTranslation}</div>
        </div>
      </div>
    `).join('');
  },

  renderJuzList() {
    const container = document.getElementById('quran-juz-list');
    if (!container) return;

    container.innerHTML = this.juzData.map(j => `
      <div class="juz-card card" onclick="QuranModule.openReader('juz', ${j.num})">
        <div class="surah-num-badge ml-2 mb-2" style="margin: 0 auto 12px auto;">${j.num}</div>
        <h3>Juz ${j.num}</h3>
        <span>${j.name}</span>
        <div class="text-muted small mt-2" style="font-size: 0.75rem;">Starts: ${j.start}</div>
      </div>
    `).join('');
  },

  renderBookmarksList() {
    const container = document.getElementById('quran-bookmarks-list');
    if (!container) return;

    this.loadBookmarks();
    this.loadMushafBookmarks();

    const hasVerses = this.bookmarks.length > 0;
    const hasPages = this.mushafBookmarks && this.mushafBookmarks.length > 0;

    if (!hasVerses && !hasPages) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-bookmark text-muted"></i>
          <p>No bookmarks saved yet. You can bookmark verses in the reader, or pages in the Mushaf.</p>
        </div>`;
      return;
    }

    let html = '<div class="bookmarks-sections-wrapper" style="display: flex; flex-direction: column; gap: 24px;">';

    // 1. Verses Section
    html += `
      <div class="bookmark-section">
        <h3 class="section-title-small mb-3"><i class="fa-solid fa-book-open-reader text-emerald" style="margin-right: 8px;"></i>Saved Verses (${this.bookmarks.length})</h3>
        ${!hasVerses ? `
          <div class="empty-state-mini card p-4 text-center" style="padding: 24px; text-align: center;">
            <p class="text-muted small">No verses bookmarked yet. Tap the bookmark icon next to any verse in the reader.</p>
          </div>
        ` : `
          <div class="bookmarks-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${this.bookmarks.map((b, idx) => `
              <div class="card hover-shadow" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 16px;">
                <div>
                  <div class="d-flex justify-between align-center mb-2" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="color: var(--primary-color); margin: 0;">Surah ${b.surahName} (${b.surahNum}:${b.ayahNum})</h4>
                    <button class="btn-icon-small text-danger" onclick="QuranModule.removeBookmark(${idx}); event.stopPropagation();" title="Remove Bookmark">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <p class="arabic-text text-right text-sm" style="font-size: 1.3rem; line-height: 1.5; margin-bottom: 8px; direction: rtl; text-align: right;">${b.arabicText}</p>
                  <p class="small italic text-secondary" style="font-size: 0.85rem; margin-bottom: 12px;">${b.translationText}</p>
                </div>
                <button class="btn btn-outline btn-gold btn-small" style="width: 100%;" onclick="QuranModule.openReader('surah', ${b.surahNum}, ${b.ayahNum})">
                  <i class="fa-solid fa-book-open"></i> Go to Verse
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>`;

    // 2. Mushaf Pages Section
    html += `
      <div class="bookmark-section">
        <h3 class="section-title-small mb-3"><i class="fa-solid fa-book-quran text-gold" style="margin-right: 8px;"></i>Saved Mushaf Pages (${this.mushafBookmarks.length})</h3>
        ${!hasPages ? `
          <div class="empty-state-mini card p-4 text-center" style="padding: 24px; text-align: center;">
            <p class="text-muted small">No pages bookmarked yet. Click "Bookmark Page" while reading the Mushaf PDF.</p>
          </div>
        ` : `
          <div class="bookmarks-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${this.mushafBookmarks.map((b, idx) => `
              <div class="card hover-shadow" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 16px;">
                <div>
                  <div class="d-flex justify-between align-center mb-2" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="color: var(--primary-color); margin: 0;">${b.name}</h4>
                    <button class="btn-icon-small text-danger" onclick="QuranModule.removeMushafBookmark(${idx}); event.stopPropagation();" title="Remove Bookmark">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <div class="d-flex justify-between align-center mt-1" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="badge badge-gold">Page ${b.pageNum}</span>
                    <span class="text-muted small" style="font-size: 0.72rem;">Saved: ${b.date}</span>
                  </div>
                </div>
                <button class="btn btn-outline btn-emerald btn-small" style="width: 100%;" onclick="QuranModule.goToMushafPageBookmark(${b.pageNum})">
                  <i class="fa-solid fa-book-open"></i> Open Page ${b.pageNum}
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>`;

    html += '</div>';
    container.innerHTML = html;
  },

  removeBookmark(idx) {
    this.bookmarks.splice(idx, 1);
    this.saveBookmarks();
  },

  removeMushafBookmark(idx) {
    this.mushafBookmarks.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.MUSHAF_BOOKMARKS, JSON.stringify(this.mushafBookmarks));
    this.renderBookmarksList();
  },

  goToMushafPageBookmark(pageNum) {
    // 1. Switch tab to Mushaf
    document.querySelectorAll('[data-quran-tab]').forEach(t => {
      if (t.getAttribute('data-quran-tab') === 'mushaf') {
        t.click();
      }
    });
    // 2. Jump to page
    setTimeout(() => {
      this.jumpToMushafPage(pageNum);
    }, 100);
  },

  filterSurahs(query) {
    const container = document.getElementById('quran-surah-list');
    if (!container) return;

    const filtered = this.surahs.filter(s => 
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      s.englishNameTranslation.toLowerCase().includes(query.toLowerCase()) ||
      s.number.toString() === query
    );

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state text-center grid-span-full">
          <i class="fa-solid fa-search-minus text-muted"></i>
          <p>No Surahs matched "${query}".</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(s => `
      <div class="surah-card card" onclick="QuranModule.openReader('surah', ${s.number})">
        <div class="surah-card-left">
          <div class="surah-num-badge">${s.number}</div>
          <div>
            <div class="surah-title-en">${s.englishName}</div>
            <div class="surah-sub-en">${s.revelationType} • ${s.numberOfAyahs} Ayahs</div>
          </div>
        </div>
        <div class="surah-card-right">
          <div class="surah-title-ar">${s.name}</div>
          <div class="surah-sub-en">${s.englishNameTranslation}</div>
        </div>
      </div>
    `).join('');
  },

  openReader(type, id, highlightAyahNum = null) {
    if (highlightAyahNum) {
      router.navigate(`quran/reader/${type}/${id}/${highlightAyahNum}`);
    } else {
      router.navigate(`quran/reader/${type}/${id}`);
    }
  },

  async openReaderUI(type, id, highlightAyahNum = null) {
    const modal = document.getElementById('quran-reader-modal');
    if (!modal) return;

    const isAlreadyOpen = modal.classList.contains('active') && modal.getAttribute('data-view-id') === `${type}-${id}`;
    if (isAlreadyOpen) {
      if (highlightAyahNum) {
        const highlightEl = document.getElementById(`ayah-${id}-${highlightAyahNum}`);
        if (highlightEl) {
          highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightEl.classList.add('highlighted-flash');
          setTimeout(() => highlightEl.classList.remove('highlighted-flash'), 2500);
        }
      }
      return;
    }

    modal.classList.add('active');
    modal.setAttribute('data-view-id', `${type}-${id}`);

    // Set Loading state
    const scroller = document.getElementById('quran-reader-content');
    scroller.innerHTML = `
      <div class="empty-state text-center">
        <i class="fa-solid fa-circle-notch fa-spin text-emerald" style="font-size: 2.5rem;"></i>
        <p class="mt-2">Loading Holy Script chapters. Please wait...</p>
      </div>`;

    document.getElementById('reader-font-size-indicator').textContent = `${appState.settings.fontSize}px`;

    if (type === 'surah') {
      await this.loadSurahInReader(id, highlightAyahNum);
    } else if (type === 'juz') {
      await this.loadJuzInReader(id);
    }
  },

  closeReaderUI() {
    const modal = document.getElementById('quran-reader-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.removeAttribute('data-view-id');
    }
  },

  async loadSurahInReader(surahNum, highlightAyahNum = null) {
    const scriptBtn = document.getElementById('btn-reader-script-toggle');
    const selectedScriptEdition = scriptBtn.classList.contains('active') 
      ? this.editions.indopak 
      : this.editions.uthmani;

    const selectedTrans = appState.settings.translation || 'en.sahih';

    // Caching keys
    const cacheKeyArabic = `surah_${surahNum}_${selectedScriptEdition}`;
    const cacheKeyTrans = `surah_${surahNum}_${selectedTrans}`;

    let arabicPayload = localStorage.getItem(cacheKeyArabic);
    let transPayload = localStorage.getItem(cacheKeyTrans);

    try {
      if (!arabicPayload) {
        const arRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/${selectedScriptEdition}`);
        const arData = await arRes.json();
        if (arData.code === 200) {
          arabicPayload = JSON.stringify(arData.data);
          localStorage.setItem(cacheKeyArabic, arabicPayload);
        }
      }

      if (!transPayload) {
        const trRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/${selectedTrans}`);
        const trData = await trRes.json();
        if (trData.code === 200) {
          transPayload = JSON.stringify(trData.data);
          localStorage.setItem(cacheKeyTrans, transPayload);
        }
      }

      this.currentSurahData = JSON.parse(arabicPayload);
      this.currentTranslationData = JSON.parse(transPayload);

      this.renderQuranReader(highlightAyahNum);
      
      // Update reading progress
      this.saveLastRead(surahNum, this.currentSurahData.englishName, highlightAyahNum || 1);

    } catch (err) {
      console.error("Failed loading Surah:", err);
      document.getElementById('quran-reader-content').innerHTML = `
        <div class="empty-state text-center">
          <i class="fa-solid fa-triangle-exclamation text-danger"></i>
          <p>Failed loading Surah content. Please check your internet connection.</p>
        </div>`;
    }
  },

  async loadJuzInReader(juzNum) {
    const scriptBtn = document.getElementById('btn-reader-script-toggle');
    const selectedScriptEdition = scriptBtn.classList.contains('active') 
      ? this.editions.indopak 
      : this.editions.uthmani;

    const selectedTrans = appState.settings.translation || 'en.sahih';

    const cacheKeyArabic = `juz_${juzNum}_${selectedScriptEdition}`;
    const cacheKeyTrans = `juz_${juzNum}_${selectedTrans}`;

    let arabicPayload = localStorage.getItem(cacheKeyArabic);
    let transPayload = localStorage.getItem(cacheKeyTrans);

    try {
      if (!arabicPayload) {
        const arRes = await fetch(`https://api.alquran.cloud/v1/juz/${juzNum}/${selectedScriptEdition}`);
        const arData = await arRes.json();
        if (arData.code === 200) {
          arabicPayload = JSON.stringify(arData.data);
          localStorage.setItem(cacheKeyArabic, arabicPayload);
        }
      }

      if (!transPayload) {
        const trRes = await fetch(`https://api.alquran.cloud/v1/juz/${juzNum}/${selectedTrans}`);
        const trData = await trRes.json();
        if (trData.code === 200) {
          transPayload = JSON.stringify(trData.data);
          localStorage.setItem(cacheKeyTrans, transPayload);
        }
      }

      this.currentSurahData = JSON.parse(arabicPayload);
      this.currentTranslationData = JSON.parse(transPayload);

      this.renderJuzReader();

    } catch(err) {
      console.error("Failed loading Juz:", err);
      document.getElementById('quran-reader-content').innerHTML = `
        <div class="empty-state text-center">
          <i class="fa-solid fa-triangle-exclamation text-danger"></i>
          <p>Failed loading Juz content. Please check your internet connection.</p>
        </div>`;
    }
  },

  renderQuranReader(highlightAyahNum = null) {
    const titleEl = document.getElementById('reader-surah-title');
    const subEl = document.getElementById('reader-surah-subtitle');
    const scroller = document.getElementById('quran-reader-content');

    if (!this.currentSurahData || !this.currentTranslationData) return;

    const s = this.currentSurahData;
    titleEl.textContent = s.englishName;
    subEl.textContent = `${s.revelationType} • ${s.numberOfAyahs} Verses`;

    let html = '';

    // Render Bismillah (if not Surah 9 - Tawbah, and not Surah 1 - Fatiha where it is built-in)
    if (s.number !== 9 && s.number !== 1) {
      html += `
        <div class="bismillah-container">
          <p class="arabic-text text-center" style="font-size: 2.2rem; line-height: 1.8;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <span class="text-muted small">In the name of Allah, the Entirely Merciful, the Especially Merciful.</span>
        </div>`;
    }

    // Map verses
    s.ayahs.forEach((ayah, index) => {
      const transAyah = this.currentTranslationData.ayahs[index];
      let cleanText = ayah.text;
      
      // Remove Bismillah from beginning of first Ayah if API returned it (e.g. for Simple script)
      if (s.number !== 9 && s.number !== 1 && index === 0) {
        cleanText = cleanText.replace(/^(بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِِ|بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ)/, '').trim();
      }

      const ayahId = `ayah-${s.number}-${ayah.numberInSurah}`;
      const isBookmarked = this.isAyahBookmarked(s.number, ayah.numberInSurah);
      const isHighlighted = highlightAyahNum && Number(highlightAyahNum) === ayah.numberInSurah;

      html += `
        <div class="ayah-block ${isHighlighted ? 'highlight-border' : ''}" id="${ayahId}" style="${isHighlighted ? 'background: rgba(217, 119, 6, 0.04);' : ''}">
          <div class="ayah-arabic-row text-right">
            <span class="arabic-text" style="font-size: ${appState.settings.fontSize}px;">${cleanText}</span>
            <span class="ayah-number-marker" style="margin-left: 12px; margin-right: 0;">${ayah.numberInSurah}</span>
          </div>
          <div class="ayah-translations">
            <div class="ayah-translation-item">
              <span class="translation-lang-tag">${appState.settings.translation === 'ta.tamil' ? 'Tamil' : appState.settings.translation === 'ur.jalandhry' ? 'Urdu' : 'English'}</span>
              <span>${transAyah.text}</span>
            </div>
          </div>
          <div class="ayah-actions-row">
            <button class="btn-icon-small" title="Bookmark" onclick="QuranModule.toggleBookmark(${s.number}, '${s.englishName}', ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </button>
            <button class="btn-icon-small" title="Copy Verse" onclick="QuranModule.copyAyah(${s.number}, ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button class="btn-icon-small" title="Share Verse" onclick="QuranModule.shareAyah(${s.number}, '${s.englishName}', ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
          </div>
        </div>`;
    });

    scroller.innerHTML = html;

    // Apply font size adjustment
    this.applyFontSize();

    // Scroll to highlighted verse if requested
    if (highlightAyahNum) {
      setTimeout(() => {
        const highlightEl = document.getElementById(`ayah-${s.number}-${highlightAyahNum}`);
        if (highlightEl) {
          highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  },

  renderJuzReader() {
    const titleEl = document.getElementById('reader-surah-title');
    const subEl = document.getElementById('reader-surah-subtitle');
    const scroller = document.getElementById('quran-reader-content');

    if (!this.currentSurahData || !this.currentTranslationData) return;

    const j = this.currentSurahData;
    titleEl.textContent = `Juz ${j.number}`;
    subEl.textContent = `${j.ayahs.length} Verses`;

    let html = '';

    j.ayahs.forEach((ayah, index) => {
      const transAyah = this.currentTranslationData.ayahs[index];
      const ayahId = `ayah-juz-${j.number}-${index}`;
      const isBookmarked = this.isAyahBookmarked(ayah.surah.number, ayah.numberInSurah);

      // Print a small badge when a new Surah starts inside this Juz
      const showSurahHeader = index === 0 || (ayah.surah.number !== j.ayahs[index-1].surah.number);
      if (showSurahHeader) {
        html += `
          <div class="bismillah-container" style="margin-top: 24px; padding-bottom: 12px;">
            <h3 style="color: var(--primary-color); font-family: var(--font-heading);">${ayah.surah.englishName}</h3>
            <span class="text-muted small">${ayah.surah.englishNameTranslation} • Revelation: ${ayah.surah.revelationType}</span>
          </div>`;
      }

      html += `
        <div class="ayah-block" id="${ayahId}">
          <div class="ayah-arabic-row text-right">
            <span class="arabic-text" style="font-size: ${appState.settings.fontSize}px;">${ayah.text}</span>
            <span class="ayah-number-marker" style="margin-left: 12px; margin-right: 0;">${ayah.numberInSurah}</span>
          </div>
          <div class="ayah-translations">
            <div class="ayah-translation-item">
              <span class="translation-lang-tag">${ayah.surah.englishName} (${ayah.surah.number}:${ayah.numberInSurah})</span>
              <span>${transAyah.text}</span>
            </div>
          </div>
          <div class="ayah-actions-row">
            <button class="btn-icon-small" title="Bookmark" onclick="QuranModule.toggleBookmark(${ayah.surah.number}, '${ayah.surah.englishName}', ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </button>
            <button class="btn-icon-small" title="Copy Verse" onclick="QuranModule.copyAyah(${ayah.surah.number}, ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button class="btn-icon-small" title="Share Verse" onclick="QuranModule.shareAyah(${ayah.surah.number}, '${ayah.surah.englishName}', ${ayah.numberInSurah}, \`${ayah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`, \`${transAyah.text.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">
              <i class="fa-solid fa-share-nodes"></i>
            </button>
          </div>
        </div>`;
    });

    scroller.innerHTML = html;
    this.applyFontSize();
  },

  isAyahBookmarked(surahNum, ayahNum) {
    return this.bookmarks.some(b => b.surahNum === Number(surahNum) && b.ayahNum === Number(ayahNum));
  },

  toggleBookmark(surahNum, surahName, ayahNum, arabicText, translationText) {
    const idx = this.bookmarks.findIndex(b => b.surahNum === Number(surahNum) && b.ayahNum === Number(ayahNum));
    
    // Toggle active state in DOM if currently open in reader
    const matchingBtn = event.currentTarget;
    const icon = matchingBtn.querySelector('i');

    if (idx > -1) {
      // Remove
      this.bookmarks.splice(idx, 1);
      if (icon) {
        icon.className = 'fa-regular fa-bookmark';
      }
    } else {
      // Add
      this.bookmarks.push({
        surahNum: Number(surahNum),
        surahName,
        ayahNum: Number(ayahNum),
        arabicText,
        translationText
      });
      if (icon) {
        icon.className = 'fa-solid fa-bookmark';
      }
    }
    this.saveBookmarks();
  },

  copyAyah(surahNum, ayahNum, arabic, translation) {
    const textToCopy = `"${arabic}"\n[Surah ${surahNum}, Ayah ${ayahNum}]\n\nTranslation:\n"${translation}"`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('Verse copied to clipboard!'))
      .catch(err => console.error('Failed copying text:', err));
  },

  shareAyah(surahNum, surahName, ayahNum, arabic, translation) {
    const textToShare = `Quran [${surahName} ${surahNum}:${ayahNum}]:\n"${arabic}"\n\nTranslation:\n"${translation}"\n- Shared via DeenQ`;
    if (navigator.share) {
      navigator.share({
        title: `Quran ${surahName} ${surahNum}:${ayahNum}`,
        text: textToShare
      }).catch(err => console.log('Share error:', err));
    } else {
      this.copyAyah(surahNum, ayahNum, arabic, translation);
    }
  },

  // --- Mushaf PDF Reading Methods ---
  async initMushaf() {
    if (this.pdfDoc) {
      this.updateMushafStats();
      return;
    }
    
    if (this.isPdfLoading) return;
    this.isPdfLoading = true;

    this.updateMushafStats();

    const scroller = document.getElementById('mushaf-pages-scroller');
    if (!scroller) return;

    scroller.innerHTML = `
      <div class="empty-state text-center" id="mushaf-loading-spinner" style="padding: 40px 0;">
        <i class="fa-solid fa-circle-notch fa-spin text-emerald" style="font-size: 2.5rem;"></i>
        <p class="mt-2">Loading Quran Mushaf PDF (33MB)...</p>
      </div>`;

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

      this.pdfDoc = await pdfjsLib.getDocument('assets/quran.pdf').promise;
      
      const spinner = document.getElementById('mushaf-loading-spinner');
      if (spinner) spinner.remove();

      const totalPages = this.pdfDoc.numPages;
      let html = '';
      for (let i = 1; i <= totalPages; i++) {
        html += `
          <div class="mushaf-page-wrapper" id="mushaf-page-wrap-${i}" data-page-num="${i}">
            <div class="mushaf-page-placeholder" id="mushaf-placeholder-${i}">
              <i class="fa-solid fa-book-open"></i>
              <span>Page ${i}</span>
            </div>
            <canvas class="mushaf-page-canvas hide" id="mushaf-canvas-${i}"></canvas>
            <div class="mushaf-page-label">Page ${i}</div>
          </div>`;
      }
      scroller.innerHTML = html;

      this.setupLazyLoading();
      this.setupPageClickListeners();
      this.updateContinueButton();
      this.updateStreak();
      this.initPinchToZoom();

    } catch (err) {
      console.error("Failed loading PDF:", err);
      scroller.innerHTML = `
        <div class="empty-state text-center">
          <i class="fa-solid fa-triangle-exclamation text-danger"></i>
          <p>Failed loading Mushaf. Make sure assets/quran.pdf exists.</p>
        </div>`;
      this.isPdfLoading = false;
    }
  },

  setupLazyLoading() {
    const container = document.getElementById('mushaf-viewer-container');
    if (!container) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.getAttribute('data-page-num'));
        if (entry.isIntersecting) {
          this.renderPage(pageNum);
          this.saveLastReadPage(pageNum);
        } else {
          this.unrenderPage(pageNum);
        }
      });
    }, {
      root: container,
      rootMargin: '400px 0px', // Fetch pages early
      threshold: 0.05
    });

    document.querySelectorAll('.mushaf-page-wrapper').forEach(wrap => {
      this.observer.observe(wrap);
    });
  },

  async renderPage(pageNum) {
    if (this.renderedPages.has(pageNum)) return;
    this.renderedPages.add(pageNum);

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const canvas = document.getElementById(`mushaf-canvas-${pageNum}`);
      const placeholder = document.getElementById(`mushaf-placeholder-${pageNum}`);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      placeholder.classList.add('hide');
      canvas.classList.remove('hide');

      // Only draw the bookmark line if this rendered page is the explicitly saved bookmark page
      const savedBookmarkPage = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_BOOKMARK_PAGE));
      const savedLineY = parseFloat(localStorage.getItem(STORAGE_KEYS.MUSHAF_LINE_Y));
      if (pageNum === savedBookmarkPage && !isNaN(savedLineY)) {
        this.drawBookmarkLine(pageNum, savedLineY);
      }

    } catch (e) {
      console.error(`Error rendering page ${pageNum}:`, e);
      this.renderedPages.delete(pageNum);
    }
  },

  unrenderPage(pageNum) {
    if (!this.renderedPages.has(pageNum)) return;
    this.renderedPages.delete(pageNum);

    const canvas = document.getElementById(`mushaf-canvas-${pageNum}`);
    const placeholder = document.getElementById(`mushaf-placeholder-${pageNum}`);
    if (canvas && placeholder) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      canvas.classList.add('hide');
      placeholder.classList.remove('hide');

      const line = document.getElementById(`mushaf-line-indicator-${pageNum}`);
      if (line) line.remove();
    }
  },

  setupPageClickListeners() {
    document.querySelectorAll('.mushaf-page-wrapper').forEach(wrap => {
      let pressTimer = null;
      let startX = 0;
      let startY = 0;
      let isMoving = false;

      const startPress = (clientX, clientY) => {
        isMoving = false;
        startX = clientX;
        startY = clientY;

        // Clear any existing timer
        if (pressTimer) clearTimeout(pressTimer);

        pressTimer = setTimeout(() => {
          if (!isMoving) {
            const rect = wrap.getBoundingClientRect();
            const clickY = clientY - rect.top;
            const percentY = (clickY / rect.height) * 100;
            const pageNum = parseInt(wrap.getAttribute('data-page-num'));

            this.saveLastReadLine(pageNum, percentY);

            // Audio/Haptic feedback (Vibrate 50ms)
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }
        }, 600); // 600ms hold for long-press
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      const movePress = (clientX, clientY) => {
        // Cancel long press if they drag more than 8px (avoids trigger during scroll)
        if (Math.abs(clientX - startX) > 8 || Math.abs(clientY - startY) > 8) {
          isMoving = true;
          cancelPress();
        }
      };

      // Mouse events
      wrap.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        startPress(e.clientX, e.clientY);
      });
      wrap.addEventListener('mousemove', (e) => {
        movePress(e.clientX, e.clientY);
      });
      wrap.addEventListener('mouseup', cancelPress);
      wrap.addEventListener('mouseleave', cancelPress);

      // Touch events (mobile)
      wrap.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startPress(touch.clientX, touch.clientY);
      }, { passive: true });
      wrap.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        movePress(touch.clientX, touch.clientY);
      }, { passive: true });
      wrap.addEventListener('touchend', cancelPress, { passive: true });
      wrap.addEventListener('touchcancel', cancelPress, { passive: true });

      // Prevent regular quick clicks from triggering anything
      wrap.addEventListener('click', (e) => {
        e.preventDefault();
      });
    });
  },

  saveLastReadLine(pageNum, percentY) {
    // Explicit long-press sets the bookmark page and line y coordinates
    localStorage.setItem(STORAGE_KEYS.MUSHAF_BOOKMARK_PAGE, pageNum);
    localStorage.setItem(STORAGE_KEYS.MUSHAF_LINE_Y, percentY.toFixed(2));
    
    // Also sync the currently viewing page key to match
    localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_PAGE, pageNum);
    
    const now = new Date();
    localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_TIME, now.toISOString());

    this.updateMushafStats();
    this.updateContinueButton();
    this.drawBookmarkLine(pageNum, percentY);
  },

  drawBookmarkLine(pageNum, percentY) {
    // Remove existing lines on all pages
    document.querySelectorAll('.mushaf-bookmark-line').forEach(line => line.remove());

    const wrap = document.getElementById(`mushaf-page-wrap-${pageNum}`);
    if (wrap) {
      const line = document.createElement('div');
      line.id = `mushaf-line-indicator-${pageNum}`;
      line.className = 'mushaf-bookmark-line';
      line.style.top = `${percentY}%`;
      wrap.appendChild(line);
    }
  },

  saveLastReadPage(pageNum) {
    // Scrolling auto-tracks the active viewing page without moving the bookmark line
    const saved = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_LAST_PAGE) || 1);
    if (pageNum !== saved) {
      localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_PAGE, pageNum);
      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_TIME, now.toISOString());
      this.updateMushafStats();
    }
  },

  updateMushafStats() {
    const streakEl = document.getElementById('mushaf-streak');
    const timeEl = document.getElementById('mushaf-last-time');
    const pageEl = document.getElementById('mushaf-last-page');

    const streak = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_STREAK) || 0);
    const lastTime = localStorage.getItem(STORAGE_KEYS.MUSHAF_LAST_TIME);
    const lastPage = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_LAST_PAGE) || 1);

    if (streakEl) streakEl.textContent = `${streak} Days`;
    if (pageEl) pageEl.textContent = `Page ${lastPage}`;
    
    if (timeEl) {
      if (lastTime) {
        timeEl.textContent = this.formatTimeAgo(new Date(lastTime));
      } else {
        timeEl.textContent = 'Never';
      }
    }
  },

  updateContinueButton() {
    const btn = document.getElementById('btn-mushaf-last-read');
    const label = document.getElementById('mushaf-last-read-page-num');
    const bookmarkPage = localStorage.getItem(STORAGE_KEYS.MUSHAF_BOOKMARK_PAGE);

    if (btn && label) {
      if (bookmarkPage) {
        btn.classList.remove('hide');
        label.textContent = bookmarkPage;
      } else {
        btn.classList.add('hide');
      }
    }
  },

  jumpToMushafPage(pageNum) {
    if (pageNum < 1 || pageNum > 611) {
      alert("Please enter a valid page number between 1 and 611.");
      return;
    }

    const wrap = document.getElementById(`mushaf-page-wrap-${pageNum}`);
    const container = document.getElementById('mushaf-viewer-container');
    if (wrap && container) {
      const offsetTop = wrap.offsetTop - container.offsetTop - 16;
      container.scrollTo({ top: offsetTop, behavior: 'smooth' });
      this.saveLastReadPage(pageNum);
    }
  },

  jumpToMushafPageAndLine(pageNum, percentY) {
    if (pageNum < 1 || pageNum > 611) {
      alert("Please enter a valid page number between 1 and 611.");
      return;
    }

    const wrap = document.getElementById(`mushaf-page-wrap-${pageNum}`);
    const container = document.getElementById('mushaf-viewer-container');
    if (wrap && container) {
      const pageHeight = wrap.offsetHeight || wrap.clientHeight || 820;
      const lineOffset = (percentY / 100) * pageHeight;
      const offsetTop = (wrap.offsetTop - container.offsetTop) + lineOffset - (container.clientHeight / 2);
      
      container.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
      this.saveLastReadPage(pageNum);

      // Force draw line bookmark at exact position
      this.drawBookmarkLine(pageNum, percentY);
    }
  },

  updateStreak() {
    const today = new Date();
    const todayStr = this.formatDateISO(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDateISO(yesterday);

    const lastDateRead = localStorage.getItem(STORAGE_KEYS.MUSHAF_LAST_DATE);
    let streak = parseInt(localStorage.getItem(STORAGE_KEYS.MUSHAF_STREAK) || 0);

    if (!lastDateRead) {
      streak = 1;
      localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_DATE, todayStr);
    } else if (lastDateRead === yesterdayStr) {
      streak += 1;
      localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_DATE, todayStr);
    } else if (lastDateRead !== todayStr) {
      streak = 1;
      localStorage.setItem(STORAGE_KEYS.MUSHAF_LAST_DATE, todayStr);
    }
    
    localStorage.setItem(STORAGE_KEYS.MUSHAF_STREAK, streak);
    this.updateMushafStats();
  },

  formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  },

  toggleFullscreen(forceState) {
    const container = document.getElementById('mushaf-viewer-container');
    const btn = document.getElementById('btn-mushaf-fullscreen');
    if (!container || !btn) return;

    const currentlyFull = container.classList.contains('mushaf-fullscreen-mode');
    const shouldBeFull = forceState !== undefined ? forceState : !currentlyFull;

    if (shouldBeFull === currentlyFull) return;

    if (shouldBeFull) {
      container.classList.add('mushaf-fullscreen-mode');
      btn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit';
      if (container.requestFullscreen && !document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      }
    } else {
      container.classList.remove('mushaf-fullscreen-mode');
      btn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  },

  exitFullscreen() {
    this.toggleFullscreen(false);
  },

  initPinchToZoom() {
    const scroller = document.getElementById('mushaf-pages-scroller');
    if (!scroller) return;

    let initialDist = 0;
    let currentScale = 1.0;
    let baseScale = 1.0;
    let isPinching = false;

    // Use passive: false to allow e.preventDefault() to block standard browser layout zooming
    scroller.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        baseScale = parseFloat(scroller.style.getPropertyValue('--mushaf-scale') || 1.0);
        e.preventDefault();
      }
    }, { passive: false });

    scroller.addEventListener('touchmove', (e) => {
      if (isPinching && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        const factor = dist / initialDist;
        let newScale = baseScale * factor;
        
        // Pinch scale bounded between 1.0x and 2.5x
        newScale = Math.max(1.0, Math.min(2.5, newScale));
        
        currentScale = newScale;
        scroller.style.setProperty('--mushaf-scale', currentScale);
        e.preventDefault();
      }
    }, { passive: false });

    scroller.addEventListener('touchend', (e) => {
      if (isPinching && e.touches.length < 2) {
        isPinching = false;
        baseScale = currentScale;
      }
    }, { passive: true });
  }
};

// Register Quran module initialization
router.register('quran', (args) => {
  QuranModule.init(args);
});
