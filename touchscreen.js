// Core Node modules
var path = require('path')
var cp = require("child_process")
    // NPM installed modules
var Rx = require('rx')
var wincmd = require('node-windows')

var userName = process.env['USERPROFILE'].split(path.sep)[2]
var findDisconnectsCmd = 'net statistics workstation | findstr "^Server disconnects"'
var programName = 'TSADO.EXE'
var startCmd = 'start C:\\Users\\' + userName + '\\Desktop\\Touchscreen.lnk'
var results = ''


var source = Rx.Observable.create(function(observer) {
    setInterval(function() {
        cp.exec(findDisconnectsCmd, function(error, stdout, stderr) {
            observer.onNext(stdout);
        })
    }, 1000)

    return () => console.log('disposed')
});

var subscription = source.subscribe(function(data) {
    if (results === '') {
        results = data
    } else {
        if (data != results) {
            console.log('New Disconnect', data)
            results = data
            restart()
        }
    }
});

function restart() {
    var running = []
    wincmd.list(function(svc) {
        svc.filter(function(x) {
                if (x.ImageName === programName) {
                    return x
                }
            })
            .map(function(c) {
                wincmd.kill(c.PID, function() {
                    console.log('Process Killed')
                })
            })
        launch()
    })
}
var i = 1

function launch() {
    cp.exec(startCmd, function(error, stdout, stderr) {
        if (error) {
            console.log('Attempt ' + i + ' - Could not reconnect')
            i++
            setTimeout(function() {
                launch()
            }, 2000)
        } else {
            var date = new Date()
            console.log('Process restarted at ' + date)
            i = 1
        }
    })
}
