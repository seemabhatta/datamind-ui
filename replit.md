# DataMind - AI-Powered Data Analytics Platform

## Overview

DataMind is a modern web application that provides AI-powered data analytics through conversational interfaces. The platform allows users to interact with data using natural language queries, with AI agents that can generate SQL queries and create visualizations. Built as a full-stack application with real-time chat capabilities, it features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui component library with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming, Inter font family for typography
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live chat functionality

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API and WebSocket server
- **Database ORM**: Drizzle ORM for type-safe database operations with PostgreSQL
- **Real-time Features**: WebSocket server using 'ws' library for chat functionality
- **Development**: Hot module replacement with Vite middleware in development mode
- **Build System**: esbuild for fast server-side bundling

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver for scalable connections
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Core Tables**:
  - Users: Authentication and user profiles
  - Chat Sessions: Conversation management with agent type tracking
  - Chat Messages: Message history with metadata storage
  - Visualizations: Chart configurations and data storage
  - Pinned Visualizations: User dashboard customization

### AI Agent System
- **Dual Agent Architecture**: 
  - Query Agent: Processes natural language and generates SQL queries
  - YAML Agent: Handles structured data configuration tasks
- **Agent Service**: Centralized service for processing messages and generating responses
- **Visualization Service**: Automatic chart generation from query results using Plotly

### Real-time Communication
- **WebSocket Integration**: Persistent connections for live chat updates
- **Session Management**: Active session tracking with connection mapping
- **Message Types**: Structured message protocol for different interaction types
- **State Synchronization**: Real-time updates for typing indicators and response streaming

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Development Platform**: Replit integration with custom development tooling

### Frontend Libraries
- **Component Library**: Radix UI primitives for accessible base components
- **Visualization**: Plotly.js for interactive chart rendering
- **Form Management**: React Hook Form with Zod validation schemas
- **Date Handling**: date-fns for date manipulation utilities

### Backend Services
- **Database Driver**: @neondatabase/serverless for PostgreSQL connectivity
- **Session Storage**: connect-pg-simple for PostgreSQL-backed session storage
- **WebSocket**: ws library for WebSocket server implementation

### Development Tools
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **Type Safety**: TypeScript throughout the stack with strict configuration
- **Code Quality**: ESLint and TypeScript for code consistency
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer

### UI and Styling
- **Design System**: shadcn/ui with customizable theme variables
- **Icons**: Lucide React for consistent iconography
- **Animations**: CSS animations with Tailwind for smooth transitions
- **Responsive Design**: Mobile-first approach with breakpoint utilities