# Vocabulary Service Unit - Domain Model

## Domain Overview
Manages vocabulary content, categories, search functionality, and content administration.

## Aggregates

### Vocabulary Aggregate
**Root Entity**: VocabularyWord
**Consistency Boundary**: Individual vocabulary word and its metadata
**Invariants**: 
- Word text cannot be empty
- Each word belongs to exactly one category
- Audio assets are optional but validated when present

### Category Aggregate
**Root Entity**: Category
**Consistency Boundary**: Category and its vocabulary count
**Invariants**:
- Category name must be unique
- Category cannot be deleted if it contains vocabulary

## Entities

### VocabularyWord (Aggregate Root)
```
VocabularyWord {
  - wordId: WordId (Identity)
  - word: WordText (Value Object)
  - meaning: Meaning (Value Object)
  - example: Example (Value Object)
  - translation: Translation (Value Object)
  - categoryId: CategoryId
  - audioAsset: AudioAsset (Value Object, optional)
  - createdAt: DateTime
  - updatedAt: DateTime
}
```

### Category (Aggregate Root)
```
Category {
  - categoryId: CategoryId (Identity)
  - name: CategoryName (Value Object)
  - description: String
  - wordCount: Integer
  - createdAt: DateTime
}
```

## Value Objects

### WordText
```
WordText {
  - value: String
  - validate(): Boolean (non-empty, max 200 chars)
}
```

### Meaning
```
Meaning {
  - value: String
  - validate(): Boolean (non-empty, max 500 chars)
}
```

### Example
```
Example {
  - value: String
  - validate(): Boolean (max 1000 chars)
}
```

### Translation
```
Translation {
  - value: String
  - validate(): Boolean (max 500 chars)
}
```

### CategoryName
```
CategoryName {
  - value: String
  - validate(): Boolean (non-empty, max 100 chars)
}
```

### AudioAsset
```
AudioAsset {
  - fileName: String
  - s3Key: String
  - cdnUrl: String
  - fileSize: Long
  - format: AudioFormat (enum: MP3, WAV)
}
```

### SearchQuery
```
SearchQuery {
  - term: String
  - categoryFilter: CategoryId (optional)
  - validate(): Boolean
}
```

## Domain Events

### VocabularyWordAdded
```
VocabularyWordAdded {
  - wordId: WordId
  - categoryId: CategoryId
  - word: WordText
  - occurredAt: DateTime
}
```

### VocabularyWordUpdated
```
VocabularyWordUpdated {
  - wordId: WordId
  - previousVersion: VocabularyWord
  - occurredAt: DateTime
}
```

### AudioAssetUploaded
```
AudioAssetUploaded {
  - wordId: WordId
  - audioAsset: AudioAsset
  - occurredAt: DateTime
}
```

### CategoryCreated
```
CategoryCreated {
  - categoryId: CategoryId
  - name: CategoryName
  - occurredAt: DateTime
}
```

## Policies

### UniqueWordPolicy
Ensures word uniqueness within categories

### AudioAssetValidationPolicy
Validates audio file format and size constraints

### CategoryIntegrityPolicy
Maintains category word counts and prevents deletion of non-empty categories

## Repositories

### VocabularyRepository
```
VocabularyRepository {
  - findById(wordId: WordId): VocabularyWord
  - findByCategory(categoryId: CategoryId, page: Page): List<VocabularyWord>
  - search(query: SearchQuery, page: Page): List<VocabularyWord>
  - save(word: VocabularyWord): void
  - delete(wordId: WordId): void
  - count(): Long
}
```

### CategoryRepository
```
CategoryRepository {
  - findById(categoryId: CategoryId): Category
  - findByName(name: CategoryName): Category
  - findAll(): List<Category>
  - save(category: Category): void
  - updateWordCount(categoryId: CategoryId, count: Integer): void
}
```

## Domain Services

### VocabularySearchService
```
VocabularySearchService {
  - search(query: SearchQuery, page: Page): SearchResult
  - rankResults(results: List<VocabularyWord>, query: SearchQuery): List<VocabularyWord>
}
```

### ContentImportService
```
ContentImportService {
  - importVocabulary(data: VocabularyData): ImportResult
  - validateImportData(data: VocabularyData): ValidationResult
  - mergeWithExisting(newWords: List<VocabularyWord>): MergeResult
}
```

### AudioAssetService
```
AudioAssetService {
  - uploadAudio(wordId: WordId, audioFile: AudioFile): AudioAsset
  - generateCdnUrl(s3Key: String): String
  - validateAudioFile(audioFile: AudioFile): ValidationResult
}
```