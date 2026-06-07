# FoodieHub — Project Instruction for AI Assistants

## Copy and paste everything below into Claude or any AI tool before asking questions about your project

---

## Project Overview

You are helping me build **FoodieHub**, a full-stack food delivery platform built with a **microservices architecture**. This is a portfolio project aimed at showcasing my skills to international startup recruiters, especially in Germany, UAE, Singapore, and Ireland.

## Tech Stack

**Frontend:**
- Angular (latest version)
- Angular Material or Tailwind CSS for UI
- RxJS for state management
- TypeScript

**Backend (Microservices):**
- Node.js with Express.js (or NestJS) for each service
- TypeScript across all services

**Databases:**
- MongoDB — for User, Restaurant, and Order services
- PostgreSQL/MySQL — for Payment service (transactional data)
- Redis — for caching (cart, sessions, rate limiting, real-time order status)

**Communication:**
- RabbitMQ or Kafka — for async messaging between services
- REST APIs — for synchronous communication
- API Gateway (Nginx or Kong) — single entry point

**DevOps & Deployment:**
- Docker + Docker Compose — containerized services
- GitHub Actions — CI/CD pipeline
- Deployed on Railway / Render / AWS Free Tier

## Microservices Breakdown

1. **User Service** — Registration, login, JWT auth, profile management (MongoDB)
2. **Restaurant Service** — Restaurant listings, menus, search, ratings (MongoDB)
3. **Order Service** — Order creation, status tracking, order history (MongoDB)
4. **Payment Service** — Payment processing, transaction records (SQL)
5. **Notification Service** — Email/SMS/push notifications (event-driven)
6. **Delivery Service** — Driver assignment, real-time tracking
7. **API Gateway** — Routing, rate limiting, authentication middleware

## Redis Usage

- Cart data (temporary, fast access)
- Session/JWT token caching
- Rate limiting on APIs
- Real-time order status caching
- Restaurant search result caching

## Key Features to Implement

- User registration & login with JWT
- Browse restaurants and menus
- Add to cart and place orders
- Real-time order status tracking
- Payment integration (Stripe/Razorpay)
- Restaurant owner dashboard (manage menu, view orders)
- Search with filters (cuisine, rating, price)
- Review and rating system
- Admin dashboard for platform management

## Architecture Principles

- Each microservice has its own database (Database per Service pattern)
- Services communicate via message queues for async operations
- API Gateway handles routing, auth, and rate limiting
- CQRS pattern where applicable
- Circuit breaker pattern for fault tolerance
- Health check endpoints for each service

## Project Goals

- **Portfolio showcase** — must look impressive on GitHub and Wellfound
- **System design interview ready** — I should be able to explain every architectural decision
- **Production-quality code** — clean code, proper error handling, tests, documentation
- **Deployed and live** — with a working demo link

## How to Help Me

When I ask questions about this project:
1. Always consider the microservices architecture — don't suggest monolithic patterns
2. Give production-quality code, not shortcuts
3. Explain the **why** behind decisions (I need to explain these in interviews)
4. Suggest best practices used in real startups
5. Point out trade-offs when relevant
6. Keep scalability in mind
7. If I'm doing something wrong architecturally, tell me directly

## Current Status

I am currently **in development**. I may ask about:
- Specific service implementation
- Database schema design
- Redis caching strategies
- Docker setup
- Testing strategies
- Deployment help
- System design explanations
- Code review and debugging

---

**Now, here is my question:** [TYPE YOUR QUESTION HERE]
