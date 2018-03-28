# node-postgres-dev-server

Install:
```
> npm i postgresql-dev-server
```

Start a server:
```js
require('postgres-dev-server').start({
    fsync: 'off', // tests will run faster
    port: '8432',
    pgdata: 'var/postgres',
    initSql: [
        'create database testdb'
    ]
}).then((p) => {
    console.log('Ready!', `PID=${p.pid}`);
});
```
