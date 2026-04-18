# Wasel - Jordan's Shared Ride, Bus, and Parcel Platform

[![CI](https://github.com/wasel/wasel/workflows/CI/badge.svg)](https://github.com/wasel/wasel/actions)
[![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](https://github.com/wasel/wasel)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A comprehensive mobility platform connecting travelers, packages, and scheduled bus services across Jordan. Built with modern web technologies and production-grade architecture.

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/wasel/wasel.git
cd wasel
npm install

# 2. Environment setup
cp .env.example .env
# Configure your environment variables

# 3. Development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

---

## 🏗️ Architecture Overview

### Tech Stack

| Layer            | Technology                             | Purpose                    |
| ---------------- | -------------------------------------- | -------------------------- |
| **Frontend**     | React 18, TypeScript, Vite 6          | Modern UI framework        |
| **Routing**      | React Router 7 (lazy-loaded)          | Client-side navigation     |
| **Styling**      | Tailwind CSS 4 + Design System        | Utility-first CSS          |
| **Data**         | Supabase (Postgres + Realtime + Auth) | Backend-as-a-Service       |
| **State**        | TanStack Query v5                     | Server state management    |
| **UI**           | Radix UI                               | Accessible primitives      |
| **Payments**     | Stripe                                 | Payment processing         |
| **Monitoring**   | Sentry                                 | Error tracking             |
| **Testing**      | Vitest + Playwright                   | Unit & E2E testing         |

### Key Features

- 🚗 **Ride Sharing**: Connect drivers and passengers
- 📦 **Package Delivery**: Peer-to-peer package transport
- 🚌 **Bus Services**: Scheduled public transport
- 💰 **Integrated Payments**: Secure Stripe integration
- 🔒 **Enterprise Security**: CSP, 2FA, audit logging
- 🌍 **Bilingual**: Arabic (RTL) and English support
- 📱 **Mobile-First**: Progressive Web App
- ♿ **Accessible**: WCAG 2.1 AA compliant

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── wasel-ds/       # Design system primitives
│   ├── wasel-ui/       # Branded composites
│   └── app/            # App-level components
├── features/           # Feature modules
│   ├── rides/          # Ride sharing
│   ├── packages/       # Package delivery
│   ├── bus/            # Bus services
│   ├── auth/           # Authentication
│   └── payments/       # Payment processing
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── services/           # API & data services
├── utils/              # Utilities & helpers
├── types/              # TypeScript definitions
├── styles/             # Global styles & tokens
└── locales/            # Internationalization
```

---

## 🛠️ Development

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Git**: Latest version

### Environment Setup

Create environment files from templates:

```bash
# Development
cp .env.development.example .env

# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

### Required Environment Variables

```bash
# Core Configuration
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=Wasel

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SENTRY_DSN=https://...
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Development Commands

| Command                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Start development server                            |
| `npm run build`         | Production build with type checking                 |
| `npm run preview`       | Preview production build                            |
| `npm run test`          | Run unit tests                                      |
| `npm run test:e2e`      | Run end-to-end tests                               |
| `npm run test:coverage` | Run tests with coverage report                      |
| `npm run lint`          | Lint code with ESLint                              |
| `npm run lint:strict`   | Lint with zero warnings allowed                     |
| `npm run type-check`    | TypeScript type checking                            |
| `npm run format`        | Format code with Prettier                           |
| `npm run verify`        | Full verification pipeline                          |

### Quality Gates

The project enforces strict quality standards:

- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`
- **ESLint**: Zero warnings policy with security rules
- **Test Coverage**: 90% minimum coverage
- **Bundle Size**: 200KB per chunk limit
- **Performance**: Lighthouse CI with budgets
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Automated vulnerability scanning

---

## 🧪 Testing Strategy

### Unit Testing (Vitest)

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Coverage Thresholds:**
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

### End-to-End Testing (Playwright)

```bash
# All E2E tests
npm run test:e2e

# Accessibility tests
npm run test:e2e:a11y

# Mobile tests
npm run test:e2e:mobile

# RTL Arabic tests
npm run test:e2e:rtl
```

### Performance Testing

```bash
# Lighthouse CI
npm run test:lhci
```

---

## 🔒 Security

### Security Headers

- **CSP**: Strict Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing protection

### Authentication & Authorization

- **Supabase Auth**: Email/password and OAuth
- **Row Level Security**: Database-level permissions
- **2FA Support**: TOTP-based two-factor authentication
- **Session Management**: Secure token handling

### Data Protection

- **Input Validation**: Zod-based type-safe validation
- **XSS Prevention**: HTML sanitization
- **SQL Injection**: Parameterized queries
- **PII Redaction**: Automatic sensitive data masking

---

## 🚀 Deployment

### Build Process

```bash
# Production build
npm run build

# Verify build
npm run verify:full
```

### Environment Configuration

Set `VITE_APP_ENV` to match your deployment environment:

- `development`: Local development
- `staging`: Staging environment
- `production`: Production environment

### Deployment Platforms

**Recommended platforms:**
- **Vercel**: Zero-config deployment
- **Netlify**: JAMstack hosting
- **Cloudflare Pages**: Edge deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Supabase production database
- [ ] Stripe production keys
- [ ] Domain SSL certificate
- [ ] CDN configuration
- [ ] Error monitoring setup
- [ ] Performance monitoring
- [ ] Backup strategy

---

## 📊 Monitoring & Analytics

### Error Tracking

- **Sentry**: Real-time error monitoring
- **Custom Logging**: Structured application logs
- **Performance Metrics**: Core Web Vitals tracking

### Analytics

- **Vercel Analytics**: Performance insights
- **Custom Events**: User interaction tracking
- **Business Metrics**: Ride/package completion rates

---

## 🌍 Internationalization

### Supported Languages

- **Arabic (ar)**: Right-to-left layout
- **English (en)**: Left-to-right layout

### Adding Translations

1. Update `src/locales/translations.ts`
2. Add RTL-specific styles if needed
3. Test with `npm run test:e2e:rtl`

---

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** changes with tests
4. **Run** quality checks: `npm run verify`
5. **Submit** a pull request

### Code Standards

- **TypeScript**: Strict typing required
- **ESLint**: Zero warnings policy
- **Prettier**: Consistent formatting
- **Conventional Commits**: Semantic commit messages
- **Test Coverage**: Maintain 90%+ coverage

### Pull Request Process

1. Ensure all CI checks pass
2. Update documentation if needed
3. Add tests for new features
4. Request review from maintainers

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help

- **Documentation**: Check this README and inline docs
- **Issues**: [GitHub Issues](https://github.com/wasel/wasel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/wasel/wasel/discussions)
- **Email**: support@wasel.jo

### Reporting Security Issues

Please report security vulnerabilities privately to security@wasel.jo or through [GitHub Security Advisories](https://github.com/wasel/wasel/security/advisories).

---

## 🎯 Roadmap

### Current Version (v1.0)
- ✅ Core ride sharing functionality
- ✅ Package delivery system
- ✅ Bus route integration
- ✅ Payment processing
- ✅ Mobile-responsive design

### Upcoming Features
- 🔄 Real-time trip tracking
- 🔄 Advanced route optimization
- 🔄 Corporate accounts
- 🔄 API for third-party integrations
- 🔄 Mobile app (React Native)

---

**Built with ❤️ in Jordan**