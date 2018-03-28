const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const process = require('process');
const ProgressBar = require('progress');

const DEFAULT_DOWNLOAD_URLS = {
    linux: 'http://get.enterprisedb.com/postgresql/postgresql-10.3-1-linux-x64-binaries.tar.gz',
    win32: 'http://get.enterprisedb.com/postgresql/postgresql-10.3-1-windows-x64-binaries.zip',
    darwin: 'http://get.enterprisedb.com/postgresql/postgresql-10.3-1-osx-binaries.zip'
};


function getPostgresql(location, dowload_urls) {
    var dowload_urls = dowload_urls || DEFAULT_DOWNLOAD_URLS;
    var url = dowload_urls[os.platform()];
    if(!url) {
        throw new Error(`Have no download link for platform: ${os.platform()}`)
    }
    var localPath = path.join(location, path.basename(url));
    return downloadFile(url, localPath)
        .then(() => console.log('Extracting postgresql...'))
        .then(() => extract(localPath, location))
        .catch(console.error);
}


function downloadFile(url, localPath) {
    return new Promise((resolve, reject) => {
        if(fs.existsSync(localPath)) {
            return resolve();
        }
        var request = http.get(url, function(response) {
            if(response.statusCode !== 200) {
                reject(new Error('Response code: ' + response.statusCode))
            } else {
                var file = fs.createWriteStream(localPath);
                var bar = new ProgressBar(` ${path.basename(url)} [:bar] :rate/bps :percent :etas`, {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: parseInt(response.headers['content-length'], 10)
                  });
                response.on('data', chunk => bar.tick(chunk.length));
                response.on('error', (err) => {
                    unlink(localPath);
                    reject(err);
                });
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }
        });
    });
}

function call(command, args) {
    return new Promise((resolve, reject) => {
        var p = child_process.spawn(command, args);
        p.stderr.pipe(process.stderr);
        p.stdout.pipe(process.stdout);
        p.on('close', (code) => {
            if(code > 0) {
                reject(new Error(`Process exit code: ${code}`))
            } else {
                resolve();
            }
        });
    })
}

function extract(filepath, location) {
    if(os.platform() == 'win32') {
        return call('PowerShell', ['-Command', `"Expand-Archive -Path' \\"${filepath}\\" -DestinationPath \\"${location}\\""`]);
    } else if(/tar.gz$/.test(filepath)) {
        return call('tar', ['-x', '-f', filepath, '-C', location, '--overwrite']);
    } else if(/zip$/.test(filepath)) {
        return call('unzip', ['-qod', location, filepath]);
    }
}

function ensureHaveBinaries(location) {
    if(fs.existsSync(path.join(location, 'pgsql', 'bin'))) {
        return Promise.resolve();
    } else {
        return getPostgresql(location);
    }
}

if(require.main === module) {
    ensureHaveBinaries(__dirname);
}