FROM python:3.11-slim

# 1. Install lightweight system audio dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Install the Mutagen metadata tag reader required by your script
RUN pip install --no-cache-dir mutagen

# 3. Download Linux native yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY . .

EXPOSE 8000

CMD ["python", "server.py"]