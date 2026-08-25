import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const chunksDir = join(__dirname, '..', 'src', 'locales', 'chunks');

const files = readdirSync(chunksDir).filter(f => f.endsWith('.ts'));

let fixed = 0;
for (const file of files) {
  const path = join(chunksDir, file);
  let content = readFileSync(path, 'utf-8');
  
  // The chunks have a pattern like:
  //   en: {
  //       key: value,
  //       ...
  //     },    <-- WRONG: this extra }, should not be here
  //   },
  // We need to remove the extra "  }," that appears between en: and ar: blocks
  // and the extra "  }" that appears after ar: block
  
  // Match: line with just "    }," (4 spaces + "},") that appears after en: block
  // The pattern is: en: { ... \n    },\n  },
  // We want to remove the "    }," line
  content = content.replace(
    /(en: \{[^}]*\n)(    \},\n)(  \},\nar: \{)/
  );
  
  // Actually let me just do a simpler fix: remove the line that has only "    }," 
  // when it appears between en: and ar: blocks
  
  // Split into lines, fix, rejoin
  const lines = content.split('\n');
  const out = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that are just "    }," when the previous non-empty line was inside en:/ar:
    if (trimmed === '},') {
      const prevNonEmpty = out.reverse().find(l => l.trim() !== '');
      out.reverse();
      
      if (prevNonEmpty && (prevNonEmpty.includes('en:') || prevNonEmpty.includes('ar:'))) {
        // This "    }," is closing the en:/ar: block, keep it
        out.push(line);
      } else if (i + 1 < lines.length && lines[i + 1].trim() === '},') {
        // This "    }," is the extra one before the real closing "  },"
        continue;
      } else {
        out.push(line);
      }
    } else {
      out.push(line);
    }
  }
  
  const fixedContent = out.join('\n');
  if (fixedContent !== content) {
    writeFileSync(path, fixedContent);
    fixed++;
  }
}

console.log(`Fixed ${fixed} chunk files`);
