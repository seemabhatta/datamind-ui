# DataMind - AI-Powered Data Analytics Platform

## Overview

DataMind is a comprehensive analytics platform that replicates and enhances CLI-based data analysis capabilities through a modern web interface. It provides AI-powered data analytics with natural language querying, semantic data modeling, and real-time visualization. Key capabilities include Snowflake connectivity, an enhanced agent framework with function tools, SQL query generation and execution, automatic visualization creation, and dashboard management. It is a full-stack application with a React frontend, Express.js backend, SQLite database, and WebSocket communication.

## User Preferences

Preferred communication style: Simple, everyday language.
Design philosophy: Clean, simple interface - strongly rejects modern/sleek design elements like gradients, glass morphism, or complex styling.
Left sidebar: Collapsible navigation with new chat as default landing page, plus dashboards/query/semantic-model matching @agents system, and chat history for previous conversations. Settings moved to profile dropdown with integrations and agent hub in tabbed interface.
Models section: Ontology data modeling interface where users select data sources (configured in settings), browse available tables/views/folders, select multiple objects, and create ontology models with relationships and configurations.
Assistant panel: Should be minimizable/maximizable for better workspace management. Maximize should open fullscreen overlay mode.
Context-aware assistant: Agent modes are automatically locked based on current navigation selection - Query section locks to @query agent, Ontology section locks to @ontology agent, Dashboard section locks to @dashboards agent. Users cannot manually switch agents in contextual views. Chat view allows manual agent selection via @mentions.
@agents system: Implemented comprehensive @agents autocomplete with dropdown suggestions labeled as "@agents", keyboard navigation (arrow keys + Enter/Escape), clean letter-based icons (no emojis), and intelligent context switching for different agent types (@ontology, @query, @dashboards). Agent hub moved to settings. Removed plus button in favor of @agents workflow.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **UI Framework**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with a clean, simple design
- **State Management**: TanStack Query (React Query) for server state management
- **Navigation**: Three-column layout with collapsible left sidebar, main content, and assistant panel
- **Real-time Communication**: WebSocket integration for live chat

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API and WebSocket server
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Features**: WebSocket server using 'ws' library
- **Development**: Hot module replacement with Vite middleware
- **Build System**: esbuild for fast server-side bundling

### Database Design
- **Primary Database**: SQLite with better-sqlite3
- **Schema Management**: Direct SQL table creation with foreign key constraints
- **Core Tables**: Users, Chat Sessions, Chat Messages, Visualizations, Pinned Visualizations, Snowflake Connections

### AI Agent System
- **Enhanced Agent Framework**:
  - Query Agent: Natural language to SQL processing
  - Ontology Agent: Semantic data model creation
  - Dashboard Agent: Visualization and dashboard management
- **Function Tool System**: Advanced pattern matching and context-aware command execution
- **Agent Context Manager**: Persistent session state and intelligent context restoration
- **Snowflake Service**: Direct database connectivity with real-time query execution
- **Visualization Service**: Automatic chart generation from query results using Plotly

### Real-time Communication
- **WebSocket Integration**: Persistent connections for live chat updates
- **Session Management**: Active session tracking with connection mapping
- **Message Types**: Structured message protocol
- **State Synchronization**: Real-time updates for typing indicators and response streaming

### UI/UX Decisions
- **Design Philosophy**: Clean, simple, and functional, avoiding complex styling like gradients or glass morphism.
- **Typography**: Unified system with classes for different text elements (e.g., `.text-display`, `.text-body`) to ensure consistency and maximize screen real estate.
- **Component Compression**: Reduced padding and sizes for components like badges and switches to achieve higher interface density.
- **Message Rendering**: Dynamic `MessageRenderer` component for structured display of error, success, and warning messages with icons and clear formatting for lists and multi-line content.
- **General Agent Guidance**: Enhanced system prompt for the general agent to provide specific, actionable guidance (e.g., directing users to `@query connect` for Snowflake connections) and intelligent routing to specialized agents.

## External Dependencies

### Core Infrastructure
- **Database**: SQLite with better-sqlite3
- **External Data**: Snowflake integration with snowflake-sdk
- **Development Platform**: Replit

### Frontend Libraries
- **Component Library**: Radix UI primitives
- **Visualization**: Plotly.js
- **Form Management**: React Hook Form with Zod
- **Date Handling**: date-fns

### Backend Services
- **Database Driver**: better-sqlite3
- **Snowflake Integration**: snowflake-sdk
- **Session Storage**: memorystore
- **WebSocket**: ws library

### Development Tools
- **Build Tools**: Vite (frontend), esbuild (backend)
- **Type Safety**: TypeScript
- **Code Quality**: ESLint
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer

### UI and Styling
- **Design System**: shadcn/ui
- **Icons**: Lucide React
- **Animations**: CSS animations with Tailwind
- **Responsive Design**: Mobile-first approach