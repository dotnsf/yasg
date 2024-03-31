//. yasg-server.js
var express = require( 'express' ),
    app = express();

//. https://github.com/peterkuma/wstcp?tab=readme-ov-file
var wstcpServer = require( 'wstcp' ).server;

//. https://www.npmjs.com/package/plz-port
var plzPort = require( 'plz-port' );  //. #2
async function getPort( p ){
  return new Promise( async function( resolve, reject ){
    plzPort( p ).then( function( port ){
      resolve( port );
    });
  });
}

require( 'dotenv' ).config();
//var ws_server_port = 'WS_SERVER_PORT' in process.env ? parseInt( process.env.WS_SERVER_PORT ) : 8000;
//var server_port = 'SERVER_PORT' in process.env ? parseInt( process.env.SERVER_PORT ) : 10000;
var start_server_port = 'START_SERVER_PORT' in process.env ? parseInt( process.env.START_SERVER_PORT ) : 10000;

wstcpServers = [];

app.use( express.Router() );
app.get( '/add', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var ws_server_port = await getPort( start_server_port );
  var tcp_server_port = await getPort( start_server_port + 10000 );

  console.log( {ws_server_port} );
  console.log( {tcp_server_port} );

  var server = wstcpServer({
    port: ws_server_port,
    tcpPort: tcp_server_port,
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

  wstcpServers.push( server );

  res.write( JSON.stringify( { ws_server_port: ws_server_port, tcp_server_port: tcp_server_port }, null, 2 ) );
  res.end();
});

app.get( '/show/:port', async function( req, res ){
  var port = req.params.port;
  if( port ){ port = parseInt( port ); }

  var idx = -1;
  for( var i = 0; i < wstcpServers.length && idx == -1; i ++ ){
    var server = wstcpServers[i];
    if( server.ws_server_port == port || server.tcp_server_port == port ){
      idx = i;
    }
  }

  if( idx > -1 ){
    var server = wstcpServers[idx];
    res.write( JSON.stringify( { status: true, port: port, ws_server_port: server.ws_server_port, tcp_server_port: server.tcp_server_port }, null, 2 ) );
    res.end();
  }else{
    res.write( JSON.stringify( { status: false, port: port, message: 'not found' }, null, 2 ) );
    res.end();
  }
});

app.get( '/delete/:port', async function( req, res ){
  var port = req.params.port;
  if( port ){ port = parseInt( port ); }

  var idx = -1;
  for( var i = 0; i < wstcpServers.length && idx == -1; i ++ ){
    var server = wstcpServers[i];
    if( server.ws_server_port == port || server.tcp_server_port == port ){
      wstcpServers.splice( i, 1 );
      idx = i;
    }
  }

  if( idx > -1 ){
    res.write( JSON.stringify( { status: true, port: port, index: idx, message: 'deleted' }, null, 2 ) );
    res.end();
  }else{
    res.write( JSON.stringify( { status: false, port: port, message: 'not found' }, null, 2 ) );
    res.end();
  }
});

var port = 'PORT' in process.env ? parseInt( process.env.PORT ) : 8080;
app.listen( port );
console.log( 'Listening port is ' + port );
