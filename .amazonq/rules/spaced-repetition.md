# **Feature: Spaced Repetition Playback**

## Functional Requirements

### **1\. Daily Item Selection**

* #### **FR1.1**: The system shall schedule a daily mix of: New items (vocabularies have not been learnt before) and Review items (vocabularies are due for re-learnt) with a ratio of 40% vs 60% respectively. 

  * This ratio is **as strict as possible** each day. Small deviations (±1 item) are acceptable when rounding is necessary.

  * In case there aren’t enough due review items for the ratio, the system should **fill with more new items** while keeping total daily count. (and vice versa if all of the available items have been learnt once)

  * The system should have a configuration for users to set the severity cadence of learning. The default configuration should be Moderate. (at phase 1, hardcode the default config, UI configuration for users to select could be built later).

| Severity | \# words per day |
| :---- | :---- |
| Light | 15-25  |
| Moderate | 30-50 |
| Intense | 50-100 |

* #### **FR1.2**: The vocabularies are distributed to 5 different categories. For each daily list, the system shall pick items randomly but proportionally by category according to total category size. 

  * The weight of each category should be based on the total number of vocabulary available due to the fact that more vocabulary can be added.

  * If a category has **fewer remaining new items than the quota or runs out of new words**, the system should pull extra items from other categories **proportionally by their weights**.

| Category | Weight | Approx. Daily New Items |
| ----- | ----- | ----- |
| Phrasal verbs | 13% | 5 |
| Idioms | 7% | 3 |
| Topic vocabulary | 44% | 18 |
| Grammar | 3% | 1–2 |
| Phrases & collocations | 5% | 2 |
| Word formation | 6% | 3 |

---

### **2\. Daily Learning**

* #### **FR2.1**: The system shall generate the vocabulary list for that day. Daily playlists shall include both review and new items, respecting the FR1. 

  * If there aren’t enough due review items for the ratio, the system should **fill with more new items** while keeping total daily count.

  * The trigger event to create the list for today learning shall run when:

    * The app is launched/opened.

    * Or the user returns to the app after midnight (date change detected). This refers to the situation where the app was already opened before midnight (local device time), the user leaves it running (in foreground or background), and then reopens or resumes it after midnight. The app should detect that the calendar date has changed and trigger a **daily review list regeneration** without requiring the user to manually refresh or restart the app.

  * The system shall store the generated daily list in memory for the current session and persist it in the local database for offline use.

  * When the audio playback of the current word (and its meaning/example sentence) finishes, the system shall automatically select the next word to play from the current daily list.

* #### **FR2.2**: Items from the same category shall not appear consecutively more than twice. 

  * When the audio playback of the current word (and its meaning/example sentence) finishes, the system shall automatically select the next word to present from the current daily list.

* #### **FR2.3:** For each item’s spaced repetition in a day, the repetition rule should follow below

| Exposure \# | Interval (minutes) from the last exposure | Sample actual time |
| :---- | :---- | :---- |
| 1 | 0 | 9:00 |
| 2 | 5 | 9:05 |
| 3 | 7 | 9:12 |
| 4 | 10 | 9:22 |
| 5 | 15 | 9:37 |
| 6 | 30 | 10:07 |
| 7 | 60 | 11:07 |
| 8 | 90 | 12:37 |
| \>8 | 120 | … |

  * The time is calculated from the actual play time of the item. From the \#8 exposure onwards, items shall be scheduled to play once every 120 minutes since the last review.

* #### **FR2.4:** Once the playlist/round of all words per day is complete, the playlist restarts from the beginning of today’s items in a loop until stopped manually. 

* #### **FR2.5**: Same-day repeats shall be spaced by at least 5 intervening items. 

  * Those repetitions **cannot** be right after each other — no immediate back-to-back repeat (e.g: take off \- take off X)

  * There must be **at least 5 different items in between** before the same word appears again.

---

### **3\. Review Scheduling**

* #### **FR3.1**: After initial exposure, items shall be reviewed according to the following intervals: 

| Review \# | Interval (days) from the last review | Sample actual day (e.g: The first exposure is Aug 1st) |
| ----- | ----- | ----- |
| 1 | 1 | Aug 2 |
| 2 | 2 | Aug 4 |
| 3 | 3 | Aug 7 |
| 4 | 5 | Aug 12 |
| 5 | 7 | Aug 19 |
| 6 | 10 | Aug 29 |
| 7 | 14 | Sep 12 |
| 8 | 21 | Oct 10 |
| 9 | 28 | Nov 7 |
| 10 | 35 | Dec 12 |
| \>10 | 60 | … |

  * Intervals are calculated in exact calendar days based on the actual date of the last review; if a review is delayed (because the user does not open the app), all future dates shift accordingly.

  * If a scheduled review date falls on a day when the user has already reached their maximum review quota, the item should be pushed to the next day, maintaining the original sequence of intervals.

* #### **FR3.2 (optional)**: If an item is marked as “forgotten” by the user (optional interaction), its next review date shall reset to day 1\. 

* #### **FR3.3**: If no explicit user feedback is given, the system determines the item is retained and continues its scheduled progression. 

* #### **FR3.4:** From 10th scheduled review and onwards, the item shall be marked as mastered and scheduled for maintenance reviews at long intervals (once every 60 days from the last review) 

  * These items shall be removed from the active daily review playlist and no longer compete with new items for scheduling.

---

### **4\. Retirement**

* #### **FR4.1**: Once a user confirms to retire a word, it shall be marked as “retired.” 

  * An item can be retired **at any stage** of learning (new, in-progress, or mastered).

* #### **FR4.2**: Retired items shall only appear once every 100 days from the last review for maintenance exposure. 

---

### **5\. System Behavior**

* #### **FR5.1**: The algorithm shall operate without requiring active recall tests. 

  * The algorithm should work in a **purely passive** learning mode — the user doesn’t need to answer quizzes, type answers, or press any button.

* #### **FR5.2:** The daily data learning should be cleared daily in order to reduce the overload of browser since the application is serverless and runs totally in the browser. 

  * The cleanup occurs at 00:00 daily according to the user's timezone.

* #### **FR5.3:** Clearing daily data **does not reset spaced repetition**
  * SRS history is stored separately in local storage.