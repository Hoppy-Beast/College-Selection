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

## ✨ Key Features (v5.0 Edition)

- ⚡ **On-Demand Board Chunk Loading**: Initial page load downloads **0 KB** of college data. When a user selects a board (e.g. Dhaka, Rajshahi, Chittagong), only the required lightweight board chunk (~200 KB – ~790 KB) is fetched with instant in-memory caching (saving **85% to 96%** bandwidth).
- 🔘 **Quick Board Selector Chips**: 1-click quick board selection bar directly inside the filter panel (`[ Dhaka ] [ Rajshahi ] [ Chittagong ] ...`).
- 📊 **Multi-Sort Priority Builder**: Add up to 3 priority rankings (e.g. GPA-5 Rate &rarr; Total Examinees &rarr; Pass Rate) with stream-aware logic and 2-decimal precision tie-breaking.
- 🏛️ **Dedicated Dhaka Board 2025 Benchmark Archive**: Independent search tool with Minimum GPA requirements and approved seat capacity data across 1,185 institutions from the official Dhaka Education Board archive.
- 🎨 **High-Contrast Editorial Design System**: Designed using **Space Grotesk** and **Plus Jakarta Sans**, sharp structural boundaries, high-contrast dark carbon theme, and zero emojis.
- 🇧🇩 **Nationwide Coverage (7,400+ Audited Colleges)**: Complete coverage across all 10 Education Boards (Dhaka, Rajshahi, Chittagong, Comilla, Sylhet, Barisal, Dinajpur, Jessore, Mymensingh, Madrasah).

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

### Step 1: Scrape Official Results
Run the high-speed multi-threaded scraper:
```bash
python scraper.py
```

### Step 2: Compile & Validate the National Dataset
```bash
python build_full_dataset.py
```

### Step 3: Split into Lightweight Board Chunks
```bash
python build_board_chunks.py
```

### Step 4: Update Dhaka Board Benchmark Dataset
Place the newly downloaded Excel file in the `data/` folder and run:
```bash
python build_dhaka_dataset.py
```

### Step 5: Deploy Updates to GitHub Pages
```bash
git add .
git commit -m "Update college datasets for new academic batch"
git push origin main
```

---

## 📁 Repository File Map

```
├── index.html                  # Main application markup & UI structure
├── style.css                   # High-contrast editorial design system
├── app.js                      # Dual-module app logic & on-demand chunk loader
├── assets/                     # Logos, favicon, and preview media (preview.png, logo.png)
├── data/
│   ├── boards/                 # 10 Lightweight board JSON chunks + manifest.json
│   │   ├── dhaka.json          # Dhaka Board (1,076 colleges)
│   │   ├── rajshahi.json       # Rajshahi Board (754 colleges)
│   │   ├── chittagong.json     # Chittagong Board (281 colleges)
│   │   ├── comilla.json        # Comilla Board (455 colleges)
│   │   ├── sylhet.json         # Sylhet Board (323 colleges)
│   │   ├── barisal.json        # Barisal Board (349 colleges)
│   │   ├── dinajpur.json       # Dinajpur Board (667 colleges)
│   │   ├── jessore.json        # Jessore Board (575 colleges)
│   │   ├── mymensingh.json     # Mymensingh Board (306 colleges)
│   │   ├── madrasah.json       # Madrasah Board (2,687 institutions)
│   │   └── manifest.json       # Chunk registry & metadata manifest
│   ├── dhaka_colleges.json     # Dhaka Board 2025 benchmark dataset (1,185 colleges)
│   ├── colleges.json           # Complete national database (7,473 institutions)
│   └── Board of Intermediate...xlsx # Raw official Dhaka Board dataset
├── scraper.py                  # High-speed multi-threaded board result scraper
├── build_full_dataset.py       # Data compiler and aggregation pipeline
├── build_board_chunks.py       # Splits colleges.json into on-demand board chunks
├── build_dhaka_dataset.py      # Parses Dhaka Board Excel into dhaka_colleges.json
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
