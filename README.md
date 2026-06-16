# BigQuery Release Notes Viewer & Tweet Poster

A modern web application built using Python Flask (backend) and vanilla HTML, CSS, and JavaScript (frontend). It parses the Google Cloud BigQuery Release Notes XML feed, displays them in a beautiful, interactive timeline, and enables sharing individual or multiple selected updates directly to Twitter/X.

## Key Features

- **Automated XML Parsing**: Fetches the official Google Cloud BigQuery Atom feed and parses it into discrete, easy-to-read updates.
- **Smart Caching**: Implements a 10-minute server-side memory cache to reduce external network calls and load pages instantly.
- **Dynamic Search & Filtering**: Instant client-side search by keyword and filtering by update type (e.g., Features, Issues, Changes, Deprecated).
- **Stunning Responsive UI**:
  - Premium **Slate Dark Mode** by default, with smooth transition to Light Mode.
  - Interactive **Timeline Feed** showing historical updates grouped by date.
  - Interactive status-coded tags (emerald features, rose issues, indigo changed, etc.).
- **Social Media Integration**:
  - **Single Update Tweet**: Quick share button on each card that formats the update and opens the Twitter intent dialog.
  - **Multi-Select Tweet Bar**: Select multiple cards to combine updates into a bulleted digest and tweet them collectively.
  - **Interactive Composer**: Built-in modal with real-time character count and truncation warnings for Twitter's 280-character limit.
- **Clipboard Utility**: One-click button to copy formatted release notes directly to the clipboard with visual confirmation feedback.

## Requirements

- Python 3.8+
- Flask

## Getting Started

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Flask server**:
   ```bash
   python app.py
   ```

3. **Access the application**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

## Project Structure

- `app.py`: Flask application containing feed fetch, cache management, XML parsing, and REST endpoints.
- `requirements.txt`: Python dependencies list.
- `templates/index.html`: Base page template containing layout structures for dark/light themes, modal composer, and selection bars.
- `static/css/style.css`: Modern responsive stylesheet defining theme variables, card designs, animations, and modal overlays.
- `static/js/main.js`: Main frontend script controlling fetching, search, filter chips, item selection state, copy utilities, and modal X-Twitter intent composition.
