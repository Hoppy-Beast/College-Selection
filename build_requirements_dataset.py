"""
Build All Boards Class XI Seat Capacity & Minimum GPA Requirement Dataset
Source: all-boards/*.pdf
Output:
  - data/requirements/<board>.json (for each of the 10 boards)
  - data/requirements/all_colleges.json
  - data/requirements/manifest.json
  - data/dhaka_colleges.json (for backwards-compatibility)
"""

import os
import sys
import json
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

board_mapping = {
    'কুমিল্লা_.pdf': ('COMILLA', 'Comilla'),
    'চট্টগ্রাম_.pdf': ('CHITTAGONG', 'Chittagong'),
    'ঢাকা_.pdf': ('DHAKA', 'Dhaka'),
    'দিনাজপুর_.pdf': ('DINAJPUR', 'Dinajpur'),
    'বরিশাল_.pdf': ('BARISAL', 'Barisal'),
    'ময়মনসিংহ_.pdf': ('MYMENSINGH', 'Mymensingh'),
    'মাদ্রাসা_.pdf': ('MADRASAH', 'Madrasah'),
    'যশোর_.pdf': ('JESSORE', 'Jessore'),
    'রাজশাহী_.pdf': ('RAJSHAHI', 'Rajshahi'),
    'সিলেট_.pdf': ('SYLHET', 'Sylhet'),
}

def build_all_requirements():
    all_boards_dir = 'all-boards'
    output_dir = os.path.join('data', 'requirements')
    os.makedirs(output_dir, exist_ok=True)

    all_colleges_list = []
    board_manifest = {}

    for pdf_filename, (board_code, board_display) in board_mapping.items():
        pdf_path = os.path.join(all_boards_dir, pdf_filename)
        if not os.path.exists(pdf_path):
            print(f"Error: {pdf_path} not found!")
            continue

        print(f"Parsing {board_display} ({pdf_filename})...")
        doc = pymupdf.open(pdf_path)
        colleges = {}

        for pno in range(len(doc)):
            page = doc[pno]
            tabs = page.find_tables()
            for tab in tabs:
                for row in tab.extract():
                    if not row or len(row) < 10:
                        continue
                    if row[0] == 'District' or row[2] == 'EIIN':
                        continue
                    eiin_val = str(row[2]).strip()
                    if not eiin_val.isdigit():
                        continue

                    district = str(row[0]).strip().title()
                    thana = str(row[1]).strip().title()
                    name = " ".join(str(row[3]).split()).strip()
                    shift = str(row[4]).strip().upper()
                    version = str(row[5]).strip().upper()
                    group = str(row[6]).strip()
                    gender = str(row[7]).strip()

                    try:
                        tot_seats = int(float(str(row[8]).replace(',', '')))
                    except:
                        tot_seats = 0

                    try:
                        min_gpa = float(str(row[9]))
                    except:
                        min_gpa = 0.0

                    own_min_gpa = 0.0
                    if len(row) > 10 and row[10]:
                        try:
                            own_min_gpa = float(str(row[10]))
                        except:
                            pass

                    sq_seats = 0
                    if len(row) > 11 and row[11]:
                        try:
                            sq_seats = int(float(str(row[11])))
                        except:
                            pass

                    sq_min_gpa = 0.0
                    if len(row) > 12 and row[12]:
                        try:
                            sq_min_gpa = float(str(row[12]))
                        except:
                            pass

                    reserved = 0
                    if len(row) > 13 and row[13]:
                        try:
                            reserved = int(float(str(row[13])))
                        except:
                            pass

                    # Hardcoded Exclusion: Never display Hermann Gmeiner / EIIN 108215
                    if eiin_val == '108215' or 'HERMANN' in name.upper() or 'GMEINER' in name.upper():
                        continue

                    if eiin_val not in colleges:
                        colleges[eiin_val] = {
                            'eiin': eiin_val,
                            'name': name,
                            'board': board_code,
                            'board_name': board_display,
                            'thana': thana,
                            'zilla': district,
                            'total_seat': 0,
                            'min_gpa_lowest': 5.0,
                            'min_gpa_highest': 0.0,
                            'shifts': set(),
                            'genders': set(),
                            'mediums': set(),
                            'groups': set(),
                            'offers': []
                        }

                    c = colleges[eiin_val]
                    c['total_seat'] += tot_seats

                    if min_gpa < c['min_gpa_lowest']:
                        c['min_gpa_lowest'] = min_gpa
                    if min_gpa > c['min_gpa_highest']:
                        c['min_gpa_highest'] = min_gpa

                    c['shifts'].add(shift)
                    c['genders'].add(gender)
                    c['mediums'].add(version)
                    c['groups'].add(group)

                    c['offers'].append({
                        'group': group,
                        'medium': version,
                        'shift': shift,
                        'gender': gender,
                        'min_gpa': min_gpa,
                        'own_min_gpa': own_min_gpa,
                        'total_seat': tot_seats,
                        'sq_seats': sq_seats,
                        'sq_min_gpa': sq_min_gpa,
                        'reserved': reserved
                    })

        board_college_list = []
        total_board_seats = 0
        total_board_offers = 0

        for c in colleges.values():
            c['shifts'] = sorted(list(c['shifts']))
            c['genders'] = sorted(list(c['genders']))
            c['mediums'] = sorted(list(c['mediums']))
            c['groups'] = sorted(list(c['groups']))
            if c['min_gpa_lowest'] > 5.0:
                c['min_gpa_lowest'] = 0.0
            c['min_gpa_lowest'] = round(c['min_gpa_lowest'], 2)
            c['min_gpa_highest'] = round(c['min_gpa_highest'], 2)
            c['offers'].sort(key=lambda x: (x['group'], x['medium'], x['shift'], x['gender']))
            total_board_seats += c['total_seat']
            total_board_offers += len(c['offers'])
            board_college_list.append(c)

        board_college_list.sort(key=lambda x: x['name'])

        board_out_file = os.path.join(output_dir, f"{board_code.lower()}.json")
        with open(board_out_file, 'w', encoding='utf-8') as f:
            json.dump(board_college_list, f, ensure_ascii=False, indent=2)

        file_kb = os.path.getsize(board_out_file) / 1024
        print(f"  -> Saved {len(board_college_list)} colleges ({total_board_seats:,} seats, {total_board_offers} offers) to {board_out_file} ({file_kb:.1f} KB)")

        board_manifest[board_code] = {
            'board_code': board_code,
            'board_name': board_display,
            'colleges_count': len(board_college_list),
            'total_seats': total_board_seats,
            'total_offers': total_board_offers,
            'file': f"{board_code.lower()}.json",
            'file_kb': round(file_kb, 1)
        }

        all_colleges_list.extend(board_college_list)

        # For Dhaka, also update data/dhaka_colleges.json for backwards compatibility
        if board_code == 'DHAKA':
            dhaka_compat_file = os.path.join('data', 'dhaka_colleges.json')
            with open(dhaka_compat_file, 'w', encoding='utf-8') as f:
                json.dump(board_college_list, f, ensure_ascii=False, indent=2)
            print(f"  -> Updated backwards-compatible {dhaka_compat_file}")

    all_colleges_list.sort(key=lambda x: (x['board'], x['name']))
    all_out_file = os.path.join(output_dir, 'all_colleges.json')
    with open(all_out_file, 'w', encoding='utf-8') as f:
        json.dump(all_colleges_list, f, ensure_ascii=False, indent=2)

    manifest_file = os.path.join(output_dir, 'manifest.json')
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_colleges': len(all_colleges_list),
            'total_seats': sum(b['total_seats'] for b in board_manifest.values()),
            'total_offers': sum(b['total_offers'] for b in board_manifest.values()),
            'boards': board_manifest
        }, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 65)
    print(f"SUCCESS: Generated {len(all_colleges_list):,} colleges across 10 boards.")
    print(f"Total Approved Seats: {sum(b['total_seats'] for b in board_manifest.values()):,}")
    print(f"Manifest written to {manifest_file}")

if __name__ == '__main__':
    build_all_requirements()
