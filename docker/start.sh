#!/bin/sh

# Start Tor in the background
echo "Starting Tor..."
tor -f /etc/tor/torrc &

# Wait for Tor to initialize
sleep 10

# Display the onion address
if [ -f /var/lib/tor/hidden_service/hostname ]; then
    echo "Onion address: $(cat /var/lib/tor/hidden_service/hostname)"
else
    echo "Waiting for Tor to generate onion address..."
    sleep 5
    if [ -f /var/lib/tor/hidden_service/hostname ]; then
        echo "Onion address: $(cat /var/lib/tor/hidden_service/hostname)"
    fi
fi

# Start the Node.js application
echo "Starting SvelteKit application..."
cd /app
exec node build/index.js