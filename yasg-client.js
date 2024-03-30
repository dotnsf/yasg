//. yasg-client.js
//. https://github.com/peterkuma/wstcp?tab=readme-ov-file
require( 'dotenv' ).config();

var ws_server_url = 'WS_SERVER_URL' in process.env ? process.env.WS_SERVER_URL : 'ws://localhost:8000';
var target_hostname = 'TARGET_HOSTNAME' in process.env ? process.env.TARGET_HOSTNAME : '';
var target_port = 'TARGET_PORT' in process.env ? parseInt( process.env.TARGET_POSRT ) : 8080;


var wstcpClient = require( 'wstcp' ).client;

var wstcp_params = {
    url: ws_server_url,
    tcpPort: target_port,
    remote: true
};
if( target_hostname ){
    wstcp_params.tcpHostname = target_hostname;
}

var client = wstcpClient( wstcp_params );

/*
 * ws://localhost:8000 で待っている WSTCP Server に接続
 * YASG Server からの TCP 接続リクエストを（'xxxxx'の） ~~22~~ 8080 番ポートに送る
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
