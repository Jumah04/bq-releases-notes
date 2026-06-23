# BigQuery Release Pulse 🚀

**BigQuery Release Pulse** is a lightweight, responsive, and visually stunning web application designed to track Google Cloud BigQuery release updates. It parses official Atom feed release notes, dynamically organizes updates by category, offers search and filter capabilities, and provides a built-in composer to draft and preview tweets before sharing them to X (Twitter).

---

## 🌟 Features

*   **Live Synchronization**: Fetches the official Google Cloud BigQuery release notes Atom feed in real-time.
*   **Smart Categorization**: Daily release notes are parsed and segmented into clean cards by type:
    *   ✨ **Features**: New capability releases and enhancements.
    *   🔄 **Changes**: Modifications to existing functionality.
    *   ⚠️ **Deprecated**: Features scheduled for deprecation or removal.
    *   🛠️ **Fixed**: Bug fixes and resolved issues.
    *   📄 **Other**: General notes and notices.
*   **Powerful Filtering & Sorting**:
    *   Real-time search across date, type, and content.
    *   Filter updates by category type.
    *   Sort entries chronologically (Newest First / Oldest First).
*   **Social Sharing Hub**:
    *   Quick-share any update directly to X (Twitter).
    *   Automatic character counting (max 280 chars) with warnings.
    *   Pre-composed tweets with relevant hashtags (`#BigQuery #GCP`) and a direct link back to official documentation.
*   **Modern Visual Design**: Uses Outfit and Plus Jakarta Sans typography, custom gradients, interactive hover states, card micro-animations, skeleton screen loaders, and customized toast notifications.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, [Flask](https://flask.palletsprojects.com/)
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Custom Variables, Flexbox, Grid), Semantic HTML5
- **Feed Parser**: XML Document Object Model Parsing (`xml.etree.ElementTree` in Python, `DOMParser` in JavaScript)

---

## 📂 Project Structure

```text
bq-releases-notes/
├── app.py                # Flask application, backend XML feed fetching & basic JSON API routing
├── templates/
│   └── index.html        # Main HTML5 semantic structure & modal overlays
├── static/
│   ├── css/
│   │   └── style.css     # UI Styling (HSL variables, glassmorphism, responsive grid, animations)
│   └── js/
│       └── app.js        # Core logic: API consumption, HTML parser, filtering, & modal/toast controls
├── .gitignore            # Standard ignores for python, environments, and IDEs
└── README.md             # Project documentation (this file)
```

---

## ⚡ Getting Started

### Prerequisites

Ensure you have Python 3.8+ installed on your system.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jumah04/bq-releases-notes.git
   cd bq-releases-notes
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install Flask
   ```

### Running the Application

1. Start the Flask local development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```text
   http://127.0.0.1:5000
   ```

---

## 🧪 How It Works Under the Hood

1. **Backend Fetching**: `app.py` initiates a secure HTTP request to `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` using a custom User-Agent, parsing the Atom feed xml namespace structure to produce clean JSON.
2. **Frontend Segment Extraction**: Because Google groups multiple release updates under single daily XML entry contents, `static/js/app.js` runs a segmenter that detects `<h3>` tags (e.g. *Feature*, *Change*) and splits them into distinct UI cards.
3. **Dynamic Filtering**: The DOM is rendered reactively in the browser whenever the search query input changes, or dropdown filters are selected, maintaining performance without hitting external APIs repeatedly.
