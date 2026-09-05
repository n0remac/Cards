# AI-Powered Trading Card Game

## Overview
Welcome to our unique AI-powered trading card game, where every card is a one-of-a-kind creation! In this game, players collect and use cards that are uniquely generated for them, with artwork created by the ChatGPT API. This ensures a fresh and personalized experience for every player.

## Features
- **Unique Card Generation**: Each card in the game is generated uniquely for each user, ensuring no two cards are the same.
- **AI-Generated Artwork**: The artwork for each card is created using the ChatGPT API, offering a wide range of creative and diverse visuals.
- **Interactive Gameplay**: Engage in battles, trade cards, and build your unique deck to compete against others.

## Getting Started

### Prerequisites
- Node.js
- Go (Golang)
- Rust 1.96 (the pinned toolchain is installed automatically by rustup)
- tmux (for the local development launcher)

### Setting Up the Project

1. **Clone the Repository**
   ```bash
   git clone https://github.com/n0remac/Cards.git
   cd Cards
   ```

2. **Set Up the Frontend (React)**
   - From the repository root, install dependencies:
     ```bash
     npm install
     ```
   - Start the React development server:
     ```bash
     npm run dev
     ```

3. **Set Up the Backend (Go)**
   - Ensure you are in the project's root directory.
   - Install Go dependencies:
     ```bash
     go mod tidy
     ```
   - Run the Go server:
     ```bash
     go run .
     ```

4. **Start the Dice Physics Service**
   - The `/dice` route uses a separately running authoritative Rust service:
     ```bash
     cargo run -p cards-dice-service
     ```
   - The Go server proxies `/dice/ws` to `http://127.0.0.1:8081` by default.
     Override that private upstream with `DICE_SERVICE_URL` when needed.

5. **Access the Game**
   - Open your browser at the URL printed by the frontend development server.

### Start All Services with tmux

After installing the dependencies, start the Go backend, React frontend, and
Rust dice service in separate tmux windows with:

```bash
./dev.sh
```

The script creates a `cards` session with `backend`, `frontend`, and `dice`
windows, then attaches to it. Use `Ctrl-b n` and `Ctrl-b p` to move between
windows. To start it without attaching, pass `--detached`. To stop everything:

```bash
tmux kill-session -t cards
```

Set `CARDS_TMUX_SESSION` to use a different session name.
