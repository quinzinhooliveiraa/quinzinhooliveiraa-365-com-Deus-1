#!/bin/bash
echo "🏗️  Building Casa dos 20 for mobile..."
echo ""

echo "1. Building web assets..."
npx vite build --outDir dist/public
echo ""

echo "2. Syncing with native projects..."
npx cap sync
echo ""

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  Android: npx cap open android  (opens Android Studio)"
echo "  iOS:     npx cap open ios      (opens Xcode)"
