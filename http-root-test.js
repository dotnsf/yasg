//. http-root-test.js
var express = require( 'express' ),
    fs = require( 'fs' ),
    app = express();
var port = 'PORT' in process.env ? parseInt( process.env.PORT ) : 1000;  //. < 1024

var root_file = '/root/.bash_history';  //. root にしか読めないファイル

//. HTTP server
app.use( express.Router() );
app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  fs.readFile( root_file, "utf-8", function( err, text ){
    if( err ){
      res.write( JSON.stringify( err, 2, null ) );
      res.end();
    }else{
      res.write( text );
      res.end();
    }
  });
});

app.listen( port );
console.log( 'Listening port is ' + port );
