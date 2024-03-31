# YASG(Yet Another Secure Gateway)

## Overview

YASG（Yet Another Secure Gateway - やすじー）

Open Source versions of [Secure Gateway](https://cloud.ibm.com/docs/SecureGateway?topic=SecureGateway-about-sg&locale=ja).


## Files

- `yasg-server.js`
  - YASG サーバー
    - インターネット上に存在している
    - YASG クライアントに先駆けて起動中
    - ユーザーからのアクセスを受け付けるサーバー

- `yasg-client.js`
  - YASG クライアント
    - イントラネット上に存在している
    - 起動時に YASG サーバーに WebSocket で接続する
    - ターゲットサーバー（ターゲットリソース）にアクセスできるサーバー

- `http-test.js`
  - シンプルな HTTP サーバー
  - yasg-client.js と一緒に使って動作確認するためのもの

- `http-root-test.js`
  - root 権限がないと使えない、シンプルな HTTP サーバー
    - root 権限がないと読み込めないはずの `/root/.bash_history` の中身を表示する
  - yasg-client.js と一緒に使って動作確認するためのもの

  
## How to use

- Run YASG server
  - `$ node yasg-server`
  - ENV values(default)
    - `WS_SERVER_PORT`(8000) : Port # of listening WebSocket 
    - `SERVER_PORT`(10000) : Port # of listening user request.

- Run YASG client
  - `$ node yasg-client`
  - ENV values(default)
    - `WS_SERVER_URL`("ws://localhost:8000") : URL of requesting WebSocket 
    - `TARGET_HOSTNAME`("" (='localhost)) :  Hostname(IP) of target host
    - `TARGET_PORT`("8080") :  Port # of target host

- Run HTTP-TEST
  - `$ node http-test`
    - `$ PORT=8888 node http-test`

- Run HTTP-ROOT-TEST
  - `$ sudo node http-root-test`
    - `$ sudo PORT=1000 node http-root-test`


## Logic

- WebSocket プロトコルでリモート TCP フォワーディングを利用する

- リモート TCP フォワーディングの実装は [wstcp](https://www.npmjs.com/package/wstcp) 。


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


## Copyright

2024 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
