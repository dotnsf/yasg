//. http-test.js
var express = require( 'express' ),
    app = express();
var port = 'PORT' in process.env ? parseInt( process.env.PORT ) : 8080;

//. HTTP server
app.use( express.Router() );
app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  res.write( JSON.stringify( { status: true, port: port }, null, 2 ) );
  res.end();
});

app.listen( port );
console.log( 'Listening port is ' + port );
