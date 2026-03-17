import os
import json
import urllib.parse

def generate_tracks():
    base_dir = r"s:\Files\Projects\Coding\LipLock"
    originals_dir = os.path.join(base_dir, "Original Tracks")
    instrumentals_dir = os.path.join(base_dir, "Instrumental Tracks")

    if not os.path.exists(originals_dir) or not os.path.exists(instrumentals_dir):
        print("Error: Tracks directories not found.")
        return

    originals = [f for f in os.listdir(originals_dir) if f.endswith('.mp3')]
    instrumentals = [f for f in os.listdir(instrumentals_dir) if f.endswith('_(Instrumental).wav')]

    tracks_data = []

    for orig in originals:
        basename = orig[:-4]  # Remove .mp3
        # Find matching instrumental
        # Format is usually {idx}_{basename}_(Instrumental).wav
        matched_inst = None
        for inst in instrumentals:
            if f"_{basename}_(Instrumental).wav" in inst or inst.endswith(f"{basename}_(Instrumental).wav"):
                matched_inst = inst
                break
        
        if matched_inst:
            tracks_data.append({
                "title": basename,
                "original": f"Original Tracks/{orig}",
                "instrumental": f"Instrumental Tracks/{matched_inst}"
            })

    # Write to tracks.js
    output_path = os.path.join(base_dir, "tracks.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("const TRACKS = ")
        f.write(json.dumps(tracks_data, indent=4))
        f.write(";\n")
        
    print(f"Generated tracks.js with {len(tracks_data)} paired tracks.")

if __name__ == "__main__":
    generate_tracks()
