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
echo "💾 Setting up volume for persistent Tor keys..."
echo "📋 To create volume in Railway dashboard:"
echo "   1. Deploy your project first"
echo "   2. Right-click on your service card"
echo "   3. Select 'Add Volume'"
echo "   4. Mount Path: /var/lib/tor"
echo "   5. Save the volume"
echo "   6. Redeploy to activate"
echo ""
echo "⚠️  This is CRITICAL for persistent .onion addresses!"
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