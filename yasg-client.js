//. yasg-client.js
var axiosBase = require( 'axios' );

//. https://github.com/peterkuma/wstcp?tab=readme-ov-file
require( 'dotenv' ).config();

var yasg_server_url = 'YASG_SERVER_URL' in process.env ? process.env.YASG_SERVER_URL : null; //'http://localhost:8888';
var ws_server_url = 'WS_SERVER_URL' in process.env ? process.env.WS_SERVER_URL : 'ws://localhost:10000';
var target_host = 'TARGET_HOST' in process.env ? process.env.TARGET_HOST : '';
var target_port = 'TARGET_PORT' in process.env ? parseInt( process.env.TARGET_PORT ) : 8080;
var port = 'PORT' in process.env ? parseInt( process.env.PORT ) : 8888;

console.log( {yasg_server_url} );
console.log( {ws_server_url} );
console.log( {target_host} );
console.log( {target_port} );
console.log( {port} );

var wstcpClient = require( 'wstcp' ).client;

if( !yasg_server_url ){
  var tmp = ws_server_url.split( ':' );
  yasg_server_url = 'http:' + tmp[1] + ':' + port;
}

var axios = axiosBase.create({
  baseURL: yasg_server_url,
  responseType: 'json',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
axios.get( '/init' ).then( function( result ){
  //console.log( {result} );
  if( result && result.data && result.data.status ){
    var ws_server_port = result.data.ws_server_port;
    var tcp_server_port = result.data.tcp_server_port;
    var tmp = yasg_server_url.split( ':' );
    ws_server_url = 'ws:' + tmp[1] + ':' + ws_server_port;

    var wstcp_params = {
      url: ws_server_url,
      tcpPort: target_port,
      remote: true
    };

    if( target_host ){
      wstcp_params.tcpHostname = target_host;
    }

    var client = wstcpClient( wstcp_params );
      
    tmp = tmp[1].split( '/' );
    var target_url = tmp[2] + ':' + tcp_server_port;

    console.log( 'target = ' + target_url );

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
  }else{
    console.log( 'init error' );
    console.log( {result} );
  }
});
