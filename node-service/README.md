<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).



```
node-service
├─ .prettierrc
├─ AGENTS.md
├─ common
├─ docker-compose.yml
├─ eslint.config.mjs
├─ generated
│  ├─ prisma
│  │  ├─ browser.ts
│  │  ├─ client.ts
│  │  ├─ commonInputTypes.ts
│  │  ├─ enums.ts
│  │  ├─ internal
│  │  │  ├─ class.ts
│  │  │  ├─ prismaNamespace.ts
│  │  │  └─ prismaNamespaceBrowser.ts
│  │  ├─ models
│  │  │  ├─ Assessment.ts
│  │  │  ├─ AssessmentAnswer.ts
│  │  │  ├─ AssessmentAttempt.ts
│  │  │  ├─ AssessmentAttemptAnswer.ts
│  │  │  ├─ AssessmentQuestion.ts
│  │  │  ├─ Category.ts
│  │  │  ├─ Course.ts
│  │  │  ├─ CourseCategory.ts
│  │  │  ├─ CourseInstructor.ts
│  │  │  ├─ CourseReview.ts
│  │  │  ├─ CourseReviewerCategory.ts
│  │  │  ├─ CourseSection.ts
│  │  │  ├─ Enrollment.ts
│  │  │  ├─ FileMedia.ts
│  │  │  ├─ Lesson.ts
│  │  │  ├─ LessonSkill.ts
│  │  │  ├─ PasswordResetToken.ts
│  │  │  ├─ Payment.ts
│  │  │  ├─ ProjectSubmission.ts
│  │  │  ├─ RefreshToken.ts
│  │  │  ├─ Skill.ts
│  │  │  ├─ User.ts
│  │  │  └─ UserIdentity.ts
│  │  └─ models.ts
│  └─ prisma-test
│     ├─ browser.ts
│     ├─ client.ts
│     ├─ commonInputTypes.ts
│     ├─ enums.ts
│     ├─ internal
│     │  ├─ class.ts
│     │  ├─ prismaNamespace.ts
│     │  └─ prismaNamespaceBrowser.ts
│     ├─ models
│     │  └─ TestSkill.ts
│     └─ models.ts
├─ nest-cli.json
├─ package-lock.json
├─ package.json
├─ prisma
│  ├─ migrations
│  │  ├─ 20260610000000_add_file_media_audit_fields
│  │  │  └─ migration.sql
│  │  ├─ 20260610000100_add_course_review_claim_fields
│  │  │  └─ migration.sql
│  │  ├─ 20260611000000_add_password_reset_tokens
│  │  │  └─ migration.sql
│  │  ├─ 20260612000000_add_payments_and_enrollments
│  │  │  └─ migration.sql
│  │  ├─ 20260616000000_allow_payment_retries
│  │  │  └─ migration.sql
│  │  └─ 20260617000000_add_simulation_payment_method
│  │     └─ migration.sql
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ skill.prisma
├─ prisma.config.ts
├─ README.md
├─ sample-data.txt
├─ src
│  ├─ app.module.ts
│  ├─ common
│  │  ├─ decorators
│  │  │  ├─ current-user.decorator.ts
│  │  │  └─ skip-response-formatting.decorator.ts
│  │  ├─ filters
│  │  │  ├─ http-exception.filter.ts
│  │  │  ├─ prisma-client-exception.filter.spec.ts
│  │  │  └─ prisma-client-exception.filter.ts
│  │  ├─ interceptors
│  │  │  └─ response-formatting.interceptor.ts
│  │  ├─ interfaces
│  │  │  ├─ api-error-response.interface.ts
│  │  │  ├─ api-response.interfaces.ts
│  │  │  └─ request-with-user.ts
│  │  ├─ pipes
│  │  └─ utils
│  │     ├─ clean-data-util.spec.ts
│  │     ├─ clean-data-util.ts
│  │     ├─ prisma-error.util.spec.ts
│  │     ├─ prisma-error.util.ts
│  │     └─ slugify.util.ts
│  ├─ config
│  │  ├─ vnpay.config.spec.ts
│  │  └─ vnpay.config.ts
│  ├─ core
│  │  ├─ database
│  │  │  ├─ prisma.module.ts
│  │  │  └─ prisma.service.ts
│  │  ├─ mailer
│  │  │  ├─ mailer.module.ts
│  │  │  └─ mailer.service.ts
│  │  └─ storage
│  │     └─ cloudinary
│  │        ├─ cloudinary.module.ts
│  │        └─ cloudinary.service.ts
│  ├─ features
│  │  ├─ assessments
│  │  │  ├─ assessments.module.ts
│  │  │  ├─ controllers
│  │  │  │  ├─ instructor-assessments.controller.ts
│  │  │  │  └─ learner-assessments.controller.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ answers
│  │  │  │  │  ├─ assessment-answer-response.dto.ts
│  │  │  │  │  └─ assessment-answer.dto.ts
│  │  │  │  ├─ assessment
│  │  │  │  │  ├─ assessment-response.ts
│  │  │  │  │  ├─ create-assessment.dto.ts
│  │  │  │  │  ├─ detailed-assessment.dto.ts
│  │  │  │  │  ├─ paginated-assessment-response.dto.ts
│  │  │  │  │  ├─ query-assessment.dto.ts
│  │  │  │  │  ├─ update-assessment.dto.ts
│  │  │  │  │  ├─ update-published-assessment.dto.ts
│  │  │  │  │  └─ updated-published-assessment-response.dto.ts
│  │  │  │  ├─ attempts
│  │  │  │  │  ├─ active-attempt.dto.ts
│  │  │  │  │  ├─ attempt-history.dto.ts
│  │  │  │  │  ├─ attempt-result.dto.ts
│  │  │  │  │  ├─ create-attempt.dto.ts
│  │  │  │  │  ├─ learner-assessment.dto.ts
│  │  │  │  │  ├─ learner-course-assessments.dto.ts
│  │  │  │  │  ├─ save-attempt-answer.dto.ts
│  │  │  │  │  └─ submit-project.dto.ts
│  │  │  │  └─ questions
│  │  │  │     ├─ assessment-question-response.dto.ts
│  │  │  │     └─ assessment-question.dto.ts
│  │  │  ├─ interfaces
│  │  │  │  ├─ assessment-access.repository.interface.ts
│  │  │  │  ├─ assessment-answers.repository.interface.ts
│  │  │  │  ├─ assessment-questions.repository.interface.ts
│  │  │  │  ├─ assessment.repository.interface.ts
│  │  │  │  ├─ attempt.repository.interface.ts
│  │  │  │  ├─ detailed-assessment.interface.ts
│  │  │  │  └─ learner-assessment-service-input.interface.ts
│  │  │  ├─ mappers
│  │  │  │  ├─ assessment-answers.mapper.ts
│  │  │  │  ├─ assessment-questions.mapper.ts
│  │  │  │  └─ assessment.mapper.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ assessment-access.repository.token.ts
│  │  │  │  ├─ assessment-access.repository.ts
│  │  │  │  ├─ assessment-answers.repository.token.ts
│  │  │  │  ├─ assessment-answers.repository.ts
│  │  │  │  ├─ assessment-questions.interface.token.ts
│  │  │  │  ├─ assessment-questions.repository.ts
│  │  │  │  ├─ assessment.repository.token.ts
│  │  │  │  ├─ assessment.repository.ts
│  │  │  │  ├─ attempt.repository.token.ts
│  │  │  │  ├─ attempt.repository.ts
│  │  │  │  ├─ detailed-assessment.repository.token.ts
│  │  │  │  └─ detailed-assessment.repository.ts
│  │  │  └─ services
│  │  │     ├─ assessment-access.service.ts
│  │  │     ├─ assessment-answers.service.ts
│  │  │     ├─ assessment-questions.service.ts
│  │  │     ├─ assessments.service.ts
│  │  │     └─ learner-assessments.service.ts
│  │  ├─ auth
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.module.ts
│  │  │  ├─ decorators
│  │  │  │  ├─ public.decorator.ts
│  │  │  │  └─ roles.decorator.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ change-password.dto.ts
│  │  │  │  ├─ forgot-password.dto.ts
│  │  │  │  ├─ login-response.dto.ts
│  │  │  │  ├─ login.dto.ts
│  │  │  │  ├─ message-response.dto.ts
│  │  │  │  ├─ refresh-token.dto.ts
│  │  │  │  ├─ register.dto.ts
│  │  │  │  └─ reset-password.dto.ts
│  │  │  ├─ google-oauth.controller.ts
│  │  │  ├─ guards
│  │  │  │  ├─ google-auth.guard.ts
│  │  │  │  ├─ jwt-auth.guard.ts
│  │  │  │  └─ roles.guard.ts
│  │  │  ├─ interfaces
│  │  │  │  ├─ create-google-user.interface.ts
│  │  │  │  ├─ create-local-user.interface.ts
│  │  │  │  ├─ create-refresh-token.interface.ts
│  │  │  │  ├─ jwt-payload.interface.ts
│  │  │  │  ├─ request-with-cookies.ts
│  │  │  │  └─ user.repository.interface.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ auth.repository.spec.ts
│  │  │  │  └─ auth.repository.ts
│  │  │  ├─ services
│  │  │  │  ├─ account-recovery.service.spec.ts
│  │  │  │  ├─ account-recovery.service.ts
│  │  │  │  ├─ auth.service.ts
│  │  │  │  └─ token-cleanup.service.ts
│  │  │  └─ strategies
│  │  │     ├─ google.strategy.ts
│  │  │     └─ jwt.strategy.ts
│  │  ├─ courses
│  │  │  ├─ controllers
│  │  │  │  ├─ admin-courses.controller.ts
│  │  │  │  ├─ instructor-course.controller.ts
│  │  │  │  ├─ public-courses.controller.ts
│  │  │  │  └─ reviewer-courses.controller.ts
│  │  │  ├─ courses.module.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ category
│  │  │  │  │  ├─ category-query.dto.ts
│  │  │  │  │  ├─ category-response.dto.ts
│  │  │  │  │  ├─ create-category.dto.ts
│  │  │  │  │  ├─ set-category-active-status.dto.ts
│  │  │  │  │  └─ update-category.dto.ts
│  │  │  │  ├─ course
│  │  │  │  │  ├─ course-response.dto.ts
│  │  │  │  │  ├─ create-course.dto.ts
│  │  │  │  │  ├─ instructor-course-review.dto.ts
│  │  │  │  │  ├─ paginated-course.dto.ts
│  │  │  │  │  ├─ param-course.dto.ts
│  │  │  │  │  ├─ query-course.dto.ts
│  │  │  │  │  ├─ reviewer-course-query.dto.ts
│  │  │  │  │  ├─ reviewer-course-response.dto.ts
│  │  │  │  │  ├─ reviewer-course-review.dto.ts
│  │  │  │  │  └─ update-course.dto.ts
│  │  │  │  ├─ file-media
│  │  │  │  │  ├─ create-file-media.dto.ts
│  │  │  │  │  ├─ file-media-response.dto.ts
│  │  │  │  │  ├─ query-file-media.dto.ts
│  │  │  │  │  └─ update-file-media.dto.ts
│  │  │  │  ├─ lesson
│  │  │  │  │  ├─ create-lesson.dto.ts
│  │  │  │  │  ├─ lesson-response.dto.ts
│  │  │  │  │  ├─ query-lessons.dto.ts
│  │  │  │  │  ├─ reorder-lesson.dto.ts
│  │  │  │  │  └─ update-lesson.dto.ts
│  │  │  │  ├─ paginated-response.dto.ts
│  │  │  │  ├─ review-authorization
│  │  │  │  │  └─ reviewer-category-authorization.dto.ts
│  │  │  │  └─ section-lesson
│  │  │  │     ├─ change-section-status.dto.ts
│  │  │  │     ├─ create-section.dti.ts
│  │  │  │     ├─ query-section.dto.ts
│  │  │  │     ├─ reorder-sections.dto.ts
│  │  │  │     ├─ section-response.dto.ts
│  │  │  │     └─ update-section.dto.ts
│  │  │  ├─ interfaces
│  │  │  │  ├─ category.repository.interface.ts
│  │  │  │  ├─ course-review.repository.interface.ts
│  │  │  │  ├─ course-section.repository.interface.ts
│  │  │  │  ├─ course.repository.interface.ts
│  │  │  │  ├─ file-media.repository.interface.ts
│  │  │  │  ├─ lesson.repository.interface.ts
│  │  │  │  └─ reviewer-category-authorization.repository.interface.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ category-repository.token.ts
│  │  │  │  ├─ category.repository.ts
│  │  │  │  ├─ course-repository.token.ts
│  │  │  │  ├─ course-review-repository.token.ts
│  │  │  │  ├─ course-review.repository.spec.ts
│  │  │  │  ├─ course-review.repository.ts
│  │  │  │  ├─ course-section-repository.token.ts
│  │  │  │  ├─ course-section-repository.ts
│  │  │  │  ├─ course.repository.create.spec.ts
│  │  │  │  ├─ course.repository.read.spec.ts
│  │  │  │  ├─ course.repository.state.spec.ts
│  │  │  │  ├─ course.repository.ts
│  │  │  │  ├─ course.repository.update.spec.ts
│  │  │  │  ├─ file-media.repository.spec.ts
│  │  │  │  ├─ file-media.repository.token.ts
│  │  │  │  ├─ file-media.repository.ts
│  │  │  │  ├─ lesson-repository.token.ts
│  │  │  │  ├─ lesson.repository.ts
│  │  │  │  ├─ reviewer-category-authorization-repository.token.ts
│  │  │  │  ├─ reviewer-category-authorization.repository.spec.ts
│  │  │  │  └─ reviewer-category-authorization.repository.ts
│  │  │  └─ services
│  │  │     ├─ categories.service.ts
│  │  │     ├─ course-access.service.ts
│  │  │     ├─ course-review-authorization.service.spec.ts
│  │  │     ├─ course-review-authorization.service.ts
│  │  │     ├─ course-sections.service.ts
│  │  │     ├─ courses.service.spec.ts
│  │  │     ├─ courses.service.ts
│  │  │     ├─ file-media.service.spec.ts
│  │  │     ├─ file-media.service.ts
│  │  │     ├─ lessons.service.ts
│  │  │     ├─ reviewer-courses.service.spec.ts
│  │  │     └─ reviewer-courses.service.ts
│  │  ├─ enrollments
│  │  │  ├─ controllers
│  │  │  │  └─ learner-enrollments.controller.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ enrollment-param.dto.ts
│  │  │  │  ├─ enrollment-query.dto.ts
│  │  │  │  └─ enrollment-response.dto.ts
│  │  │  ├─ enrollments.module.ts
│  │  │  ├─ interfaces
│  │  │  │  └─ enrollment.repository.interface.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ enrollment-repository.token.ts
│  │  │  │  ├─ enrollment.repository.spec.ts
│  │  │  │  └─ enrollment.repository.ts
│  │  │  └─ services
│  │  │     ├─ enrollment-access.service.ts
│  │  │     ├─ enrollments.service.spec.ts
│  │  │     └─ enrollments.service.ts
│  │  ├─ learning
│  │  │  ├─ controllers
│  │  │  │  ├─ learning-courses-v2.controller.spec.ts
│  │  │  │  ├─ learning-courses-v2.controller.ts
│  │  │  │  ├─ learning-courses.controller.spec.ts
│  │  │  │  └─ learning-courses.controller.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ course-learner-response.dto.ts
│  │  │  │  └─ v2
│  │  │  │     ├─ learning-course-v2-response.dto.ts
│  │  │  │     └─ learning-pagination-query.dto.ts
│  │  │  ├─ interfaces
│  │  │  │  ├─ learning-course-v2.repository.interface.ts
│  │  │  │  └─ learning-course.repository.interface.ts
│  │  │  ├─ learning.module.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ learning-course-v2.repository.spec.ts
│  │  │  │  ├─ learning-course-v2.repository.token.ts
│  │  │  │  ├─ learning-course-v2.repository.ts
│  │  │  │  ├─ learning-course.repository.spec.ts
│  │  │  │  ├─ learning-course.repository.token.ts
│  │  │  │  └─ learning-course.repository.ts
│  │  │  └─ services
│  │  │     ├─ learning-courses-v2.service.spec.ts
│  │  │     ├─ learning-courses-v2.service.ts
│  │  │     ├─ learning-courses.service.spec.ts
│  │  │     └─ learning-courses.service.ts
│  │  ├─ payment
│  │  │  ├─ dtos
│  │  │  │  ├─ create-simulation-payment.dto.ts
│  │  │  │  ├─ create-vnpay-payment.dto.ts
│  │  │  │  ├─ get-payments-response.dto.ts
│  │  │  │  ├─ simulation-payment-response.dto.ts
│  │  │  │  ├─ vnpay-inp-response.dto.ts
│  │  │  │  ├─ vnpay-refund-request.dto.ts
│  │  │  │  └─ vnpay-return-response.dto.ts
│  │  │  ├─ interfaces
│  │  │  │  ├─ payment.repository.interface.ts
│  │  │  │  └─ vnpayreturnquery.interface.ts
│  │  │  ├─ payments.controller.ts
│  │  │  ├─ payments.module.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ payment.repository.spec.ts
│  │  │  │  ├─ payment.repository.token.ts
│  │  │  │  └─ payment.repository.ts
│  │  │  └─ services
│  │  │     ├─ payments.service.spec.ts
│  │  │     ├─ payments.service.ts
│  │  │     ├─ vnpay.service.spec.ts
│  │  │     └─ vnpay.service.ts
│  │  ├─ skill
│  │  │  ├─ dtos
│  │  │  ├─ interfaces
│  │  │  │  └─ skill.interfaces.ts
│  │  │  ├─ services
│  │  │  │  └─ skill.service.ts
│  │  │  ├─ skill.controller.ts
│  │  │  ├─ skill.module.ts
│  │  │  └─ skill.repository.ts
│  │  ├─ skill-suggestion
│  │  │  ├─ repositories
│  │  │  ├─ services
│  │  │  │  ├─ embedding.service.ts
│  │  │  │  └─ skill-suggestion.service.ts
│  │  │  ├─ skill-suggestion.controller.ts
│  │  │  ├─ skill-suggestion.interfaces.ts
│  │  │  └─ skill-suggestion.module.ts
│  │  ├─ upload
│  │  │  ├─ dtos
│  │  │  │  └─ get-upload-signature.dto.ts
│  │  │  ├─ interfaces
│  │  │  ├─ upload.controller.ts
│  │  │  ├─ upload.module.ts
│  │  │  └─ upload.service.ts
│  │  └─ users
│  │     ├─ controllers
│  │     │  ├─ admin-users.controller.ts
│  │     │  └─ users.controller.ts
│  │     ├─ dtos
│  │     │  ├─ create-user.dto.ts
│  │     │  ├─ find-all-users-query.dto.ts
│  │     │  ├─ paginated-users-response.dto.ts
│  │     │  ├─ public-user-response.dto.ts
│  │     │  ├─ update-user.dto.ts
│  │     │  └─ user-response.dto.ts
│  │     ├─ interfaces
│  │     │  ├─ create-user-payload.interface.ts
│  │     │  ├─ get-users-payload.interface.ts
│  │     │  ├─ update-user-payload.interface.ts
│  │     │  └─ user-select-result.interface.ts
│  │     ├─ repositories
│  │     │  └─ users.repository.ts
│  │     ├─ services
│  │     │  ├─ admin-user.service.ts
│  │     │  └─ users.service.ts
│  │     └─ users.module.ts
│  └─ main.ts
├─ test
│  ├─ app.e2e-spec.ts
│  └─ jest-e2e.json
├─ tsconfig.build.json
└─ tsconfig.json

```