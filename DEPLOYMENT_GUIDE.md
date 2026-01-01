# 🚀 Production Deployment Guide - Free Hosting

## Overview

This guide will help you deploy the Office Time Manager application to **free hosting platforms** with a **monorepo architecture** (frontend + backend combined).

---

## 🏗️ Architecture

### Current Structure (Development)
```
Frontend (React) → http://localhost:5173
Backend (Express) → http://localhost:5000
```

### Production Structure (Monorepo)
```
Single Server → Serves both API and Frontend
├── /api/* → Express API routes
└── /* → React SPA (static files)
```

---

## 📦 Option 1: Render.com (Recommended)

### Why Render?
- ✅ Free tier available
- ✅ Auto-deploy from GitHub
- ✅ Free SSL certificates
- ✅ Easy MongoDB Atlas integration
- ✅ No credit card required

### Step-by-Step Deployment

#### 1. Prepare Your Code

**Create production server file:**
```bash
# This will be created in the implementation
touch server-production.js
```

#### 2. Update package.json

```json
{
  "scripts": {
    "build": "cd frontend && npm install && npm run build",
    "start": "node server-production.js",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  }
}
```

#### 3. Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"

#### 4. Configure Web Service

```yaml
Name: office-time-manager
Environment: Node
Region: Choose nearest
Branch: main
Build Command: npm run build
Start Command: npm start
```

#### 5. Environment Variables

Add these in Render dashboard:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_WORK_HOURS=8
```

#### 6. MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (512MB)
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string
6. Add to Render environment variables

#### 7. Deploy

- Push to GitHub → Auto-deploys
- Or click "Manual Deploy" in Render

#### 8. Access Your App

```
https://office-time-manager.onrender.com
```

### Render Limitations

- ⚠️ Free tier spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes 30-60 seconds
- ⚠️ 750 hours/month free (enough for 1 service)

---

## 📦 Option 2: Railway.app

### Why Railway?
- ✅ $5 free credit (no credit card)
- ✅ Better performance than Render
- ✅ No spin-down
- ✅ Built-in MongoDB option

### Step-by-Step Deployment

#### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

#### 2. Deploy from GitHub

1. Select "Deploy from GitHub repo"
2. Choose your repository
3. Railway auto-detects Node.js

#### 3. Add MongoDB

1. Click "New" → "Database" → "Add MongoDB"
2. Railway provides connection string automatically
3. Use `${{MongoDB.MONGO_URL}}` in your app

#### 4. Environment Variables

```env
NODE_ENV=production
MONGODB_URI=${{MongoDB.MONGO_URL}}
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

#### 5. Configure Build

Railway auto-detects, but you can customize:

```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### 6. Deploy

- Auto-deploys on git push
- Get public URL from Railway dashboard

### Railway Limitations

- ⚠️ $5 credit runs out (~500 hours)
- ⚠️ Need to upgrade after credit exhausted

---

## 📦 Option 3: Vercel + MongoDB Atlas

### Why Vercel?
- ✅ Best for frontend
- ✅ Unlimited deployments
- ✅ Great performance
- ✅ Free SSL

### Architecture

```
Vercel (Frontend + API Routes) + MongoDB Atlas
```

### Step-by-Step Deployment

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Create vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/src/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

#### 3. Deploy

```bash
cd office-time-manager
vercel
```

#### 4. Environment Variables

Add in Vercel dashboard or CLI:

```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
```

### Vercel Limitations

- ⚠️ Serverless functions (10s timeout)
- ⚠️ Cold starts
- ⚠️ Not ideal for long-running processes

---

## 📦 Option 4: Cyclic.sh

### Why Cyclic?
- ✅ Completely free
- ✅ No credit card required
- ✅ No spin-down
- ✅ Built-in database

### Step-by-Step Deployment

#### 1. Create Account

1. Go to [cyclic.sh](https://cyclic.sh)
2. Sign in with GitHub
3. Click "Deploy"

#### 2. Connect Repository

1. Select your GitHub repo
2. Cyclic auto-deploys

#### 3. Environment Variables

Add in Cyclic dashboard:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

#### 4. Deploy

- Auto-deploys on push
- Get URL: `https://your-app.cyclic.app`

### Cyclic Limitations

- ⚠️ Limited resources
- ⚠️ Slower than Railway/Render

---

## 🗄️ Database Options

### MongoDB Atlas (Recommended)

**Free Tier:**
- 512MB storage
- Shared cluster
- No credit card required

**Setup:**

1. Create account at [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create cluster (AWS/GCP/Azure)
3. Create database user
4. Whitelist IP: `0.0.0.0/0`
5. Get connection string:

```
mongodb+srv://username:password@cluster.mongodb.net/office-time-manager?retryWrites=true&w=majority
```

### Alternative: Railway MongoDB

- Included with Railway
- Easier setup
- Limited free tier

---

## 🔒 Security Checklist

Before deploying:

- [ ] Change all default secrets
- [ ] Use strong JWT secrets (min 32 characters)
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Enable helmet.js
- [ ] Sanitize inputs
- [ ] Use environment variables (never commit secrets)
- [ ] Enable MongoDB authentication
- [ ] Whitelist only necessary IPs

---

## 🧪 Testing Before Deployment

### Local Production Build

```bash
# Build frontend
cd frontend
npm run build

# Test production server
cd ..
NODE_ENV=production node server-production.js

# Visit http://localhost:5000
```

### Environment Variables Test

```bash
# Create .env.production
cp backend/.env.example .env.production

# Edit with production values
# Test locally
```

---

## 📊 Monitoring & Maintenance

### Free Monitoring Tools

1. **UptimeRobot** (uptime monitoring)
   - Free: 50 monitors
   - 5-minute checks
   - Email alerts

2. **Sentry** (error tracking)
   - Free: 5K errors/month
   - Real-time alerts
   - Stack traces

3. **Google Analytics** (user analytics)
   - Free
   - User behavior tracking

4. **LogRocket** (session replay)
   - Free: 1K sessions/month

### Setup Monitoring

```bash
# Install Sentry
npm install @sentry/node @sentry/react

# Configure in backend
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });

# Configure in frontend
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: process.env.VITE_SENTRY_DSN });
```

---

## 🔄 CI/CD with GitHub Actions

### Auto-deploy on Push

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Run tests
        run: npm test
      
      - name: Build frontend
        run: npm run build
      
      - name: Deploy to Render
        run: curl ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails

```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

#### 2. MongoDB Connection Error

```bash
# Check connection string format
mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Verify IP whitelist (0.0.0.0/0)
# Check database user credentials
```

#### 3. CORS Errors

```javascript
// Update backend CORS config
app.use(cors({
  origin: [
    'https://your-app.onrender.com',
    'https://your-domain.com'
  ],
  credentials: true
}));
```

#### 4. 404 on Refresh

```javascript
// Ensure catch-all route in production server
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});
```

---

## 📈 Scaling Strategy

### When to Upgrade from Free Tier

**Indicators:**
- More than 100 daily active users
- Frequent spin-down issues
- Need for 24/7 uptime
- Database exceeds 512MB
- Need for custom domain

### Paid Tier Recommendations

1. **Render:** $7/month (no spin-down)
2. **Railway:** $5/month (better performance)
3. **MongoDB Atlas:** $9/month (2GB storage)
4. **Total:** ~$15-20/month

---

## 🎯 Deployment Comparison

| Feature | Render | Railway | Vercel | Cyclic |
|---------|--------|---------|--------|--------|
| **Cost** | Free | $5 credit | Free | Free |
| **Spin-down** | Yes (15 min) | No | No | No |
| **Database** | External | Built-in | External | Built-in |
| **Build Time** | ~2-3 min | ~1-2 min | ~1 min | ~2-3 min |
| **Custom Domain** | ✅ | ✅ | ✅ | ✅ |
| **SSL** | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto |
| **Best For** | MVP | Production | Frontend | Testing |

---

## 🏆 Recommended: Render + MongoDB Atlas

**Why?**
- ✅ Completely free
- ✅ Easy setup
- ✅ Good documentation
- ✅ Auto-deploy from GitHub
- ✅ Free SSL
- ✅ Scalable

**Total Cost:** $0/month

**Performance:** Good for MVP and small teams

---

## 📞 Support

If you encounter issues:

1. Check platform status pages
2. Review deployment logs
3. Test locally first
4. Check environment variables
5. Verify database connection

---

**Next Steps:** Choose your hosting platform and follow the deployment guide! 🚀
