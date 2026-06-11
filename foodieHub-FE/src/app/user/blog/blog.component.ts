import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface BlogPost {
  slug: string;
  tag: string;
  tagColor: string;
  title: string;
  excerpt: string;
  body: string[];
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  emoji: string;
  bg: string;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss',
})
export class BlogComponent {
  expandedSlug: string | null = null;

  readonly posts: BlogPost[] = [
    {
      slug: 'how-foodiehub-works',
      tag: 'How It Works',
      tagColor: '#f9b303',
      emoji: '🍽️',
      bg: 'linear-gradient(135deg,#fff8e1,#ffe0b2)',
      title: 'How FoodieHub Works — From Tap to Doorstep',
      excerpt:
        'Ever wondered what happens the moment you place an order? Here\'s the full journey your food takes — from your screen to your door.',
      body: [
        'When you tap "Place Order" on FoodieHub, a chain of events kicks off instantly behind the scenes. Our platform is built on three independent microservices — User Service, Food Service, and Order Service — each doing exactly one job well.',
        'First, the Order Service creates your order in MongoDB and publishes an event to RabbitMQ. The restaurant\'s kitchen dashboard lights up in real time — they\'re notified via Server-Sent Events (SSE) the moment the message arrives, even before they refresh the page.',
        'Once the restaurant confirms and starts preparing your food, our driver gets assigned. You\'ll see the status update live — Confirmed → Preparing → Out for Delivery → Delivered — each step pushed directly to your browser via SSE.',
        'Your cart lives in Redis with a 2-hour TTL, so it\'s always fast to load and automatically expires if you abandon it. Payments go through Razorpay\'s hosted checkout, keeping your card details off our servers entirely.',
        'The whole journey — from order placed to food delivered — is tracked in one MongoDB document that your order history page reads directly. No polling, no page refreshes needed.',
      ],
      author: 'Grace R',
      authorRole: 'Founder & Engineer',
      date: 'June 2025',
      readTime: '4 min read',
    },
    {
      slug: 'why-microservices',
      tag: 'Architecture',
      tagColor: '#5c6bc0',
      emoji: '🏗️',
      bg: 'linear-gradient(135deg,#e8eaf6,#c5cae9)',
      title: 'Why FoodieHub Uses Microservices (And What That Actually Means)',
      excerpt:
        'Microservices is one of those buzzwords that gets thrown around a lot. Here\'s what it means in practice and why it made sense for a food delivery app.',
      body: [
        'A monolith is one big application. Microservices is several small ones. That\'s it. The interesting question is: why split?',
        'In a food delivery app, different parts of the system have very different scaling needs. Restaurant search gets hammered at lunch and dinner — thousands of requests per minute. Meanwhile the user profile service barely sees any traffic. With a monolith you scale both together, wasting resources. With microservices you scale search independently.',
        'FoodieHub has three services: User Service handles authentication with MySQL (structured, ACID-compliant — you don\'t want partial writes on a user record). Food Service runs on MongoDB because restaurant data is document-shaped — each restaurant has its own menu structure with nested categories and items. Order Service also uses MongoDB for flexible order tracking, plus Redis for the cart and RabbitMQ to publish events when orders are placed.',
        'The API Gateway sits in front of all three. Every request from the Angular frontend goes to port 8080 — the gateway routes it to the right service. This means the frontend never needs to know which service is running where.',
        'In an interview, this architecture lets you talk about real trade-offs: distributed transactions are harder (no single database transaction across services), debugging is more complex (you need distributed tracing), but scalability and team independence are genuinely better.',
      ],
      author: 'Grace R',
      authorRole: 'Founder & Engineer',
      date: 'June 2025',
      readTime: '5 min read',
    },
    {
      slug: 'our-story',
      tag: 'Our Story',
      tagColor: '#43a047',
      emoji: '🌱',
      bg: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)',
      title: 'Our Story — Why We Built FoodieHub',
      excerpt:
        'FoodieHub started as a learning project and turned into something we\'re genuinely proud of. Here\'s the story of how it came together.',
      body: [
        'FoodieHub was born out of a simple question: "I want to learn microservices — what should I build?" Food delivery apps are something everyone uses and understands. The requirements are clear enough to be realistic, complex enough to be interesting.',
        'The tech stack was chosen deliberately. Spring Boot for the backend — it\'s the industry standard for Java microservices and something you\'ll encounter at almost any startup or enterprise. Angular for the frontend — not the most fashionable choice in 2025, but it\'s structured, typed, and forces you to think about architecture.',
        'Every decision in the stack has a reason. MySQL for user data because auth requires ACID guarantees. MongoDB for restaurants because menus are documents, not rows. Redis for the cart because cart data is temporary and high-read. RabbitMQ between Order and Notification services because you don\'t want a failed notification to break an order.',
        'We deliberately kept the scope small: three microservices, one gateway, one frontend. Not six services with Kubernetes and a service mesh. The goal was to build something that demonstrates the pattern clearly, not to show off infrastructure complexity.',
        'The best portfolio projects are ones you can explain completely — every file, every decision, every trade-off. FoodieHub is that kind of project.',
      ],
      author: 'Grace R',
      authorRole: 'Founder & Engineer',
      date: 'May 2025',
      readTime: '3 min read',
    },
    {
      slug: 'tech-behind-realtime',
      tag: 'Deep Dive',
      tagColor: '#e53935',
      emoji: '⚡',
      bg: 'linear-gradient(135deg,#fce4ec,#f8bbd0)',
      title: 'The Tech Behind Real-Time Order Tracking',
      excerpt:
        'How does your browser know the moment a restaurant accepts your order? We use Server-Sent Events — here\'s how it works under the hood.',
      body: [
        'There are three ways to push data from a server to a browser: WebSockets, Long Polling, and Server-Sent Events (SSE). FoodieHub uses SSE for order tracking and admin notifications.',
        'WebSockets are bidirectional — good for chat apps. But order tracking is one-way: the server pushes status updates to the customer. For one-way, SSE is simpler: it\'s just a long-lived HTTP connection that the server writes to whenever there\'s an update.',
        'In Spring Boot, an SSE connection is a `SseEmitter` — an object you hold in memory, keyed by userId. When an order status changes, the Order Service publishes an event to RabbitMQ. The Notification Service consumes it and calls `sseEmitterService.pushToCustomer(userId, event)`, which writes to the open emitter.',
        'The Angular side is even simpler: `new EventSource(\'/api/v1/customer/notifications/stream\')`. The browser keeps the connection open and fires an event handler whenever the server writes. No polling, no websocket handshake, no library needed.',
        'For notifications when the browser tab is closed, SSE alone isn\'t enough. That\'s where Web Push (VAPID) comes in. The browser registers a push subscription on load, we store it in MongoDB, and when an event fires we send a push notification via the VAPID protocol. The browser\'s service worker receives it and shows an OS-level notification — even with the tab closed.',
      ],
      author: 'Grace R',
      authorRole: 'Founder & Engineer',
      date: 'June 2025',
      readTime: '6 min read',
    },
  ];

  toggle(slug: string) {
    this.expandedSlug = this.expandedSlug === slug ? null : slug;
  }
}
