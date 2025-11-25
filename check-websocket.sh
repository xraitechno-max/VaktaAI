#!/bin/bash

echo "🔍 VaktaAI WebSocket Conflict Detector"
echo "======================================"

echo ""
echo "1️⃣ Checking WebSocketServer count..."
WS_COUNT=$(grep -r "new WebSocketServer" server/ --include="*.ts" | wc -l)
echo "   Found: $WS_COUNT WebSocketServer(s)"
if [ $WS_COUNT -gt 1 ]; then
  echo "   ❌ PROBLEM: Multiple WebSocket servers detected!"
  echo "   Locations:"
  grep -rn "new WebSocketServer" server/ --include="*.ts"
else
  echo "   ✅ OK: Only one WebSocket server"
fi

echo ""
echo "2️⃣ Checking .listen() count..."
LISTEN_COUNT=$(grep -r "\.listen(" server/ --include="*.ts" | wc -l)
echo "   Found: $LISTEN_COUNT .listen() call(s)"
if [ $LISTEN_COUNT -gt 1 ]; then
  echo "   ❌ PROBLEM: Multiple listen calls detected!"
  echo "   Locations:"
  grep -rn "\.listen(" server/ --include="*.ts"
else
  echo "   ✅ OK: Only one listen call"
fi

echo ""
echo "3️⃣ Checking for setupDocumentProgressWS..."
if grep -q "setupDocumentProgressWS" server/routes.ts 2>/dev/null; then
  echo "   ❌ PROBLEM: setupDocumentProgressWS still being called!"
  grep -n "setupDocumentProgressWS" server/routes.ts
else
  echo "   ✅ OK: No document progress WS in routes"
fi

echo ""
echo "4️⃣ Checking running node processes..."
NODE_COUNT=$(ps aux | grep -c "[n]ode")
echo "   Found: $NODE_COUNT node process(es)"
if [ $NODE_COUNT -gt 1 ]; then
  echo "   ⚠️  WARNING: Multiple node processes running!"
  ps aux | grep "[n]ode"
fi

echo ""
echo "======================================"
if [ $WS_COUNT -eq 1 ] && [ $LISTEN_COUNT -eq 1 ]; then
  echo "✅ Configuration looks correct!"
else
  echo "❌ Issues found - fix them and try again"
fi
