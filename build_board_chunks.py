"""
Build Board-Specific JSON Chunks & Metadata Manifest from colleges.json
Output directory: data/boards/
"""

import os
import json

def build_board_chunks():
    source_file = os.path.join('data', 'colleges.json')
    output_dir = os.path.join('data', 'boards')
    os.makedirs(output_dir, exist_ok=True)

    print(f"Reading {source_file}...")
    with open(source_file, 'r', encoding='utf-8') as f:
        colleges = json.load(f)

    print(f"Total institutions: {len(colleges)}")

    board_groups = {}
    manifest = {
        'total_colleges': len(colleges),
        'boards': {}
    }

    for c in colleges:
        board_key = c.get('board', 'UNKNOWN').upper()
        if board_key not in board_groups:
            board_groups[board_key] = []
        board_groups[board_key].append(c)

    for board, items in board_groups.items():
        filename = f"{board.lower()}.json"
        filepath = os.path.join(output_dir, filename)
        
        # Sort items by rank/name
        items.sort(key=lambda x: (x.get('rank', 99999), x.get('name', '')))

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

        file_size_kb = os.path.getsize(filepath) / 1024
        
        # Extract unique districts and thanas for quick manifest
        districts = sorted(list(set(c['district'] for c in items if c.get('district'))))
        
        manifest['boards'][board] = {
            'code': board,
            'filename': filename,
            'count': len(items),
            'size_kb': round(file_size_kb, 1),
            'districts': districts
        }
        print(f"  -> Generated {filename:<16} ({len(items):>4} colleges, {file_size_kb:>6.1f} KB)")

    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nSaved manifest to {manifest_path} ({os.path.getsize(manifest_path) / 1024:.1f} KB)")
    print("All board chunks generated successfully!")

if __name__ == '__main__':
    build_board_chunks()
