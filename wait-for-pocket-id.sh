#!/bin/sh

POCKET_ID_CONFIG_URL="${POCKET_ID_BASE_URL}/.well-known/openid-configuration"

TIMEOUT=15
DELAY=3
START_TIME=$(date +%s)

echo "Checking for readiness of Pocket ID ($POCKET_ID_BASE_URL)"

while true; do
  HTTP_STATUS=$(wget --spider --server-response --quiet "$POCKET_ID_CONFIG_URL" 2>&1 | awk '/HTTP\/[0-9.]+/ {print $2; exit}')

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "Pocket ID API is ready!"
    break
  elif [ "$HTTP_STATUS" = "" ]; then
    echo "No HTTP response received."
  else
    echo "Received HTTP status: $HTTP_STATUS"
  fi

  # Check the elapsed time
  ELAPSED_TIME=$(($(date +%s) - START_TIME))
  if [ "$ELAPSED_TIME" -ge "$TIMEOUT" ]; then
    echo "Timeout reached. Pocket ID API is not ready after $TIMEOUT seconds."
    break
  fi

  echo "Pocket ID api not ready, retrying in $DELAY seconds..."
  sleep "$DELAY"
done

exec node server/index.js