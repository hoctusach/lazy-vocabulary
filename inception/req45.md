# 📄 Lazy Voca – Prompts for Feature FR4 (Retirement) & FR5 (System Behavior)

---

## ✅ DEV PROMPTS – For Backend / Amazon Q

---

### 🧩 Prompt 1: Mark Word as Retired (FR4.1)
Implement logic for marking a word as “retired” when the user clicks the button with tooltip “Got it, DO NOT show”.

- This action can happen at any stage: new, in-progress, or mastered.
- Add or update the following field:
```ts
retired: true
```
- Do not remove the word from localStorage.
- If already mastered, preserve `isMastered = true`.
- Set or preserve `lastPlayedDate` and `reviewCount`.

---

### 🧩 Prompt 2: Schedule Retired Items for Maintenance Only (FR4.2)
If a word is `retired: true`, it shall only reappear for maintenance every 100 days.

- After last playback, set:
```ts
nextReviewDate = lastPlayedDate + 100 days
```
- If 100 days not passed, skip this item from today’s list.
- Do not include it in spaced repetition or regular scheduling.

---

### 🧩 Prompt 3: Passive Learning Only (FR5.1)
Ensure that the algorithm works without active user input (no quizzes, taps, typing, etc.).

- Use:
  - `lastPlayedDate`
  - `reviewCount`
  - `nextReviewDate`
- Automatically progress items based on passive playback completion.
- Skip interaction checks.

---

### 🧩 Prompt 4: Daily Cleanup on First App Open (FR5.2)
On first app load of the day:
- Detect if the date has changed using `localStorage.lastVisitDate`.
- If changed:
  - Clear per-day tracking data:
    - Time played (e.g. `sessionDuration`)
    - Review timestamps for that date
- Keep:
  - `lastPlayedDate`
  - `reviewCount`
  - `nextReviewDate`
  - Historical data used for spaced repetition

---

## 🧪 TEST PROMPTS – For QA Team

---

### 🧪 Prompt 1: Test Retire Action (FR4.1)
- Click “Got it, DO NOT show” → word is marked:
```ts
retired: true
```
- Validate that it does not appear in:
  - Today’s learning list
  - Upcoming spaced review
- Confirm it's still saved in localStorage.

---

### 🧪 Prompt 2: Validate 100-Day Maintenance Cycle (FR4.2)
- For a `retired: true` word:
  - Set `lastPlayedDate = 2025-01-01`
  - Check `nextReviewDate = 2025-04-11` (100 days later)
- Ensure it’s excluded from all lists until that date.

---

### 🧪 Prompt 3: Passive Playback Progression (FR5.1)
- No user actions should be required to:
  - Advance playback
  - Update review count
  - Update spaced repetition
- System progresses automatically on playback end.

---

### 🧪 Prompt 4: Daily Cleanup on App Load (FR5.2)
- Simulate opening app on a new calendar date
- Confirm:
  - `sessionDuration`, `todayReviewLog` are reset
  - Other persistent fields (e.g. `lastPlayedDate`) are untouched
- Simulate second open on same day → confirm data is not cleared again

---

## ✅ Summary

| Feature | Dev Prompt | QA Prompt |
|--------|------------|-----------|
| FR4.1 – Retire word on click | ✅ | ✅ |
| FR4.2 – 100-day reappearance | ✅ | ✅ |
| FR5.1 – Passive-only logic | ✅ | ✅ |
| FR5.2 – Daily cleanup logic | ✅ | ✅ |