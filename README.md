# YASG(Yet Another Secure Gateway)

## Overview

Open Source versions of Secure Gateway.



## Logic

0. TCP Server(c2) 起動(TCP/10000)時に WebSocket サーバー s1 待ち受け(TCP/8000)

1. TCP Client(c1) 起動時に WebSocket クライアント c1 が s1 に接続。同時に TCP Client s2 を起動して Target への転送を準備する(TCP/5432)

2. TCP Server(c2) が User からリクエストを受けたら TCP クライアント c2 から s2 へ接続リクエスト(TCP/3002)

3. s2 から c2 へレスポンスして s2 と c2 が接続(TCP/3002)

4. c2 がレスポンスを受けたら、s1 から c1 へレスポンスして s1 と c1 が接続(TCP/3001)。これで Client 起動完了。

5. User からのリクエストを Server が受ける(TCP/8080)

6. Server の c2 クライアントから Client の s2 サーバーへリクエストを転送(TCP/3002)

7. Client の s2 サーバーがリクエストを受けたら(TCP/3002)、リクエスト内容にしたがって DB へリクエスト(TCP/5432)

8. DB でリクエストが処理され、結果を s2 で受け取る(TCP/5432)

9. 6. のレスポンスとして DB リクエスト結果を c2 に返す(TCP/3002)

10. 5. のレスポンスとして DB リクエスト結果を User に返す(TCP/8080)


```
User:          CL
              ⑤↓↑⑩
Server: s1     c2
       ①↑↓④  ⑥②↓↑③⑨
Client: c1     s2
              ⑦↓↑⑧
RDB:           DB
```


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


## Copyright

2024 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
