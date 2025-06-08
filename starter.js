const { spawn } = require('child_process');
function start(){
    let start = false
    var child = spawn('node SchedulerBotReborn.js', ['D:\projects\bot'], { shell: true });
    child.stdout.on('data', (data) => {
        console.log(` ${data}`);
    });

    child.stderr.on('data', function (data) {
        console.error("\x1b[31m%s\x1b[0m",data.toString());
        start = true
    });

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        return start();
    });
}
let start = start()