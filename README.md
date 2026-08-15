# 🎓 Bangladesh HSC College Selection Guide & Analytics

An editorial, high-performance web platform designed and owned by **MD. Mahinur Rahman Prachurza (Prachurza)** in collaboration with **Fahad's Tutorial (FT)** to help **SSC-26 Graduates and Parents in Bangladesh** discover, compare, and rank top **HSC Colleges** across all 64 districts in Bangladesh based on official Education Board Result Publication analytics.

[![HSC College Portal Preview](./assets/preview.png)](https://hoppy-beast.github.io/College-Selection/)

---

## 👤 Owner & Creator Information

- **Project Owner & Lead Developer**: **MD. Mahinur Rahman Prachurza (Prachurza)**
- **Community & Learning Partner**: **[Fahad's Tutorial (FT)](https://ft.education/)**
- **Target Audience**: **SSC-26 Candidates & Parents**
- **Official Board Result Verification**: **[educationboardresults.gov.bd](https://www.educationboardresults.gov.bd/v2/home)** (HSC-25 Baseline).
- **Dhaka Board Seat Benchmark Source**: **[Dhaka Education Board ERP Seat List 2025](https://erp.dhakaeducationboard.gov.bd/index.php/tc/seat_list/2025)**.

---

## ✨ Key Features (v5.0 Edition)

- **On-Demand Board Chunk Loading**: Initial page load downloads **0 KB** of college data. When a user selects a board (e.g. Dhaka, Rajshahi, Chittagong), only the lightweight board chunk (~200 KB – ~790 KB) is loaded with instant in-memory caching.
- **Quick Board Selector Chips**: 1-click quick board selection bar directly inside the filter panel (`[ Dhaka ] [ Rajshahi ] [ Chittagong ] ...`).
- **Multi-Sort Priority Builder**: Add up to 3 priority rankings (e.g. GPA-5 Rate &rarr; Total Examinees &rarr; Pass Rate) with stream-aware logic and 2-decimal precision tie-breaking.
- **Dedicated Dhaka Board 2025 Benchmark Archive**: Independent search tool with Minimum GPA requirements and approved seat capacity data from the official Dhaka Education Board archive.
- **Human Non-AI Editorial Design**: Designed using **Space Grotesk** headings, sharp structural boundaries, high-contrast dark carbon theme, and zero emojis.
- **Nationwide Coverage (7,400+ Audited Colleges)**: Complete coverage across all 10 Education Boards (Dhaka, Rajshahi, Chittagong, Comilla, Sylhet, Barisal, Dinajpur, Jessore, Mymensingh, Madrasah).

---

## 📁 Repository Structure

```
├── index.html                  # Main application markup & UI structure
├── style.css                   # High-contrast editorial design system
├── app.js                      # Dual-module app logic & on-demand chunk loader
├── assets/                     # Logos, favicon, and preview media
├── data/
│   ├── boards/                 # 10 Lightweight board JSON chunks + manifest.json
│   │   ├── dhaka.json
│   │   ├── rajshahi.json
│   │   └── ...
│   ├── dhaka_colleges.json     # Dhaka Board 2025 benchmark dataset (1,186 colleges)
│   ├── colleges.json           # Complete national database (7,473 institutions)
│   └── Board of Intermediate...xlsx # Raw official Dhaka Board dataset
├── scraper.py                  # High-speed multi-threaded board result scraper
├── build_full_dataset.py       # Data compiler and aggregation pipeline
├── build_board_chunks.py       # Splits colleges.json into on-demand board chunks
├── build_dhaka_dataset.py      # Parses Dhaka Board Excel into dhaka_colleges.json
└── README.md
```

---

## 🔄 Maintenance & Future Data Updates (For Next Batches)

When new batch results or seat lists are published by the Education Boards, follow these simple steps to update the live platform:

### 1. Update Board Academic Results
```bash
# Run the multi-threaded results scraper
python scraper.py

# Compile and validate the national dataset
python build_full_dataset.py

# Re-generate the lightweight board chunks
python build_board_chunks.py
```

### 2. Update Dhaka Board Benchmark Dataset
Place the newly downloaded Excel file in the `data/` folder and run:
```bash
python build_dhaka_dataset.py
```

### 3. Deploy Updates to GitHub Pages
```bash
git add .
git commit -m "Update college datasets for new academic batch"
git push origin main
```
GitHub Pages will automatically deploy and update the live website within 30 seconds.
