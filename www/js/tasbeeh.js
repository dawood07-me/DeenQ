/**
 * DeenQ - Digital Tasbeeh Counter Module
 * Handles dhikr incrementation, goal milestones, native vibration,
 * synthesizer beeps, and session history management.
 */

const TasbeehModule = {
  count: 0,
  target: 33,
  isVibrate: true,
  isSound: true,
  history: [],
  audioCtx: null,
  _initialized: false,

  init() {
    this.loadHistory();
    if (!this._initialized) {
      this.setupListeners();
      this._initialized = true;
    }
    this.updateDisplay();
    this.renderHistory();
  },

  setupListeners() {
    // Tap Zone click handler
    const tapZone = document.getElementById('tasbeeh-tap-zone');
    if (tapZone) {
      // Use both pointerdown and mousedown for fast mobile response
      tapZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.increment();
      });
    }

    // Reset button
    const btnReset = document.getElementById('tasbeeh-reset');
    if (btnReset) {
      btnReset.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetCounter();
      });
      btnReset.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // Save Session button
    const btnSave = document.getElementById('tasbeeh-save-session');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveCurrentSession());
    }

    // Vibration Toggle
    const btnVibrate = document.getElementById('tasbeeh-vibration-toggle');
    if (btnVibrate) {
      btnVibrate.addEventListener('click', () => {
        this.isVibrate = !this.isVibrate;
        btnVibrate.classList.toggle('active', this.isVibrate);
      });
    }

    // Sound Toggle
    const btnSound = document.getElementById('tasbeeh-sound-toggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        this.isSound = !this.isSound;
        btnSound.classList.toggle('active', this.isSound);
      });
    }

    // Target Selection Preset Buttons
    document.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const customBox = document.getElementById('tasbeeh-custom-target-box');
        
        if (e.target.id === 'btn-custom-target') {
          customBox.classList.toggle('hide');
          return;
        }

        customBox.classList.add('hide');
        document.querySelectorAll('.target-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const val = parseInt(e.target.getAttribute('data-target'));
        this.setTarget(val);
      });
    });

    // Custom Target Set button
    const btnSetCustomTarget = document.getElementById('btn-save-custom-target');
    if (btnSetCustomTarget) {
      btnSetCustomTarget.addEventListener('click', () => {
        const input = document.getElementById('tasbeeh-custom-target-input');
        const val = parseInt(input.value);
        if (val && val > 0) {
          this.setTarget(val);
          document.getElementById('tasbeeh-custom-target-box').classList.add('hide');
          
          // Mark Custom edit button as active
          document.querySelectorAll('.target-btn').forEach(t => t.classList.remove('active'));
          document.getElementById('btn-custom-target').classList.add('active');
        }
      });
    }

    // Active Dhikr Select changes
    const selectDhikr = document.getElementById('tasbeeh-active-dhikr');
    if (selectDhikr) {
      selectDhikr.addEventListener('change', (e) => {
        const customDhikr = document.getElementById('tasbeeh-custom-dhikr-input');
        if (e.target.value === 'Custom') {
          customDhikr.classList.remove('hide');
        } else {
          customDhikr.classList.add('hide');
        }
        this.resetCounter();
      });
    }
  },

  loadHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASBEEH_HISTORY);
      this.history = data ? JSON.parse(data) : [];
    } catch(e) {
      this.history = [];
    }
  },

  saveHistory() {
    localStorage.setItem(STORAGE_KEYS.TASBEEH_HISTORY, JSON.stringify(this.history));
    this.renderHistory();
  },

  increment() {
    this.count++;
    this.updateDisplay();

    // Trigger feedback sound
    if (this.isSound) {
      this.playTickSound();
    }

    // Trigger feedback vibration
    if (this.isVibrate && navigator.vibrate) {
      navigator.vibrate(40);
    }

    // Check target hit
    if (this.count === this.target) {
      this.triggerTargetHitAlert();
    }
  },

  setTarget(val) {
    this.target = val;
    const targetEl = document.getElementById('tasbeeh-count-target');
    if (targetEl) targetEl.textContent = val;
    this.updateDisplay();
  },

  resetCounter() {
    this.count = 0;
    this.updateDisplay();
  },

  updateDisplay() {
    const numEl = document.getElementById('tasbeeh-count-number');
    const tapZone = document.getElementById('tasbeeh-tap-zone');
    
    if (numEl) numEl.textContent = this.count;

    // Adjust circular progress borders overlay rotation/filling style
    if (tapZone) {
      const percentage = Math.min((this.count / this.target) * 100, 100);
      tapZone.style.borderImage = `conic-gradient(var(--accent-gold) ${percentage}%, var(--primary-color) ${percentage}%) 1`;
      
      // Special glow if target is completed
      if (this.count >= this.target) {
        tapZone.style.boxShadow = "0 8px 30px rgba(217, 119, 6, 0.4)";
      } else {
        tapZone.style.boxShadow = "0 8px 30px rgba(6, 95, 70, 0.15)";
      }
    }
  },

  triggerTargetHitAlert() {
    // Large vibration
    if (this.isVibrate && navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }

    // Large completion sound
    if (this.isSound) {
      this.playCompletionSound();
    }

    // Smooth animation effect
    const zone = document.getElementById('tasbeeh-tap-zone');
    if (zone) {
      zone.style.transform = "scale(1.1)";
      setTimeout(() => {
        zone.style.transform = "";
      }, 200);
    }
  },

  getActiveDhikrName() {
    const select = document.getElementById('tasbeeh-active-dhikr');
    if (!select) return "Dhikr";

    if (select.value === 'Custom') {
      const input = document.getElementById('tasbeeh-custom-dhikr-input');
      return (input && input.value.trim()) ? input.value.trim() : "Custom Dhikr";
    }

    const option = select.options[select.selectedIndex];
    return option ? option.text.split('(')[0].trim() : "Dhikr";
  },

  saveCurrentSession() {
    if (this.count === 0) {
      alert("Please tap the counter before saving!");
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    const session = {
      dhikr: this.getActiveDhikrName(),
      count: this.count,
      target: this.target,
      date: dateStr
    };

    // Prepend to history (newest first)
    this.history.unshift(session);
    
    // Limit to latest 30 records
    if (this.history.length > 30) {
      this.history.pop();
    }

    this.saveHistory();
    this.resetCounter();
    alert("Session saved successfully!");
  },

  renderHistory() {
    const list = document.getElementById('tasbeeh-history-list');
    if (!list) return;

    if (this.history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-clock-rotate-left text-muted"></i>
          <p>No history saved yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = this.history.map(h => `
      <div class="history-item">
        <div class="history-meta">
          <h4>${h.dhikr}</h4>
          <span>${h.date}</span>
        </div>
        <div class="history-count">${h.count} / ${h.target}</div>
      </div>
    `).join('');
  },

  playTickSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.audioCtx = this.audioCtx || new AudioContext();
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch(e) {
      console.log(e);
    }
  },

  playCompletionSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.audioCtx = this.audioCtx || new AudioContext();
      
      const now = this.audioCtx.currentTime;
      const playTone = (freq, start, duration) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      // Nice high double chime (E5 and G5)
      playTone(659.25, now, 0.45);        // E5
      playTone(783.99, now + 0.12, 0.60); // G5
    } catch(e) {
      console.log(e);
    }
  }
};

// Register route
router.register('tasbeeh', () => {
  TasbeehModule.init();
});
