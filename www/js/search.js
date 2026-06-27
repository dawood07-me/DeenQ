/**
 * DeenQ - Unified Global Search Module
 * Orchestrates queries across local Hadith/Duas databases
 * and calls api.alquran.cloud search endpoints for matching Quranic verses.
 */

const SearchModule = {
  debounceTimer: null,

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const searchInput = document.getElementById('global-search-input');
    const btnClear = document.getElementById('btn-clear-global-search');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Debounce search to prevent spamming Alquran.cloud APIs
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.performGlobalSearch(query);
        }, 400);
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.clearResults();
      });
    }
  },

  clearResults() {
    const container = document.getElementById('global-search-results');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-search-minus text-muted"></i>
          <p>Enter a search query of at least 3 characters to find verses, Hadiths, and Duas.</p>
        </div>`;
    }
  },

  async performGlobalSearch(query) {
    const container = document.getElementById('global-search-results');
    if (!container) return;

    if (!query || query.length < 3) {
      this.clearResults();
      return;
    }

    // Set Loading state
    container.innerHTML = `
      <div class="empty-state text-center">
        <i class="fa-solid fa-circle-notch fa-spin text-emerald" style="font-size: 2.5rem;"></i>
        <p class="mt-2">Searching Quran, Hadith, and Duas libraries...</p>
      </div>`;

    // 1. Search local Duas
    const matchedDuas = [];
    DuasModule.database.forEach(cat => {
      cat.items.forEach(item => {
        if (
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.en.toLowerCase().includes(query.toLowerCase()) ||
          item.trans.toLowerCase().includes(query.toLowerCase()) ||
          (item.ta && item.ta.toLowerCase().includes(query.toLowerCase()))
        ) {
          matchedDuas.push({ ...item, category: cat.category });
        }
      });
    });

    // 2. Search local Hadith
    const matchedHadith = HadithModule.database.filter(h => 
      h.text.toLowerCase().includes(query.toLowerCase()) ||
      h.ar.includes(query) ||
      h.source.toLowerCase().includes(query.toLowerCase())
    );

    // 3. Search Remote Quran via translation API
    let matchedVerses = [];
    try {
      const selectedTrans = appState.settings.translation || 'en.sahih';
      const quranSearchUrl = `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/${selectedTrans}`;
      
      const res = await fetch(quranSearchUrl);
      const payload = await res.json();
      
      if (payload.code === 200 && payload.data && payload.data.matches) {
        // Limit to top 15 results to prevent excessive DOM nesting
        matchedVerses = payload.data.matches.slice(0, 15);
      }
    } catch (err) {
      console.error("Quran global search failed:", err);
    }

    this.renderSearchResults(query, matchedVerses, matchedHadith, matchedDuas);
  },

  renderSearchResults(query, verses, hadith, duas) {
    const container = document.getElementById('global-search-results');
    if (!container) return;

    const totalMatches = verses.length + hadith.length + duas.length;

    if (totalMatches === 0) {
      container.innerHTML = `
        <div class="empty-state text-center">
          <i class="fa-solid fa-face-frown text-muted"></i>
          <p>No results found for "${query}". Try synonyms or simpler keywords.</p>
        </div>`;
      return;
    }

    let html = `
      <div class="search-summary text-muted small mb-2">
        Found ${totalMatches} total results for "${query}"
      </div>`;

    // Helper to highlight matching text
    const highlightText = (text, word) => {
      if (!text) return '';
      const regex = new RegExp(`(${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    };

    // Render Quran Matches
    if (verses.length > 0) {
      html += `
        <div class="search-group">
          <h3 class="search-section-header"><i class="fa-solid fa-book-quran"></i> Quran Verses (${verses.length})</h3>
          <div class="search-results-list">
            ${verses.map(v => `
              <div class="search-result-item card hover-shadow" onclick="SearchModule.openVerseReader(${v.surah.number}, ${v.numberInSurah})">
                <div class="search-result-title">Surah ${v.surah.englishName} (${v.surah.number}:${v.numberInSurah})</div>
                <div class="search-match-text">
                  <p class="arabic-text text-right text-sm" style="font-size: 1.3rem; margin-bottom: 8px;">${v.text}</p>
                  <p style="font-style: italic;">${highlightText(v.text, query)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // Render Dua Matches
    if (duas.length > 0) {
      html += `
        <div class="search-group mt-2">
          <h3 class="search-section-header"><i class="fa-solid fa-hands-praying"></i> Supplications (${duas.length})</h3>
          <div class="search-results-list">
            ${duas.map(d => `
              <div class="search-result-item card hover-shadow" onclick="router.navigate('duas')">
                <div class="search-result-title">${highlightText(d.title, query)} <span class="badge badge-gold" style="font-size:0.6rem; vertical-align:middle; margin-left:8px;">${d.category}</span></div>
                <p class="arabic-text text-right text-xs" style="font-size: 1.1rem; margin-bottom: 4px;">${d.ar}</p>
                <p class="small text-secondary">${highlightText(d.en, query)}</p>
                <span class="text-muted small d-block mt-2" style="font-size: 0.75rem;">Source: ${d.ref}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // Render Hadith Matches
    if (hadith.length > 0) {
      html += `
        <div class="search-group mt-2">
          <h3 class="search-section-header"><i class="fa-solid fa-book-open"></i> Hadiths (${hadith.length})</h3>
          <div class="search-results-list">
            ${hadith.map(h => `
              <div class="search-result-item card hover-shadow" onclick="router.navigate('hadith')">
                <div class="search-result-title">Hadith match <span class="badge badge-emerald" style="font-size:0.6rem; vertical-align:middle; margin-left:8px;">${h.cat}</span></div>
                <p class="arabic-text text-right text-xs" style="font-size: 1.1rem; margin-bottom: 4px;">${h.ar}</p>
                <p class="small text-secondary">${highlightText(h.text, query)}</p>
                <span class="text-muted small d-block mt-2" style="font-size: 0.75rem;">Source: ${h.source}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    container.innerHTML = html;
  },

  openVerseReader(surahNum, ayahNum) {
    // Navigates directly to the Quran reader subroute at that verse
    QuranModule.openReader('surah', surahNum, ayahNum);
  }
};

// Register route
router.register('search', () => {
  SearchModule.init();
});
