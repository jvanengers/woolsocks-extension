#!/bin/bash

# Build Safari extension from the built web extension
set -e

echo "Building Safari extension..."

# Build the Safari version first
npm run build:safari

# Create Safari extension directory structure
SAFARI_DIR="safari-extension/WoolsocksExtension"
mkdir -p "$SAFARI_DIR"

# Copy the built extension files
echo "Copying extension files to Safari project..."
cp -r dist/safari/* "$SAFARI_DIR/"

# Create the Safari Web Extension handler
cat > "$SAFARI_DIR/SafariWebExtensionHandler.swift" << 'EOF'
import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey]
        os_log(.default, log: .default, "Received message from browser.runtime.sendNativeMessage: %@", message as? CVarArg ?? "")
        
        let response = NSExtensionItem()
        response.userInfo = [ SFExtensionMessageKey: [ "Response to": message ] ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }
}
EOF

echo "Safari extension built successfully!"
echo "Next steps:"
echo "1. Open safari-extension/Woolsocks.xcodeproj in Xcode"
echo "2. Add App Group entitlements to both targets"
echo "3. Configure signing and bundle identifiers"
echo "4. Build and run on iOS Simulator or device"
