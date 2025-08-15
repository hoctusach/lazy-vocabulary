from fastapi import APIRouter, Depends
from typing import List
from ..models.vocabulary_data import VocabularyData, CustomWord, VocabularyWord
from ..services.vocabulary_service import VocabularyService

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])

vocabulary_service_instance = VocabularyService()

def get_vocabulary_service() -> VocabularyService:
    return vocabulary_service_instance

@router.get("/{user_id}", response_model=VocabularyData)
async def get_vocabulary_data(
    user_id: str,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    return service.get_vocabulary_data(user_id)

@router.post("/save", response_model=dict)
async def save_vocabulary_data(
    data: VocabularyData,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    success = service.save_vocabulary_data(data)
    return {"success": success}

@router.get("/{user_id}/words", response_model=List[VocabularyWord])
async def get_all_words(
    user_id: str,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    return service.get_all_words(user_id)

@router.get("/{user_id}/custom-words", response_model=List[CustomWord])
async def get_custom_words(
    user_id: str,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    return service.get_custom_words(user_id)

@router.post("/custom-words", response_model=CustomWord)
async def add_custom_word(
    word: CustomWord,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    return service.add_custom_word(word)

@router.delete("/{user_id}/custom-words/{word}/{category}")
async def remove_custom_word(
    user_id: str,
    word: str,
    category: str,
    service: VocabularyService = Depends(get_vocabulary_service)
):
    success = service.remove_custom_word(user_id, word, category)
    return {"success": success}