# Build Optimization for Vercel

Reduce build time, file size, and improve deployment reliability.

## Configuration in `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "nodeVersion": "18.x",
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

## Reducing Build Time

### 1. Leverage Caching
```json
{
  "buildCache": {
    "nodeModulesPattern": "**/node_modules/**"
  }
}
```

### 2. Optimize Dependencies
- Remove unused packages: `npm prune`
- Use lightweight alternatives (e.g., `date-fns` vs `moment.js`)
- Lazy load heavy libraries

### 3. Parallel Builds
For monorepos, configure parallel workspaces:
```json
{
  "monorepoManager": "pnpm",
  "buildCommand": "pnpm run build"
}
```

### 4. Source Maps
Disable in production (save ~30% build time):
```ts
// vite.config.ts
export default {
  build: {
    sourcemap: process.env.NODE_ENV === 'development'
  }
}
```

## `.vercelignore` to Reduce Output

```
node_modules
.git
.env.local
.env.*.local
tests
docs
README.md
.gitignore
.prettierrc
```

## Monitoring Build Performance

### Via Dashboard
1. Deployments → Select deployment
2. Logs → Analyze timing
3. Build Summary shows bottlenecks

### Via CLI
```bash
vercel logs --follow --tail | grep -i "build\|duration"
```

## Common Build Issues

| Issue | Solution |
|-------|----------|
| **Out of memory** | Increase `memory` in `vercel.json` |
| **Timeout (>60m)** | Optimize build or split into smaller packages |
| **Missing assets** | Check `outputDirectory` matches your build output |
| **Env vars missing** | Verify set in Vercel dashboard or reference with `@` prefix |

## Code Splitting & Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev vite-plugin-visualization

# Add to vite.config.ts
import { visualizer } from 'vite-plugin-visualization';

export default {
  plugins: [visualizer()]
}
```

## Database Connection Pooling

For expensive database connections:
```ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1  // Limit connections for serverless
});
```

## Examples

### Next.js with SWR
```ts
// next.config.js
module.exports = {
  swcMinify: true,  // Use SWC for faster minification
  productionBrowserSourceMaps: false
}
```

### Vite with Preload
```ts
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
}
```
