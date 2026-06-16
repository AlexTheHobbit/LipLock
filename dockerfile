# 1. Use the absolute smallest official Python image (cuts size down drastically)
FROM python:3.11-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install only the Mutagen library for real-time ID3 tag reading
RUN pip install --no-cache-dir mutagen

# 4. Copy your local code files into the sandbox
COPY . .

# 5. Expose the Python web server port
EXPOSE 8000

# 6. Boot the server
CMD ["python", "server.py"]