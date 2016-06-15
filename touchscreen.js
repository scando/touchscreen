var Rx = require('rx');
var cp = require("child_process")
var wincmd = require('node-windows')
var findDisconnectsCmd = 'net statistics workstation | findstr "^Server disconnects"'
var results = ''
var programName = 'TSADO.EXE'
var startCmd = 'start C:\\Users\\matt\\Desktop\\Touchscreen.lnk';

var source = Rx.Observable.create(function(observer) {
    setInterval(function() {
        cp.exec(findDisconnectsCmd, function(error, stdout, stderr) {
            observer.onNext(stdout);
        })
    }, 1000);

    return () => console.log('disposed')
});

var subscription = source.subscribe(function(data) {
    if (results === '') {
        results = data
    } else {
        if (data != results) {
            console.log('New Disconnect', data);
            results = data;
            restart();
        }
    }
});

function restart() {
    var running = [];
    wincmd.list(function(svc) {
        svc.filter(function(x) {
                if (x.ImageName === programName) {
                    return x
                }
            })
            .map(function(c) {
                wincmd.kill(c.PID, function() {
                    console.log('Process Killed');
                })
            });
						launch();
    })
}

function launch() {
    cp.exec(startCmd, function(error, stdout, stderr) {
        if (error) {
            console.log('Could not reconnect');
						setTimeout(function () {
							launch();
						}, 1000);
        } else {
            var date = new Date();
            console.log('Process restarted at ' + date);
        }
    })
}
