# Troubleshooting Vercel Deployments

Debug common build, runtime, and configuration issues.

## Deployment Failed

### Step 1: Check Build Logs
1. Vercel Dashboard → Deployments → Select failed deployment
2. Click "View Build Logs"
3. Look for red error messages

### Step 2: Common Build Errors

**Error: `Module not found`**
```
Solution:
- Check import paths are correct
- Run `npm install` locally to verify
- Check if file is listed in .gitignore
```

**Error: `Out of memory`**
```
Solution:
- Increase function memory in vercel.json:
  {
    "functions": {
      "**": { "memory": 3008 }
    }
  }
- Optimize dependencies and remove unused packages
```

**Error: `Environment variable undefined`**
```
Solution:
- Verify variable set in Vercel dashboard
- Use @PREFIX syntax in vercel.json
- Pull env locally: vercel env pull
- Check spelling (case-sensitive)
```

**Error: `ENOENT: no such file or directory`**
```
Solution:
- Verify outputDirectory in vercel.json matches your build output
- Common: "dist" for Vite, ".next" for Next.js, "build" for CRA
- Check build command produces the expected directory
```

## Using Vercel CLI for Local Testing

```bash
# Install and login
npm i -g vercel
vercel login

# Build locally exactly like Vercel
vercel build

# Test the output
vercel start

# Run single deployment test
vercel --prod --dry-run
```

## Debugging Runtime Errors

### Access Live Logs
```bash
vercel logs --follow --tail
```

### Filter for Errors
```bash
vercel logs --follow --tail | grep -i "error\|exception\|fail"
```

### View Specific Function Logs
```bash
vercel logs --follow --tail api/users
```

## Performance Issues

### Check Core Web Vitals
1. Vercel Dashboard → Analytics
2. View LCP, FID, CLS metrics
3. Compare before/after deployment

### Identify Slow Requests
```bash
vercel logs --follow --tail | awk '{if ($NF > 1000) print}'
```

### Enable Detailed Logging in Code
```ts
// api/route.ts
export default async (req, res) => {
  console.time('database-query');
  const data = await db.query(...);
  console.timeEnd('database-query');
  res.json(data);
};
```

## Cold Start Issues

Vercel automatically warms functions, but to minimize cold starts:
- Use connection pooling for databases
- Pre-warm critical functions
- Reduce function size

```ts
// Optimize function size
import only { required } from 'lodash-es';  // tree-shakeable

// Use database connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async (req, res) => {
  const client = await pool.connect();
  try {
    // query here
  } finally {
    client.release();
  }
};
```

## Rollback a Deployment

### Via Dashboard
1. Deployments → Select desired previous version
2. Click "Promote to Production"

### Via CLI
```bash
# List recent deployments
vercel ls

# Promote specific deployment
vercel promote <DEPLOYMENT_ID>
```

## Preview Deployment Not Updating

```bash
# Clear Vercel cache
vercel rebuild <PROJECT_ID>

# Or redeploy via GitHub
git push -f origin <branch>  # Force push to re-trigger
```

## Secrets Not Loading

```bash
# Verify secret is set
vercel env list

# Re-pull environment
vercel env pull

# Redeploy after adding secret
vercel deploy --prod
```

## Cron Jobs Not Triggering

Configure in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 0 * * *"
  }]
}
```

Then verify:
1. Function exists at `/api/cron/cleanup`
2. Returns HTTP 2xx status
3. Check "Cron Jobs" in dashboard under Settings

## Need More Help?

- [Vercel Docs](https://vercel.com/docs)
- [Community Discussions](https://github.com/vercel/vercel/discussions)
- [Support Dashboard](https://vercel.com/support)
