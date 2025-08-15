# 📄 Lazy Voca – Prompts for Feature FR3 (Review Scheduling)

## ✅ DEV PROMPTS – For Backend / Amazon Q

### 🧩 Prompt 1: Review Interval Scheduler (FR3.1)
Enhance backend logic to support review scheduling intervals after initial exposure.

```ts
const reviewIntervals = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35]; // for reviews 1-10
const masterInterval = 60; // from review 11 onward
```

- Calculate `nextReviewDate = lastPlayedDate + intervalDays`
- Shift future reviews if one is delayed (based on actual review date)
- If user hits daily review quota, push item to next day (`nextReviewDate++`)

---

### 🧩 Prompt 2: Handle “Retired” Words (FR3.2 Updated)
Add support for a `retired` flag in each word object stored in localStorage:

```ts
retired: true | false
```

If `retired = true`, then:
- Exclude from daily new/review list and playback
- Reset the following if applicable:
```ts
isMastered = false
reviewCount = 0
nextReviewDate = null
```

---

### 🧩 Prompt 3: Implicit Review Update (FR3.3)
If user finishes playback without giving feedback:
```ts
reviewCount += 1
lastPlayedDate = today
nextReviewDate = today + intervalFrom(reviewCount)
```

---

### 🧩 Prompt 4: Mastered Words (FR3.4)
When `reviewCount >= 10`:

```ts
isMastered = true
nextReviewDate = today + 60 days
```

- Exclude from daily list but keep in localStorage

---

### 🧩 Prompt 5: Update Storage Model
Each word must include:

```ts
{
  reviewCount: number,
  nextReviewDate: string | null,
  lastPlayedDate: string | null,
  isMastered: boolean,
  retired: boolean
}
```

No changes to UI or report tab and logics.

---

## 🧪 TEST PROMPTS – For QA Team

### 🧪 Prompt 1: Validate Review Scheduling (FR3.1)
- Simulate `reviewCount = 4`, `lastPlayedDate = "2025-08-01"`
- Expect `nextReviewDate = 2025-08-06`
- Delay playback → future intervals shift
- Full quota → `nextReviewDate++`

---

### 🧪 Prompt 2: Exclude Retired Words (FR3.2)
- If `retired: true`, word should not appear in any playlist
- Ensure:
```ts
reviewCount == 0
isMastered == false
nextReviewDate == null
```

---

### 🧪 Prompt 3: Implicit Review (FR3.3)
- Playback completes → increment `reviewCount`, update dates accordingly

---

### 🧪 Prompt 4: Mastered Word Handling (FR3.4)
- `reviewCount >= 10` → `isMastered = true`, `nextReviewDate = today + 60 days`
- Excluded from daily playlist

---

### 🧪 Prompt 5: Validate Storage Format
- Check all localStorage word entries:
  - `reviewCount`, `nextReviewDate`, `isMastered`, `retired` exist
  - Correct types and valid values

---

## ✅ Summary

| Feature | Dev Prompt | QA Prompt |
|--------|------------|-----------|
| FR3.1 – Review intervals | ✅ | ✅ |
| FR3.2 – Retired words | ✅ (Updated) | ✅ (Updated) |
| FR3.3 – No-feedback = retain | ✅ | ✅ |
| FR3.4 – Mastery & exclusion | ✅ | ✅ |
| Storage model validation | ✅ | ✅ |



