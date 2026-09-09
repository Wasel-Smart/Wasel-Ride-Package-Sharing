import os
import re

handlers_dir = os.path.join(os.path.dirname(__file__), '../supabase/functions/make-server-0b1f4071/_handlers')

for filename in os.listdir(handlers_dir):
    if not filename.endswith('.ts') or filename == 'shared.ts':
        continue
    
    filepath = os.path.join(handlers_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Find the first complete import block ending with } from './shared.ts';
    first_import_end = -1
    for i, line in enumerate(lines):
        if line.strip() == "} from './shared.ts';":
            first_import_end = i
            break
    
    if first_import_end == -1:
        print(f'{filename}: No import block found')
        continue
    
    # Find the next non-empty line after the import block
    code_start = first_import_end + 1
    while code_start < len(lines) and lines[code_start].strip() == '':
        code_start += 1
    
    # Check if there's duplicate import content after the first block
    # Look for patterns like "noContent," or "json," that indicate old imports
    has_duplicate = False
    for i in range(first_import_end + 1, min(first_import_end + 100, len(lines))):
        line = lines[i].strip()
        if line == '':
            continue
        # If we see import-like content before actual function definitions, it's a duplicate
        if line.endswith(',') and not line.startswith('async function') and not line.startswith('function'):
            has_duplicate = True
            break
        if line.startswith('async function') or line.startswith('function'):
            break
    
    if has_duplicate:
        # Find where the duplicate import block ends (before first function definition)
        duplicate_end = first_import_end + 1
        while duplicate_end < len(lines):
            line = lines[duplicate_end].strip()
            if line.startswith('async function') or line.startswith('function'):
                break
            duplicate_end += 1
        
        # Reconstruct: keep first import block + code
        new_content = '\n'.join(lines[:first_import_end + 1]) + '\n\n' + '\n'.join(lines[duplicate_end:])
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        
        print(f'{filename}: Removed duplicate imports (lines {first_import_end+1}-{duplicate_end})')
    else:
        print(f'{filename}: No duplicate imports found')
