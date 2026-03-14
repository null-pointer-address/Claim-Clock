const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const sessionLabelEl = document.getElementById('sessionLabel');
const focusSelect = document.getElementById('focusSelect');
const breakSelect = document.getElementById('breakSelect');
const focusModeBtn = document.getElementById('focusMode');
const breakModeBtn = document.getElementById('breakMode');
const startPauseBtn = document.getElementById('startPause');
const resetBtn = document.getElementById('reset');
const muteToggle = document.getElementById('muteToggle');
const volumeSlider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeLabel');
const youtubeUrl = document.getElementById('youtubeUrl');
const openMusicBtn = document.getElementById('openMusic');
const youtubeFrame = document.getElementById('youtubeFrame');
const youtubeEmbed = document.getElementById('youtubeEmbed');

let mode = 'focus';
let remainingSeconds = 30 * 60;
let timerId = null;
let tickFilePlaying = false;

// File-based tick (primary)
const tickFile = new Audio('freesound_community-metronome-loop-46242.mp3');
tickFile.loop = true;
tickFile.volume = (Number(volumeSlider?.value) || 35) / 100;

// Audio context for chime
const chimeCtx = new (window.AudioContext || window.webkitAudioContext)();

function format(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timeEl.textContent = format(remainingSeconds);
  sessionLabelEl.textContent = mode === 'focus' ? 'Focus' : 'Break';
}

function setMode(newMode) {
  mode = newMode;
  focusModeBtn.classList.toggle('active', mode === 'focus');
  breakModeBtn.classList.toggle('active', mode === 'break');
  const minutes = mode === 'focus' ? Number(focusSelect.value) : Number(breakSelect.value);
  remainingSeconds = minutes * 60;
  stopTimer();
  statusEl.textContent = 'Paused';
  updateDisplay();
}

function tick() {
  if (remainingSeconds <= 0) {
    stopTimer();
    statusEl.textContent = 'Done! Reset or switch mode.';
    playChime(mode);
    return;
  }
  remainingSeconds -= 1;
  updateDisplay();
}

function startTimer() {
  if (timerId) return;
  statusEl.textContent = 'Running';
  startPauseBtn.textContent = 'Pause';
  timerId = setInterval(tick, 1000);
  startTickLoop();
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  startPauseBtn.textContent = 'Start';
  statusEl.textContent = 'Paused';
  stopTickLoop();
}

startPauseBtn.addEventListener('click', () => {
  if (timerId) {
    stopTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', () => {
  setMode(mode);
});

focusModeBtn.addEventListener('click', () => setMode('focus'));
breakModeBtn.addEventListener('click', () => setMode('break'));

focusSelect.addEventListener('change', () => {
  if (mode === 'focus') setMode('focus');
});
breakSelect.addEventListener('change', () => {
  if (mode === 'break') setMode('break');
});

muteToggle.addEventListener('change', () => {
  if (muteToggle.checked) {
    stopTickLoop();
  } else if (timerId) {
    startTickLoop();
  }
});

openMusicBtn.addEventListener('click', () => {
  const url = youtubeUrl.value.trim();
  if (!url) return;
  try {
    const parsed = new URL(url);
    const isYT = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be');
    if (!isYT) {
      alert('Please paste a valid YouTube link.');
      return;
    }
    const yt = extractYouTubeTarget(parsed);
    if (!yt) {
      alert('Could not read the video ID.');
      return;
    }
    const embedUrl = yt.type === 'playlist'
      ? `https://www.youtube.com/embed?listType=playlist&list=${yt.id}&autoplay=1&rel=0&playsinline=1`
      : `https://www.youtube.com/embed/${yt.id}?autoplay=1&rel=0&playsinline=1`;
    youtubeFrame.src = embedUrl;
    youtubeFrame.style.height = '100%';
    youtubeEmbed.querySelector('.embed-placeholder').style.display = 'none';
  } catch (e) {
    alert('Please paste a valid YouTube link.');
  }
});

function extractYouTubeTarget(parsedUrl) {
  // playlists
  if (parsedUrl.searchParams.get('list')) {
    return { type: 'playlist', id: parsedUrl.searchParams.get('list') };
  }
  // youtu.be short
  if (parsedUrl.hostname.includes('youtu.be')) {
    const id = parsedUrl.pathname.slice(1);
    return id ? { type: 'video', id } : null;
  }
  // standard watch
  if (parsedUrl.searchParams.get('v')) {
    return { type: 'video', id: parsedUrl.searchParams.get('v') };
  }
  // shorts or embed path
  const parts = parsedUrl.pathname.split('/').filter(Boolean);
  if (parts[0] === 'shorts' && parts[1]) return { type: 'video', id: parts[1] };
  if (parts[0] === 'embed' && parts[1]) return { type: 'video', id: parts[1] };
  return null;
}

volumeSlider.addEventListener('input', () => {
  const value = Number(volumeSlider.value);
  tickFile.volume = value / 100;
  volumeLabel.textContent = `${value}%`;
});

function startTickLoop() {
  if (muteToggle.checked) return;
  stopTickLoop();
  chimeCtx.resume();
  tickFile.currentTime = 0;
  tickFile
    .play()
    .then(() => {
      tickFilePlaying = true;
    })
    .catch((err) => {
      console.warn('Tick file failed to play:', err);
    });
}

function stopTickLoop() {
  if (tickFilePlaying) {
    tickFile.pause();
    tickFile.currentTime = 0;
    tickFilePlaying = false;
  }
}

function playChime(type) {
  chimeCtx.resume();
  const now = chimeCtx.currentTime;
  const seq = type === 'focus' ? [880, 660, 523] : [660, 523];
  seq.forEach((freq, i) => {
    const osc = chimeCtx.createOscillator();
    const gain = chimeCtx.createGain();
    const start = now + i * 0.25;
    const end = start + 0.22;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain).connect(chimeCtx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  });
}

// init
updateDisplay();
if (volumeSlider) {
  volumeLabel.textContent = `${volumeSlider.value}%`;
}
