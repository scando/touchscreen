// Core Node modules
var path = require('path')
var cp = require('child_process')
var fs = require('fs')
    // NPM installed modules
var Rx = require('rx')
var wincmd = require('node-windows')
var figlet = require('figlet')
    // Project variables
var logPath = '\\\\occws0.olympic.com\\Public\\Logs\\Touchscreen.txt'
var userName = process.env['USERPROFILE'].split(path.sep)[2]
var computerName = process.env.COMPUTERNAME
var findDisconnectsCmd = 'net statistics workstation | findstr "^Server disconnects"'
var programName = 'TSADO.EXE'
var killCmd = 'taskkill /F /T /IM ' + programName
    // var startCmdTest = 'start \\\\occe2.olympic.com\\Blswin32\\Source\\TSADO.EXE'
var startCmd = 'start C:\\Users\\' + userName + '\\Desktop\\Touchscreen.lnk'
var results = ''
var i = 1
var recentRestart = false
var failOutput = 'failed'
var timeout
var tryingToRestart = false
var pad = '====='
var longPad = '=====================================================\n====================================================='
var mon = '\nEverything looks good. Monitoring '+programName+'...\n'

var source = Rx.Observable.create(runCheck)

figlet('Olympic\nControls\nCorp.', function(err, data) {
    console.log(data)
    console.log(mon)
});


function runCheck(observer) {
    setInterval(function() {
        if (tryingToRestart == false) {
            checkDisconnects(observer)
        }
        if (recentRestart == false && tryingToRestart == false) {
            checkResponse(observer)
        }
    }, 1000);
}

function checkDisconnects(observer) {
    cp.exec(findDisconnectsCmd, function(error, stdout, stderr) {
        if (results === '') {
            results = stdout
        } else {
            if (stdout != results) {
                results = stdout
                observer.onNext({
                    status: failOutput,
                    details: 'NEW DROP DETECTED'
                })
            }
        }
    })
}

function checkResponse(observer) {
    return wincmd.list(function(svc) {
        var res = svc.filter(function(x) {
                if (x.ImageName === programName) {
                    return x
                }
            })
            .map(function(v) {
                if (v.Status === 'Not Responding') {
                    observer.onNext({
                        status: failOutput,
                        details: 'PROGRAM NOT RESPONDING'
                    })
                }
            })
    }, true)
}

var kill = function(cmd) {
    return new Promise(function(resolve, reject) {
        cp.exec(cmd, function(error, stdout, stderr) {
                console.log(pad + programName + ' killed successfully')
                resolve()
            })
        })
}

function launch() {
    if (tryingToRestart == false) {
        console.log(pad + 'Attempting to restart ' + programName + '...');
    }
    tryingToRestart = true
    cp.exec(startCmd, function(error, stdout, stderr) {
        if (error) {
            clearTimeout(timeout)
            console.log(pad + 'Restart attempt ' + i + ' - Failed')
            i++
            setTimeout(function() {
                launch()
            }, 2000)
        } else {
            tryingToRestart = false
            recentRestart = true
            clearTimeout(timeout)
            timeout = setTimeout(function() {
                recentRestart = false
            }, 30000);
            var date = new Date()
            console.log(pad + programName + ' restarted at ' + date)
            log(date)
            i = 1
        }
    })
}

var subscription = source.subscribe(function(data) {
    if (data.status === 'failed') {
        var date = new Date()
        console.log(longPad + '\n' + pad + data.details + ' at ' + date)
        kill(killCmd).then(function() {
            launch()
        }).catch(function(error) {
            console.log('ERROR', error)
        })
    }
})

function log(date) {
    var data = 'COMPUTER: ' + computerName + ' USER: ' + userName + ' RESTARTED: ' + date
    var newLine = '\r\n'
    fs.appendFile(logPath, data + newLine, function(error) {
        if (error) {
            console.error(pad+"Log error:  " + error.message+ '\n' + mon)
        } else {
            console.log(longPad + '\n' + mon)
        }
    })
}
