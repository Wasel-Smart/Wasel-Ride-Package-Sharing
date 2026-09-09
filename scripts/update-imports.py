import os

handlers_dir = os.path.join(os.path.dirname(__file__), '../supabase/functions/make-server-0b1f4071/_handlers')

# Read all exports from shared.ts
with open(os.path.join(handlers_dir, 'shared.ts'), 'r') as f:
    shared_content = f.read()

# Extract all exported names
import re
exports = []
for match in re.finditer(r'^export (?:async )?(?:function|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)', shared_content, re.MULTILINE):
    exports.append(match.group(1))

# Add type exports
for match in re.finditer(r'^export type\s+([a-zA-Z_][a-zA-Z0-9_]*)', shared_content, re.MULTILINE):
    exports.append(match.group(1))

# Add interface exports
for match in re.finditer(r'^export interface\s+([a-zA-Z_][a-zA-Z0-9_]*)', shared_content, re.MULTILINE):
    exports.append(match.group(1))

print(f'Found {len(exports)} exports from shared.ts')

# Create the import block
import_lines = ['import {']
for i, name in enumerate(exports):
    import_lines.append(f'  {name},')
import_lines.append('} from \'./shared.ts\';')

import_block = '\n'.join(import_lines)

# Update each domain file
for filename in os.listdir(handlers_dir):
    if not filename.endswith('.ts') or filename == 'shared.ts':
        continue
    
    filepath = os.path.join(handlers_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace existing import block
    lines = content.split('\n')
    new_lines = []
    skip_imports = False
    for line in lines:
        if line.startswith('import {') or line.startswith('} from \'./shared.ts\';') or (skip_imports and line == ''):
            skip_imports = not skip_imports if line.startswith('import {') or line.startswith('} from') else skip_imports
            continue
        if skip_imports:
            skip_imports = False
            continue
        new_lines.append(line)
    
    # Insert new import block at the top
    new_content = import_block + '\n\n' + '\n'.join(new_lines).strip() + '\n'
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f'Updated {filename}')
