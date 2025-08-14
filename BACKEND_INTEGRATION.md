# Backend Integration Guide

## Quick Start

### 1. Start Backend Server
```bash
# Option 1: Use batch file
start-backend.bat

# Option 2: Manual start
cd src/backend/unified_service
python server.py
```

Backend runs on: `http://localhost:8000`

### 2. Start Frontend
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

## How It Works

### Backend Server
- **HTTP Server**: Minimal Python HTTP server exposing REST API
- **CORS Enabled**: Frontend can call backend from different port
- **Sample Data**: Pre-loaded with 6 categories and 13+ vocabulary words

### Frontend Integration
- **BackendVocabularyService**: New service that calls backend API
- **Automatic Fallback**: Uses local service in test mode
- **Same Interface**: No changes needed to existing components

### API Endpoints Available
```
GET  /api/vocabulary/categories
POST /api/vocabulary/categories  
GET  /api/vocabulary/categories/{id}/words
POST /api/vocabulary/words
GET  /api/vocabulary/search?q={query}
POST /api/users/register
POST /api/users/login
GET  /api/learning/daily-list/{user_id}
POST /api/learning/review
```

## Testing Backend

### Test API Directly
```bash
# Get categories
curl http://localhost:8000/api/vocabulary/categories

# Search vocabulary
curl "http://localhost:8000/api/vocabulary/search?q=break"

# Register user
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nickname":"Test","password":"password"}'
```

### Frontend Integration
1. Start backend server
2. Start frontend dev server  
3. Frontend automatically uses backend data
4. All vocabulary operations now go through backend

## Current Status

✅ **Backend Published**: HTTP server exposing all functionality
✅ **Frontend Client**: API client for backend communication  
✅ **Service Integration**: Backend service integrated into frontend
✅ **CORS Configured**: Cross-origin requests working
✅ **Sample Data**: Pre-loaded vocabulary available immediately

## Next Steps

1. **User Authentication**: Add login/register UI components
2. **Progress Tracking**: Integrate learning progress features
3. **Data Migration**: Add UI for importing local data
4. **Error Handling**: Add better error handling and offline support
5. **Production Deploy**: Deploy backend to cloud service

The frontend can now work independently with the backend running on localhost:8000!