import http.server
import sys

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def handle_one_request(self):
        try:
            super().handle_one_request()
        except ConnectionResetError:
            # This happens when the browser cancels an active media download
            # (for example, when you change songs before the current one finishes downloading)
            pass

    def log_message(self, format, *args):
        # We can also silence normal logs if we want, but keeping them is fine.
        super().log_message(format, *args)

if __name__ == '__main__':
    port = 8000
    
    with http.server.ThreadingHTTPServer(("", port), QuietHandler) as httpd:
        print(f"LipLock Server started!")
        print(f"Serving at http://localhost:{port}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            sys.exit(0)
