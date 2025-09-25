#!/bin/bash

echo "🚂 Setting up Railway deployment with persistent Tor volume..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway whoami || {
    echo "Please login to Railway first:"
    echo "railway login"
    exit 1
}

# Create or connect to project
echo "📦 Setting up Railway project..."
railway link || railway init

# Volume configuration
echo "💾 Volume configuration for Tor keys..."
echo "✅ Volume is configured in railway.toml:"
echo "   [[deploy.volumes]]"
echo "   name = \"tor-keys\""
echo "   mountPath = \"/var/lib/tor\""
echo ""
echo "📋 Railway will automatically create the volume on deployment"
echo "⚠️  If volume doesn't persist, check Railway plan supports volumes"
echo "💡 The debug output in logs will show if volume is working"

# Set environment variables
echo "🔧 Setting environment variables..."
echo "Please set these environment variables in Railway dashboard:"
echo "- PUBLIC_SUPABASE_URL"
echo "- PUBLIC_SUPABASE_ANON_KEY" 
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- SUPABASE_DB_PASSWORD"
echo "- SUPABASE_JWT_SECRET"

echo ""
echo "✅ Railway setup complete!"
echo "📋 Next steps:"
echo "1. Set environment variables in Railway dashboard"
echo "2. Deploy: git push"
echo "3. Check logs for your .onion address"