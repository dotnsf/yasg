//. yasg-server.js
//. https://github.com/peterkuma/wstcp?tab=readme-ov-file
require( 'dotenv' ).config();

var ws_server_port = 'WS_SERVER_PORT' in process.env ? parseInt( process.env.WS_SERVER_PORT ) : 8000;
var port = 'PORT' in process.env ? parseInt( process.env.PORT ) : 10000;

var wstcpServer = require( 'wstcp' ).server;
var server = wstcpServer( {
    port: ws_server_port,
    tcpPort: port,
    remote: true
});

/*
 * YASG Client からの WebSocket 接続リクエストを ws://localhost:8000 で待つ
 * ユーザーからのリクエストを 10000 番ポートで待ち受ける
 */

server.on( 'connection', function(){
    console.log( 'server: connection' );
});
server.on( 'error', function( err ){
    console.log( `server error: ${err.message}` );
});

