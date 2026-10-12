# 🗣️ BoloYaar AI

### Your Voice. Your Conversation. Your AI Yaar.

BoloYaar AI is a **voice-first AI conversational assistant** designed to provide natural, interactive conversations through speech. The system allows users to communicate with the AI using their voice, while the entire conversational intelligence is powered by a **locally hosted Large Language Model (LLM)**.

The application combines **Speech-to-Text, Local LLM inference, Retrieval-Augmented Generation (RAG), and Text-to-Speech** to create a complete voice-based AI interaction pipeline.

---

## 🌟 Vision

BoloYaar AI aims to make AI interaction more natural by allowing users to simply **press a button and start talking**.

Instead of typing prompts, users interact with the system through voice.

> **Tap → Speak → AI Understands → AI Thinks → AI Responds**

The goal is to create an AI companion that feels conversational, accessible, and easy to use.

---

## ✨ Key Features

### 🎙️ Voice-First Interaction

The application provides a simple mobile interface with a **central circular voice button**.

When the user taps the button:

1. BoloYaar AI greets the user through voice.
2. The conversation session begins.
3. The user speaks naturally.
4. Speech is converted into text.
5. The local LLM processes the user's query.
6. RAG retrieves relevant information when required.
7. The generated response is converted back into speech.
8. The AI speaks the response to the user.

---

### 🗣️ Speech-to-Text

BoloYaar AI uses **Whisper 3.2B** for speech recognition.

The user's voice is captured through the mobile application and converted into text before being passed to the conversational AI pipeline.

**Pipeline:**

                    ┌─────────────────────────┐
                    │       MOBILE APP        │
                    │                         │
                    │   🔵 Tap & Speak        │
                    │   🎙️ Voice Input       │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   DJANGO + FLASK API    │
                    │      Backend Layer      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    SPEECH TO TEXT       │
                    │      Whisper 3.2B       │
                    └────────────┬────────────┘
                                 │
                                 │ User Query
                                 ▼
              ┌────────────────────────────────────┐
              │              RAG LAYER              │
              │                                     │
              │  Retrieve relevant information      │
              │  from the Knowledge Base             │
              └──────────────────┬─────────────────┘
                                 │
                    Relevant Context + Query
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       LOCAL LLM         │
                    │         3.2B             │
                    │                         │
                    │  Generate AI Response    │
                    └────────────┬────────────┘
                                 │
                                 │ Response Text
                                 ▼
                    ┌─────────────────────────┐
                    │     TEXT TO SPEECH      │
                    │   Kitten TTS / gTTS     │
                    └────────────┬────────────┘
                                 │
                                 │ Voice Response
                                 ▼
                    ┌─────────────────────────┐
                    │       MOBILE APP        │
                    │                         │
                    │   🔊 AI Voice Response  │
                    └─────────────────────────┘


       ┌────────────────────────────────────────────┐
       │              RAG KNOWLEDGE BASE             │
       │                                             │
       │  📄 Documents   🌐 Web Data   📚 Custom Data│
       │                                             │
       └──────────────────────┬─────────────────────┘
                              │
                              ▼
                         RAG Retriever
                              │
                              ▼
                         Relevant Context


                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │                     │
                    │ • Users             │
                    │ • Conversations     │
                    │ • Chat History      │
                    │ • Application Data  │
                    └─────────────────────┘
