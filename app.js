document.addEventListener('DOMContentLoaded', () => {
    // Global track state if TRACKS is valid
    if (typeof TRACKS === 'undefined' || TRACKS.length === 0) {
        console.error("No tracks found. Please run the track generator script.");
        return;
    }

    // Initialize UI Elements
    const trackSelector = document.getElementById('track-selector');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const timeScrubber = document.getElementById('time-scrubber');
    const timeDisplay = document.getElementById('time-display');
    const liplockFader = document.getElementById('liplock-fader');

    // Populate Track Selector
    TRACKS.forEach((track, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = track.title;
        trackSelector.appendChild(option);
    });

    // Audio Elements
    const originalAudio = new Audio();
    const instrumentalAudio = new Audio();

    let originalLoaded = false;
    let instrumentalLoaded = false;
    let isPlaying = false;
    let isDraggingScrubber = false;
    let duration = 0;

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const updateTimeDisplay = () => {
        timeDisplay.textContent = `${formatTime(originalAudio.currentTime)} / ${formatTime(duration)}`;
    };

    const checkReadyState = () => {
        if (originalLoaded && instrumentalLoaded) {
            playPauseBtn.disabled = false;
            timeScrubber.disabled = false;
            duration = originalAudio.duration || 0;
            timeScrubber.max = duration;
            updateTimeDisplay();
        }
    };

    originalAudio.addEventListener('canplaythrough', () => {
        originalLoaded = true;
        checkReadyState();
    });

    instrumentalAudio.addEventListener('canplaythrough', () => {
        instrumentalLoaded = true;
        checkReadyState();
    });

    originalAudio.addEventListener('loadedmetadata', () => {
        duration = originalAudio.duration;
        timeScrubber.max = duration;
        updateTimeDisplay();
    });

    // Crossfade Logic implementation
    const updateVolumes = () => {
        const x = parseFloat(liplockFader.value);
        originalAudio.volume = Math.max(0, Math.min(1, 1.0 - x));
        instrumentalAudio.volume = Math.max(0, Math.min(1, x));
    };

    let originalObjectUrl = null;
    let instrumentalObjectUrl = null;
    let currentFetchId = 0;

    const loadTrack = async (index) => {
        const fetchId = ++currentFetchId;
        const track = TRACKS[index];
        // Reset states
        originalLoaded = false;
        instrumentalLoaded = false;
        playPauseBtn.disabled = true;
        timeScrubber.disabled = true;
        isPlaying = false;
        isDraggingScrubber = false;
        duration = 0;
        
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        timeScrubber.value = 0;
        timeDisplay.textContent = "0:00 / 0:00";

        try {
            const [origRes, instRes] = await Promise.all([
                fetch(track.original),
                fetch(track.instrumental)
            ]);
            
            const origBlob = await origRes.blob();
            const instBlob = await instRes.blob();

            if (fetchId !== currentFetchId) return; // Ignore stale fetch

            if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
            if (instrumentalObjectUrl) URL.revokeObjectURL(instrumentalObjectUrl);

            originalObjectUrl = URL.createObjectURL(origBlob);
            instrumentalObjectUrl = URL.createObjectURL(instBlob);

            originalAudio.src = originalObjectUrl;
            instrumentalAudio.src = instrumentalObjectUrl;
            
            originalAudio.load();
            instrumentalAudio.load();
            updateVolumes();
        } catch (err) {
            console.error("Failed to fetch audio tracks", err);
        }
    };

    // Initialize first track
    loadTrack(0);

    // Track Selector Event
    trackSelector.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        loadTrack(index);
    });

    // Play / Pause Logic
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            originalAudio.pause();
            instrumentalAudio.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        } else {
            const p1 = originalAudio.play();
            const p2 = instrumentalAudio.play();
            
            if (p1 !== undefined) p1.catch(e => console.error("Original playback failed", e));
            if (p2 !== undefined) p2.catch(e => console.error("Instrumental playback failed", e));

            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
        isPlaying = !isPlaying;
    });

    // When audio ends naturally
    originalAudio.addEventListener('ended', () => {
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        originalAudio.currentTime = 0;
        instrumentalAudio.currentTime = 0;
        timeScrubber.value = 0;
        updateTimeDisplay();
    });

    timeScrubber.addEventListener('input', (e) => {
        isDraggingScrubber = true;
        const newTime = parseFloat(e.target.value);
        timeDisplay.textContent = `${formatTime(newTime)} / ${formatTime(duration)}`;
    });

    timeScrubber.addEventListener('change', (e) => {
        const newTime = parseFloat(e.target.value);
        originalAudio.currentTime = newTime;
        instrumentalAudio.currentTime = newTime;
        isDraggingScrubber = false;
    });

    originalAudio.addEventListener('timeupdate', () => {
        if (!isDraggingScrubber && duration > 0) {
            timeScrubber.value = originalAudio.currentTime;
            updateTimeDisplay();

            const diff = Math.abs(originalAudio.currentTime - instrumentalAudio.currentTime);
            if (diff > 0.1) {
                instrumentalAudio.currentTime = originalAudio.currentTime;
            }
        }
    });

    liplockFader.addEventListener('input', updateVolumes);
});
