/**
 * DeenQ - Hadith Module
 * Hosts offline database of authentic traditions, handles category tab switching,
 * text search matching, and bookmark triggers.
 */

const HadithModule = {
  // Local Database of authentic Hadiths across specified categories
  database: [
    {
      id: 1,
      cat: "faith",
      source: "Sahih al-Bukhari",
      text: "The Prophet (ﷺ) said: 'Faith has over seventy branches, and modesty is a branch of faith.'",
      ar: "الإِيمَانُ بِضْعٌ وَسَبْعُونَ شُعْبَةً، وَالْحَيَاءُ شُعْبَةٌ مِنَ الإِيمَانِ"
    },
    {
      id: 2,
      cat: "faith",
      source: "Sahih al-Bukhari",
      text: "The Prophet (ﷺ) said: 'None of you will have faith until he wishes for his brother what he likes for himself.'",
      ar: "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ"
    },
    {
      id: 3,
      cat: "prayer",
      source: "Sahih Muslim",
      text: "The Messenger of Allah (ﷺ) said: 'The nearest a servant comes to his Lord is when he is prostrating (in Sujud), so make many supplications (in this state).'",
      ar: "أَقْرَبُ مَا يَكُونُ الْعَبْدُ مِنْ رَبِّهِ وَهُوَ سَاجِدٌ فَأَكْثِرُوا الدُّعَاءَ"
    },
    {
      id: 4,
      cat: "prayer",
      source: "Sahih al-Bukhari",
      text: "The Prophet (ﷺ) said: 'The five daily prayers and from one Friday prayer to the next Friday prayer is an expiation of the sins committed between them, if one avoids major sins.'",
      ar: "الصَّلَوَاتُ الْخَمْسُ وَالْجُمُعَةُ إِلَى الْجُمُعَةِ كَفَّارَةٌ لِمَا بَيْنَهُنَّ مَا اجْتُنِبَتِ الْكَبَائِرُ"
    },
    {
      id: 5,
      cat: "charity",
      source: "Sahih al-Bukhari",
      text: "The Messenger of Allah (ﷺ) said: 'Charity does not decrease wealth, and Allah increases the honor of him who forgives, and he who humbles himself before Allah, Allah will elevate him.'",
      ar: "مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ وَمَا زَادَ اللَّهُ عَبْدًا بِعَفْوٍ إِلاَّ عِزًّا"
    },
    {
      id: 6,
      cat: "charity",
      source: "Sahih al-Bukhari",
      text: "The Prophet (ﷺ) said: 'Save yourself from Hell-fire even by giving half a date-fruit in charity.'",
      ar: "اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ"
    },
    {
      id: 7,
      cat: "family",
      source: "Sahih al-Bukhari",
      text: "The Messenger of Allah (ﷺ) said: 'The best of you are those who are best to their families, and I am the best of you to my family.'",
      ar: "خَيْرُكُمْ خَيْرُكُمْ لأَهْلِهِ وَأَنَا خَيْرُكُمْ لأَهْلِي"
    },
    {
      id: 8,
      cat: "family",
      source: "Sahih al-Bukhari",
      text: "A man asked the Prophet: 'Who among people is most deserving of my fine treatment?' He said: 'Your mother.' The man asked: 'Then who?' He said: 'Your mother.' The man asked: 'Then who?' He said: 'Your mother.' The man asked: 'Then who?' He said: 'Then your father.'",
      ar: "جَاءَ رَجُلٌ إِلَى رَسُولِ اللَّهِ صلى الله عليه وسلم فَقَالَ يَا رَسُولَ اللَّهِ مَنْ أَحَقُّ النَّاسِ بِحُسْنِ صَحَابَتِي قَالَ أُمُّكَ قَالَ ثُمَّ مَنْ قَالَ أُمُّكَ قَالَ ثُمَّ مَنْ قَالَ أُمُّكَ قَالَ ثُمَّ مَنْ قَالَ ثُمَّ أَبُوكَ"
    },
    {
      id: 9,
      cat: "character",
      source: "Sunan at-Tirmidhi",
      text: "The Prophet (ﷺ) said: 'Nothing is heavier upon the scale of a believer on the Day of Resurrection than good character.'",
      ar: "مَا مِنْ شَيْءٍ أَثْقَلُ فِي مِيزَانِ الْمُؤْمِنِ يَوْمَ الْقِيَامَةِ مِنْ حُسْنِ الْخُلُقِ"
    },
    {
      id: 10,
      cat: "character",
      source: "Sahih al-Bukhari",
      text: "The Messenger of Allah (ﷺ) said: 'Make things easy for people and do not make them difficult, and give good tidings and do not make people turn away.'",
      ar: "يَسِّرُوا وَلاَ تُعَسِّرُوا وَبَشِّرُوا وَلاَ تُنَفِّرُوا"
    },
    {
      id: 11,
      cat: "knowledge",
      source: "Sunan Ibn Majah",
      text: "The Prophet (ﷺ) said: 'Seeking knowledge is an obligation upon every Muslim.'",
      ar: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ"
    },
    {
      id: 12,
      cat: "knowledge",
      source: "Sahih al-Bukhari",
      text: "The Messenger of Allah (ﷺ) said: 'If Allah wants to do good to a person, He makes him comprehend the religion.'",
      ar: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ"
    },
    {
      id: 13,
      cat: "patience",
      source: "Sahih al-Bukhari",
      text: "The Messenger of Allah (ﷺ) said: 'No fatigue, nor disease, nor sorrow, nor sadness, nor hurt, nor distress befalls a Muslim, even if it were the prick of a thorn, but that Allah expiates some of his sins for it.'",
      ar: "مَا يُصِيبُ الْمُسْلِمَ مِنْ نَصَبٍ وَلاَ وَصَبٍ وَلاَ هَمٍّ وَلاَ حُزْنٍ وَلاَ أَذًى وَلاَ غَمٍّ حَتَّى الشَّوْكَةِ يُشَاكُهَا إِلاَّ كَفَّرَ اللَّهُ بِهَا مِنْ خَتَايَاهُ"
    },
    {
      id: 14,
      cat: "patience",
      source: "Sahih Muslim",
      text: "The Prophet (ﷺ) said: 'How wonderful is the affair of the believer, for his affairs are all good... If something good happens to him, he is thankful, and that is good for him. If something bad happens to him, he is patient, and that is good for him.'",
      ar: "عَجَبًا لأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ ... إِنْ أَصَابَتْهُ سَرَّاءُ شَكَرَ فَكَانَ خَيْرًا لَهُ وَإِنْ أَصَابَتْهُ ضَرَّاءُ صَبَرَ فَكَانَ خَيْرًا لَهُ"
    }
  ],
  
  bookmarks: [],
  currentTab: 'all',

  init() {
    this.loadBookmarks();
    this.setupListeners();
    this.renderHadithList();
  },

  setupListeners() {
    // Search filter input
    const search = document.getElementById('hadith-search');
    if (search) {
      search.addEventListener('input', (e) => this.filterHadithBySearch(e.target.value.trim()));
    }

    // Category Tabs click handlers
    document.querySelectorAll('.hadith-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.hadith-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        this.currentTab = e.target.getAttribute('data-hadith-cat');
        this.renderHadithList();
      });
    });
  },

  loadBookmarks() {
    try {
      const data = localStorage.getItem('hadith_bookmarks');
      this.bookmarks = data ? JSON.parse(data) : [];
    } catch(e) {
      this.bookmarks = [];
    }
  },

  saveBookmarks() {
    localStorage.setItem('hadith_bookmarks', JSON.stringify(this.bookmarks));
  },

  renderHadithList(items = null) {
    const container = document.getElementById('hadith-list');
    if (!container) return;

    let targetItems = items;
    
    if (!targetItems) {
      if (this.currentTab === 'all') {
        targetItems = this.database;
      } else {
        targetItems = this.database.filter(h => h.cat === this.currentTab);
      }
    }

    if (targetItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-search-minus text-muted"></i>
          <p>No Hadiths found.</p>
        </div>`;
      return;
    }

    container.innerHTML = targetItems.map(h => {
      const isBookmarked = this.bookmarks.includes(h.id);
      return `
        <div class="hadith-card card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="badge badge-emerald hadith-cat-badge">${h.cat}</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn-icon-small" title="Bookmark Hadith" onclick="HadithModule.toggleBookmark(${h.id})">
                <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
              </button>
              <button class="btn-icon-small" title="Copy Hadith" onclick="HadithModule.copyHadith(${h.id}, \`${h.text.replace(/'/g, "\\'")}\`, \`${h.source}\`)">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button class="btn-icon-small" title="Share Hadith" onclick="HadithModule.shareHadith(${h.id}, \`${h.text.replace(/'/g, "\\'")}\`, \`${h.source}\`)">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
            </div>
          </div>
          <p class="arabic-text text-right" style="font-size: 1.5rem; line-height: 1.7; margin-bottom: 12px;">${h.ar}</p>
          <p class="hadith-text">${h.text}</p>
          <span class="hadith-reference">— ${h.source}</span>
        </div>`;
    }).join('');
  },

  filterHadithBySearch(query) {
    if (!query) {
      this.renderHadithList();
      return;
    }

    const filtered = this.database.filter(h => 
      h.text.toLowerCase().includes(query.toLowerCase()) ||
      h.ar.includes(query) ||
      h.source.toLowerCase().includes(query.toLowerCase()) ||
      h.cat.toLowerCase().includes(query.toLowerCase())
    );

    this.renderHadithList(filtered);
  },

  toggleBookmark(id) {
    const idx = this.bookmarks.indexOf(id);
    const matchingBtn = event.currentTarget;
    const icon = matchingBtn.querySelector('i');

    if (idx > -1) {
      // Remove
      this.bookmarks.splice(idx, 1);
      if (icon) icon.className = 'fa-regular fa-bookmark';
    } else {
      // Add
      this.bookmarks.push(id);
      if (icon) icon.className = 'fa-solid fa-bookmark';
    }
    this.saveBookmarks();
  },

  copyHadith(id, text, source) {
    const shareText = `Hadith:\n${text}\n\nSource: ${source} - DeenQ`;
    navigator.clipboard.writeText(shareText)
      .then(() => alert('Hadith copied to clipboard!'))
      .catch(err => console.error('Copy failed:', err));
  },

  shareHadith(id, text, source) {
    const shareText = `Hadith:\n${text}\n\nSource: ${source} - Shared via DeenQ`;
    if (navigator.share) {
      navigator.share({
        title: 'Hadith Shared',
        text: shareText
      }).catch(err => console.log('Share failed:', err));
    } else {
      this.copyHadith(id, text, source);
    }
  }
};

// Register route
router.register('hadith', () => {
  HadithModule.init();
});
