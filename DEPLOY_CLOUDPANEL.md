# Deploy Custom Form Builder on CloudPanel

This guide deploys the project on a **VPS with [CloudPanel](https://www.cloudpanel.io/)** using:

- **One domain** (recommended): e.g. `forms.yourdomain.com`
  - Serves the React build (static files)
  - Proxies `/api` and `/uploads` to the Node.js backend
- **MySQL** database (created in CloudPanel)
- **PM2** to keep the API running

No frontend code changes are needed if you use the nginx proxy (the app already calls `/api` with relative URLs).

---

## What you need before starting

| Item | Example |
|------|---------|
| VPS with CloudPanel installed | Ubuntu 22.04 + CloudPanel v2 |
| Domain pointed to server IP | `forms.yourdomain.com` → A record |
| SSH access | Root or site user |
| Node.js 20+ on server | Set in CloudPanel → Node.js site or NVM |

---

## Architecture (production)

```
Browser
   │
   ▼
https://test.testyoursite.xyz  (CloudPanel nginx + SSL)
   │
   ├── /              → /home/.../test.testyoursite.xyz/  (frontend dist)
   ├── /api/*         → proxy → http://127.0.0.1:3001  (/.../backend)
   └── /uploads/*     → proxy → http://127.0.0.1:3001
                              │
                              ▼
                         MySQL
```

**Example paths on your server:**

| What | Path |
|------|------|
| Frontend (dist) | `/home/testyoursite-test/htdocs/test.testyoursite.xyz/` |
| Backend (API) | `/home/testyoursite-test/htdocs/test.testyoursite.xyz/backend/` |

---

## Step 1 — Create MySQL database in CloudPanel

1. Log in to **CloudPanel** (`https://your-server-ip:8443`).
2. Open **Databases** → **Add Database**.
3. Create:
   - **Database name:** `form_builder`
   - **User** + **strong password**
4. Note the connection details (host is usually `127.0.0.1` or `localhost`).

Your `DATABASE_URL` will look like:

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/form_builder"
```

(URL-encode special characters in the password if needed.)

---

## Step 2 — Create a site in CloudPanel

1. **Sites** → **Add Site**.
2. Choose **Static HTML** (or **PHP** — both allow custom nginx vhost).
3. **Domain:** `forms.yourdomain.com`
4. Create the site and enable **SSL** (Let’s Encrypt) in the site’s SSL tab.

> **Why Static HTML?** The React app is built to static files. The API runs separately via PM2, not as CloudPanel’s “Node.js site” document root.

---

## Step 3 — Upload the project (SSH)

1. In CloudPanel, open the site → **SSH/FTP** and note the **site user** and path, e.g.:

   ```text
   /home/cloudpanel-site/htdocs/forms.yourdomain.com/
   ```

2. Connect by SSH:

   ```bash
   ssh cloudpanel-site@YOUR_SERVER_IP
   ```

3. Upload code (pick one method):

   **Option A — Git (recommended)**

   ```bash
   cd ~/htdocs/forms.yourdomain.com
   git clone YOUR_REPO_URL app
   cd app
   ```

   **Option B — ZIP**  
   Upload ZIP via SFTP (FileZilla / WinSCP) to `htdocs/forms.yourdomain.com/app/` and unzip.

Final layout example (two common layouts):

**Layout A — backend inside site root (your server):**

```text
/home/testyoursite-test/htdocs/test.testyoursite.xyz/
├── index.html              ← frontend dist (site root)
├── assets/
└── backend/                ← API + prisma + .env
    ├── src/
    ├── prisma/
    ├── dist/
    └── uploads/
```

**Layout B — separate app folder:**

```text
/home/.../htdocs/forms.yourdomain.com/
├── index.html              ← frontend dist
├── assets/
└── app/backend/            ← API
```

---

## Step 4 — Configure and build the backend

```bash
# Layout A (backend in site root):
cd ~/htdocs/test.testyoursite.xyz/backend
# Layout B:
# cd ~/htdocs/forms.yourdomain.com/app/backend

# Install dependencies
npm install

# Create production .env
nano .env
```

**Production `.env` example:**

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/form_builder"
JWT_SECRET="use-a-long-random-string-at-least-32-chars"
JWT_EXPIRES_IN="24h"
CORS_ORIGIN="https://forms.yourdomain.com"
PORT=3001
UPLOAD_DIR="./uploads"
```

```bash
# Generate Prisma client and sync database
npx prisma generate
npx prisma db push

# Optional: create admin user + sample form
npm run db:seed

# Build TypeScript
npm run build

# Create uploads folders and permissions
mkdir -p uploads uploads/avatars
chmod -R 755 uploads
```

---

## Step 5 — Run the API with PM2

Install PM2 (once per site user):

```bash
npm install pm2@latest -g
```

Start the API from the **backend** folder:

```bash
# Layout A (backend in site root):
cd ~/htdocs/test.testyoursite.xyz/backend
# Layout B:
# cd ~/htdocs/forms.yourdomain.com/app/backend
pm2 start dist/index.js --name form-builder-api
pm2 save
```

**Auto-start after server reboot** (CloudPanel docs):

```bash
echo $PATH
# Copy the output, then:
crontab -e
```

Add (replace `PATH` with your output):

```cron
PATH=/home/your-user/.nvm/versions/node/v20.x.x/bin:/usr/local/bin:...
@reboot pm2 resurrect &> /dev/null
```

Check status:

```bash
pm2 status
pm2 logs form-builder-api
curl http://127.0.0.1:3001/api/health
```

You should see `{"status":"ok"}`.

---

## Step 6 — Build and publish the frontend

On the server (or build locally and upload `dist/`):

```bash
cd ~/htdocs/forms.yourdomain.com/app/frontend
npm install
npm run build
```

Copy the build to the **site document root**:

```bash
cd /home/testyoursite-test/htdocs/test.testyoursite.xyz/backend/../frontend
npm run build
cp -r dist/* /home/testyoursite-test/htdocs/test.testyoursite.xyz/
```

Or if you build on your PC, upload `dist/*` into:

`/home/testyoursite-test/htdocs/test.testyoursite.xyz/`

The site root must contain `index.html` and `assets/`.

---

## Fix: browser shows "Cannot GET /"

This means **nginx sends `/` to Node.js**, but Express only has `/api` routes.

**Fix A (quick, keep your current vhost):** add to `backend/.env`:

```env
SERVE_STATIC=true
```

Rebuild and restart:

```bash
cd /home/testyoursite-test/htdocs/test.testyoursite.xyz/backend
npm run build
pm2 restart form-builder-api
```

Express will serve `index.html` from `/home/.../test.testyoursite.xyz/` (parent of `backend/`).

**Fix B (recommended long-term):** change nginx so `/` serves static files and only `/api` + `/uploads` proxy to port 3001 (see Step 7 below).

---

## Step 7 — Configure nginx (reverse proxy for API)

In CloudPanel:

1. Open your site → **Vhost** (or **Nginx Config**).
2. Inside the `server { ... }` block for `forms.yourdomain.com`, add **before** the main `location /` block:

```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10M;
}

location /uploads {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

3. Ensure the SPA fallback exists for React Router (if not already there):

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

4. Save and reload nginx (CloudPanel usually does this automatically).

---

## Step 8 — Verify deployment

| Test | URL |
|------|-----|
| Health | `https://forms.yourdomain.com/api/health` |
| Login UI | `https://forms.yourdomain.com/login` |
| Admin (after login) | `https://forms.yourdomain.com/dashboard` |
| Public form (if seeded) | `https://forms.yourdomain.com/f/contact-us` |

Default seed login (if you ran `db:seed`):

- Email: `admin@example.com`
- Password: `admin123`  
  **Change the password immediately** under Profile.

---

## Step 9 — Updates (redeploy)

```bash
cd ~/htdocs/forms.yourdomain.com/app
git pull   # if using git

cd backend
npm install
npx prisma db push
npm run build
pm2 restart form-builder-api

cd ../frontend
npm install
npm run build
cp -r dist/* ~/htdocs/forms.yourdomain.com/
```

---

## Alternative: API on a subdomain

If you prefer `api.yourdomain.com` instead of path proxying:

1. Create a **Node.js** site in CloudPanel for `api.yourdomain.com` (port `3001`).
2. Deploy only the `backend/` folder there.
3. Set frontend production API base — you must build with an env variable (requires a small code change in `vite.config.ts` / `api/client.ts` to use `import.meta.env.VITE_API_URL`).
4. Set `CORS_ORIGIN=https://app.yourdomain.com`.

The **single-domain proxy** approach (Step 7) is simpler for this project.

---

## Troubleshooting

### Prisma: "Could not find Prisma Schema"

This happens when you run `npx prisma` **outside** the `backend` folder, or the `prisma/` folder was not uploaded.

**Fix:**

```bash
# 1. Go to the backend folder (adjust path to your server)
cd ~/htdocs/forms.yourdomain.com/app/backend

# 2. Confirm schema exists
ls -la prisma/schema.prisma

# 3. Install dependencies first (uses project's Prisma 6.x, not random npx 7.x)
npm install

# 4. Run via npm scripts (recommended)
npm run db:generate
npx prisma db push
npm run db:seed
```

If `ls prisma/schema.prisma` says **file not found**, upload the full `backend` folder including `backend/prisma/schema.prisma` and `backend/prisma/seed.ts`.

**Do not** run plain `npx prisma` from `htdocs/` or site root — always from `backend/` after `npm install`.

### Prisma: "Environment variable not found: DATABASE_URL"

Create `.env` in the **backend** folder (same folder as `package.json`):

```bash
cd /home/testyoursite-test/htdocs/test.testyoursite.xyz/backend
nano .env
```

Paste (replace with your CloudPanel MySQL details from **Databases** in CloudPanel):

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/form_builder"
JWT_SECRET="your-long-random-secret-here"
JWT_EXPIRES_IN="24h"
CORS_ORIGIN="https://test.testyoursite.xyz"
PORT=3001
UPLOAD_DIR="./uploads"
```

**Password special characters:** If the password has `@`, `#`, `%`, etc., URL-encode them in `DATABASE_URL` (e.g. `@` → `%40`).

Then run from **backend** (not `backend/prisma`):

```bash
cd /home/testyoursite-test/htdocs/test.testyoursite.xyz/backend
npx prisma db push
npm run db:seed
```

Verify `.env` is readable:

```bash
ls -la .env
cat .env | grep DATABASE_URL
```

| Problem | What to check |
|---------|----------------|
| 502 on `/api` | `pm2 status` — is API online? `pm2 logs form-builder-api` |
| Database error | `DATABASE_URL` user/password, database exists, `npx prisma db push` |
| Login fails / CORS | `CORS_ORIGIN` must exactly match `https://forms.yourdomain.com` (no trailing slash) |
| Blank page after refresh | nginx `try_files ... /index.html` for SPA |
| File upload fails | `client_max_body_size 10M` in nginx; `uploads/` writable by site user |
| 401 on all API calls | `JWT_SECRET` changed after tokens issued — log in again |
| SSL mixed content | Use `https://` everywhere; CloudPanel Let’s Encrypt on site |

**View API logs:**

```bash
pm2 logs form-builder-api --lines 100
```

**Test DB connection:**

```bash
cd backend
npx prisma db execute --stdin <<< "SELECT 1"
```

---

## Security checklist (production)

- [ ] Strong `JWT_SECRET` (32+ random characters)
- [ ] Strong MySQL password
- [ ] SSL enabled in CloudPanel
- [ ] Change default admin password after seed
- [ ] Firewall: only 80, 443, 8443 (CloudPanel) open
- [ ] Do not commit `.env` to Git
- [ ] Restrict CloudPanel admin access (IP allowlist if possible)

---

## Quick reference — ports and paths

| Service | Port / path |
|---------|-------------|
| CloudPanel UI | `8443` |
| nginx (public) | `80` / `443` |
| Node API (internal) | `3001` |
| MySQL | `3306` (localhost only) |
| Frontend files | `~/htdocs/forms.yourdomain.com/` |
| Backend app | `~/htdocs/forms.yourdomain.com/app/backend/` |
| Uploads | `backend/uploads/` |

---

For technology details (what each library does), see [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md).
