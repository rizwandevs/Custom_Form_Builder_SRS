# Custom Form Builder

Web-based dynamic form builder (React + Node.js + MySQL) per the project SRS.

## Stack

- **Frontend**: React 19, TypeScript, Redux Toolkit, Tailwind CSS, @dnd-kit
- **Backend**: Node.js, Express, Prisma, JWT auth
- **Database**: MySQL (Laragon)

## Prerequisites

- Node.js 20+
- MySQL running (Laragon default: `root` with no password)

## Setup

### 1. Database

Create database (or let Prisma create it):

```sql
CREATE DATABASE IF NOT EXISTS form_builder;
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # if .env missing
npm install
npx prisma db push
npm run db:seed
npm run dev
```

API runs at **http://localhost:3001**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173** (proxies `/api` to backend)

## Demo login

- Email: `admin@example.com`
- Password: `admin123`

## Sample public form

After seeding: **http://localhost:5173/f/contact-us**

## Features

- JWT authentication (login / logout)
- Dashboard with stats and recent submissions
- Form CRUD, duplicate, publish
- Drag-and-drop form builder with field settings and conditional visibility
- Public form renderer with validation
- Submission list, search, detail view, CSV export

## Project structure

```
├── backend/     Express API + Prisma
├── frontend/    React admin + public forms
└── README.md
```
