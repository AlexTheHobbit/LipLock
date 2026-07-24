import http.server
import sys
import os
import json
from mutagen.easyid3 import EasyID3

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 🔥 INTERCEPT RULES: Generate tracks.js in-memory on every page load
        if self.path == '/tracks.js' or self.path == 'tracks.js':
            tracks_data = self.dynamic_scan_tracks()
            js_content = f"const TRACKS = {json.dumps(tracks_data, indent=4)};\n"
            
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.end_headers()
            self.wfile.write(js_content.encode('utf-8'))
            return
        
        # Otherwise, pass through and serve HTML/CSS/Audio files normally
        return super().do_GET()

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

        tracks_data.sort(key=lambda t: t["artist"].lower())
        return tracks_data

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except ConnectionResetError:
            # Prevents terminal errors when browser truncates active audio downloads
            pass

    def log_message(self, format, *args):
        # Keeps server terminal outputs concise
        super().log_message(format, *args)

if __name__ == '__main__':
    port = 8000
    # Threading server allows simultaneous streaming of original and instrumental files
    with http.server.ThreadingHTTPServer(("", port), QuietHandler) as httpd:
        print(f"LipLock Server active on port {port} (Real-time dynamic tracking enabled)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            sys.exit(0)