#!/bin/sh

# Debug volume mounting
echo "=========================================="
echo "🔍 VOLUME DEBUGGING"
echo "=========================================="
echo "Checking /var/lib/tor directory..."
ls -la /var/lib/tor/ || echo "Directory doesn't exist yet"
echo "Checking for existing hidden service..."
ls -la /var/lib/tor/hidden_service/ || echo "Hidden service directory doesn't exist yet"

# Ensure proper ownership of Tor directories
echo "Setting up Tor directories..."
mkdir -p /var/lib/tor/hidden_service
chown -R tor:tor /var/lib/tor
chmod 700 /var/lib/tor
chmod 700 /var/lib/tor/hidden_service

echo "After setup:"
ls -la /var/lib/tor/
ls -la /var/lib/tor/hidden_service/ || echo "Hidden service directory is empty (expected for first run)"
echo "=========================================="

# Start Tor in the background
echo "Starting Tor..."
tor -f /etc/tor/torrc &

# Wait for Tor to initialize
sleep 10

# Get the onion address and inject it into the app
echo "=========================================="
echo "🧅 TOR HIDDEN SERVICE INITIALIZATION"
echo "=========================================="

if [ -f /var/lib/tor/hidden_service/hostname ]; then
    ONION_URL=$(cat /var/lib/tor/hidden_service/hostname)
    export PUBLIC_ONION_URL="http://${ONION_URL}"
    
    echo "✅ Tor hidden service is ACTIVE!"
    echo "🌐 Your .onion address: ${ONION_URL}"
    echo "🔗 Full URL: ${PUBLIC_ONION_URL}"
    echo "📋 Share this URL for anonymous access"
    
    # Inject onion URL into the built app
    echo "window.PUBLIC_ONION_URL = '${PUBLIC_ONION_URL}';" > /app/build/client/_app/onion-config.js
    echo "✅ Onion URL injected into application"
else
    echo "⏳ Waiting for Tor to generate onion address..."
    sleep 10
    if [ -f /var/lib/tor/hidden_service/hostname ]; then
        ONION_URL=$(cat /var/lib/tor/hidden_service/hostname)
        export PUBLIC_ONION_URL="http://${ONION_URL}"
        
        echo "✅ Tor hidden service is ACTIVE!"
        echo "🌐 Your .onion address: ${ONION_URL}"
        echo "🔗 Full URL: ${PUBLIC_ONION_URL}"
        echo "📋 Share this URL for anonymous access"
        
        # Inject onion URL into the built app
        echo "window.PUBLIC_ONION_URL = '${PUBLIC_ONION_URL}';" > /app/build/client/_app/onion-config.js
        echo "✅ Onion URL injected into application"
    else
        echo "⚠️  WARNING: Tor onion address not yet generated!"
        echo "🔍 Check Tor logs for issues"
        export PUBLIC_ONION_URL=""
        echo "window.PUBLIC_ONION_URL = '';" > /app/build/client/_app/onion-config.js
    fi
fi

echo "=========================================="

# Start the Node.js application with the onion URL available
echo "🚀 Starting SvelteKit application on port 8080..."
echo "=========================================="

# Start the app in background and monitor onion URL
cd /app
node build/index.js &
APP_PID=$!

# Function to display onion URL periodically
display_onion_info() {
    while true; do
        sleep 300  # Every 5 minutes
        if [ -f /var/lib/tor/hidden_service/hostname ]; then
            CURRENT_ONION=$(cat /var/lib/tor/hidden_service/hostname)
            echo "=========================================="
            echo "🧅 TOR STATUS UPDATE"
            echo "🌐 Your .onion address: ${CURRENT_ONION}"
            echo "🔗 Full URL: http://${CURRENT_ONION}"
            echo "📋 Share this URL for anonymous access"
            echo "⏰ $(date)"
            echo "=========================================="
        fi
    done
}

# Start periodic display in background
display_onion_info &
MONITOR_PID=$!

# Wait for the main app process
wait $APP_PID