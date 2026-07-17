<h1 align="center">Mini-CRM · Full-Stack</h1>

<p align="center">
  A full-stack CRM to manage contacts and clients, with user authentication and a cloud database —<br/>
  each user securely manages their own contacts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/License-MIT-3DA639?style=flat-square" alt="MIT License"/>
</p>

<p align="center">
  <img src="screenshot.png" alt="Mini-CRM — screenshot" width="100%"/>
</p>

<p align="center">
  <a href="https://mini-crm-nine-psi.vercel.app"><b>Live Demo →</b></a>
</p>

---

## Overview

A full-stack CRM where users sign up, log in, and manage their contacts (name, email, phone, company, notes) in the cloud. Data persists across devices, and each user can only see their own contacts — enforced at the database level with Row Level Security.

---

## Features

### Authentication
- Email / password sign up and login (Supabase Auth)
- Registration form with real-time validation, password strength meter and show/hide password

### Contacts (CRUD)
- Create, edit, and delete contacts
- Fields: name, email, phone, company, notes
- Instant search by name, email or company

### Design & UX
- Minimal, SaaS-style interface (light & dark mode)
- Responsive, accessible (keyboard, focus states, ARIA)

---

## Architecture

The browser talks directly to Supabase; security is enforced by Row Level Security policies.

```mermaid
flowchart LR
    A["Browser<br/>HTML · CSS · JavaScript"] -->|"Auth + CRUD"| B["Supabase"]
    B --> C[("PostgreSQL")]
    B --> D["Auth + Row Level Security"]
```

---

## Technologies

| Technology | Purpose |
|------------|---------|
| JavaScript | Application logic and DOM |
| HTML5 / CSS3 | Interface and styling |
| Supabase | Authentication + PostgreSQL database |
| Vercel | Hosting and continuous deployment |
| Git and GitHub | Version control |

---

## How It Works

1. The user signs up or logs in (Supabase Auth issues a secure session).
2. The frontend reads and writes contacts directly through the Supabase client.
3. Row Level Security policies ensure each request only touches the logged-in user's rows.
4. Changes persist instantly in the cloud database.

---

## Author

**Emiliano Lizarraga** — AI-Assisted Developer
Portfolio: https://emilianohsierra.vercel.app · GitHub: https://github.com/emilianohsierra

---

## License

Released under the MIT License.
