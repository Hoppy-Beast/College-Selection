import argparse
import asyncio
import base64
import datetime
import json
import os
import re
import sys
import time
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import ddddocr

sys.stdout.reconfigure(encoding='utf-8')

# The 10 Official Bangladesh Education Boards for HSC & Alim
# (Technical board excluded as general HSC is not published under this portal)
BOARD_MAP = {
    "dhaka": "DHAKA",
    "rajshahi": "RAJSHAHI",
    "chittagong": "CHITTAGONG",
    "comilla": "COMILLA",
    "sylhet": "SYLHET",
    "barisal": "BARISAL",
    "dinajpur": "DINAJPUR",
    "jessore": "JESSORE",
    "mymensingh": "MYMENSINGH",
    "madrasah": "MADRASAH"
}

def parse_groups_from_html(raw_html):
    """
    Extracts group breakdowns (Science, Commerce, Humanities / General / Alim).
    Handles both 100% pass cases (PASSED=51; GPA5=51) and partial pass cases (PASSED=741; NOT PASSED=2; GPA5=383).
    """
    groups_data = {
        "science": {"total": 0, "passed": 0, "pass_rate": 0.0, "gpa5": 0},
        "commerce": {"total": 0, "passed": 0, "pass_rate": 0.0, "gpa5": 0},
        "humanities": {"total": 0, "passed": 0, "pass_rate": 0.0, "gpa5": 0}
    }

    # Matches <font color=red>GROUP_NAME</font>: STATS or GROUP_NAME: STATS
    matches = re.findall(
        r'(?:<font[^>]*>)?\s*([A-Za-z\s\.\'-]+)\s*(?:</font>)?\s*:\s*(PASSED\s*=\s*\d+[^<\n\r]+)',
        raw_html,
        re.I
    )

    for g_name, g_stats in matches:
        g_name_upper = g_name.strip().upper()
        if any(skip in g_name_upper for skip in ["INST:", "INSTITUTION", "CENTRE", "CENTER", "THANA", "ZILLA"]):
            continue

        p_m = re.search(r'PASSED\s*=\s*(\d+)', g_stats, re.I)
        np_m = re.search(r'NOT\s*PASSED\s*=\s*(\d+)', g_stats, re.I)
        f_m = re.search(r'FAILED\s*=\s*(\d+)', g_stats, re.I)
        g5_m = re.search(r'GPA\s*5\s*=\s*(\d+)', g_stats, re.I)

        passed = int(p_m.group(1)) if p_m else 0
        not_passed = int(np_m.group(1)) if np_m else (int(f_m.group(1)) if f_m else 0)
        gpa5 = int(g5_m.group(1)) if g5_m else 0
        total = passed + not_passed
        pass_rate = round(passed / total * 100.0, 2) if total > 0 else 0.0

        group_obj = {
            "total": total,
            "passed": passed,
            "pass_rate": pass_rate,
            "gpa5": gpa5
        }

        if "SCIENCE" in g_name_upper:
            groups_data["science"] = group_obj
        elif "BUSINESS" in g_name_upper or "COMMERCE" in g_name_upper:
            groups_data["commerce"] = group_obj
        elif any(h in g_name_upper for h in ["HUMANITIES", "GENERAL", "ALIM", "ISLAMIC", "VOCATIONAL", "BM", "MUZAWWID", "HIFZ"]):
            groups_data["humanities"] = group_obj

    return groups_data

def parse_report_content(raw_html, fallback_info):
    """
    Parses the authentic HTML report returned in res_json['extra']['content'] from POST /v2/getres.
    Extracts 100% verified examinee counts, passed/failed, pass rate, GPA-5, and stream breakdowns.
    """
    if not raw_html or not isinstance(raw_html, str):
        return None

    if "No Result found" in raw_html or "Result Not Found" in raw_html:
        return None

    # 1. Extract Institution Name & EIIN
    inst_match = re.search(r'Institution:\s*(.*?)\s*\(EIIN:\s*(\d+)\)', raw_html, re.I)
    name = inst_match.group(1).strip().upper() if inst_match else fallback_info.get("name", "").upper()
    eiin = inst_match.group(2).strip() if inst_match else fallback_info.get("eiin", "")

    # 2. Extract Thana & District
    thana_match = re.search(r'Thana/Upazilla:\s*([^,]+),\s*Zilla:\s*([^<\n\r]+)', raw_html, re.I)
    thana = thana_match.group(1).strip().upper() if thana_match else fallback_info.get("thana", "").upper()
    district = thana_match.group(2).strip().upper() if thana_match else fallback_info.get("district", "").upper()

    thana = re.sub(r'<[^>]+>', '', thana).strip()
    district = re.sub(r'<[^>]+>', '', district).strip()

    # 3. Extract Overall Examinee Statistics
    stats_match = re.search(r'No\.\s*of\s*Students:\s*\{([^}]+)\}', raw_html, re.I)
    if stats_match:
        stats_str = stats_match.group(1)
        examinee_m = re.search(r'Examinee:\s*(\d+)', stats_str, re.I)
        appeared_m = re.search(r'Appeared:\s*(\d+)', stats_str, re.I)
        passed_m = re.search(r'Passed:\s*(\d+)', stats_str, re.I)
        pass_rate_m = re.search(r'Percentage of Pass:\s*([\d\.]+)', stats_str, re.I)
        gpa5_m = re.search(r'GPA\s*5:\s*(\d+)', stats_str, re.I)

        total_examinees = int(examinee_m.group(1)) if examinee_m else 0
        appeared = int(appeared_m.group(1)) if appeared_m else total_examinees
        passed = int(passed_m.group(1)) if passed_m else 0
        failed = max(0, appeared - passed)
        pass_rate = float(pass_rate_m.group(1)) if pass_rate_m else (round(passed / appeared * 100.0, 2) if appeared > 0 else 0.0)
        gpa5_count = int(gpa5_m.group(1)) if gpa5_m else 0
    else:
        return None

    gpa5_rate = round((gpa5_count / appeared * 100.0), 2) if appeared > 0 else 0.0

    # 4. Extract Groups: science, commerce, humanities
    groups_data = parse_groups_from_html(raw_html)

    return {
        "eiin": str(eiin).strip(),
        "code": str(fallback_info.get("code", "")).strip(),
        "name": name,
        "board": fallback_info.get("board", "").upper(),
        "district": district,
        "thana": thana,
        "total_examinees": total_examinees,
        "appeared": appeared,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "gpa5_count": gpa5_count,
        "gpa5_rate": gpa5_rate,
        "groups": groups_data
    }

async def solve_portal_challenge(page):
    """
    Solves Cloudflare / bot challenges automatically (handles math, puzzle pieces, color/object buttons).
    """
    for attempt in range(15):
        title = await page.title()
        if "verifying" not in title.lower() and "robot" not in title.lower():
            return True

        prompt_el = page.locator(".challenge-prompt")
        prompt_text = ""
        if await prompt_el.count() > 0:
            prompt_text = (await prompt_el.inner_text()).lower().strip()

        # 1. Arithmetic challenge
        if "=" in prompt_text and "?" in prompt_text:
            expr = prompt_text.split("=")[0].strip()
            try:
                ans = str(eval(expr))
                btn = page.locator(f"button:has-text('{ans}'), button[data-value='{ans}']")
                if await btn.count() > 0:
                    await btn.first.click()
                    await page.wait_for_timeout(1500)
                    continue
            except:
                pass

        # 2. Choice buttons (colors / objects / text)
        buttons = page.locator(".choice-button, .object-choice, button[data-value]")
        btn_count = await buttons.count()
        if btn_count > 0:
            clicked = False
            for i in range(btn_count):
                btn = buttons.nth(i)
                data_val = (await btn.get_attribute("data-value") or "").lower()
                aria_lbl = (await btn.get_attribute("aria-label") or "").lower()
                btn_text = (await btn.inner_text()).lower().strip()
                for k in [data_val, aria_lbl, btn_text]:
                    if k and k in prompt_text:
                        await btn.click()
                        clicked = True
                        break
                if clicked:
                    break
            if not clicked:
                await buttons.first.click()
            await page.wait_for_timeout(1500)
            continue

        # 3. Puzzle challenge
        puzzle_piece = page.locator(".puzzle-piece")
        puzzle_cell = page.locator(".puzzle-cell.is-missing")
        if await puzzle_piece.count() > 0 and await puzzle_cell.count() > 0:
            await puzzle_piece.first.click()
            await page.wait_for_timeout(300)
            await puzzle_cell.first.click()
            await page.wait_for_timeout(1500)
            continue

        await page.wait_for_timeout(600)

    return "verifying" not in (await page.title()).lower()

async def fetch_board_institution_list(page, board_key):
    """
    Fetches the live institution list for a given education board from the official API.
    """
    url = f"https://eboardresults.com/v2/list?id=btree&board={board_key}&exam=hsc&year=2025&type=tbl&cols=eiin,i_code,i_name,zilla,thana"
    data = await page.evaluate("""async (u) => {
        try {
            const r = await fetch(u);
            const d = await r.json();
            return d.data || [];
        } catch(e) {
            return [];
        }
    }""", url)
    return data

async def scrape_college_report(page, inst, ocr, max_attempts=35):
    """
    Queries live /v2/captcha, solves it with OCR, and queries POST /v2/getres.
    Returns (record, None) on success or (None, failure_reason) on failure.
    """
    eiin = inst["eiin"]
    board_key = inst["board_key"]

    for attempt in range(1, max_attempts + 1):
        try:
            # 1. Fetch captcha
            cap_data = await page.evaluate("""async () => {
                const r = await fetch('/v2/captcha?r=' + Math.random());
                const blob = await r.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }""")

            # If redirected to challenge page HTML, solve it
            if cap_data and cap_data.startswith("data:text/html"):
                await solve_portal_challenge(page)
                await asyncio.sleep(0.5)
                continue

            if not cap_data or not cap_data.startswith("data:image"):
                await asyncio.sleep(0.15)
                continue

            header, encoded = cap_data.split(",", 1)
            raw_bytes = base64.b64decode(encoded)
            pred = ocr.classification(raw_bytes).strip()
            digits = re.sub(r'[^0-9]', '', pred)
            if len(digits) != 4:
                continue

            # 2. Post to /v2/getres
            payload = {
                "exam": "hsc",
                "year": "2025",
                "board": board_key,
                "result_type": "2",
                "eiin": eiin,
                "captcha": digits
            }
            res = await page.evaluate("""async (params) => {
                const formData = new URLSearchParams();
                for (const [k, v] of Object.entries(params)) {
                    formData.append(k, v);
                }
                const r = await fetch('/v2/getres', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData.toString()
                });
                try {
                    return await r.json();
                } catch(e) {
                    return { status: -1 };
                }
            }""", payload)

            if res.get("status") == 0:
                content = res.get("extra", {}).get("content", "")
                record = parse_report_content(content, inst)
                if record:
                    return record, None
                else:
                    return None, "No HSC 2025 result report published for this institution"
            else:
                await asyncio.sleep(0.04)
        except Exception:
            await asyncio.sleep(0.15)

    return None, "Captcha solve timeout after maximum attempts"

def save_and_rank_colleges(scraped_records, output_path="data/colleges.json"):
    """
    Ranks all scraped colleges descending by gpa5_rate primary, pass_rate secondary, gpa5_count tertiary,
    assigns 1-indexed rank, and writes clean JSON output.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    sorted_records = sorted(
        scraped_records,
        key=lambda x: (x.get("gpa5_rate", 0.0), x.get("pass_rate", 0.0), x.get("gpa5_count", 0)),
        reverse=True
    )

    for idx, rec in enumerate(sorted_records, 1):
        rec["rank"] = idx

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sorted_records, f, ensure_ascii=False, indent=2)

    return sorted_records

def save_failed_institutions(failed_records, output_path="data/failed_institutions.json"):
    """
    Saves failed institutions list to JSON output.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(failed_records, f, ensure_ascii=False, indent=2)

async def worker_task(worker_id, browser, clearance_cookies, queue, ocr, state, save_lock, config):
    """
    Concurrent async worker running in its own isolated browser context & session,
    seeded with the verified clearance cookies from the coordinator.
    """
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    context = await browser.new_context(user_agent=user_agent)
    if clearance_cookies:
        await context.add_cookies(clearance_cookies)

    page = await context.new_page()

    try:
        await page.goto("https://eboardresults.com/v2/home", wait_until="domcontentloaded", timeout=30000)
        await solve_portal_challenge(page)
    except Exception as e:
        print(f"[Worker-{worker_id}] Warning during warm-up: {e}", flush=True)

    while True:
        try:
            inst = await queue.get()
        except asyncio.CancelledError:
            break

        if inst is None:
            queue.task_done()
            break

        eiin = inst["eiin"]
        t_start = time.time()
        record, fail_reason = await scrape_college_report(page, inst, ocr)
        elapsed = time.time() - t_start

        async with save_lock:
            state["processed_count"] += 1
            curr_idx = state["processed_count"]
            total = state["total_count"]

            if record:
                state["completed_colleges"][eiin] = record
                state["failed_institutions"].pop(eiin, None)
                print(f"[{curr_idx:4d}/{total}] [W{worker_id:02d}] [✓] {record['board']:10s} | EIIN: {record['eiin']:6s} | {record['name'][:30]:30s} | GPA-5: {record['gpa5_count']:4d} ({record['gpa5_rate']:5.2f}%) | Pass: {record['pass_rate']:5.2f}% ({elapsed:.2f}s)", flush=True)
            else:
                fail_item = {
                    "eiin": eiin,
                    "code": inst.get("code", ""),
                    "name": inst.get("name", ""),
                    "board": inst.get("board", ""),
                    "district": inst.get("district", ""),
                    "thana": inst.get("thana", ""),
                    "reason": fail_reason or "Unknown failure",
                    "timestamp": datetime.datetime.now().isoformat()
                }
                state["failed_institutions"][eiin] = fail_item
                print(f"[{curr_idx:4d}/{total}] [W{worker_id:02d}] [!] {inst['board']:10s} | EIIN: {inst['eiin']:6s} | {inst['name'][:30]:30s} | ({fail_reason})", flush=True)

            # Auto-save every N records (default 50)
            interval = config["checkpoint_interval"]
            if curr_idx % interval == 0 or curr_idx == total:
                scraped_list = list(state["completed_colleges"].values())
                failed_list = list(state["failed_institutions"].values())

                save_and_rank_colleges(scraped_list, config["output"])
                save_and_rank_colleges(scraped_list, config["checkpoint_colleges"])

                save_failed_institutions(failed_list, config["failed_output"])
                save_failed_institutions(failed_list, config["checkpoint_failed"])

                print(f"\n>>> [CHECKPOINT @ {curr_idx}/{total}] Saved {len(scraped_list)} valid colleges & {len(failed_list)} failed records to disk.\n", flush=True)

        queue.task_done()

    await context.close()

async def run_production_scraper(
    boards=None,
    limit_per_board=None,
    concurrency=None,
    checkpoint_interval=50,
    retry_failed=False,
    fresh=False,
    output_file="data/colleges.json",
    failed_output_file="data/failed_institutions.json"
):
    """
    High-speed multi-core async scraper pipeline with challenge clearance, checkpoints, and failure tracking.
    """
    # Dynamically utilize available CPU cores (default 16 on 16-core system)
    if concurrency is None:
        cpu_cnt = os.cpu_count() or 8
        concurrency = min(24, max(8, cpu_cnt))

    print("=========================================================================", flush=True)
    print("  PRODUCTION-GRADE HSC 2025 EDUCATION BOARD HIGH-SPEED ASYNC SCRAPER   ", flush=True)
    print(f"  Concurrency: {concurrency} workers (utilizing all {os.cpu_count()} CPU cores) | Checkpoint: every {checkpoint_interval} items")
    if fresh:
        print("  Mode: FRESH START (All previous data ignored, scraping everything fresh)", flush=True)
    print("=========================================================================", flush=True)

    ocr = ddddocr.DdddOcr(show_ad=False)
    target_boards = list(BOARD_MAP.keys()) if not boards else [b.lower() for b in boards]

    checkpoint_colleges = "scratch/colleges_checkpoint.json"
    checkpoint_failed = "scratch/failed_institutions_checkpoint.json"
    os.makedirs("scratch", exist_ok=True)
    os.makedirs("data", exist_ok=True)

    # 1. Load existing checkpoints / outputs (unless fresh is requested)
    completed_colleges = {}
    failed_institutions = {}

    if not fresh:
        for src in [output_file, checkpoint_colleges]:
            if os.path.exists(src):
                try:
                    with open(src, "r", encoding="utf-8") as f:
                        for rec in json.load(f):
                            # Only keep records from target boards
                            if rec.get("board", "").lower() != "technical":
                                completed_colleges[rec["eiin"]] = rec
                except Exception:
                    pass

        for src in [failed_output_file, checkpoint_failed]:
            if os.path.exists(src):
                try:
                    with open(src, "r", encoding="utf-8") as f:
                        for rec in json.load(f):
                            if rec.get("board", "").lower() != "technical":
                                failed_institutions[rec["eiin"]] = rec
                except Exception:
                    pass

        print(f"[Checkpoint] Loaded {len(completed_colleges)} previously scraped successful colleges.", flush=True)
        print(f"[Checkpoint] Loaded {len(failed_institutions)} previously tracked failed institutions.", flush=True)
        if retry_failed:
            print("[Checkpoint] --retry-failed enabled: Will re-attempt all failed institutions.", flush=True)
            failed_institutions.clear()
    else:
        print("[Fresh Start] All previous cached data and checkpoints cleared.", flush=True)

    config = {
        "output": output_file,
        "failed_output": failed_output_file,
        "checkpoint_colleges": checkpoint_colleges,
        "checkpoint_failed": checkpoint_failed,
        "checkpoint_interval": checkpoint_interval,
        "concurrency": concurrency
    }

    async with async_playwright() as p:
        print(f"\nLaunching Chromium instance with {concurrency} isolated async worker contexts...", flush=True)
        browser = await p.chromium.launch(headless=True)
        
        # Primary coordinator context for challenge resolution and directory fetching
        master_context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        master_page = await master_context.new_page()

        print("Navigating coordinator to https://eboardresults.com/v2/home ...", flush=True)
        await master_page.goto("https://eboardresults.com/v2/home", wait_until="domcontentloaded")
        solved = await solve_portal_challenge(master_page)
        if not solved:
            print("[ERROR] Failed to clear bot challenge on portal.")
            await browser.close()
            return
        
        print("Coordinator successfully cleared portal challenge!", flush=True)
        all_cookies = await master_context.cookies()
        clearance_cookies = [c for c in all_cookies if c['name'] != 'EBRSESSID2']
        print(f"Extracted {len(clearance_cookies)} clearance cookies for worker seeding.", flush=True)

        # 2. Fetch directory across target boards
        all_board_institutions = []
        for board_key in target_boards:
            if board_key not in BOARD_MAP:
                continue
            official_name = BOARD_MAP[board_key]
            print(f"[Directory] Fetching college directory for Board: {official_name:12s} ({board_key})...", flush=True)
            raw_list = await fetch_board_institution_list(master_page, board_key)
            print(f"            Retrieved {len(raw_list)} institutions from official board API.", flush=True)

            count = 0
            for row in raw_list:
                if not isinstance(row, list) or len(row) < 5:
                    continue
                eiin = str(row[0]).strip()
                code = str(row[1]).strip()
                name = str(row[2]).strip().upper()
                district = str(row[3]).strip().upper()
                thana = str(row[4]).strip().upper()

                if not eiin:
                    continue

                all_board_institutions.append({
                    "eiin": eiin,
                    "code": code,
                    "name": name,
                    "board": official_name,
                    "district": district,
                    "thana": thana,
                    "board_key": board_key
                })
                count += 1
                if limit_per_board and count >= limit_per_board:
                    break

        await master_context.close()

        # 3. Filter pending institutions (skip already processed)
        queue = asyncio.Queue()
        already_processed_count = 0
        for inst in all_board_institutions:
            eiin = inst["eiin"]
            # Check if already present and has valid groups (or needs re-parse)
            if eiin in completed_colleges:
                # If groups had total=0 but gpa5_count > 0 or appeared > 0, re-queue to fetch accurate stream stats
                existing_rec = completed_colleges[eiin]
                grp = existing_rec.get("groups", {})
                sci_tot = grp.get("science", {}).get("total", 0)
                com_tot = grp.get("commerce", {}).get("total", 0)
                hum_tot = grp.get("humanities", {}).get("total", 0)
                total_grp = sci_tot + com_tot + hum_tot

                if total_grp == 0 and existing_rec.get("appeared", 0) > 0 and not retry_failed:
                    # Needs refresh for group streams!
                    queue.put_nowait(inst)
                    continue

                already_processed_count += 1
                continue

            if not retry_failed and eiin in failed_institutions:
                already_processed_count += 1
                continue

            queue.put_nowait(inst)

        total_queued = queue.qsize()
        total_items = len(all_board_institutions)
        print(f"\nInstitution Pool Summary:", flush=True)
        print(f"  - Total in scope:       {total_items}", flush=True)
        print(f"  - Already processed:    {already_processed_count} (skipped)", flush=True)
        print(f"  - Pending to scrape:    {total_queued}", flush=True)
        print(f"  - Concurrency workers:  {concurrency}", flush=True)
        print(f"  - Checkpoint interval:  every {checkpoint_interval} institutions\n", flush=True)

        if total_queued == 0:
            print("All institutions in target scope are already scraped! Generating final ranking output...", flush=True)
        else:
            state = {
                "completed_colleges": completed_colleges,
                "failed_institutions": failed_institutions,
                "processed_count": already_processed_count,
                "total_count": total_items
            }
            save_lock = asyncio.Lock()

            start_time = time.time()
            # Spawn worker pool seeded with clearance cookies
            workers = [
                asyncio.create_task(worker_task(w_id, browser, clearance_cookies, queue, ocr, state, save_lock, config))
                for w_id in range(1, concurrency + 1)
            ]

            # Wait for all queue items to be processed
            await queue.join()

            # Signal workers to shut down
            for _ in range(concurrency):
                queue.put_nowait(None)
            await asyncio.gather(*workers, return_exceptions=True)

            print(f"\nScraping queue finished in {time.time() - start_time:.2f} seconds.", flush=True)

        await browser.close()

    # 4. Final Save, Ranking & Summary
    print("\n=========================================================================", flush=True)
    print("Ranking and generating final dataset files...", flush=True)
    final_records = save_and_rank_colleges(list(completed_colleges.values()), output_file)
    final_failed = list(failed_institutions.values())
    save_failed_institutions(final_failed, failed_output_file)

    print(f"  [✓] Saved {len(final_records)} valid college records to -> {output_file}")
    print(f"  [✓] Saved {len(final_failed)} failed institution records to -> {failed_output_file}")
    print("=========================================================================", flush=True)

    if final_records:
        print("\nTOP 15 RANKED COLLEGES:")
        for c in final_records[:15]:
            sci_g5 = c.get('groups', {}).get('science', {}).get('gpa5', 0)
            com_g5 = c.get('groups', {}).get('commerce', {}).get('gpa5', 0)
            hum_g5 = c.get('groups', {}).get('humanities', {}).get('gpa5', 0)
            print(f"  Rank #{c['rank']:3d} | EIIN: {c['eiin']:6s} | {c['name']:36s} | Board: {c['board']:10s} | GPA-5: {c['gpa5_rate']:5.2f}% ({c['gpa5_count']:4d}) [Sci:{sci_g5} Com:{com_g5} Hum:{hum_g5}] | Pass: {c['pass_rate']:5.2f}%", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HSC 2025 Bangladesh Education Board High-Speed Async Scraper")
    parser.add_argument("--boards", nargs="+", help="Specific boards to scrape (e.g. dhaka chittagong rajshahi)")
    parser.add_argument("--limit", type=int, help="Limit number of colleges per board")
    parser.add_argument("--concurrency", type=int, default=None, help="Number of concurrent worker sessions (default: CPU cores count)")
    parser.add_argument("--checkpoint-interval", type=int, default=50, help="Save to disk every N records (default: 50)")
    parser.add_argument("--retry-failed", action="store_true", help="Retry previously failed institutions")
    parser.add_argument("--fresh", action="store_true", help="Start from a clean slate, ignoring all previous data/checkpoints")
    parser.add_argument("--output", default="data/colleges.json", help="Output file path for colleges (default: data/colleges.json)")
    parser.add_argument("--failed-output", default="data/failed_institutions.json", help="Output file path for failed institutions (default: data/failed_institutions.json)")
    args = parser.parse_args()

    asyncio.run(run_production_scraper(
        boards=args.boards,
        limit_per_board=args.limit,
        concurrency=args.concurrency,
        checkpoint_interval=args.checkpoint_interval,
        retry_failed=args.retry_failed,
        fresh=args.fresh,
        output_file=args.output,
        failed_output_file=args.failed_output
    ))
