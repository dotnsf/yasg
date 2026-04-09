#!/bin/bash

pkg src/server/index.js -t node18-linux-x64,node18-linux-arm64,node18-win-x64 -o yasg-server
chmod +x yasg-server-win-x64.exe
mv yasg-server-* assets/

pkg src/client/index.js -t node18-linux-x64,node18-linux-arm64,node18-win-x64 -o yasg-client
chmod +x yasg-client-win-x64.exe
mv yasg-client-* assets/


