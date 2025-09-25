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
   PUBLIC_SUPABASE_URL=your_supabase_project_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
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
2. Update environment variables with your project credentials
3. Run migrations:
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
docker run -p 3000:3000 links-aggregator
```

The container will:
- Start Tor with hidden service configuration
- Display the `.onion` address in logs
- Serve the application on port 3000

## Railway Deployment

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Deploy using the included `railway.json` configuration

The deployment will automatically:
- Build using the Dockerfile
- Configure Tor hidden service
- Start the application

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