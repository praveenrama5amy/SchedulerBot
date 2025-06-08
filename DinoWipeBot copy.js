console.log("\n----------------------------------------------------------------------\n");
console.log('Bot Started');
const fs = require('fs');
const Rcon = require('rcon');
const { Client } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });
const data = fs.readFileSync('./config.json', 'utf-8');
const configFile = JSON.parse(data);
const mysql = require('mysql');
const { resolve } = require('path');
const { disconnect } = require('process');

client.login(configFile.discordBotToken);

var botStatus;
client.on('ready', async function() {
    console.log(colors.green, client.user.tag + " BOT has been Logged In.")
    botStatus = true;
}).on('message', function(message) {
    if (message.content == "$kickme") {
        kickme(message);
    }
});

//----------- DataBase Connection -----------------
var db = mysql.createConnection({
    host: configFile.database.hostname,
    port: configFile.database.port,
    user: configFile.database.username,
    password: configFile.database.password,
    database: configFile.database.database
})

db.connect(function(err) {
    if (err) {
        if (err.code == "ER_ACCESS_DENIED_ERROR") {
            console.log("Database Authentication Error");
        } else {
            console.log(err);
        }
    };
})

colors = {
    red: "\x1b[31m%s\x1b[0m",
    green: "\x1b[32m%s\x1b[0m",
    yellow: "\x1b[33m%s\x1b[0m",
    blue: "\x1b[34m%s\x1b[0m",
    magenta: "\x1b[35m%s\x1b[0m",
    cyan: "\x1b[36m%s\x1b[0m",
};


var servers = [];
var serverNames = [];
for (server in configFile.servers) {
    servers.push(configFile.servers[server]);
    serverNames.push(server);
}

var scheduledCommandNames = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommandNames.push(scheduledCommand);
}

var scheduledTime = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledTime.push(configFile.scheduledCommands[scheduledCommand].time);
}

var scheduledCommands = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommands.push(configFile.scheduledCommands[scheduledCommand].command);
}

var scheduledCommandDiscordNotification = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommandDiscordNotification.push(configFile.scheduledCommands[scheduledCommand].discordNotification);
}

var scheduledCommandDiscordNotificationChannelId = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommandDiscordNotificationChannelId.push(configFile.scheduledCommands[scheduledCommand].discordNotificationChannelId);
}
var scheduledCommandDiscordMessages = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommandDiscordMessages.push(configFile.scheduledCommands[scheduledCommand].discordmessage);
}
var scheduledCommandToServer = [];
for (scheduledCommand in configFile.scheduledCommands) {
    scheduledCommandToServer.push(configFile.scheduledCommands[scheduledCommand].toServer);
}
console.log("Server Count: " + servers.length);
console.log(colors.cyan, "Servers Watching:" + serverNames);
console.log("\n----------------------------------------------------------------------\n");
console.log(colors.yellow, "Commands are being Watched for perform: ");
for (let i = 0; i < scheduledCommandNames.length; i++) {
    console.log(colors.magenta, scheduledCommandNames[i]);
}

function sendCommandToServer(hostname, port, password, command, serverName) {
    var conn = new Rcon(hostname, port, password);
    conn.on('auth', function() {
        conn.send(command);
    }).on('response', function(str) {
        if (str.match("Server received, But no response!")) {
            console.log(colors.green, showCurrentTime() + "-" + command + " command sended to " + serverName);
            conn.disconnect();
        } else {
            console.log(colors.green, showCurrentTime() + "Command Has Send: " + command + "\n" + showCurrentTime() + "Response: " + str);
            conn.disconnect();
        }
    }).on('error', function(error) {
        console.log(colors.red, showCurrentTime() + "Error Sending Sendind Command :'" + command + "'-Error : " + error);
    }).on('end', function() {
        console.log(showCurrentTime() + 'Connection closed with RCON Server ' + serverName);
    })
    conn.connect();
}

setInterval(currentTime, 1000);

function currentTime() {
    var date = new Date();
    currentTimeInSeconds = (date.getHours() * 60 * 60) + (date.getMinutes() * 60) + date.getSeconds();
    currentTime = {
        hrs: date.getHours(),
        mins: date.getMinutes(),
        secs: date.getSeconds()
    };
    checkTimeForWipe();
}

function showCurrentTime() {
    return "[" + currentTime.hrs + ":" + currentTime.mins + ":" + currentTime.secs + "]";
}

function checkTimeForWipe() {
    for (let i = 0; i < scheduledTime.length; i++) {
        if (currentTimeInSeconds == ((scheduledTime[i][0] * 60 * 60) + (scheduledTime[i][1] * 60) + (scheduledTime[i][2]))) {
            console.log("\n----------------------------------------------");
            console.log(showCurrentTime() + " Command Triggerred : " + scheduledCommandNames[i]);
            if (scheduledCommandToServer[i][0] == 'all') {
                sendCommandToAllServer(scheduledCommands[i]);
            } else {
                var discordNotification = {
                    discordNotification: scheduledCommandDiscordNotification[i],
                    ToServer: scheduledCommandToServer[i],
                    ChannelId: scheduledCommandDiscordNotificationChannelId[i],
                    Messages: scheduledCommandDiscordMessages[i]
                };
                sendCommand(scheduledCommands[i], scheduledCommandToServer[i], discordNotification);

            }
            if (scheduledCommandDiscordNotification[i]) {
                sendNotificationToDiscord(scheduledCommandToServer[i], scheduledCommandDiscordNotificationChannelId[i], scheduledCommandDiscordMessages[i]);
            }
        }
    }
}

function sendCommand(command, toServer, discordNotification) {
    for (let i = 0; i < toServer.length; i++) {
        let x = toServer[i];
        let serverName = toServer[i]
        sendCommandToServer(configFile.servers[x].hostname, configFile.servers[x].port, configFile.servers[x].password, command, x);
        var conn = new Rcon(configFile.servers[x].hostname, configFile.servers[x].port, configFile.servers[x].password);
        conn.on('auth', function() {
            conn.send(command);
        }).on('response', function(str) {
            if (str.match("Server received, But no response!")) {
                console.log(colors.green, showCurrentTime() + "-" + command + " command sended to " + serverName);
                conn.disconnect();
            } else {
                console.log(colors.green, showCurrentTime() + "Command Has Send: " + command + "\n" + showCurrentTime() + "Response: " + str);
                conn.disconnect();
            }
        }).on('error', function(error) {
            console.log(colors.red, showCurrentTime() + "Error Sending Sendind Command :'" + command + "'-Error : " + error);
        }).on('end', function() {
            console.log(showCurrentTime() + 'Connection closed with RCON Server ' + serverName);
        })
        conn.connect();
    }
    if (discordNotification.discordNotification == true) {

    }
}

function sendNotificationToDiscord(toserver, scheduledCommandDiscordNotificationChannelId, message) {
    if (botStatus) {
        let dcChannel = client.channels.cache.get(scheduledCommandDiscordNotificationChannelId);
        var content = "```";
        for (let i = 0; i < toserver.length; i++) {
            content += toserver[i] + ": " + message + '\n';
        }
        content += "```";
        if (dcChannel.send(content)) {
            console.log(colors.green, showCurrentTime() + " Discord Notification send successfully");
        }
    }
}


console.log("\n----------------------------------------------------------------------\n");



//-------------------- BOT FUNCTIONS ---------------------------------


async function kickme(message) {
    let discordId = message.author.id;
    let steamId = await getSteamIdWithDiscordId(discordId);
    steamId = steamId[0].SteamId;
    let channel = client.channels.cache.get(message.channelId);
    if (steamId == "" || steamId == null) {
        channel.send("You Have not linked Steam With Discord Link it in <#942331861852651541>");
    } else {
        let MapNameOfPlayer = await getMapNameOfPlayer(steamId);
        MapNameOfPlayer = MapNameOfPlayer[0].ServerKey;
        if (MapNameOfPlayer == null || MapNameOfPlayer == "") {
            channel.send("You Are Not In any Map");
        } else {
            var conn = new Rcon(configFile.servers[MapNameOfPlayer].hostname, configFile.servers[MapNameOfPlayer].port, configFile.servers[MapNameOfPlayer].password);
            let command = "kickplayer " + steamId;
            conn.on('auth', () => {
                conn.send(command);
            }).on('response', function(str) {
                if (str.match("Server received, But no response!")) {
                    console.log(colors.green, showCurrentTime() + "-" + command + " command sended to " + serverName);
                    channel.send("You are Kicked From " + MapNameOfPlayer);
                } else {
                    console.log(colors.green, showCurrentTime() + "Command Has Send: " + command + "\n" + showCurrentTime() + "Response: " + str);
                    channel.send("You are Kicked From " + MapNameOfPlayer);
                }
            }).on('error', function(error) {
                console.log(colors.red, showCurrentTime() + "Error Sending Sendind Command :'" + command + "'-Error : " + error);
            }).on('end', function() {
                console.log(showCurrentTime() + 'Connection closed with RCON Server ' + serverName);
            })
            conn.connect();
        }
    }
}

function getSteamIdWithDiscordId(DiscordId) {
    return new Promise((resolve) => {
        let sql = "SELECT * FROM discordsteamlinks WHERE DiscordId = '" + DiscordId + "'";
        db.query(sql, (err, result) => {
            if (err) throw err;
            resolve(result);
        });
    })
}

function getMapNameOfPlayer(steamId) {
    return new Promise((resolve) => {
        let sql = "SELECT * FROM currentplayers WHERE SteamId = '" + steamId + "'";
        db.query(sql, (err, result) => {
            if (err) throw err;
            resolve(result);
        })
    })
}