#!/usr/bin/env python3
"""
Simple HTTP server for GigCampus frontend development
Serves static files and handles CORS for API integration
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all origins in development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Handle routing for single-page app behavior
        parsed_path = urlparse(self.path)
        
        # If requesting root, serve index.html
        if parsed_path.path == '/':
            self.path = '/templates/index.html'
        
        # If requesting a path without extension and it's not a file, serve index.html
        elif '.' not in os.path.basename(parsed_path.path):
            if not os.path.exists('.' + parsed_path.path):
                # For SPA routing, you might want to serve index.html
                # For now, let's just handle it normally
                pass
        
        super().do_GET()

    def guess_type(self, path):
        # Add proper MIME types for modern web assets
        mimetype = super().guess_type(path)
        
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html'
        elif path.endswith('.json'):
            return 'application/json'
        
        return mimetype

def main():
    port = int(os.environ.get('PORT', 8000))
    
    # Change to the frontend directory
    frontend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(frontend_dir)
    
    print(f"Starting GigCampus Frontend Development Server...")
    print(f"Serving from: {frontend_dir}")
    print(f"Server URL: http://localhost:{port}")
    print(f"Main page: http://localhost:{port}/templates/index.html")
    print(f"Sign In: http://localhost:{port}/templates/signin.html")
    print(f"Sign Up: http://localhost:{port}/templates/getstarted.html")
    print("Press Ctrl+C to stop the server")
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down the server...")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()