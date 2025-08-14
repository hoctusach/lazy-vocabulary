from typing import Dict, List, Any
from ..application.vocabulary_query_service import VocabularyQueryService
from ..application.content_administration_service import ContentAdministrationService

class VocabularyController:
    def __init__(self, query_service: VocabularyQueryService, admin_service: ContentAdministrationService):
        self.query_service = query_service
        self.admin_service = admin_service
    
    def get_categories(self) -> Dict[str, Any]:
        try:
            categories = self.query_service.get_categories()
            return {"success": True, "data": categories}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_words_by_category(self, category_id: str) -> Dict[str, Any]:
        try:
            words = self.query_service.get_words_by_category(category_id)
            return {"success": True, "data": words}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def search_vocabulary(self, query: str) -> Dict[str, Any]:
        try:
            words = self.query_service.search_vocabulary(query)
            return {"success": True, "data": words}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def create_category(self, name: str, description: str = None) -> Dict[str, Any]:
        try:
            category = self.admin_service.create_category(name, description)
            return {"success": True, "data": category}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def add_word(self, word_text: str, meaning: str, category_id: str, 
                 example: str = None, translation: str = None) -> Dict[str, Any]:
        try:
            word = self.admin_service.add_vocabulary_word(word_text, meaning, category_id, example, translation)
            return {"success": True, "data": word}
        except Exception as e:
            return {"success": False, "error": str(e)}