"""
Minimal HTTP server for the unified Lazy Vocabulary backend service.
"""
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from service_factory import get_service_factory

# Global controller instance
controller = get_service_factory().get_controller()

class LazyVocabularyHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        self.send_cors_headers()
        path = urlparse(self.path).path
        query = parse_qs(urlparse(self.path).query)
        
        try:
            if path == '/api/vocabulary/categories':
                result = controller.get_categories()
            elif path.startswith('/api/vocabulary/categories/') and path.endswith('/words'):
                category_id = path.split('/')[-2]
                result = controller.get_words_by_category(category_id)
            elif path == '/api/vocabulary/search':
                query_param = query.get('q', [''])[0]
                result = controller.search_vocabulary(query_param)
            elif path.startswith('/api/learning/daily-list/'):
                user_id = path.split('/')[-1]
                size = int(query.get('size', ['20'])[0])
                result = controller.get_daily_learning_list(user_id, size)
            else:
                self.send_error(404, "Not Found")
                return
            
            self.send_json_response(result)
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)})
    
    def do_POST(self):
        self.send_cors_headers()
        path = urlparse(self.path).path
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if path == '/api/users/register':
                result = controller.register_user(data)
            elif path == '/api/users/login':
                result = controller.login_user(data)
            elif path == '/api/vocabulary/categories':
                result = controller.create_category(data)
            elif path == '/api/vocabulary/words':
                result = controller.add_vocabulary_word(data)
            elif path == '/api/learning/review':
                result = controller.record_review_event(data)
            else:
                self.send_error(404, "Not Found")
                return
            
            self.send_json_response(result)
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)})
    
    def send_cors_headers(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode('utf-8'))

def run_server(port=8000):
    server = HTTPServer(('localhost', port), LazyVocabularyHandler)
    print(f"Backend server running on http://localhost:{port}")
    print("Available endpoints:")
    print("  GET  /api/vocabulary/categories")
    print("  POST /api/vocabulary/categories")
    print("  GET  /api/vocabulary/categories/{id}/words")
    print("  POST /api/vocabulary/words")
    print("  GET  /api/vocabulary/search?q={query}")
    print("  POST /api/users/register")
    print("  POST /api/users/login")
    print("  GET  /api/learning/daily-list/{user_id}")
    print("  POST /api/learning/review")
    server.serve_forever()

if __name__ == "__main__":
    run_server()