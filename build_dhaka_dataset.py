"""
Build Dhaka Board Class XI Seat Capacity & Minimum GPA Requirement Dataset (2025 Benchmark)
Source: data/Board of Intermediate and Secondary Education, Dhaka    Available seat list for class XI.xlsx
Output: data/dhaka_colleges.json
"""

import os
import json
import html
from python_calamine import CalamineWorkbook

def build_dhaka_dataset():
    excel_path = os.path.join(
        'data',
        'Board of Intermediate and Secondary Education, Dhaka    Available seat list for class XI.xlsx'
    )
    output_path = os.path.join('data', 'dhaka_colleges.json')

    print(f"Reading {excel_path}...")
    wb = CalamineWorkbook.from_path(excel_path)
    sheet = wb.get_sheet_by_name(wb.sheet_names[0])
    rows = sheet.to_python()

    data_rows = rows[1:]
    colleges = {}

    for r in data_rows:
        if not r or len(r) < 10:
            continue

        eiin = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0]).strip()
        name = html.unescape(str(r[1])).strip()
        name = " ".join(name.split())

        # Hardcoded Exclusion: Never display Hermann Gmeiner / SOS Hermann Gmeiner / EIIN 108215
        if eiin == '108215' or 'HERMANN' in name.upper() or 'GMEINER' in name.upper():
            continue

        thana = str(r[2]).strip().title()
        zilla = str(r[3]).strip().title()
        gender = str(r[4]).strip()
        group = str(r[5]).strip()
        medium = str(r[6]).strip().upper()
        shift = str(r[7]).strip().upper()

        min_gpa = float(r[8]) if isinstance(r[8], (int, float)) else (
            float(str(r[8])) if str(r[8]).strip() else 0.0
        )
        total_seat = int(r[9]) if isinstance(r[9], (int, float)) else (
            int(str(r[9])) if str(r[9]).strip() else 0
        )

        if eiin not in colleges:
            colleges[eiin] = {
                'eiin': eiin,
                'name': name,
                'thana': thana,
                'zilla': zilla,
                'total_seat': 0,
                'min_gpa_lowest': 5.0,
                'min_gpa_highest': 0.0,
                'shifts': set(),
                'genders': set(),
                'mediums': set(),
                'groups': set(),
                'offers': []
            }

        c = colleges[eiin]
        c['total_seat'] += total_seat

        if min_gpa < c['min_gpa_lowest']:
            c['min_gpa_lowest'] = min_gpa
        if min_gpa > c['min_gpa_highest']:
            c['min_gpa_highest'] = min_gpa

        c['shifts'].add(shift)
        c['genders'].add(gender)
        c['mediums'].add(medium)
        c['groups'].add(group)

        c['offers'].append({
            'group': group,
            'medium': medium,
            'shift': shift,
            'gender': gender,
            'min_gpa': min_gpa,
            'total_seat': total_seat
        })

    college_list = []
    total_offers_count = 0

    for c in colleges.values():
        c['shifts'] = sorted(list(c['shifts']))
        c['genders'] = sorted(list(c['genders']))
        c['mediums'] = sorted(list(c['mediums']))
        c['groups'] = sorted(list(c['groups']))
        c['min_gpa_lowest'] = round(c['min_gpa_lowest'], 2)
        c['min_gpa_highest'] = round(c['min_gpa_highest'], 2)
        c['offers'].sort(key=lambda x: (x['group'], x['medium'], x['shift'], x['gender']))
        total_offers_count += len(c['offers'])
        college_list.append(c)

    college_list.sort(key=lambda x: x['name'])

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(college_list, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {len(college_list)} colleges with {total_offers_count} total offerings.")
    print(f"Saved to {output_path} (Size: {os.path.getsize(output_path) / 1024:.1f} KB)")

if __name__ == '__main__':
    build_dhaka_dataset()
