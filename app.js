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
        option.textContent = track.artist ? `${track.title} - ${track.artist}` : track.title;
        trackSelector.appendChild(option);
    });

    // Web Audio API Configuration
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const originalGain = audioCtx.createGain();
    const instrumentalGain = audioCtx.createGain();
    
    // Connect gains to final destination (speakers)
    originalGain.connect(audioCtx.destination);
    instrumentalGain.connect(audioCtx.destination);

    // Audio buffers to hold fully decoded sample data
    let originalBuffer = null;
    let instrumentalBuffer = null;
    
    // Active buffer source nodes (need to be recreated on every play/seek)
    let originalSource = null;
    let instrumentalSource = null;
    
    let currentFetchId = 0;

    // Logic States
    let isPlaying = false;
    let isDraggingScrubber = false;
    let duration = 0;
    
    let offsetTime = 0;    // Tracks the play position across pauses
    let startTime = 0;     // The context timeline absolute time when play started
    let rafId = null;

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const updateTimeDisplay = (currentTime) => {
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    };

    const updateVolumes = () => {
        const x = parseFloat(liplockFader.value);
        originalGain.gain.value = Math.max(0, Math.min(1, 1.0 - x));
        instrumentalGain.gain.value = Math.max(0, Math.min(1, x));
    };

    const stopPlayback = () => {
        if (originalSource) {
            try { originalSource.stop(); } catch(e){}
            originalSource.disconnect();
            originalSource = null;
        }
        if (instrumentalSource) {
            try { instrumentalSource.stop(); } catch(e){}
            instrumentalSource.disconnect();
            instrumentalSource = null;
        }
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };

    const startPlayback = (timeOffset) => {
        stopPlayback();
        
        if (!originalBuffer || !instrumentalBuffer) return;
        
        originalSource = audioCtx.createBufferSource();
        originalSource.buffer = originalBuffer;
        originalSource.connect(originalGain);
        
        instrumentalSource = audioCtx.createBufferSource();
        instrumentalSource.buffer = instrumentalBuffer;
        instrumentalSource.connect(instrumentalGain);
        
        originalSource.start(0, timeOffset);
        instrumentalSource.start(0, timeOffset);
        
        startTime = audioCtx.currentTime;
        offsetTime = timeOffset;

        const updateTick = () => {
            if (!isPlaying) return;
            let currentPosition = offsetTime + (audioCtx.currentTime - startTime);
            
            if (currentPosition >= duration) {
                // Audio natural end
                isPlaying = false;
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                offsetTime = 0;
                timeScrubber.value = 0;
                updateTimeDisplay(0);
                stopPlayback();
                return;
            }
            
            if (!isDraggingScrubber) {
                timeScrubber.value = currentPosition;
                updateTimeDisplay(currentPosition);
            }
            rafId = requestAnimationFrame(updateTick);
        };
        rafId = requestAnimationFrame(updateTick);
    };

    const loadTrack = async (index) => {
        const fetchId = ++currentFetchId;
        const track = TRACKS[index];
        
        // Reset states
        if (isPlaying) {
            stopPlayback();
            isPlaying = false;
        }
        playPauseBtn.disabled = true;
        timeScrubber.disabled = true;
        isDraggingScrubber = false;
        duration = 0;
        offsetTime = 0;
        
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        timeScrubber.value = 0;
        updateTimeDisplay(0);

        try {
            const [origRes, instRes] = await Promise.all([
                fetch(track.original),
                fetch(track.instrumental)
            ]);
            
            const origArrayBuffer = await origRes.arrayBuffer();
            const instArrayBuffer = await instRes.arrayBuffer();

            if (fetchId !== currentFetchId) return;

            // AudioContext decodeAudioData gets Sample-Accurate representations 
            originalBuffer = await audioCtx.decodeAudioData(origArrayBuffer);
            instrumentalBuffer = await audioCtx.decodeAudioData(instArrayBuffer);

            if (fetchId !== currentFetchId) return;

            duration = originalBuffer.duration;
            timeScrubber.max = duration;
            playPauseBtn.disabled = false;
            timeScrubber.disabled = false;
            
            updateVolumes();
            updateTimeDisplay(0);
        } catch (err) {
            console.error("Failed to decode audio tracks", err);
            // Re-throw or ignore as necessary
        }
    };

    // Initialize first track
    loadTrack(0);

    // Track Selector Event
    trackSelector.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        loadTrack(index);
    });

    // Play/Pause Action
    playPauseBtn.addEventListener('click', () => {
        // Must resume AudioContext due to browser autoplay policies requiring User interaction
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (isPlaying) {
            // Calculate how far we got before pausing, so we can resume from here later
            offsetTime += (audioCtx.currentTime - startTime);
            stopPlayback();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        } else {
            startPlayback(offsetTime);
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
        isPlaying = !isPlaying;
    });

    // Timeline Scrub Logic
    timeScrubber.addEventListener('input', (e) => {
        isDraggingScrubber = true;
        const newTime = parseFloat(e.target.value);
        updateTimeDisplay(newTime);
    });

    timeScrubber.addEventListener('change', (e) => {
        const newTime = parseFloat(e.target.value);
        offsetTime = newTime;
        if (isPlaying) {
            startPlayback(offsetTime);
        }
        isDraggingScrubber = false;
    });

    // Crossfader target logic
    liplockFader.addEventListener('input', updateVolumes);
});
