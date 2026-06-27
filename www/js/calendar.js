/**
 * DeenQ - Islamic Calendar Module
 * Computes Gregorian-to-Hijri conversions offline using Julian Day equations,
 * renders calendar grids, and highlights major religious holidays.
 */

const CalendarModule = {
  currentDate: new Date(), // Selected active month/year view
  events: [
    { title: "Islamic New Year", monthNum: 1, day: 1, desc: "1st of Muharram, marking the start of the Hijri year." },
    { title: "Day of Ashura", monthNum: 1, day: 10, desc: "10th of Muharram. A day of fasting and historical significance." },
    { title: "Mawlid al-Nabi", monthNum: 3, day: 12, desc: "12th of Rabi' al-Awwal. Commemorating the birth of Prophet Muhammad (ﷺ)." },
    { title: "Start of Ramadan", monthNum: 9, day: 1, desc: "1st of Ramadan. The blessed month of obligatory fasting begins." },
    { title: "Laylat al-Qadr", monthNum: 9, day: 27, desc: "27th of Ramadan (traditional estimation). Night of Decree/Power." },
    { title: "Eid al-Fitr", monthNum: 10, day: 1, desc: "1st of Shawwal. Celebration marking the end of Ramadan fasting." },
    { title: "Day of Arafah", monthNum: 12, day: 9, desc: "9th of Dhu al-Hijjah. The pinnacle of the Hajj pilgrimage." },
    { title: "Eid al-Adha", monthNum: 12, day: 10, desc: "10th of Dhu al-Hijjah. Festival of Sacrifice." }
  ],

  init() {
    this.setupListeners();
    this.renderCalendar();
  },

  setupListeners() {
    // Prev Month Button
    const btnPrev = document.getElementById('btn-prev-month');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
      });
    }

    // Next Month Button
    const btnNext = document.getElementById('btn-next-month');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
      });
    }
  },

  // Converts Gregorian Date to Hijri object offline using standard Julian equations
  gregorianToHijri(y, m, d) {
    if (m < 3) {
      y -= 1;
      m += 12;
    }
    
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    
    // Julian Day Number
    const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
    
    // Convert to Hijri
    const epoch = 1948439.5;
    const cycle = 10631;
    let j = Math.floor(jd - epoch);
    const cyc = Math.floor(j / cycle);
    j = j - cyc * cycle;
    const yearNum = Math.floor((j - 1) / 354.36667);
    const yj = Math.floor(yearNum * 354.36667 + 0.5);
    j = j - yj;
    const year = cyc * 30 + yearNum + 1;
    const month = Math.floor((j - 1) / 29.5);
    const mj = Math.floor(month * 29.5 + 0.5);
    j = j - mj;
    const day = j + 1;

    const monthNames = [
      "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
      "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
      "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"
    ];

    return {
      day: Math.round(day),
      monthNum: month + 1,
      monthName: monthNames[month] || "Muharram",
      year: Math.round(year)
    };
  },

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth(); // 0-indexed

    // Calculate details for calendar grid
    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Total days in month
    const prevMonthDays = new Date(year, month, 0).getDate();

    const monthNamesGreg = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Compute Hijri range represented in this month
    const startHijri = this.gregorianToHijri(year, month + 1, 1);
    const endHijri = this.gregorianToHijri(year, month + 1, totalDays);

    // Update Header Label
    const headerLabel = document.getElementById('calendar-month-year');
    if (headerLabel) {
      const hijriMonthsStr = startHijri.monthName === endHijri.monthName 
        ? `${startHijri.monthName} ${startHijri.year}` 
        : `${startHijri.monthName} / ${endHijri.monthName} ${endHijri.year}`;
      headerLabel.innerHTML = `${monthNamesGreg[month]} ${year} <div style="font-size:0.85rem; font-weight:500; margin-top:2px; color:var(--accent-gold);">${hijriMonthsStr} AH</div>`;
    }

    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    let html = '';
    const today = new Date();

    // Render Previous Month Padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const h = this.gregorianToHijri(prevY, prevM + 1, prevD);
      
      html += `
        <div class="calendar-day-cell other-month">
          <span class="greg-date">${prevD}</span>
          <span class="hijri-date">${h.day}</span>
        </div>`;
    }

    // Render Current Month Days cells
    const monthEventsList = [];
    for (let d = 1; d <= totalDays; d++) {
      const h = this.gregorianToHijri(year, month + 1, d);
      const isToday = (today.getDate() === d && today.getMonth() === month && today.getFullYear() === year);
      
      // Match active religious events for this Hijri day
      const dayEvent = this.events.find(ev => ev.monthNum === h.monthNum && ev.day === h.day);
      if (dayEvent) {
        monthEventsList.push({
          title: dayEvent.title,
          gregDate: `${d} ${monthNamesGreg[month]}`,
          hijriDate: `${h.day} ${h.monthName}`,
          desc: dayEvent.desc
        });
      }

      const cellClass = [
        'calendar-day-cell',
        isToday ? 'today' : '',
        dayEvent ? 'has-event' : ''
      ].filter(Boolean).join(' ');

      html += `
        <div class="${cellClass}" onclick="CalendarModule.showCellDetails(${d}, '${monthNamesGreg[month]}', '${h.day} ${h.monthName} ${h.year}', '${dayEvent ? dayEvent.title : ''}')" title="${dayEvent ? dayEvent.title : ''}">
          <span class="greg-date" style="${dayEvent ? 'color: var(--accent-gold);' : ''}">${d}</span>
          <span class="hijri-date">${h.day}</span>
        </div>`;
    }

    // Render Next Month Padding cells
    const totalRenderedCells = firstDayIndex + totalDays;
    const remainingCells = 42 - totalRenderedCells; // Standard 6-row grid
    for (let d = 1; d <= remainingCells; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const h = this.gregorianToHijri(nextY, nextM + 1, d);

      html += `
        <div class="calendar-day-cell other-month">
          <span class="greg-date">${d}</span>
          <span class="hijri-date">${h.day}</span>
        </div>`;
    }

    grid.innerHTML = html;

    // Render Sidebar events list
    this.renderSidebarEvents(monthEventsList);
  },

  renderSidebarEvents(monthEvents) {
    const list = document.getElementById('calendar-events-list');
    if (!list) return;

    if (monthEvents.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-minus text-muted"></i>
          <p>No major Islamic events in this month view.</p>
        </div>`;
      return;
    }

    list.innerHTML = monthEvents.map(e => `
      <div class="event-item">
        <div class="event-title">${e.title}</div>
        <div class="event-dates">${e.gregDate} (${e.hijriDate})</div>
        <p class="small text-secondary mt-2" style="font-size: 0.8rem; margin-top: 4px;">${e.desc}</p>
      </div>
    `).join('');
  },

  showCellDetails(gregDay, gregMonthName, hijriStr, eventTitle) {
    let msg = `Gregorian Date: ${gregDay} ${gregMonthName}\nHijri Date: ${hijriStr}`;
    if (eventTitle) {
      msg += `\n\nEvent: ${eventTitle}!`;
    }
    alert(msg);
  }
};

// Register route
router.register('calendar', () => {
  CalendarModule.init();
});
