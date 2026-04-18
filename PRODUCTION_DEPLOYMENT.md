# 🚀 Wasel Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ **Security Requirements**
- [ ] All log injection vulnerabilities fixed
- [ ] Environment variables validated
- [ ] Demo data disabled (`VITE_ENABLE_DEMO_DATA=false`)
- [ ] Synthetic trips disabled (`VITE_ENABLE_SYNTHETIC_TRIPS=false`)
- [ ] Local persistence fallback disabled in production
- [ ] HTTPS enforced for all production URLs

### ✅ **Configuration Requirements**
- [ ] Production environment file created (`.env.production`)
- [ ] Supabase production project configured
- [ ] Stripe live keys configured
- [ ] Google Maps API key set up
- [ ] Support contact information updated
- [ ] Sentry error monitoring configured

### ✅ **Build Requirements**
- [ ] All tests passing (`npm run test:coverage`)
- [ ] Type checking clean (`npm run type-check`)
- [ ] Linting clean (`npm run lint:strict`)
- [ ] Security audit clean (`npm run test:security`)
- [ ] Bundle size acceptable (<2MB total)

## 🔧 **Step 1: Environment Setup**

### 1.1 Create Production Environment File
```bash
cp .env.production.template .env.production
```

### 1.2 Configure Required Variables
Edit `.env.production` and replace ALL placeholder values:

**Critical Variables (Must be set):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `VITE_PRODUCTION_APP_URL` - Your production domain (HTTPS required)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe live publishable key
- `VITE_SUPPORT_EMAIL` - Your support email address

**Security Variables (Must be false):**
- `VITE_ENABLE_DEMO_DATA=false`
- `VITE_ENABLE_SYNTHETIC_TRIPS=false`
- `VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK=false`

## 🏗️ **Step 2: Build Process**

### 2.1 Run Production Build
```bash
# This validates environment, runs tests, and builds
npm run build:production
```

### 2.2 Verify Build Output
```bash
# Check bundle size
npm run build:analyze

# Test production build locally
npm run preview
```

## 🌐 **Step 3: Server Configuration**

### 3.1 Static File Hosting
Upload the `/dist` directory to your hosting provider.

### 3.2 Server Configuration

#### **Nginx Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service worker
    location /sw.js {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # SPA routing
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers for HTML
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com;";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### **Apache Configuration (.htaccess)**
```apache
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# SPA routing
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>
```

### 3.3 CDN Configuration (Recommended)

#### **Cloudflare Settings**
- Enable "Always Use HTTPS"
- Set Browser Cache TTL to "1 year" for static assets
- Enable "Auto Minify" for CSS, JS, HTML
- Enable "Brotli" compression
- Configure Page Rules:
  - `your-domain.com/assets/*` → Cache Level: Cache Everything, Edge Cache TTL: 1 year
  - `your-domain.com/sw.js` → Cache Level: Bypass Cache

## 🔍 **Step 4: Post-Deployment Verification**

### 4.1 Functional Testing
- [ ] Application loads correctly
- [ ] Authentication works (sign up, sign in, sign out)
- [ ] Core features functional (find ride, offer ride, packages)
- [ ] Payment integration works
- [ ] Mobile responsiveness
- [ ] PWA installation works

### 4.2 Performance Testing
```bash
# Run Lighthouse audit
npm run test:lhci

# Check Core Web Vitals
# Use Google PageSpeed Insights: https://pagespeed.web.dev/
```

**Target Scores:**
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >95

### 4.3 Security Testing
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No console errors in production
- [ ] No sensitive data exposed in client
- [ ] CSP headers configured

## 📊 **Step 5: Monitoring Setup**

### 5.1 Error Monitoring
- Configure Sentry DSN in production environment
- Set up error alerting
- Monitor error rates and performance

### 5.2 Analytics
- Configure Google Analytics (if using)
- Set up Vercel Analytics (if using Vercel)
- Monitor user behavior and conversion rates

### 5.3 Uptime Monitoring
- Set up uptime monitoring (Pingdom, UptimeRobot, etc.)
- Configure alerts for downtime
- Monitor API response times

## 🚨 **Troubleshooting**

### Common Issues

#### **Build Fails**
```bash
# Clear cache and reinstall
npm run clean:deps
npm install
npm run build:production
```

#### **Environment Variables Not Working**
- Ensure all variables start with `VITE_`
- Check for typos in variable names
- Verify `.env.production` is in project root
- Restart build process after changes

#### **Routing Issues**
- Verify server is configured for SPA routing
- Check that all routes redirect to `index.html`
- Ensure base URL is configured correctly

#### **Performance Issues**
- Check bundle size with `npm run build:analyze`
- Verify compression is enabled on server
- Check CDN configuration
- Monitor Core Web Vitals

## 📞 **Support**

If you encounter issues during deployment:

1. Check the build logs for specific error messages
2. Verify all environment variables are correctly set
3. Test the build locally with `npm run preview`
4. Check server logs for runtime errors
5. Use browser developer tools to debug client-side issues

## 🎉 **Success!**

Once deployed successfully, your Wasel application will be:
- ✅ Secure and production-ready
- ✅ Optimized for performance
- ✅ Monitored for errors and uptime
- ✅ Scalable and maintainable

Remember to:
- Monitor performance metrics regularly
- Keep dependencies updated
- Review security settings periodically
- Backup your data and configurations