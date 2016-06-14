let Rx = require('rx');
let cp = require("child_process")
let wincmd = require('node-windows')
let findDisconnectsCmd = 'net statistics workstation | findstr "^Server disconnects"'
let results = ''
let programName = 'TSADO.EXE'
let startCmd = 'start C:\\Users\\matt\\Desktop\\Touchscreen.lnk';

let source = Rx.Observable.create(observer => {
    setInterval(function() {
        cp.exec(findDisconnectsCmd, (error, stdout, stderr) => {
            observer.onNext(stdout);
        })
    }, 1000);

    return () => console.log('disposed')
});

let subscription = source.subscribe(data => {
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
    let running = [];
    wincmd.list(svc => {
        svc.filter(x => {
                if (x.ImageName === programName) {
                    return x
                }
            })
            .map(c => {
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
            console.log('Process restarted');
        }
    })
}
