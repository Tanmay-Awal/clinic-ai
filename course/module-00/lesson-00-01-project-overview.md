# Module 0 - Lesson 0.1 - Project Overview

## Goal of this lesson

By the end of this lesson, you should be able to explain:
- what this project is
- why it exists
- what each major folder does
- how the frontend, backend, and bot fit together
- what happens from a phone call to a dashboard update

This lesson is the foundation for everything else.

---

## 1. What is this project?

This project is a clinic voice automation system.

That means it is software that helps a clinic handle phone conversations automatically.

Instead of a human answering every call immediately, the system can:
- answer the call
- understand what the caller wants
- book appointments
- reschedule appointments
- detect urgent situations
- create follow-up actions
- store the conversation
- show analytics in a web dashboard

At a high level, the system has three major parts:

- Frontend: the web interface
- Backend: the API and database logic
- Bot: the live voice assistant that talks on the phone

These three parts work together, but they do different jobs.

---

## 2. Why does this project exist?

The project exists because clinics receive a lot of repetitive phone calls.

Examples:
- "What are your hours?"
- "I want to book an appointment."
- "Can I reschedule?"
- "Is this urgent?"
- "What doctor should I see?"

If staff had to answer every call manually, it would take time and create delays.

This project solves that by automating the first layer of communication.

The bot handles the conversation.
The backend stores and processes the results.
The frontend shows the clinic team what happened.

Without this system:
- calls would be slower to answer
- staff would spend more time on repetitive tasks
- conversations would not be analyzed automatically
- there would be less visibility into call performance

---

## 3. The three major folders

Your repository is organized into three main application folders:

- [`D:\Clinic Development Sales\clinic-frontend`](D:\Clinic%20Development%20Sales\clinic-frontend)
- [`D:\Clinic Development Sales\clinic-backend`](D:\Clinic%20Development%20Sales\clinic-backend)
- [`D:\Clinic Development Sales\clinic-bot`](D:\Clinic%20Development%20Sales\clinic-bot)

### 3.1 Frontend

The frontend is the user-facing website.

It is built with:
- Next.js
- React
- TypeScript

Its job is to:
- show dashboards
- show calls
- show insights
- show reports
- show admin pages
- show chatbot and WhatsApp pages

Important entry files include:
- [`D:\Clinic Development Sales\clinic-frontend\src\app\layout.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\app\layout.tsx)
- [`D:\Clinic Development Sales\clinic-frontend\src\app\page.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\app\page.tsx)
- [`D:\Clinic Development Sales\clinic-frontend\src\components\AppLayout.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\components\AppLayout.tsx)

### 3.2 Backend

The backend is the server that exposes APIs.

It is built with:
- NestJS
- TypeScript
- PostgreSQL
- TypeORM

Its job is to:
- authenticate users
- store calls and appointments
- manage actions
- generate dashboard data
- provide report data
- accept call ingestion from the bot

Important entry files include:
- [`D:\Clinic Development Sales\clinic-backend\src\main.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\main.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\app.module.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\app.module.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\call\call.controller.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\call\call.controller.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\call\call.service.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\call\call.service.ts)

### 3.3 Bot

The bot is the live voice agent.

It is built with:
- Python
- FastAPI
- Pipecat
- Twilio
- Deepgram
- Cartesia
- Groq

Its job is to:
- receive live audio from phone calls
- transcribe speech to text
- understand the caller
- decide what to say next
- speak back to the caller
- send the finished call data to the backend

Important entry files include:
- [`D:\Clinic Development Sales\clinic-bot\server.py`](D:\Clinic%20Development%20Sales\clinic-bot\server.py)
- [`D:\Clinic Development Sales\clinic-bot\bot.py`](D:\Clinic%20Development%20Sales\clinic-bot\bot.py)
- [`D:\Clinic Development Sales\clinic-bot\tools.py`](D:\Clinic%20Development%20Sales\clinic-bot\tools.py)
- [`D:\Clinic Development Sales\clinic-bot\runtime.py`](D:\Clinic%20Development%20Sales\clinic-bot\runtime.py)

---

## 4. What each part is responsible for

### Frontend responsibility

The frontend is for humans using a browser.

It displays:
- metrics
- lists
- forms
- tables
- charts
- call details
- action management

It does not directly talk to the database.
It talks to the backend through HTTP APIs.

### Backend responsibility

The backend is the business and data layer.

It:
- receives requests from the frontend
- checks authentication and security
- reads and writes the database
- returns structured JSON responses
- accepts ingestion from the bot

### Bot responsibility

The bot is the real-time conversation layer.

It:
- listens and speaks in a live call
- uses speech-to-text and text-to-speech
- uses an LLM to reason
- decides what flow to follow
- sends completed call data to the backend

---

## 5. The end-to-end workflow

Here is the complete story of a typical call:

1. A patient calls the clinic number.
2. Twilio receives the call.
3. Twilio opens a WebSocket connection to the Python bot.
4. The bot starts a Pipecat audio pipeline.
5. The bot receives live audio frames.
6. Deepgram converts speech into text.
7. The bot classifies the caller intent.
8. The LLM decides what to say next.
9. Cartesia converts the bot response into speech.
10. Twilio streams the audio back to the caller.
11. If the caller wants an appointment, the bot asks the backend for available slots.
12. If the caller books or reschedules, the bot updates backend data through API calls.
13. When the call ends, the bot sends a call ingestion payload to the backend.
14. The backend saves the call and triggers analysis.
15. The frontend later reads that data and shows it in dashboards and tables.

This is the most important workflow in the whole project.

---

## 6. How the codebase is layered

Think of the project as three layers:

### Presentation layer

This is the frontend.

It answers:
- What does the user see?
- What buttons and charts exist?
- How do we navigate the app?

### Service layer

This is the backend.

It answers:
- What does this data mean?
- Who is allowed to access it?
- How do we store and query it?

### Conversation layer

This is the bot.

It answers:
- What does the caller want?
- What should the assistant say next?
- How should the voice call progress?

---

## 7. How the layers communicate

The layers talk to each other using APIs and network protocols.

### Frontend to backend

The frontend uses HTTP requests.

Example:
- browser sends a request
- backend returns JSON

You can see that pattern in:
- [`D:\Clinic Development Sales\clinic-frontend\src\lib\api\client.ts`](D:\Clinic%20Development%20Sales\clinic-frontend\src\lib\api\client.ts)

### Bot to backend

The bot also uses HTTP requests.

Example:
- bot asks for clinic context
- bot asks for appointment slots
- bot sends final call data

You can see that in:
- [`D:\Clinic Development Sales\clinic-bot\runtime.py`](D:\Clinic%20Development%20Sales\clinic-bot\runtime.py)
- [`D:\Clinic Development Sales\clinic-bot\tools.py`](D:\Clinic%20Development%20Sales\clinic-bot\tools.py)

### Twilio to bot

Twilio uses WebSockets for live audio streaming.

That means the connection stays open while the call is active.

You can see that in:
- [`D:\Clinic Development Sales\clinic-bot\server.py`](D:\Clinic%20Development%20Sales\clinic-bot\server.py)

---

## 8. What technologies are present?

This project uses many technologies.

### Frontend technologies
- Next.js
- React
- TypeScript
- Tailwind CSS
- React Query
- Zustand

### Backend technologies
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Passport JWT
- class-validator
- throttling and security middleware

### Bot technologies
- Python
- FastAPI
- Pipecat
- Twilio
- Deepgram
- Cartesia
- Groq
- aiohttp

Each of these will get its own lesson later.

---

## 9. What files matter most first?

If you are learning from zero, these are the first files to understand:

### Frontend
- [`D:\Clinic Development Sales\clinic-frontend\src\app\layout.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\app\layout.tsx)
- [`D:\Clinic Development Sales\clinic-frontend\src\app\page.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\app\page.tsx)
- [`D:\Clinic Development Sales\clinic-frontend\src\components\AppLayout.tsx`](D:\Clinic%20Development%20Sales\clinic-frontend\src\components\AppLayout.tsx)
- [`D:\Clinic Development Sales\clinic-frontend\src\lib\api\client.ts`](D:\Clinic%20Development%20Sales\clinic-frontend\src\lib\api\client.ts)
- [`D:\Clinic Development Sales\clinic-frontend\src\store\authStore.ts`](D:\Clinic%20Development%20Sales\clinic-frontend\src\store\authStore.ts)

### Backend
- [`D:\Clinic Development Sales\clinic-backend\src\main.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\main.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\app.module.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\app.module.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\call\call.service.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\call\call.service.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\user\user.service.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\user\user.service.ts)
- [`D:\Clinic Development Sales\clinic-backend\src\dashboard\dashboard.service.ts`](D:\Clinic%20Development%20Sales\clinic-backend\src\dashboard\dashboard.service.ts)

### Bot
- [`D:\Clinic Development Sales\clinic-bot\server.py`](D:\Clinic%20Development%20Sales\clinic-bot\server.py)
- [`D:\Clinic Development Sales\clinic-bot\bot.py`](D:\Clinic%20Development%20Sales\clinic-bot\bot.py)
- [`D:\Clinic Development Sales\clinic-bot\runtime.py`](D:\Clinic%20Development%20Sales\clinic-bot\runtime.py)
- [`D:\Clinic Development Sales\clinic-bot\tools.py`](D:\Clinic%20Development%20Sales\clinic-bot\tools.py)

---

## 10. What you should understand before the next lesson

Before we move on, make sure you can answer these in your own words:

1. What are the 3 major parts of the system?
2. What does each part do?
3. Why is the bot separate from the backend?
4. Why does the frontend use the backend instead of accessing the database directly?
5. What happens when a patient makes a phone call?

---

## 11. Mini interview questions

Beginner:
- What problem does this project solve?
- What are the three main folders?
- Which part talks to users in the browser?

Intermediate:
- Why should the bot not directly write to the database?
- Why is the backend responsible for security and validation?
- What is the difference between real-time call handling and dashboard rendering?

Interview level:
- If the frontend and backend are unavailable, can the bot still answer calls?
- If Twilio is working but the backend is down, what happens?
- Why is this architecture easier to maintain than putting everything in one codebase?

---

## 12. What comes next?

The next lesson should explain the end-to-end architecture in more detail:
- browser requests
- backend APIs
- database
- bot runtime
- WebSockets
- call ingestion

That will be the best next file to read after this one.

