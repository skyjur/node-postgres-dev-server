# node-postgresql-dev-server

Install:
```
$ npm i postgresql-dev-server

> postgresql-dev-server@1.0.1 postinstall /home/ski/projects/testp/node_modules/postgresql-dev-server
> node download.js

 postgresql-10.3-1-linux-x64-binaries.tar.gz [====================] 10014612/bps 100% 0.0s
Extracting postgresql...
npm notice created a lockfile as package-lock.json. You should commit this file.
npm WARN testp@1.0.0 No description
npm WARN testp@1.0.0 No repository field.

+ postgresql-dev-server@1.0.1
added 2 packages in 4.578s
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
