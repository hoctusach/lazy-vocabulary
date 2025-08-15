FR1.1 and FR1.2
Yes, what we discussed covers most of the business logic and edge cases, but to make it fully actionable for both development and testing teams, let’s break it down into two clean prompt sets, with clear goals:

✅ DEV PROMPTS — For Implementation
Each of these prompts can be passed to a developer (or an LLM agent like Amazon Q / GitHub Copilot / Codex) to build the system logic.

🧩 Prompt 1: Vocabulary Word Data Structure
Design the data model for each vocabulary word stored in local storage.
 The model must track the user’s progress for spaced repetition and daily scheduling.
interface VocabWord {
  word: string;
  type: string; // e.g., "phrasal verb"
  category: string; // one of 6 types
  isLearned: boolean;
  reviewCount: number; // 0-4+
  lastPlayedDate: string; // e.g., "2025-08-12"
  nextReviewDate: string; // for spaced repetition logic
  status: "new" | "due" | "not_due";
  createdDate: string; // when first learned
}


🧩 Prompt 2: Daily Word List Generator
Write a function that:
Accepts a severity level (light, moderate, intense)


Picks X total words based on severity:


Light → 15–25


Moderate → 30–50 (default)


Intense → 50–100


Enforces ratio: 40% new, 60% due for review


If not enough items in one category, fill from the other


Randomizes selected words daily


Returns full word list with updated lastPlayedDate



🧩 Prompt 3: Spaced Repetition Update Logic
For each reviewed word:
Increment reviewCount by 1


Update nextReviewDate using logic:


Review 1 → +1 day


Review 2 → +2 days


Review 3 → +4 days


Review 4+ → +7 days (weekly repetition)


Change status to "not_due"



🧩 Prompt 4: Weighted New Word Selection
When selecting new words (40% of total):
Distribute by these category weights:


Topic Vocabulary: 44%


Phrasal Verbs: 13%


Idioms: 7%


Grammar: 3%


Word Formation: 6%


Phrases & Collocations: 5%


If a category is exhausted, redistribute proportionally to the others.



🧪 TEST PROMPTS — For QA Test Case / Script Creation
These prompts help QA write manual or automated test cases. They are phrased with test objectives and expected behavior.

🧪 Prompt 1: Test Daily Ratio
Create test cases to ensure the daily list contains:
40% new words (where isLearned = false)


60% review words (where status = "due")
 Allow a rounding tolerance of ±1 word.



🧪 Prompt 2: Test Severity-Based Count
Write tests that validate:
Severity = Light → total items between 15 and 25


Severity = Moderate → between 30 and 50


Severity = Intense → between 50 and 100
 Also verify the selected count matches the 40/60 ratio.



🧪 Prompt 3: Test Fallbacks When Pools Are Empty
Create test cases where:
Not enough due items → list is filled with more new


No new items left → list is filled with more review


Both pools are empty → return an empty list



🧪 Prompt 4: Test Word Metadata Update
After a session:
lastPlayedDate should be updated to today


reviewCount increments


nextReviewDate follows spaced repetition logic


Status changes to "not_due"



🧪 Prompt 5: Test Category Distribution
Validate that new items selected follow these weights:
Topic Vocabulary: 44%, Phrasal Verbs: 13%, etc.
 Simulate exhausted categories and verify proportional redistribution to remaining ones.



🧪 Prompt 6: Test Local Storage Format
Write test cases to validate:
Each word stored in expected schema


No missing fields


Proper date format (e.g., "YYYY-MM-DD")



Summary: Are These Prompts Enough?
✅ Yes — for both DEV & QA teams, these prompts:
Capture full business logic from FR1.1 and FR1.2


Define word-level metadata


Include day-to-day item selection, edge cases, and fallback


Are structured and independently usable by LLM agents or humans



Would you like me to export this into:
🧾 A Word or PDF format for team sharing?


📊 An Excel sheet listing each test case?


Let me know and I’ll generate them.
FR2.1-FR2.5
Now I’ll rewrite the dev and test prompts for FR2.1–FR2.5 using the existing localStorage-based JSON as the source of truth.

✅ DEV PROMPTS (Updated for localStorage JSON)

🧩 Prompt 1: Generate Daily Learning List (from localStorage)
Read the vocabulary array from localStorage. Based on FR1 (40% new, 60% due review), select today’s learning list.
Use isLearned = false for new items


Use status = "due" or nextReviewDate <= now for review items


Apply fallback if one type is insufficient


Shuffle and return a list of size based on user's severity config


Save today's list to:


sessionStorage["todayList"]


Also persist to localStorage under todayList_YYYYMMDD



🧩 Prompt 2: Detect and Trigger List Regeneration
Trigger the list regeneration when:
App is launched (cold start)


App resumes and detects calendar date has changed
 Use local time and lastListDate in storage for comparison. If different, regenerate today’s list.



🧩 Prompt 3: Auto Playback Queue
When one word's audio (word + meaning + example) finishes:
Automatically advance to next item in today’s list


Use todayList from sessionStorage


Track position using currentIndex pointer



🧩 Prompt 4: Prevent Category Repetition
Before saving todayList, rearrange it to ensure:
No more than 2 items from same category appear consecutively
 Rearrangement should preserve most of the original order but break long category streaks



🧩 Prompt 5: Spaced Repetition Schedule
Use these fields in each word object:
exposuresToday: how many times the word was played today


lastExposureTime: when it was last played
 Use the table below to compute the next eligible play time:


ts
CopyEdit
const delayByExposure = [0, 5, 7, 10, 15, 30, 60, 90, 120];

For each word, store nextAllowedTime = lastExposureTime + delay.
 Only include the word in the queue if current time >= nextAllowedTime.

🧩 Prompt 6: Enforce Loop and Spacing Rules
Loop behavior:
When the last word is played, start from index 0


Do not repeat any word if it was shown in the last 5 items


Maintain a lastPlayedWords queue (max 5) to enforce this



🧪 TEST PROMPTS (Updated for localStorage JSON)

🧪 Prompt 1: Test Daily List Generation from JSON
From saved localStorage vocab list:
Ensure todayList respects 40% new vs 60% review


If not possible, test fallback logic


Ensure the list size is within severity config range



🧪 Prompt 2: Test Regeneration Triggers
Simulate:
App launch → todayList is created


Resume app after midnight → new todayList is created


Same day resume → todayList remains the same



🧪 Prompt 3: Test Playback Flow
After audio ends:
currentIndex moves forward


Word at new index begins playback


At list end → starts again from index 0



🧪 Prompt 4: Test No Triple Same Category
Check that no 3 consecutive words in todayList have the same category
 If found → test rearrangement function

🧪 Prompt 5: Test Spaced Repetition Delay Logic
For each item in todayList:
Validate nextAllowedTime = lastExposureTime + delay


Word only reappears after time has passed


Exposure count increments correctly



🧪 Prompt 6: Repeat Spacing Rule
Play word X, then attempt to repeat it:
Ensure at least 5 different words have been played in between


If violated, word is skipped or delayed



✅ Summary
Rule/Feature
Covered in Prompts
Uses real localStorage JSON
✅
List generation & persistence
✅
Playback queue control
✅
Time-based repetition
✅
Same-category avoidance
✅
Repeat spacing rule
✅
QA coverage
✅ Full test scenario set




