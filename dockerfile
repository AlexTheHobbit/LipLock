# 1. Use an official lightweight Python image
FROM python:3.11-slim

# 2. Install Linux system dependencies (ffmpeg for audio, curl to download yt-dlp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Install the Linux version of yt-dlp globally inside the container
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# 4. Set the internal directory
WORKDIR /app

# 5. Copy all your project files (HTML, JS, CSS, Python scripts, Tracks) into the container
COPY . .

# 6. Your Python script is configured to use Port 8000
EXPOSE 8000

# 7. Start your custom Python server script
CMD ["python", "server.py"]