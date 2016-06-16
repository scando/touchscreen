// Core Node modules
var path = require('path')
var cp = require('child_process')
    // NPM installed modules
var Rx = require('rx')
var wincmd = require('node-windows')
    // Project variables
var userName = process.env['USERPROFILE'].split(path.sep)[2]
var findDisconnectsCmd = 'net statistics workstation | findstr "^Server disconnects"'
var programName = 'TSADO.EXE'
var killCmd = 'taskkill /F /T /IM ' + programName
var startCmd = 'start C:\\Users\\' + userName + '\\Desktop\\Touchscreen.lnk'
var results = ''
var i = 1
var restarted = false

var source = Rx.Observable.create(function(observer) {
    var output = 'failed'
    setInterval(function() {
        cp.exec(findDisconnectsCmd, function(error, stdout, stderr) {
            if (results === '') {
                results = stdout
            } else {
                if (stdout != results) {
                    results = stdout
                    observer.onNext({
                        status: output,
                        details: 'New drop detected'
                    })
                }
            }
        })
        if (restarted == true) {
            setTimeout(function() {
                list()
                restarted = false
            }, 30000);
        } else {
            list()
        }
    }, 2000)

    function list() {
        return wincmd.list(function(svc) {
            var res = svc.filter(function(x) {
                if (x.ImageName === programName) {
                    return x
                }
            })
            res.map(function(v) {
                if (v.Status === 'Not Responding') {
                    observer.onNext({
                        status: output,
                        details: 'Program not responding'
                    })
                }
            })
        }, true)
    }
})

var kill = function() {
    return new Promise(function(resolve, reject) {
        cp.exec(killCmd, function(error, stdout, stderr) {
            if (error) {
                console.log('Error:', error)
            } else {
                console.log(stdout)
                resolve()
            }
        })
    })
}

function launch() {
    cp.exec(startCmd, function(error, stdout, stderr) {
        if (error) {
            console.log('Reconnection attempt ' + i + ' - Failed')
            i++
            setTimeout(function() {
                launch()
            }, 2000)
        } else {
            restarted = true
            var date = new Date()
            console.log(programName + ' restarted at ' + date)
            i = 1
        }
    })
}

var subscription = source.subscribe(function(data) {
    if (data.status === 'failed') {
        console.log(data.details)
        kill().then(function() {
            launch()
        }).catch(function(error) {
            console.log('ERROR', error)
        })
    }
})
