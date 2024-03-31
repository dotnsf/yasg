# YASG(Yet Another Secure Gateway)

## Overview

YASG（Yet Another Secure Gateway - やすじー）

Open Source versions of [Secure Gateway](https://cloud.ibm.com/docs/SecureGateway?topic=SecureGateway-about-sg).


## Files

- `yasg-server.js`
  - YASG server
    - Supposed to be in internet
    - Supposed to be started before YASG client
    - Supposed to be a TCP server which receives user request

- `yasg-client.js`
  - YASG client
    - Supposed to be in intranet or local network
      - like the ones of [Secure Gateway](https://cloud.ibm.com/docs/SecureGateway?topic=SecureGateway-about-sg) client.
    - Supposed to be started after YASG server, and connect it via WebSocket
    - Supposed to connect target server(target resource), like secure DB.

- `http-test.js`
  - Simple HTTP server(on port 8000)
  - Deserved to use with yasg-client.js

- `http-root-test.js`
  - Simple HTTP server(on port 1000) which need root priviledge
    - Display contents of `/root/.bash_history` which needs root priviledge to read.
  - Deserved to use with yasg-client.js

  
## How to Dockerize(still waiting for issue #5)

- YASG server
  - `$ docker build -t yourname/yasg-server -f Dockerfile.server .`
- YASG client
  - `$ docker build -t yourname/yasg-client -f Dockerfile.client .`


## How to use

- Run YASG server
  - `$ node yasg-server`
    - Run HTTP on 8080
  - `http://(yasg-server):8080/add/10000/10001`
    - Add new YASG server instance which use port 10000 for websocket, and 10001 for tcp
  - `http://(yasg-server):8080/add`
    - Add new YASG server instance
  - `http://(yasg-server):8080/show/10000`
    - Find YASG server instance which listens on port 10000
  - `http://(yasg-server):8080/show`
    - Show all YASG server instances
  - `http://(yasg-server):8080/delete/10000`
    - Delete YASG server instance which listens on port 10000


- Run YASG client
  - `$ node yasg-client`
  - ENV values(default)
    - `WS_SERVER_URL`("ws://localhost:10000") : URL of requesting WebSocket 
    - `TARGET_HOSTNAME`("" (='localhost)) :  Hostname(IP) of target host
    - `TARGET_PORT`("8000") :  Port # of target host

- Run HTTP-TEST
  - `$ node http-test`
    - `$ PORT=8888 node http-test`

- Run HTTP-ROOT-TEST
  - `$ sudo node http-root-test`
    - `$ sudo PORT=1000 node http-root-test`


## Examples

- ex. 0
  - `$ node http-test`
    - runs on 8000
  - `$ node yasg-server`
    - runs on 8080
  - `$ http://(yasg-server):8080/add`
    - assign new yasg-server instance #0 on 10000 and 40000
  - `$ WS_SERVER_URL=ws://localhost:10000 TARGET_PORT=8000 node yasg-client`
    - run new yasg-client, and connect to yasg-server instance #0 
  - `$ http://(yasg-server):40000/`
    - shows result of `http://(yasg-client):8000/`

- ex. 1
  - `$ http://(yasg-server):8080/add`
    - assign new yasg-server instance #1 on 10001 and 40001
  - `$ WS_SERVER_URL=ws://localhost:10001 TARGET_PORT=3306 TARGET_HOSTNAME=mysql.example.com node yasg-client`
    - run new yasg-client, and connect to yasg-server instance #1 
  - `$ mysql -h (yasg-server) -u user -p -P 40001`
    - connect to MySQL server which runs on (mysql.example.com)

- ex. 2
  - `$ http://(yasg-server):8080/add`
    - assign new yasg-server instance #2 on 10002 and 40002
  - `$ WS_SERVER_URL=ws://localhost:10002 TARGET_PORT=8080 TARGET_HOSTNAME=w3.example.com node yasg-client`
    - run new yasg-client, and connect to yasg-server instance #2 
  - `$ http://(yasg-server):40002/`
    - shows result of `http://(w3.example.com):8080/`


## Examples on Docker(still waiting for issue #5)

- Run YASG server on Docker
  - Build docker image
    - `$ docker build -t yourname/yasg-server -f Dockerfile.server .`
  - Run docker image
    - `$ docker run -d -n yasg-server -P -e PORT=8080 yourname/yasg-server`
  - Add new instance
    - `http://(yasg-server):8080/add`

- Run YASG client on Docker
  - Build docker image
    - `$ docker build -t yourname/yasg-client -f Dockerfile.client .`
  - Run docker image
    - `$ docker run -d -n yasg-client -p 10000:10000 -e WS_SERVER_URL=ws://localhost:10000 -e TARGET_PORT=3306 -e TARGET_HOSTNAME=mysql.example.com yourname/yasg-client`
    - `$ mysql -h (yasg-server) -u user -p -P 40000`
      - connect to MySQL server which runs on (mysql.example.com)


## Basic Logic

- To use **TCP remote forwarding** over **WebSocket**

- To use [wstcp](https://www.npmjs.com/package/wstcp) as implementation of TCP remote forwarding.


## PostgreSQL on docker

- `$ docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db postgres`

- `$ docker exec -it postgres bash`

- `/# psql -U user -d db`

- `db=# create table if not exists items ( id varchar(50) not null primary key, name varchar(50) default '', price int default 0 );`

- `db=# insert into items values( '001', 'Shampoo', 1000 );`

- `db=# insert into items values( '002', 'Body Soap', 800 );`

- `db=# insert into items values( '003', 'Rince', 1200 );`

- `db=# \q`

- `/# exit`


## References

https://qiita.com/LittleBear-6w6/items/9d780fea1b88340a0840
https://www.npmjs.com/package/wstcp


## Licensing

Those codes are licensed under MIT.


## Copyright

2024 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
