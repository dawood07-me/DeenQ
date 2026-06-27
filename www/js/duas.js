/**
 * DeenQ - Supplications (Duas) Module
 * Houses local categorized JSON supplications database and controls UI rendering,
 * sub-panel navigation, and real-time search.
 */

const DuasModule = {
  // Local Database of authentic Duas
  database: [
    {
      category: "Morning",
      icon: "fa-sun",
      items: [
        {
          title: "Morning Supplication for Protection",
          ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
          trans: "Asbahna wa-asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah.",
          en: "We have entered the morning and at this very time the whole kingdom belongs to Allah, praise be to Allah. There is no deity worthy of worship except Allah, Alone, without partner.",
          ref: "Sahih Muslim"
        },
        {
          title: "Supplication for Well-being",
          ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
          trans: "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah.",
          en: "O Allah, I ask You for forgiveness and well-being in this world and the Hereafter.",
          ref: "Sunan Abu Dawud"
        }
      ]
    },
    {
      category: "Evening",
      icon: "fa-moon",
      items: [
        {
          title: "Evening Supplication",
          ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
          trans: "Amsayna wa-amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah.",
          en: "We have entered the evening and at this very time the whole kingdom belongs to Allah, praise be to Allah. There is no deity worthy of worship except Allah, Alone, without partner.",
          ref: "Sahih Muslim"
        }
      ]
    },
    {
      category: "Sleeping",
      icon: "fa-bed",
      items: [
        {
          title: "Before Sleeping",
          ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
          trans: "Bismika Allahumma amutu wa-ahya.",
          en: "In Your name, O Allah, I die and I live.",
          ref: "Sahih al-Bukhari",
          ta: "உன் பெயரால் இறைவா நான் மரணிக்கிறேன், உயிர்வாழ்கிறேன்."
        }
      ]
    },
    {
      category: "Waking Up",
      icon: "fa-umbrella-beach",
      items: [
        {
          title: "Upon Waking Up",
          ar: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
          trans: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa-ilaihin-nushur.",
          en: "All praise is for Allah who gave us life after having taken it from us and untowards Him is the resurrection.",
          ref: "Sahih al-Bukhari",
          ta: "எங்களை மரணிக்கச் செய்த பின் எங்களை உயிர்ப்பித்த இறைவனுக்கே அனைத்துப் புகழும். மேலும் அவன் பக்கமே திரும்புதல் உள்ளது."
        }
      ]
    },
    {
      category: "Before Eating",
      icon: "fa-utensils",
      items: [
        {
          title: "Before Eating",
          ar: "بِسْمِ اللَّهِ",
          trans: "Bismillah.",
          en: "In the name of Allah.",
          ref: "Sunan Abu Dawud",
          ta: "அல்லாஹ்வின் பெயரால்."
        },
        {
          title: "If forgotten at start",
          ar: "بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ",
          trans: "Bismillahi fi awwalihi wa-akhirihi.",
          en: "In the name of Allah in the beginning and in the end.",
          ref: "Sunan at-Tirmidhi"
        }
      ]
    },
    {
      category: "After Eating",
      icon: "fa-cookie-bite",
      items: [
        {
          title: "After Eating",
          ar: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
          trans: "Alhamdu lillahil-ladhi at'amana wa-saqana wa-ja'alana muslimin.",
          en: "Praise be to Allah Who has fed us and given us drink, and made us Muslims.",
          ref: "Sunan Abu Dawud (Weak, but traditionally recited)",
          ta: "எங்களுக்கு உணவளித்து, புகட்டிய மற்றும் எங்களை முஸ்லிம்களாக ஆக்கிய அல்லாஹ்வுக்கே புகழனைத்தும்."
        }
      ]
    },
    {
      category: "Entering Mosque",
      icon: "fa-door-open",
      items: [
        {
          title: "Upon Entering the Mosque",
          ar: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
          trans: "Allahummaf-tah li abwaba rahmatik.",
          en: "O Allah, open for me the gates of Your mercy.",
          ref: "Sahih Muslim"
        }
      ]
    },
    {
      category: "Leaving Mosque",
      icon: "fa-door-closed",
      items: [
        {
          title: "Upon Leaving the Mosque",
          ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
          trans: "Allahumma inni as'aluka min fadlik.",
          en: "O Allah, indeed I ask You of Your bounty.",
          ref: "Sahih Muslim"
        }
      ]
    },
    {
      category: "Travelling",
      icon: "fa-plane-departure",
      items: [
        {
          title: "Supplication for Travel",
          ar: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ",
          trans: "Subhanal-ladhi sakhkhara lana hadha wa-ma kunna lahu muqrinin, wa-inna ila rabbina lamunqalibun.",
          en: "Glory to Him Who has subjected this to us, and we could never have it by our efforts. And verily, to our Lord we indeed are to return.",
          ref: "Surah Az-Zukhruf 43:13-14",
          ta: "எங்களுக்கு இதனை வசப்படுத்தித்தந்த அவன் தூயவன், நாங்கள் அதற்கு சக்தி பெற்றவர்களாக இருக்கவில்லை. மேலும் நிச்சயமாக நாம் எங்கள் இரட்சகனிடமே மீளக்கூடியவர்கள்."
        }
      ]
    },
    {
      category: "Parents",
      icon: "fa-people-roof",
      items: [
        {
          title: "Dua for Parents' Mercy",
          ar: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
          trans: "Rabbi irhamhuma kama rabbayani saghira.",
          en: "My Lord, have mercy upon them as they brought me up [when I was] small.",
          ref: "Surah Al-Isra 17:24",
          ta: "என் இறைவனே! நான் குழந்தையாக இருந்த போது அவர்கள் என்னை அன்போடு வளர்த்தது போல், அவர்கள் இருவர் மீதும் நீ கருணை புரிவாயாக!"
        }
      ]
    },
    {
      category: "Forgiveness",
      icon: "fa-hands-asl-interpreting",
      items: [
        {
          title: "Sayyidul Istighfar (Chief Supplication for Forgiveness)",
          ar: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ",
          trans: "Allahumma anta rabbi la ilaha illa anta, khalaqtani wa-ana 'abduka, wa-ana 'ala 'ahdika wa-wa'dika ma-stata'tu.",
          en: "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best as I can.",
          ref: "Sahih al-Bukhari"
        }
      ]
    },
    {
      category: "Protection",
      icon: "fa-shield-halved",
      items: [
        {
          title: "Protection Against All Evil",
          ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
          trans: "Bismillahi-lladhi la yadurru ma'as-mihi shay'un fil-ardi wa-la fis-sama'i wa-huwas-sami'ul-'alim.",
          en: "In the name of Allah, with Whose name nothing is harmed on earth nor in the heaven, and He is the All-Hearing, the All-Knowing.",
          ref: "Sunan Abu Dawud",
          ta: "அல்லாஹ்வின் திருப்பெயரால், அவனது பெயருடன் பூமியிலோ அல்லது வானத்திலோ எந்த ஒரு பொருளும் தீங்கு செய்ய முடியாது. அவன் செவியேற்பவன், நன்கறிபவன்."
        }
      ]
    },
    {
      category: "Rizq",
      icon: "fa-coins",
      items: [
        {
          title: "Supplication for Beneficial Provisions",
          ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
          trans: "Allahumma inni as'aluka 'ilman nafi'an, wa-rizqan tayyiban, wa-'amalan mutaqabbalan.",
          en: "O Allah, I ask You for useful knowledge, wholesome provision, and acceptable deeds.",
          ref: "Sunan Ibn Majah",
          ta: "யா அல்லாஹ்! பயனுள்ள கல்வியையும், தூய்மையான உணவையும், ஏற்றுக்கொள்ளப்பட்ட அமல்களையும் உன்னிடம் வேண்டுகிறேன்."
        }
      ]
    },
    {
      category: "Illness",
      icon: "fa-heart-pulse",
      items: [
        {
          title: "Dua for the Sick",
          ar: "أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، اشْفِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ",
          trans: "Adhhibil-bas Rabban-nas, ishfi wa-antash-shafi, la shifa'a illa shifa'uk.",
          en: "Remove the disease, O Lord of the people! Heal, for You are the Healer. There is no cure but Your cure.",
          ref: "Sahih al-Bukhari"
        }
      ]
    },
    {
      category: "Anxiety",
      icon: "fa-face-rolling-eyes",
      items: [
        {
          title: "Supplication against Grief and Distress",
          ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ",
          trans: "Allahumma inni a'udhu bika minal-hammi wal-hazani, wal-'ajzi wal-kasali, wal-bukhli wal-jubn.",
          en: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice.",
          ref: "Sahih al-Bukhari",
          ta: "யா அல்லாஹ்! கவலையிலிருந்தும் துக்கத்திலிருந்தும், பலவீனத்திலிருந்தும் சோம்பேறித்தனத்திலிருந்தும், கஞ்சத்தனத்திலிருந்தும் கோழைத்தனத்திலிருந்தும் உன்னிடம் பாதுகாப்புத் தேடுகிறேன்."
        }
      ]
    },
    {
      category: "Gratitude",
      icon: "fa-hands-bound",
      items: [
        {
          title: "Supplication to Help Offer Gratitude",
          ar: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
          trans: "Allahumma a'inni 'ala dhikrika wa-shukrika wa-husni 'ibadatik.",
          en: "O Allah, help me to remember You, to thank You, and to worship You in an excellent manner.",
          ref: "Sunan Abu Dawud",
          ta: "யா அல்லாஹ்! உன்னை நினைவுகூரவும், உனக்கு நன்றி செலுத்தவும், உன்னை அழகிய முறையில் வணங்கவும் எனக்கு உதவி செய்வாயாக."
        }
      ]
    }
  ],

  init(args) {
    this.setupListeners();
    this.renderCategoriesGrid();

    if (args && args[0] === 'category' && args[1] !== undefined) {
      const idx = parseInt(args[1]);
      this.openCategoryUI(idx);
    } else {
      this.closeCategoryUI();
    }
  },

  setupListeners() {
    // Back to grid button in panel view
    const btnBack = document.getElementById('btn-back-duas-grid');
    if (btnBack) {
      btnBack.onclick = () => {
        router.navigate('duas');
      };
    }

    // Search input handler
    const search = document.getElementById('duas-search');
    if (search) {
      search.oninput = (e) => this.filterDuas(e.target.value.trim());
    }
  },

  renderCategoriesGrid() {
    const grid = document.getElementById('duas-categories-grid');
    if (!grid) return;

    grid.innerHTML = this.database.map((cat, index) => `
      <div class="dua-cat-card card" onclick="DuasModule.openCategory(${index})">
        <div class="dua-cat-icon">
          <i class="fa-solid ${cat.icon}"></i>
        </div>
        <h4>${cat.category}</h4>
        <span class="text-muted small">${cat.items.length} Supplications</span>
      </div>
    `).join('');
  },

  openCategory(index) {
    router.navigate(`duas/category/${index}`);
  },

  openCategoryUI(index) {
    const cat = this.database[index];
    if (!cat) return;

    const grid = document.getElementById('duas-categories-grid');
    const panel = document.getElementById('dua-detail-panel');
    if (grid && panel) {
      grid.classList.add('hide');
      panel.classList.remove('hide');
      document.getElementById('dua-category-title').textContent = `${cat.category} Duas`;
      this.renderDuaItems(cat.items);
    }
  },

  closeCategoryUI() {
    const grid = document.getElementById('duas-categories-grid');
    const panel = document.getElementById('dua-detail-panel');
    if (grid && panel) {
      panel.classList.add('hide');
      grid.classList.remove('hide');
    }
  },

  renderDuaItems(items) {
    const list = document.getElementById('dua-items-list');
    if (!list) return;

    list.innerHTML = items.map((item, idx) => `
      <div class="dua-item-card card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h4 style="color: var(--primary-color);">${item.title}</h4>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon-small" title="Copy Supplication" onclick="DuasModule.copyDua(${idx}, \`${item.ar}\`, \`${item.en.replace(/'/g, "\\'")}\`)"><i class="fa-solid fa-copy"></i></button>
            <button class="btn-icon-small" title="Share Supplication" onclick="DuasModule.shareDua(${idx}, \`${item.title}\`, \`${item.ar}\`, \`${item.en.replace(/'/g, "\\'")}\`)"><i class="fa-solid fa-share-nodes"></i></button>
          </div>
        </div>
        <p class="arabic-text text-right" style="font-size: 1.8rem; line-height: 1.8;">${item.ar}</p>
        <p class="dua-translit">${item.trans}</p>
        <p class="translation-text" style="font-size: 0.95rem; margin-top: 8px;">${item.en}</p>
        ${item.ta ? `<p class="translation-text" style="font-size: 0.95rem; margin-top: 6px; border-left: 2px solid var(--accent-gold); padding-left: 8px; color: var(--text-secondary);"><span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-gold); display: block;">TAMIL</span>${item.ta}</p>` : ''}
        <span class="dua-ref">${item.ref}</span>
      </div>
    `).join('');
  },

  filterDuas(query) {
    const grid = document.getElementById('duas-categories-grid');
    const panel = document.getElementById('dua-detail-panel');

    if (!query || query.length < 2) {
      // Clear search, show default category grid
      panel.classList.add('hide');
      grid.classList.remove('hide');
      this.renderCategoriesGrid();
      return;
    }

    // Flat map and search across all items in database
    const matched = [];
    this.database.forEach(cat => {
      cat.items.forEach(item => {
        if (
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.en.toLowerCase().includes(query.toLowerCase()) ||
          item.trans.toLowerCase().includes(query.toLowerCase()) ||
          (item.ta && item.ta.toLowerCase().includes(query.toLowerCase())) ||
          cat.category.toLowerCase().includes(query.toLowerCase())
        ) {
          matched.push(item);
        }
      });
    });

    grid.classList.add('hide');
    panel.classList.remove('hide');
    document.getElementById('dua-category-title').textContent = `Search Matches for "${query}"`;

    if (matched.length === 0) {
      document.getElementById('dua-items-list').innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-search-minus text-muted"></i>
          <p>No Supplications matched "${query}".</p>
        </div>`;
      return;
    }

    this.renderDuaItems(matched);
  },

  copyDua(idx, ar, en) {
    const text = `"${ar}"\n\nTranslation:\n"${en}"\n- DeenQ Supplications`;
    navigator.clipboard.writeText(text)
      .then(() => alert('Supplication copied to clipboard!'))
      .catch(err => console.error('Copy failed:', err));
  },

  shareDua(idx, title, ar, en) {
    const text = `${title}:\n"${ar}"\n\nTranslation:\n"${en}"\n- Shared via DeenQ`;
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text
      }).catch(err => console.log('Share failed:', err));
    } else {
      this.copyDua(idx, ar, en);
    }
  }
};

// Register view trigger
router.register('duas', (args) => {
  DuasModule.init(args);
});
