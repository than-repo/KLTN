## Getting Started

First, run the development server:
use npm.cmd like:

```bash
npm run dev
```

```
e-learning-fe
├─ .prettierignore
├─ AGENTS.md
├─ CLAUDE.md
├─ eslint.config.mjs
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prettier.config.js
├─ production_elearning_learning_page_design.md
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ icons
│  ├─ images
│  │  ├─ AI.png
│  │  ├─ auth-illustration.png
│  │  ├─ home-learning-workspace.png
│  │  ├─ logo.png
│  │  ├─ logo.svg
│  │  ├─ nestjs.png
│  │  └─ nextjs.png
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ app
│  │  ├─ auth
│  │  │  └─ google
│  │  │     └─ success
│  │  │        └─ page.tsx
│  │  ├─ courses
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]
│  │  │     ├─ learn
│  │  │     │  ├─ assessments
│  │  │     │  │  └─ [assessmentId]
│  │  │     │  │     └─ attempts
│  │  │     │  │        └─ [attemptId]
│  │  │     │  │           ├─ page.tsx
│  │  │     │  │           └─ result
│  │  │     │  │              └─ page.tsx
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     └─ payment
│  │  │        └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ forgot-password
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  ├─ my-courses
│  │  │  └─ page.tsx
│  │  ├─ page.tsx
│  │  ├─ payments
│  │  │  └─ vnpay
│  │  │     └─ return
│  │  │        └─ page.tsx
│  │  ├─ profile
│  │  │  └─ page.tsx
│  │  ├─ register
│  │  │  └─ page.tsx
│  │  ├─ reset-password
│  │  │  └─ page.tsx
│  │  └─ _components
│  │     ├─ home-content.ts
│  │     ├─ home-page.tsx
│  │     └─ sections
│  │        ├─ category-section.tsx
│  │        ├─ featured-courses-section.tsx
│  │        ├─ final-cta-section.tsx
│  │        ├─ footer-section.tsx
│  │        ├─ hero-section.tsx
│  │        ├─ role-section.tsx
│  │        └─ stats-section.tsx
│  ├─ components
│  │  ├─ layout
│  │  │  └─ public-navbar
│  │  │     ├─ auth-actions.tsx
│  │  │     ├─ brand-link.tsx
│  │  │     ├─ desktop-nav.tsx
│  │  │     ├─ mobile-nav-link.tsx
│  │  │     ├─ nav-link.tsx
│  │  │     ├─ navbar-search.tsx
│  │  │     ├─ public-navbar.tsx
│  │  │     └─ user-menu.tsx
│  │  ├─ shared
│  │  └─ ui
│  │     ├─ badge.tsx
│  │     ├─ button-link.tsx
│  │     ├─ README.md
│  │     └─ section-header.tsx
│  ├─ features
│  │  ├─ assessments
│  │  │  ├─ api
│  │  │  │  └─ assessment-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ assessment-attempt-page.tsx
│  │  │  │  ├─ assessment-attempt-route-client.tsx
│  │  │  │  ├─ attempt-history.tsx
│  │  │  │  ├─ attempt-result-route-client.tsx
│  │  │  │  ├─ attempt-result.tsx
│  │  │  │  ├─ learner-assessment-entry.tsx
│  │  │  │  ├─ project-submission-form.tsx
│  │  │  │  ├─ quiz-question-card.tsx
│  │  │  │  └─ quiz-timer.tsx
│  │  │  ├─ hooks
│  │  │  │  ├─ use-assessment-attempt.ts
│  │  │  │  ├─ use-attempt-result.ts
│  │  │  │  ├─ use-learner-assessment.ts
│  │  │  │  └─ use-learner-course-assessments.ts
│  │  │  ├─ types
│  │  │  │  └─ assessment.ts
│  │  │  └─ utils
│  │  │     ├─ assessment-labels.ts
│  │  │     └─ assessment-time.ts
│  │  ├─ auth
│  │  │  ├─ api
│  │  │  │  └─ auth-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ auth-illustration.tsx
│  │  │  │  ├─ auth-page-shell.tsx
│  │  │  │  ├─ forgot-password-form.tsx
│  │  │  │  ├─ google-auth-button.tsx
│  │  │  │  ├─ google-auth-success.tsx
│  │  │  │  ├─ guest-only-route.tsx
│  │  │  │  ├─ login-form.tsx
│  │  │  │  ├─ protected-route.tsx
│  │  │  │  ├─ register-form.tsx
│  │  │  │  ├─ reset-password-form.tsx
│  │  │  │  └─ role-protected-route.tsx
│  │  │  ├─ hooks
│  │  │  │  └─ use-auth.ts
│  │  │  └─ types
│  │  │     └─ auth.ts
│  │  ├─ courses
│  │  │  ├─ api
│  │  │  │  └─ course-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ course-card.tsx
│  │  │  │  ├─ course-catalog-state.tsx
│  │  │  │  ├─ course-detail.tsx
│  │  │  │  ├─ course-filter-summary.tsx
│  │  │  │  ├─ course-filters.tsx
│  │  │  │  ├─ course-grid.tsx
│  │  │  │  ├─ course-image.tsx
│  │  │  │  ├─ course-pagination.tsx
│  │  │  │  ├─ course-search.tsx
│  │  │  │  └─ courses-header.tsx
│  │  │  ├─ mocks
│  │  │  ├─ types
│  │  │  │  └─ course.ts
│  │  │  └─ utils
│  │  │     └─ course-data.ts
│  │  ├─ enrollments
│  │  │  ├─ api
│  │  │  │  └─ enrollment-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ enrollment-cta.tsx
│  │  │  │  ├─ my-course-card.tsx
│  │  │  │  ├─ my-courses-content.tsx
│  │  │  │  ├─ my-courses-pagination.tsx
│  │  │  │  └─ payment-checkout.tsx
│  │  │  └─ types
│  │  │     └─ enrollment.ts
│  │  ├─ learning
│  │  │  ├─ api
│  │  │  │  └─ learning-course-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ course-curriculum-sidebar.tsx
│  │  │  │  ├─ course-learning-content.tsx
│  │  │  │  ├─ learning-course-page.tsx
│  │  │  │  ├─ learning-page-states.tsx
│  │  │  │  ├─ lesson-content-viewer.tsx
│  │  │  │  ├─ lesson-header.tsx
│  │  │  │  └─ lesson-tabs.tsx
│  │  │  ├─ mocks
│  │  │  │  └─ course-learning.ts
│  │  │  ├─ types
│  │  │  │  └─ learning-course.ts
│  │  │  └─ utils
│  │  │     ├─ learning-course.ts
│  │  │     └─ media-url.ts
│  │  ├─ payments
│  │  │  ├─ api
│  │  │  │  └─ payment-api.ts
│  │  │  ├─ components
│  │  │  │  ├─ vnpay-checkout.tsx
│  │  │  │  └─ vnpay-return-content.tsx
│  │  │  ├─ types
│  │  │  │  └─ payment.ts
│  │  │  └─ utils
│  │  │     └─ pending-vnpay-payment.ts
│  │  └─ users
│  │     ├─ api
│  │     │  └─ profile-api.ts
│  │     ├─ components
│  │     │  └─ edit-profile-form.tsx
│  │     └─ types
│  │        └─ profile.ts
│  ├─ hooks
│  ├─ lib
│  │  ├─ api
│  │  │  ├─ client.ts
│  │  │  └─ README.md
│  │  └─ config
│  │     └─ env.ts
│  ├─ providers
│  │  └─ auth-provider.tsx
│  ├─ styles
│  │  └─ globals.css
│  └─ types
│     └─ api.ts
└─ tsconfig.json

```