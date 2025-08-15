# **Lazy Voca Backend — PO Summary Note**

**Product name:** Lazy Voca (cloud backend)

**Owner:** Product Hunter (PO)

**Date:** 2025‑08‑14

**Purpose:** Enable multi‑device learning and cloud‑synced progress for Lazy Voca learners by introducing a backend server.

---

## **Problem**

Progress is currently stored locally on each device, preventing multi‑device learning and risking data loss.

---

## **Goals**

* Store learner identity (email, nickname) and progress in the backend.  
* Allow seamless learning across devices.  
* Lay groundwork for advanced features (analytics, spaced repetition).  
* Maintain low cost and minimal operational overhead.

---

## **Non‑Goals (MVP)**

* No major UI/UX redesign.  
* No social or community features.  
* No complex admin dashboard beyond basic content import.

---

## **Key Functional Requirements**

1. **Account & Auth** – Sign‑up/sign‑in with email \+ nickname.  
2. **Multi‑Device Sync** – Real‑time or near‑real‑time sync of progress across devices.  
3. **Vocabulary Access** – API to retrieve vocabulary by category or search.  
4. **Daily List Generation** – Follow FR2 rules for mixing review and new items.  
5. **Progress Tracking** – Save review events and SRS scheduling data.  
6. **Data Import** – Merge existing local progress into the cloud.  
7. **Basic Admin Tools** – Upload vocabulary and assets.  
8. **Basic Analytics** – Track active users, review counts, accuracy.

---

## **Non‑Functional Requirements**

* **Availability:** 99.9% uptime.  
* **Latency:** p95 under 400ms.  
* **Security:** Minimal PII, encryption in transit/at rest.  
* **Scalability:** Support at least 100K monthly active users.  
* **Cost:** Target \<$200/month for 10K MAU.

---

## **PO Notes for Dev Team**

* **Database schema** must be derived from existing Lazy Voca code and data structures to ensure alignment.  
* **Tech stack**: AWS Cognito (auth), API Gateway \+ Lambda (API), Aurora Serverless PostgreSQL (DB), S3 (assets), EventBridge/SQS (async), CloudWatch/X‑Ray (monitoring), AWS CDK (IaC). ORM/migrations to be agreed by dev team.  
* **Sync rules**: Server is the source of truth; merges based on timestamps; idempotent event handling.  
* **Migration plan**: Client export → backend import → merge → switch to server‑authoritative mode.  
* **Testing**: Contract, unit, integration, load, and security tests.

---

## **Success Criteria (MVP)**

* Users can sign in, see my progress saved from the server, learn on one device, and resume on another within 5 seconds.  
* Import from local storage works without data loss.  
* Admin can upload vocabulary and audio mappings.  
* Performance and error rate meet targets.

