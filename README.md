# DataMind - AI-Powered Data Analytics Platform

DataMind is a modern web application that provides AI-powered data analytics through a dashboard-style interface with an integrated assistant sidebar. The platform features semantic data modeling capabilities and intelligent AI agents for natural language data querying with interactive visualizations.

## Features

- **Intelligent AI Agents**: Two specialized agents for data querying and YAML configuration generation
- **Real-time Chat Interface**: WebSocket-powered conversations with typing indicators
- **Interactive Visualizations**: Plotly-powered charts generated from natural language queries
- **Semantic Data Modeling**: Visual relationship mapping and configuration management
- **File Upload Support**: Handle CSV, JSON, Excel, and other data formats
- **Session Management**: Persistent chat sessions with history and organization
- **Clean UI Design**: Simple, functional interface built with shadcn/ui components
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **Plotly.js** for interactive visualizations

### Backend
- **Express.js** with TypeScript
- **WebSocket** server using 'ws' library
- **Drizzle ORM** with PostgreSQL
- **Neon** serverless PostgreSQL driver
- **Session management** with connect-pg-simple

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (local or cloud)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd datamind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/datamind
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=datamind
   PGUSER=username
   PGPASSWORD=password
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Create database tables
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Running in Standalone Mode

### Local Development

For local development with hot reloading:

```bash
# Start both frontend and backend
npm run dev
```

This command starts:
- Express server on port 5000
- Vite development server with HMR
- WebSocket server for real-time features

### Production Build

To build and run in production mode:

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment (Optional)

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

Build and run with Docker:

```bash
docker build -t datamind .
docker run -p 5000:5000 --env-file .env datamind
```

### Environment Configuration

#### Required Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PGHOST=localhost
PGPORT=5432
PGDATABASE=datamind
PGUSER=your_username
PGPASSWORD=your_password

# Application Configuration
NODE_ENV=production
PORT=5000

# Optional: AI Service Configuration
OPENAI_API_KEY=your_openai_api_key
```

#### Database Setup Options

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL locally
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb datamind
sudo -u postgres createuser -P datamind_user
```

**Option 2: Neon (Serverless PostgreSQL)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

**Option 3: Docker PostgreSQL**
```bash
docker run --name datamind-postgres \
  -e POSTGRES_DB=datamind \
  -e POSTGRES_USER=datamind_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

## Project Structure

```
datamind/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (chat, dashboard, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configs
│   │   └── main.tsx        # Application entry point
│   └── index.html          # HTML template
├── server/                 # Express backend application
│   ├── services/           # Business logic services
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data access layer
│   ├── db.ts               # Database configuration
│   └── vite.ts             # Vite middleware setup
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema definitions
├── package.json            # Dependencies and scripts
├── drizzle.config.ts       # Database migration configuration
├── vite.config.ts          # Vite build configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server with HMR
npm run build            # Build for production
npm start               # Start production server

# Database
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Drizzle Studio (database GUI)
npm run db:generate     # Generate migration files
npm run db:migrate      # Run database migrations

# Code Quality
npm run type-check      # Run TypeScript type checking
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## API Endpoints

### Session Management
- `GET /api/sessions/:userId` - Get user sessions
- `POST /api/sessions` - Create new session
- `DELETE /api/sessions/:sessionId` - Delete session
- `DELETE /api/sessions/bulk` - Delete multiple sessions

### Messages
- `GET /api/sessions/:sessionId/messages` - Get session messages
- `POST /api/sessions/:sessionId/messages` - Send message
- `DELETE /api/messages/:messageId` - Delete message

### Visualizations
- `GET /api/visualizations` - Get user visualizations
- `POST /api/visualizations` - Save visualization
- `POST /api/visualizations/pin` - Pin visualization to dashboard

### WebSocket Events
- `join_session` - Join a chat session
- `message` - Send/receive messages
- `typing` - Typing indicators
- `error` - Error notifications

## Configuration

### Customizing AI Agents

Edit `server/services/agent-service.ts` to customize agent behavior:

```typescript
// Add custom agent logic
export class AgentService {
  // Modify query processing
  async processQuery(message: string): Promise<string> {
    // Your custom logic here
  }
  
  // Modify YAML generation
  async generateYAML(prompt: string): Promise<string> {
    // Your custom logic here
  }
}
```

### UI Customization

The application uses Tailwind CSS and shadcn/ui components. Customize the theme in:

- `client/src/index.css` - Global styles and CSS variables
- `tailwind.config.ts` - Tailwind configuration
- `components.json` - shadcn/ui component configuration

### Database Schema

Modify the database schema in `shared/schema.ts` and apply changes:

```bash
npm run db:push
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Reset database schema
npm run db:push
```

**2. WebSocket Connection Failed**
- Ensure port 5000 is available
- Check firewall settings
- Verify WebSocket support in your browser

**3. Build Errors**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf client/.vite
```

**4. TypeScript Errors**
```bash
# Run type checking
npm run type-check

# Regenerate types from database
npm run db:generate
```

### Performance Optimization

**Frontend Optimization**
- Enable code splitting for large components
- Use React.lazy() for route-based code splitting
- Implement proper loading states
- Optimize bundle size with webpack-bundle-analyzer

**Backend Optimization**
- Implement database connection pooling
- Add Redis caching for frequent queries
- Use database indexing for query optimization
- Implement rate limiting for API endpoints

**Database Optimization**
```sql
-- Add useful indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_visualizations_user_id ON visualizations(user_id);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

### Development Guidelines

- Follow the existing code style and conventions
- Add TypeScript types for all new code
- Include unit tests for new functionality
- Update documentation for API changes
- Use conventional commits for commit messages

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For questions and support:

- Check the [Issues](issues) section for known problems
- Review the [Requirements](requirements.md) document for detailed specifications
- Check the [replit.md](replit.md) file for project architecture details

## Deployment

### Replit Deployment
The application is optimized for Replit deployment. Simply:
1. Import the repository to Replit
2. Set environment variables in Replit Secrets
3. Run the application using the configured workflow

### Other Hosting Platforms
The application can be deployed to:
- **Vercel**: Frontend and serverless functions
- **Netlify**: Static site with edge functions  
- **Railway**: Full-stack deployment
- **Heroku**: Traditional PaaS deployment
- **DigitalOcean**: VPS or App Platform
- **AWS**: EC2, ECS, or Lambda deployment

Each platform may require specific configuration adjustments for database connections and environment variables.