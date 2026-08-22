# 🎓 Bangladesh HSC College Statistics & Historical Performance Archive

An editorial, high-performance web platform designed and owned by **MD. Mahinur Rahman Prachurza (Prachurza)** in collaboration with **Fahad's Tutorial (FT)** to help **SSC-26 Graduates and Parents in Bangladesh** explore, compare, and analyze top **HSC Colleges** across all 64 districts in Bangladesh based on official Education Board Result Publication analytics.

[![HSC College Statistics Portal Preview](./assets/preview.png)](https://hoppy-beast.github.io/College-Selection/)

👉 **Live Production URL**: **[https://hoppy-beast.github.io/College-Selection/](https://hoppy-beast.github.io/College-Selection/)**

---

## 👤 Owner & Partner Information

- **Project Owner & Lead Developer**: **MD. Mahinur Rahman Prachurza (Prachurza)**
- **Community & Learning Partner**: **[Fahad's Tutorial (FT)](https://ft.education/)**
- **Target Audience**: **SSC-26 Candidates, Teachers & Parents**
- **Official Board Result Verification**: **[educationboardresults.gov.bd](https://www.educationboardresults.gov.bd/v2/home)** (HSC-25 Baseline).
- **Dhaka Board Seat Benchmark Source**: **[Dhaka Education Board ERP Seat List 2025](https://erp.dhakaeducationboard.gov.bd/index.php/tc/seat_list/2025)**.

---

## ✨ Key Features (v6.0 Edition)

- ⚡ **Dual-Module On-Demand Board Chunk Loading**: Initial page load downloads **0 KB** of college or seat data. When a user selects any Education Board, only the required lightweight board chunk is fetched with instant in-memory caching (saving **85% to 96%** bandwidth).
- 🔘 **Quick Board Selector Chips**: 1-click quick board selection bar directly inside the filter panels across both analytical and requirements modules (`[ Dhaka ] [ Rajshahi ] [ Chittagong ] ...`).
- 📊 **Multi-Sort Priority Builder**: Add up to 3 priority rankings (e.g. GPA-5 Rate &rarr; Total Examinees &rarr; Pass Rate) with stream-aware logic and 2-decimal precision tie-breaking.
- 🏛️ **All Boards Class XI Minimum GPA & Seat Capacity Benchmark (2025 Archive)**: Independent search and candidate matcher tool with minimum GPA cutoff requirements and approved seat capacity data across **7,734 institutions (2.6M+ approved seats)** spanning all 10 Education Boards.
- 🎯 **Candidate SSC GPA Benchmark Matcher**: Enter your exact SSC GPA (0.00 - 5.00) to automatically verify eligibility across all course streams, highlight qualifying institutions, and toggle *"Show ONLY Institutions Where GPA &ge; Required Min GPA"*.
- 🎨 **High-Contrast Editorial Design System**: Designed using **Space Grotesk** and **Plus Jakarta Sans**, sharp structural boundaries, high-contrast dark carbon theme, and zero emojis.
- 🇧🇩 **Comprehensive Nationwide Coverage**: Complete coverage across all 10 Education Boards (Dhaka, Rajshahi, Chittagong, Comilla, Sylhet, Barisal, Dinajpur, Jessore, Mymensingh, Madrasah).

---

## 🚀 Quickstart: How to Run Locally

### Option 1: Direct File Open (Zero Setup)
Simply open `index.html` in any web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Using Python Local Web Server (Recommended)
Open a terminal in the project directory and run:
```bash
python -m http.server 8000
```
Then visit **[http://localhost:8000](http://localhost:8000)** in your browser.

### Option 3: Using VS Code Live Server
1. Install the **Live Server** extension in Visual Studio Code.
2. Right-click on `index.html` &rarr; Click **"Open with Live Server"**.

---

## 🌐 How to Clone & Deploy on Your Own GitHub Pages

You can host your own copy of this portal for free on GitHub Pages in under 2 minutes:

### 1. Clone the Repository
```bash
git clone https://github.com/Hoppy-Beast/College-Selection.git
cd College-Selection
```

### 2. Connect to Your Own GitHub Repository
```bash
# Set your new GitHub repository URL
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push the code
git push -u origin main
```

### 3. Enable GitHub Pages
1. Go to your GitHub repository **Settings**.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment &rarr; Source**, choose **Deploy from a branch**.
4. Set the branch to **`main`** / **`/ (root)`** and click **Save**.
5. Your website will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` in 30 seconds!

---

## 🔄 Maintenance & Scraper Pipeline (Updating Data for Next Batches)

When new batch results or seat lists are published by the Education Boards, follow these simple steps to update the live platform:

### Step 1: Scrape Official Results (Exam Performance)
Run the high-speed multi-threaded scraper:
```bash
python scraper.py
```

### Step 2: Compile & Split Board Chunks (Exam Performance)
```bash
python build_full_dataset.py
python build_board_chunks.py
```

### Step 3: Scrape & Build All Boards Class XI Seat Requirements
Place all official PDF circulars in `all-boards/` (e.g. `ঢাকা_.pdf`, `রাজশাহী_.pdf`, etc.) and run:
```bash
python build_requirements_dataset.py
```

### Step 4: Deploy Updates to GitHub Pages
```bash
git add .
git commit -m "Update college datasets for new academic batch"
git push origin main
```

---

## 📁 Repository File Map

```
├── index.html                  # Main application markup & dual-mode UI structure
├── style.css                   # High-contrast editorial design system
├── app.js                      # Dual-module app logic & on-demand chunk loader
├── assets/                     # Logos, favicon, and preview media (preview.png, logo.png)
├── all-boards/                 # Official source PDFs for all 10 Education Boards
│   ├── ঢাকা_.pdf               # Dhaka Board official circular
│   ├── রাজশাহী_.pdf            # Rajshahi Board official circular
│   ├── চট্টগ্রাম_.pdf           # Chittagong Board official circular
│   ├── কুমিল্লা_.pdf            # Comilla Board official circular
│   ├── সিলেট_.pdf              # Sylhet Board official circular
│   ├── বরিশাল_.pdf             # Barisal Board official circular
│   ├── দিনাজপুর_.pdf           # Dinajpur Board official circular
│   ├── যশোর_.pdf              # Jessore Board official circular
│   ├── ময়মনসিংহ_.pdf           # Mymensingh Board official circular
│   └── মাদ্রাসা_.pdf            # Madrasah Board official circular
├── data/
│   ├── boards/                 # Module 1: Academic analytics board chunks
│   ├── requirements/           # Module 2: All 10 boards seat & GPA cutoff chunks
│   │   ├── dhaka.json          # Dhaka Board (1,121 colleges • 518,106 seats)
│   │   ├── rajshahi.json       # Rajshahi Board (809 colleges • 386,670 seats)
│   │   ├── dinajpur.json       # Dinajpur Board (703 colleges • 327,410 seats)
│   │   ├── jessore.json        # Jessore Board (588 colleges • 220,489 seats)
│   │   ├── comilla.json        # Comilla Board (460 colleges • 257,510 seats)
│   │   ├── barisal.json        # Barisal Board (364 colleges • 156,898 seats)
│   │   ├── sylhet.json         # Sylhet Board (330 colleges • 138,735 seats)
│   │   ├── mymensingh.json     # Mymensingh Board (306 colleges • 130,745 seats)
│   │   ├── chittagong.json     # Chittagong Board (279 colleges • 168,379 seats)
│   │   ├── madrasah.json       # Madrasah Board (2,774 institutions • 309,255 seats)
│   │   ├── all_colleges.json   # Combined national seat requirements catalog (7,734 institutions)
│   │   └── manifest.json       # Requirements manifest registry & summary metrics
│   ├── colleges.json           # Complete national academic database
│   └── dhaka_colleges.json     # Backwards-compatible Dhaka dataset
├── scraper.py                  # High-speed multi-threaded board result scraper
├── build_full_dataset.py       # Data compiler and aggregation pipeline
├── build_board_chunks.py       # Splits colleges.json into on-demand board chunks
├── build_requirements_dataset.py # Scrapes all-boards/*.pdf into data/requirements/*.json
├── .nojekyll                   # Bypasses Jekyll for static asset serving on GitHub Pages
├── .gitignore                  # Git ignore configuration
└── README.md                   # Project documentation & guides
```

---

## ⚖️ Disclaimer & Source Attribution

- **Educational Purpose**: This platform is an independent archival statistics tool created to help students and parents review historical academic benchmarks.
- **Verification**: Historical data may be cross-checked directly on official government portals:
  - [Dhaka Education Board ERP Seat List](https://erp.dhakaeducationboard.gov.bd/index.php/tc/seat_list/2025)
  - [Web Based Result Publication System](https://www.educationboardresults.gov.bd/v2/home)
  - [Official XI Class Admission Portal](http://xiclassadmission.gov.bd)
