#!/bin/bash

# Navigate to the npm project directory and start the npm process
cd react_server/exovision-ui && npm run start &

# Navigate to the Python script directory and execute the script
cd react_server/flask-server && python Exoplanet_Graph.py

# Wait for all background jobs to finish
wait
