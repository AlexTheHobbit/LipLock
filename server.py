def dynamic_scan_tracks(self):
        """Scans the tracks directories and extracts ID3 tags in real-time"""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        originals_dir = os.path.join(base_dir, "Original Tracks")
        instrumentals_dir = os.path.join(base_dir, "Instrumental Tracks")

        if not os.path.exists(originals_dir) or not os.path.exists(instrumentals_dir):
            return []

        originals = [f for f in os.listdir(originals_dir) if f.endswith('.mp3')]
        instrumentals = [f for f in os.listdir(instrumentals_dir) if f.endswith(('_(Instrumental).wav', '_(Instrumental).mp3'))]

        tracks_data = []

        for orig in originals:
            orig_basename = os.path.splitext(orig)[0]  # Clean song name (e.g., "01 - Creep")
            matched_inst = None
            
            # 🔥 FIX: Drop extensions on instrumentals too before comparing string names
            for inst in instrumentals:
                inst_basename = os.path.splitext(inst)[0]  # e.g., "1_01 - Creep_(Instrumental)"
                
                if f"_{orig_basename}_(Instrumental)" in inst_basename or inst_basename.endswith(f"{orig_basename}_(Instrumental)"):
                    matched_inst = inst
                    break
            
            if matched_inst:
                artist = ""
                title = orig_basename
                
                try:
                    orig_path = os.path.join(originals_dir, orig)
                    audio = EasyID3(orig_path)
                    if 'artist' in audio and audio['artist']:
                        artist = audio['artist'][0]
                    if 'title' in audio and audio['title']:
                        title = audio['title'][0]
                except Exception:
                    pass

                tracks_data.append({
                    "title": title,
                    "artist": artist,
                    "original": f"Original Tracks/{orig}",
                    "instrumental": f"Instrumental Tracks/{matched_inst}"
                })
                
        return tracks_data