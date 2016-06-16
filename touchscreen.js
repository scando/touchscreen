// Core Node modules
var path = require('path')
var cp = require('child_process')
var fs = require('fs')
    // NPM installed modules
var Rx = require('rx')
var wincmd = require('node-windows')
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

var source = Rx.Observable.create(runCheck)

function runCheck(observer) {
    setInterval(function() {
        checkDisconnects(observer)
        if (recentRestart == false && tryingToRestart == false) {
            checkResponse(observer)
        }
    }, 1000);
}

function checkDisconnects(observer) {
    cp.exec(findDisconnectsCmd, function(error, stdout, stderr) {
        console.log('Check for disconnects')
        if (results === '') {
            results = stdout
        } else {
            if (stdout != results) {
                results = stdout
                observer.onNext({
                    status: failOutput,
                    details: 'New drop detected'
                })
            }
        }
    })
}

function checkResponse(observer) {
    return wincmd.list(function(svc) {
        console.log('Check for response')
        var res = svc.filter(function(x) {
                if (x.ImageName === programName) {
                    return x
                }
            })
            .map(function(v) {
                if (v.Status === 'Not Responding') {
                    observer.onNext({
                        status: failOutput,
                        details: 'Program not responding'
                    })
                }
            })
    }, true)
}

var kill = function(cmd) {
    return new Promise(function(resolve, reject) {
        cp.exec(cmd, function(error, stdout, stderr) {
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
    tryingToRestart = true
    cp.exec(startCmd, function(error, stdout, stderr) {
        if (error) {
            clearTimeout(timeout)
            console.log('Reconnection attempt ' + i + ' - Failed')
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
            console.log(programName + ' restarted at ' + date)
            log(date)
            i = 1
        }
    })
}

var subscription = source.subscribe(function(data) {
    if (data.status === 'failed') {
        console.log(data.details)
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
    fs.appendFile(logPath, data+newLine, function(error) {
        if (error) {
            console.error("write error:  " + error.message)
        } else {
            console.log("Successful logged to " + logPath)
        }
    })
}
