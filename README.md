# 🗣️ BoloYaar AI

> **Your Voice. Your Conversation. Your AI Yaar.**
> A voice-first AI companion with a crafted light theme, powered by a locally hosted Large Language Model (LLM) and optional Cloudflare Tunnel deployment.

---

## ✨ Features

* 🎙️ **Voice-First Interaction**: Speak naturally with one tap. Audio is transcribed locally with Whisper STT and replied to with spoken audio.
* 🤖 **100% Local Intelligence**: Powered by **LLaMA 3.2 (3B)** via [Ollama](https://ollama.com). Runs entirely on your hardware with no paid cloud API keys required.
* 💬 **Dual Mode (Voice & Text)**: Use your microphone or type messages. All chats are permanently saved to your conversation history.
* 🎨 **Human-Crafted Light Theme**: Warm porcelain and sand aesthetic designed for comfort, clarity, and focus.
* 🌐 **Zero-Cost Remote Sharing**: Host on your PC and share with friends anywhere in the world using free **Cloudflare Tunnels** (HTTPS included).
* 📱 **PWA Ready**: Installable on iPhone, Android, and Desktop via "Add to Home Screen".

---

## 📁 Repository Structure

```
boloyaarai/
├── frontend/                    # Frontend Web App (HTML / Vanilla CSS / JS)
│   ├── index.html               # Main application interface
│   ├── manifest.json            # Progressive Web App manifest
│   ├── sw.js                    # Service Worker (offline cache)
│   ├── css/style.css            # Crafted light theme design system
│   └── js/
│       ├── config.js            # Base URL configuration (same-origin relative)
│       ├── api.js               # API client (JWT authentication)
│       ├── auth.js              # Sign in / Register logic
│       ├── voice.js             # Web Audio recording & visualizer
│       ├── chat.js              # Message rendering, TTS playback & history
│       └── app.js               # Bootstrap & navigation
│
├── backend/
│   ├── django_app/              # Main Backend (Users, Conversations, Auth, Frontend host)
│   │   ├── boloyaarai_project/  # Django settings, URLs, static routing
│   │   ├── apps/
│   │   │   ├── users/           # User accounts & JWT authentication
│   │   │   ├── conversations/   # Conversation sessions & message history
│   │   │   └── voice/           # Proxy to AI microservice
│   │   ├── manage.py
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   └── flask_ai/               # AI Microservice (STT, LLM inference, TTS)
│       ├── app.py               # faster-whisper + Ollama + gTTS endpoints
│       ├── requirements.txt
│       └── .env.example
│
├── cloudflare/
│   └── config.example.yml       # Cloudflare Tunnel configuration template
├── start.bat                    # Windows: 1-click start for local development
├── start_with_tunnel.bat        # Windows: 1-click start with public Cloudflare Tunnel
├── .gitignore                   # Excludes caches, venvs, and sensitive files
└── README.md                    # This guide
```

---

## 🚀 Moving to Your Personal PC (GitHub Setup)

### Part 1: Push from this Machine to GitHub

1. **Initialize Git and commit**:
   ```powershell
   cd C:\Boloyaarai
   git init
   git add .
   git commit -m "Initial commit: BoloYaar AI complete setup"
   ```

2. **Create a new repository on GitHub**:
   * Go to [github.com/new](https://github.com/new).
   * Name your repository (e.g. `boloyaarai`).
   * Choose **Public** or **Private**.
   * Leave "Initialize with README" **unchecked**.

3. **Push your code to GitHub**:
   ```powershell
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/boloyaarai.git
   git branch -M main
   git push -u origin main
   ```

---

### Part 2: Setup on Your Personal PC

#### Step 1: Install Prerequisites
1. **Python 3.11 or 3.12**: Download from [python.org](https://www.python.org/downloads/) (check *"Add python.exe to PATH"* during installation).
2. **Git**: Download from [git-scm.com](https://git-scm.com/).
3. **Ollama**: Download and install from [ollama.com](https://ollama.com).

#### Step 2: Download the AI Model
Open a terminal (Command Prompt or PowerShell) and run:
```bash
ollama run llama3.2
```
*This downloads the lightweight 3B model (~2.0 GB). Once the prompt appears, type `/bye` to exit.*

#### Step 3: Clone Your Repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/boloyaarai.git
cd boloyaarai
```

#### Step 4: Install Dependencies

1. **Django Backend**:
   ```bash
   cd backend\django_app
   pip install -r requirements.txt
   copy .env.example .env
   python manage.py migrate
   python manage.py createsuperuser   # (Optional: create your admin account)
   cd ..\..
   ```

2. **Flask AI Microservice**:
   ```bash
   cd backend\flask_ai
   pip install -r requirements.txt
   copy .env.example .env
   cd ..\..
   ```

---

### Part 3: Running the App on Your Personal PC

#### Option A: Quick Local Run (1-Click)
Double-click:
```
start.bat
```
*Or run it from the terminal:*
```bash
.\start.bat
```
This automatically starts:
1. Ollama (`llama3.2`)
2. Flask AI (Port `5000`)
3. Django Backend + Frontend (Port `8000`)
4. Opens **http://localhost:8000** in your browser!

---

#### Option B: Expose to the Internet via Your Domain (Cloudflare Tunnel)

To allow friends to open the app on their phone using `boloyaar.yourdomain.com`:

1. **Download Cloudflare Tunnel client**:
   Download `cloudflared-windows-amd64.exe` from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases/latest) and place it in the `boloyaarai` root folder as `cloudflared.exe`.

2. **Authenticate with your Cloudflare account**:
   ```powershell
   .\cloudflared.exe tunnel login
   ```
   *(A browser window opens. Select your domain, e.g. `someshtech.world`, to authorize).*

3. **Create your tunnel**:
   ```powershell
   .\cloudflared.exe tunnel create boloyaarai
   ```
   *Note the Tunnel UUID shown in the output.*

4. **Configure DNS**:
   ```powershell
   .\cloudflared.exe tunnel route dns YOUR_TUNNEL_UUID boloyaar.yourdomain.com
   ```

5. **Update `cloudflare/config.yml`**:
   ```yaml
   tunnel: YOUR_TUNNEL_UUID
   credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\YOUR_TUNNEL_UUID.json

   ingress:
     - hostname: boloyaar.yourdomain.com
       service: http://localhost:8000
       originRequest:
         connectTimeout: 30s
         keepAliveTimeout: 90s
         httpHostHeader: boloyaar.yourdomain.com

     - service: http_status:404
   ```

6. **Start all services with tunnel**:
   Double-click `start_with_tunnel.bat`!
   Your site will be live at `https://boloyaar.yourdomain.com`.

---

## 🔧 Configuration Details

### Django (`backend/django_app/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | Random string | Django security key |
| `DEBUG` | `False` | Debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,...` | Allowed hostnames |
| `FLASK_AI_URL` | `http://127.0.0.1:5000` | Address of Flask AI microservice |

### Flask AI (`backend/flask_ai/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama service endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Model name in Ollama |
| `WHISPER_MODEL_SIZE`| `base` | Whisper size (`base` for fast CPU, `large-v3` for GPU) |
| `WHISPER_DEVICE` | `cpu` | Device (`cpu` or `cuda`) |
| `FLASK_ENV` | `production` | Production mode (disables watchdog reload loop) |
| `FLASK_PORT` | `5000` | Port for Flask microservice |

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Vanilla Modern CSS, JavaScript ES6+ (No node/npm build step needed).
* **Backend API**: Python 3.12, Django 5.1, Django REST Framework, SimpleJWT.
* **AI & Speech**:
  * **LLM**: Meta LLaMA 3.2 (3B) running locally on Ollama.
  * **Speech-to-Text (STT)**: `faster-whisper` with Silero VAD (Voice Activity Detection).
  * **Text-to-Speech (TTS)**: Google TTS (`gTTS`).
* **Tunnel & Edge**: Cloudflare Zero Trust Tunnel with automated SSL/TLS.

---

## 📄 License
MIT License. Free to use, modify, and distribute.
