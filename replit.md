# DataMind - AI-Powered Data Analytics Platform

## Overview

DataMind is a comprehensive analytics platform that replicates and enhances CLI-based data analysis capabilities through a modern web interface. The platform provides AI-powered data analytics with natural language querying, semantic data modeling, and real-time visualization capabilities. Core functionality includes Snowflake connectivity, enhanced agent framework with function tools, SQL query generation and execution, automatic visualization creation, and dashboard management. Built as a full-stack application with SQLite database and real-time WebSocket communication, featuring React frontend with shadcn/ui components and Express.js backend with integrated Snowflake service.

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
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui component library with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with clean, simple design - no gradients, glass morphism, or complex effects
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Navigation**: Three-column layout with collapsible left sidebar (dashboard/studio/trainings/settings pages), main content area, and assistant panel
- **Real-time Communication**: WebSocket integration for live chat functionality

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API and WebSocket server
- **Database ORM**: Drizzle ORM for type-safe database operations with PostgreSQL
- **Real-time Features**: WebSocket server using 'ws' library for chat functionality
- **Development**: Hot module replacement with Vite middleware in development mode
- **Build System**: esbuild for fast server-side bundling

### Database Design
- **Primary Database**: SQLite with better-sqlite3 for local storage and fast operations
- **Schema Management**: Direct SQL table creation with proper foreign key constraints
- **Core Tables**:
  - Users: Authentication and user profiles
  - Chat Sessions: Conversation management with agent type tracking
  - Chat Messages: Message history with metadata storage
  - Visualizations: Chart configurations and data storage
  - Pinned Visualizations: User dashboard customization
  - Snowflake Connections: External data source configurations and credentials

### AI Agent System
- **Enhanced Agent Framework**: 
  - Query Agent: Natural language to SQL processing with Snowflake integration
  - Ontology Agent: Semantic data model creation and relationship mapping
  - Dashboard Agent: Visualization management and dashboard creation
- **Function Tool System**: Advanced pattern matching and context-aware command execution
- **Agent Context Manager**: Persistent session state and intelligent context restoration
- **Snowflake Service**: Direct database connectivity with real-time query execution
- **Visualization Service**: Automatic chart generation from query results using Plotly

### Real-time Communication
- **WebSocket Integration**: Persistent connections for live chat updates
- **Session Management**: Active session tracking with connection mapping
- **Message Types**: Structured message protocol for different interaction types
- **State Synchronization**: Real-time updates for typing indicators and response streaming

## External Dependencies

### Core Infrastructure
- **Database**: SQLite with better-sqlite3 for local data persistence
- **External Data**: Snowflake integration with snowflake-sdk for enterprise data access
- **Development Platform**: Replit integration with custom development tooling

### Frontend Libraries
- **Component Library**: Radix UI primitives for accessible base components
- **Visualization**: Plotly.js for interactive chart rendering
- **Form Management**: React Hook Form with Zod validation schemas
- **Date Handling**: date-fns for date manipulation utilities

### Backend Services
- **Database Driver**: better-sqlite3 for local SQLite operations
- **Snowflake Integration**: snowflake-sdk for enterprise data warehouse connectivity
- **Session Storage**: memorystore for in-memory session management
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

## CLI Analysis Insights (August 10, 2025)

**Architecture Analysis:** Completed comprehensive review of the original DataMind CLI implementation to identify reusable patterns for web platform enhancement.

**Key Findings:**
- CLI uses OpenAI Agent SDK with sophisticated function_tool decorators
- Rich AgentContext dataclass manages all state (connection, databases, schemas, query results)
- Comprehensive tool ecosystem: connection, metadata, query, YAML/dictionary, visualization tools
- Advanced behavioral patterns: context-aware responses, proactive actions, smart intent interpretation
- Proper session management with SQLiteSession for conversation persistence

**Implementation Status (August 10, 2025 - 8:41 PM):**
1. ✅ **Phase 1 Complete:** OpenAI Agent SDK architecture with function_tool pattern fully implemented
2. ✅ **Phase 2 Complete:** Full tool ecosystem implemented including YAML, visualization, summary generation
3. ✅ **Phase 3 Complete:** Enhanced session management and comprehensive AgentContext
4. ✅ **Phase 4 Complete:** Advanced agent behaviors and sophisticated pattern matching
5. ✅ **Phase 5 Complete:** Unified @mentions and agent integration with comprehensive Agent Hub Configuration

**Agent Hub Configuration (August 10, 2025 - 8:41 PM):**
- **Function Ecosystem Analysis:** Comprehensive 29-function mapping based on CLI structure
- **Implementation Coverage:** 18 of 29 functions (62% CLI parity)
- **Agent-Specific Access:** Query (18 tools), Ontology (15 tools), Dashboard (8 tools), General (6 tools)
- **@Mentions Integration:** Agents now appear in both chat typeahead and left navigation as @query, @ontology, @dashboard, @help
- **Missing Functions:** 11 advanced CLI functions identified for future implementation (metadata analysis, query optimization, stage management, dashboard creation)

**Final Implementation:** Unified agent system with @mentions integration, comprehensive tool management interface, and 62% CLI function parity. Agent Hub provides complete control over function access, prompts, and agent behaviors.

## Migration to Replit Environment (August 12, 2025)

**Migration Status:** ✅ **COMPLETED**
- **Platform Transfer:** Successfully migrated from Replit Agent to standard Replit environment
- **Dependencies:** All required packages installed and configured properly
- **Security:** OpenAI API key properly configured via Replit Secrets
- **Database:** SQLite database initialized with all required tables and default configurations
- **Server Status:** Application running successfully on port 5000 with WebSocket connectivity
- **Interface Cleanup:** Removed CLI Function Parity Status card and @Mentions tab as requested
- **Agent Hub:** Streamlined to Tools, Prompts, and Agents tabs for cleaner interface

**Migration Completed On:** August 12, 2025 at 2:37 AM
**Environment:** Production-ready on Replit with full functionality

## Typography System Unification (August 12, 2025)

**Implementation Status:** ✅ **COMPLETED**
- **Unified Typography System:** Created comprehensive typography classes in `client/src/index.css`
- **Typography Hierarchy:** 
  - `.text-display` - Large titles and headers (text-lg font-semibold)
  - `.text-title` - Section titles and card headers (text-sm font-medium)
  - `.text-subtitle` - Subsection titles and element names (text-xs font-medium)
  - `.text-body` - Standard body text and form elements (text-sm)
  - `.text-caption` - Descriptions and secondary text (text-xs text-muted-foreground)
  - `.text-micro` - Labels and minimal text elements (text-xs)
- **Components Updated:** All UI components and application files standardized to use unified classes
- **Files Modified:** 25+ files including all shadcn/ui components, Agent Hub Settings, sidebar, message bubbles, and core application components
- **Design Goal:** Maximum screen real estate utilization with compact, consistent typography throughout the interface

**Typography Completed On:** August 12, 2025 at 3:05 AM
**Result:** Consistent, compact font system across entire application

## Interface Elements Compression (August 12, 2025)

**Implementation Status:** ✅ **COMPLETED** 
- **Badge Component:** Reduced padding from px-2.5 py-0.5 to px-1.5 py-0, changed font-weight from semibold to medium
- **Switch Component:** Reduced from h-6 w-11 to h-4 w-7, minimized border thickness, smaller thumb (h-3 w-3), reduced shadow
- **Agent Hub Settings:** Tightened spacing between elements from space-x-2/space-x-3 to space-x-1.5
- **Typography Harmonization:** Applied text-subtitle class consistently to all component titles
- **Design Goal:** Maximum interface density with smaller badges, switches, and reduced visual weight

**Elements Compression Completed On:** August 12, 2025 at 3:30 AM  
**Result:** Compact interface elements with significantly reduced visual footprint