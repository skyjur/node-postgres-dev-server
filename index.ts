import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process';
import * as child_process from 'child_process';


const bin = {
    initdb: path.join(__dirname, 'pgsql', 'bin', 'initdb'),
    postgres: path.join(__dirname, 'pgsql', 'bin', 'postgres'),
    psql: path.join(__dirname, 'pgsql', 'bin', 'psql'),
    createdb: path.join(__dirname, 'pgsql', 'bin', 'createdb')
};

export const configDefaults = {
    fsync: 'off',
    pgdata: process.env.PGDATA || 'var/postgres',
    port: process.env.PGPORT || '8432',
    initSql: []
};

export type Config = typeof configDefaults;

function start(userConfig?: Config) : Promise<child_process.ChildProcess> {
    var config = {...configDefaults, ...(userConfig || {})};
    return ensureInitDb(config.pgdata).then((isNew) => {
        return new Promise<child_process.ChildProcess>((resolve, reject) => {
            var p = child_process.spawn(bin.postgres, ['-D', config.pgdata, '-c', 'fsync=' + config.fsync, '-p', config.port]);
            var ready = false;
            setTimeout(() => {
                if(!ready) { p.kill(); }  // kill if fails to start
            }, 2000);
            p.stderr.on('data', chunk => {
                let chunkStr = chunk.toString();
                if(/database system is ready to accept connections/.test(chunkStr)) {
                    if(isNew) {         
                        runInitSql(config)
                            .then(success)
                            .catch((e) => {
                                p.kill();
                            });
                    } else {
                        success();
                    }
                }
                if(/ERROR/.test(chunkStr)) {
                    console.error(`[PG ERROR]`, chunkStr);
                }
            });
            p.on('close', (code) => {
                if(!ready) {
                    reject(new Error('Failed to start postgresql database'));
                } else {
                    console.log('Closing postgresql server');
                }
            });

            function success() {
                ready = true;
                resolve(p);
            }
        });
    });
}

function ensureInitDb(pgdata: string) {
    if(!fs.existsSync(path.join(pgdata, 'PG_VERSION'))) {
        return call(bin.initdb, ['-D', pgdata, '--nosync']).then(() => true);
    } else {
        return Promise.resolve(false);
    }
}

function runInitSql(config: Config) {
    var p: Promise<any> = Promise.resolve();
    for(var sql of config.initSql) {
        p = p.then(() => {
            return call(bin.psql, ['-p', config.port, '-h', '127.0.0.1', 'postgres', '-c', sql]);
        });
    }
    return p;
}

function call(command: string, args: string[]) {
    return new Promise((resolve, reject) => {
        var p = child_process.spawn(command, args);
        let out = '';
        p.stderr.on('data', chunk => out += chunk.toString());
        p.stderr.on('data', chunk => out += chunk.toString());
        p.on('close', (code) => {
            if(code > 0) {
                reject(new Error(`Process exit code: ${code}:\n\n${out}`))
            } else {
                resolve();
            }
        });
    })
}

export default start;

if(require.main == module) {
    start().then(proc => {
        console.log('Postgresql server', `PID=${proc.pid}`, `PORT=${configDefaults.port}`);
    });
}