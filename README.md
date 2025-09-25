# Links Aggregator

A modern links aggregator built with SvelteKit 5, Skeleton UI, and Supabase, designed to run as a Tor hidden service on Railway.

## Tech Stack

- **Frontend**: SvelteKit 5 with Skeleton UI
- **Backend**: Node.js 20+ with SvelteKit API routes
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with Skeleton UI components
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Deployment**: Railway with Docker
- **Privacy**: Tor hidden service support

## Features

- Modern, responsive UI with Skeleton components
- Real-time database with Supabase
- Docker containerization with Tor integration
- Railway deployment ready
- ESLint and Prettier configured
- Vitest testing setup

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- Supabase CLI (optional, for local development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your Supabase credentials:
   ```env
   # Client-side (PUBLIC_ prefix for browser exposure)
   PUBLIC_SUPABASE_URL=your_supabase_project_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Server-side (Private - no PUBLIC_ prefix)
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_DB_PASSWORD=your_supabase_db_password
   SUPABASE_JWT_SECRET=your_supabase_jwt_secret
   ```

### Development Commands

```bash
# Start development server (runs on http://localhost:8080)
pnpm dev

# Build for production
pnpm build

# Preview production build (runs on http://localhost:8080)
pnpm preview

# Run tests
pnpm test

# Run linting
pnpm lint

# Format code
pnpm format
```

## Supabase Setup

### Local Development

1. Install Supabase CLI:
   ```bash
   pnpm add -g @supabase/cli
   ```

2. Start local Supabase:
   ```bash
   pnpx supabase start
   ```

3. Create new migration:
   ```bash
   pnpx supabase migrations new feature_name
   ```

### Production Setup

1. Create a new Supabase project
2. Link your local project to Supabase:
   ```bash
   pnpx supabase link
   ```
3. Update environment variables with your project credentials
4. Push migrations to your Supabase project:
   ```bash
   pnpx supabase db push
   ```

## Docker & Tor Setup

### Building the Docker Image

```bash
docker build -t links-aggregator .
```

### Running with Tor

```bash
docker run -p 8080:8080 links-aggregator
```

The container will:
- Start Tor with hidden service configuration
- Display the `.onion` address in logs
- Serve the application on port 8080

## Railway Deployment

### Option 1: Automatic Deployment
1. Connect your repository to Railway
2. Set environment variables in Railway dashboard:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_JWT_SECRET`

   **Note**: These environment variables are required during both build and runtime for the Docker container.
3. Deploy using the included `railway.toml` configuration

### Option 2: Manual Volume Setup (Required for Persistent Tor Keys)
1. Deploy your project to Railway first
2. **Right-click on your service card** in Railway dashboard
3. **Select "Add Volume"**
4. **Mount Path**: `/var/lib/tor` (only field needed)
5. **Save** the volume
6. **Redeploy** to activate the volume

**Alternative**: Run the setup script for guidance: `bash scripts/setup-railway.sh`

**Note**: The volume ensures your `.onion` address stays the same across deployments.

The deployment will automatically:
- Build using the Dockerfile
- Configure Tor hidden service with persistent volume for keys
- Start the application

### Volume Configuration

The Railway deployment includes a persistent volume (`tor-keys`) mounted at `/var/lib/tor` to preserve Tor hidden service keys between deployments. This ensures your `.onion` address remains consistent across redeploys.

**Volume Details (railway.toml):**
```toml
[[deploy.volumes]]
name = "tor-keys"
mountPath = "/var/lib/tor"
```

**Purpose**: Persist Tor hidden service private keys and hostname across deployments

## Project Structure

```
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── routes/
│   │   ├── +layout.svelte       # Main layout
│   │   └── +page.svelte         # Home page
│   ├── app.html                 # HTML template
│   └── app.css                  # Global styles
├── tests/                       # Test files
├── docker/                      # Docker configuration
├── supabase/                    # Supabase configuration
├── package.json
├── svelte.config.js
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Create meaningful commit messages

## License

MIT License