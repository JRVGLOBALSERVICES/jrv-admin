# JRV Admin 🎛️

A powerful admin panel built with Next.js 16, TypeScript, and Tailwind CSS for managing rental services, cars, agreements, and user operations with advanced AI capabilities.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ecf8e?style=flat&logo=supabase)
![Version](https://img.shields.io/badge/Version-1.8.2-green?style=flat)

## 📋 Table of Contents

- [What This Project Does](#what-this-project-does)
- [Why It's Useful](#why-its-useful)
- [Getting Started](#getting-started)
- [Authentication & Roles](#authentication--roles)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Features](#features)
- [Image Uploads](#image-uploads)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)

## 🎯 What This Project Does

JRV Admin is a comprehensive administrative dashboard that manages:

- **Car Fleet Management** - Track inventory, availability, and maintenance
- **Agreement Processing** - Create and manage rental agreements
- **User Management** - Admin and customer account control
- **Audit Logging** - Track all system changes and actions
- **AI Document Processing** - OCR and AI-powered data extraction with Google Cloud Vision & Gemini
- **PDF Generation** - Create professional rental agreements
- **Image Management** - Cloudinary integration for optimized storage
- **Manual/Documentation** - Interactive documentation portal

The system features role-based access control, real-time updates, and automated version bumping.

## 💡 Why It's Useful

### For Administrators
- **Centralized control** of all business operations
- **Audit trail** for compliance and accountability
- **AI-powered** document processing saves time
- **PDF generation** for professional agreements
- **Role management** for team access control

### For Operations Staff
- **Quick car lookup** with availability status
- **Agreement creation** with auto-populated data
- **User account** management interface
- **Mobile-responsive** for field operations

### For Developers
- **Type-safe** development with TypeScript
- **Modern stack** with Next.js 16 App Router
- **Modular architecture** for maintainability
- **AI integration** examples with Google Gemini
- **Version management** automated scripts

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn** package manager
- **Supabase account** for authentication and database
- **Cloudinary account** for image storage
- **Google Cloud** account (for Vision API & Gemini AI, optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/jrv-admin.git
   cd jrv-admin
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Public Supabase client (safe to expose to client)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key

   # Server-only Supabase service role key (DO NOT expose to client)
   SUPABASE_SERVICE_ROLE_KEY=service-role-key

   # Cloudinary for uploads
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Google Cloud AI (optional)
   GOOGLE_CLOUD_VISION_API_KEY=your-vision-api-key
   GOOGLE_GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Create initial admin user in Supabase**

   ```sql
   INSERT INTO admin_users (user_id, role)
   VALUES ('<SUPABASE_USER_ID>', 'superadmin');
   ```

2. **Configure database tables** in Supabase
3. **Upload initial car inventory** (optional)
4. **Test authentication** and role-based access

## 🔐 Authentication & Roles

Auth is powered by Supabase with email/password authentication. The system enforces role-based access control.

### Role Hierarchy

- **superadmin** - Full system access with elevated permissions
- **admin** - Regular administrative access

### Server-Side Guard

The `requireAdmin()` function (in [src/lib/auth/requireAdmin.ts](src/lib/auth/requireAdmin.ts)) protects routes:

```typescript
const auth = await requireAdmin();
if (!auth.ok) {
  return NextResponse.json(
    { error: auth.message },
    { status: auth.status }
  );
}
// User authenticated as admin
const { id, role } = auth;
```

### Authentication Flow

1. User logs in at `/` (login page)
2. Credentials verified via `/admin/login/api` route
3. Supabase sets authentication cookie
4. `createSupabaseServer()` reads cookie for server-side operations
5. Role verified against `admin_users` table

### Security Notes

- Cookie-based authentication for SSR compatibility
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) used only server-side
- All admin routes protected by `requireAdmin()` middleware
- Password hashing handled by Supabase Auth

## 📁 Project Structure

```
jrv-admin/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Login page
│   │   ├── layout.tsx                    # Root layout
│   │   ├── admin/
│   │   │   ├── layout.tsx                # Admin layout with sidebar
│   │   │   ├── login/api/route.ts        # Login API endpoint
│   │   │   ├── upload/route.ts           # Image upload endpoint
│   │   │   ├── cars/                     # Car management
│   │   │   ├── agreements/               # Agreement processing
│   │   │   ├── users/                    # User management
│   │   │   └── audit/                    # Audit log viewer
│   │   └── manual/                       # Documentation portal
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx                # Button component
│   │       ├── Card.tsx                  # Card component
│   │       ├── Table.tsx                 # Data table
│   │       ├── Modal.tsx                 # Modal dialog
│   │       ├── Sidebar.tsx               # Admin sidebar
│   │       └── SplashScreen.tsx          # Loading screen
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server client (SSR)
│   │   │   └── admin.ts                  # Admin client (service role)
│   │   ├── auth/
│   │   │   ├── requireAdmin.ts           # Auth middleware
│   │   │   └── roles.ts                  # Role definitions
│   │   ├── cloudinary.ts                 # Cloudinary config
│   │   └── upload.ts                     # Upload helper
│   └── types/                            # TypeScript definitions
├── scripts/
│   ├── bump-version.js                   # Version management
│   └── check-urgent.ts                   # Urgent check script
├── public/
│   ├── manual/                           # Manual assets
│   ├── assets/                           # Static assets
│   └── sfx/                              # Sound effects
└── package.json                          # Dependencies
```

## 🔐 Environment Variables

| Variable | Description | Required | Visibility |
|----------|-------------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | Server-only |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes | Server-only |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | Server-only |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | Server-only |
| `GOOGLE_CLOUD_VISION_API_KEY` | Google Vision API key | No | Server-only |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | No | Server-only |

**Important**: Never commit `.env.local` or expose service role keys to the client.

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |
| `npm run version:patch` | Bump patch version (1.0.0 → 1.0.1) |
| `npm run version:minor` | Bump minor version (1.0.0 → 1.1.0) |
| `npm run version:major` | Bump major version (1.0.0 → 2.0.0) |
| `npm run build:version` | Build and auto-bump patch version |

## ✨ Features

### Core Features
- ✅ **Next.js 16** with App Router and React 19
- ✅ **TypeScript** strict mode for type safety
- ✅ **Tailwind CSS 4** for modern styling
- ✅ **Supabase** for auth, database, and real-time
- ✅ **Cloudinary** for optimized image storage
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **Audit Logging** for all system changes
- ✅ **Responsive Design** mobile-first approach

### Advanced Features
- **Google Cloud Vision API** for OCR document scanning
- **Google Gemini AI** for intelligent data extraction
- **PDF Generation** with @react-pdf/renderer
- **Lottie Animations** for engaging UI
- **Tesseract.js** for client-side OCR fallback
- **React PDF Viewer** for document display
- **Date-fns-tz** for timezone handling
- **Use-debounce** for optimized search

### AI Capabilities
- **Document Recognition** extract text from images
- **Auto-fill Forms** AI suggests field values
- **Data Validation** AI checks for consistency
- **Smart Search** semantic search across records

### Developer Features
- **Automated Versioning** with bump scripts
- **Hot Module Replacement** fast development
- **React Compiler** enabled for optimization
- **TypeScript Paths** @/ alias for clean imports
- **ESLint** configured with Next.js rules

## 📤 Image Uploads

Upload flow uses Cloudinary for optimized storage:

```typescript
import { uploadImage } from "@/lib/upload";

async function handleFileUpload(file: File) {
  try {
    const url = await uploadImage(file);
    console.log("Uploaded to:", url);
    // Save URL to database
  } catch (error) {
    console.error("Upload failed:", error);
  }
}
```

The `/admin/upload` route handles server-side upload to Cloudinary and returns the public URL.

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel automatically builds and deploys

```bash
npm run build
# Vercel handles deployment
```

### Manual Deployment

```bash
npm run build
npm start
```

### Environment Configuration

- Set all required environment variables
- Mark `SUPABASE_SERVICE_ROLE_KEY` and `*_SECRET` as server-only
- Configure domain and SSL certificates
- Set up monitoring and error tracking

## 🔧 Troubleshooting

### Common Issues

**Missing env variables**
- Verify all required variables are set in `.env.local`
- Check Vercel/host environment variables

**Supabase auth session not present**
- Ensure cookies are enabled in browser
- Check sameSite and secure cookie settings
- Verify `createSupabaseServer()` is used server-side

**Upload errors**
- Confirm Cloudinary credentials are correct
- Check file size limits (default: 10MB)
- Verify server route `/admin/upload` is accessible

**Admin user not recognized**
- Ensure `admin_users` table has entry for user
- Verify `user_id` matches Supabase Auth user ID
- Check role value is 'admin' or 'superadmin'

**Service role misuse**
- Never use `SUPABASE_SERVICE_ROLE_KEY` in client code
- Only import from server-side files (route handlers, server components)

### Debug Tips

- Check browser console for client errors
- Review server logs for API route errors
- Use Supabase dashboard to inspect database
- Test authentication in incognito mode

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use functional components with hooks
- Write descriptive commit messages
- Update README for behavior or env var changes
- Test on multiple browsers and devices
- Maintain accessibility standards

## 📞 Support

### Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Google Cloud Vision](https://cloud.google.com/vision/docs)
- [Google Gemini AI](https://ai.google.dev/docs)

### Getting Help
- 🐛 Report bugs via GitHub Issues
- 💡 Request features via Pull Requests
- 📧 Contact the development team

### Maintainers
**JRV Systems Development Team**

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and AI**
