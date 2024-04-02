//. yasg-client.js
//. https://github.com/peterkuma/wstcp?tab=readme-ov-file
require( 'dotenv' ).config();

var ws_server_url = 'WS_SERVER_URL' in process.env ? process.env.WS_SERVER_URL : 'ws://localhost:10000';
var target_host = 'TARGET_HOST' in process.env ? process.env.TARGET_HOST : '';
var target_port = 'TARGET_PORT' in process.env ? parseInt( process.env.TARGET_PORT ) : 8080;

console.log( {ws_server_url} );
console.log( {target_host} );
console.log( {target_port} );

var wstcpClient = require( 'wstcp' ).client;

var wstcp_params = {
    url: ws_server_url,
    tcpPort: target_port,
    remote: true
};
if( target_host ){
    wstcp_params.tcpHostname = target_host;
}

var client = wstcpClient( wstcp_params );

/*
 * ws://localhost:10000 で待っている WSTCP Server に接続
 * YASG Server からの TCP 接続リクエストを（ tcpHost の） 8080 番ポートに送る
 */

client.on( 'connection', function(){
    console.log( 'client: connection' );
});
client.on( 'close', function(){
    console.log( 'client: close' );
});
client.on( 'error', function( err ){
    console.log( `client error: ${err.message}` );
});
