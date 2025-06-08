console.log("\n----------------------------------------------------------------------\n");
console.log('Bot Started');
const fs = require('fs');
const Rcon = require('rcon');
const { Client } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });
const data = fs.readFileSync('./config.json', 'utf-8');
const configFile = JSON.parse(data);
const mysql = require('mysql');

client.login(configFile.discordBotToken);

var botStatus;
client.on('ready', function() {
    console.log(colors.green, client.user.tag + " BOT has been Logged In.")
    botStatus = true;
}).on('message', function(message) {
    if (message.content.toLowerCase() == "$kickme") {
        kickme(message);
    }
    if (message.content.toLowerCase() == "$points") {
        arkPoints(message);
    }
    if ((message.content).substring(0, 6) == "$trade") {
        tradePoints(message);
    }
    if ((message.content).substring(0, 6) == "$admin") {
        admin(message);
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


//------------------------------------------------------------Connection Check-------------------------------------------
db.query("", function(err, result) {
    if (err) {
        if (err.code == "ER_ACCESS_DENIED_ERROR") {
            console.log(colors.red, "** DataBase Authentication Failed **");
        } else if (err.code == 'ENOTFOUND') {
            console.log(colors.red, "** database Host Not Found **");
        } else if (err.code == "ER_EMPTY_QUERY") {

        } else {
            console.log(colors.red, err);
        }
    } else {
        console.log(colors.green, configFile.database.database + " DB Authenticated");
    }
})
for (i = 0; i < serverNames.length; i++) {
    let x = serverNames[i];
    let hostname = configFile.servers[x].hostname;
    let port = configFile.servers[x].port;
    let password = configFile.servers[x].password;
    let command = "";
    var conn = new Rcon(hostname, port, password);
    conn.on('auth', function() {
        conn.disconnect();
    }).on('error', function(error) {
        console.log(colors.red, x + " RCON Connection Error : " + error);
    })
    conn.connect();
}
//------------------------------------------------------------Connection Check END-------------------------------------------


function sendCommandToServer(hostname, port, password, command, serverName) {
    var conn = new Rcon(hostname, port, password);
    conn.on('auth', function() {
        conn.send(command);
    }).on('response', function(str) {
        if (str.match("Server received, But no response!")) {
            console.log(colors.green, serverName + showCurrentTime() + "-" + command + " command sended to " + serverName);
        } else {
            console.log(colors.green, serverName + showCurrentTime() + "Command Has Send: " + command + "\n" + showCurrentTime() + "Response: " + str);
        }
    }).on('error', function(error) {
        console.log(colors.red, serverName + showCurrentTime() + "Error Sending Sendind Command :'" + command + "'-Error : " + error);
    }).on('end', function() {

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
                sendCommand(scheduledCommands[i], scheduledCommandToServer[i]);
            }
            if (scheduledCommandDiscordNotification[i]) {
                sendNotificationToDiscord(scheduledCommandToServer[i], scheduledCommandDiscordNotificationChannelId[i], scheduledCommandDiscordMessages[i]);
            }
        }
    }
}

function sendCommand(command, toServer) {

    setTimeout(() => {
        console.log("----------------------------------------------");
    }, 1000);
    for (let i = 0; i < toServer.length; i++) {
        let x = toServer[i];
        if (!serverNames.includes(x)) {
            console.log(colors.red, x + " Server Does Not in Servers List In config File. Define " + x + " in servers object in config file.");
        } else {
            sendCommandToServer(configFile.servers[x].hostname, configFile.servers[x].port, configFile.servers[x].password, command, x);
        }

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
    try {
        let discordId = message.author.id;
        let steamId = await getSteamIdWithDiscordId(discordId);
        if (steamId.length != 0) {
            steamId = steamId[0].SteamId;
        }
        let channel = client.channels.cache.get(message.channelId);
        if (steamId == "" || steamId == null) {
            channel.send("You Have not linked Steam With Discord Link it in <#942331861852651541> <@!" + message.author.id + ">");
        } else {
            let MapNameOfPlayer = await getMapNameOfPlayer(steamId);
            if (MapNameOfPlayer != null && MapNameOfPlayer != "") {
                MapNameOfPlayer = MapNameOfPlayer[0].ServerKey;
                console.log(MapNameOfPlayer);
            }
            if (MapNameOfPlayer == null || MapNameOfPlayer == "") {
                channel.send("Currently You Are Not in Any Server <@!" + message.author.id + ">");
            } else if (!serverNames.includes(MapNameOfPlayer)) {
                console.log("Server Key in Config File does not match With Kals Crosschat Servey key name");
            } else {
                var conn = new Rcon(configFile.servers[MapNameOfPlayer].hostname, configFile.servers[MapNameOfPlayer].port, configFile.servers[MapNameOfPlayer].password);
                let command = "kickplayer " + steamId;
                conn.on('auth', () => {
                    conn.send(command);
                }).on('response', function(str) {
                    if (str.match("Server received, But no response!")) {
                        console.log(colors.green, showCurrentTime() + "-" + command + " command sended to " + MapNameOfPlayer);
                        channel.send("You are Kicked From " + MapNameOfPlayer);
                        conn.disconnect();
                    } else {
                        console.log(colors.green, showCurrentTime() + "Command Has Send: " + command + "\n" + showCurrentTime() + "Response: " + str);
                        console.log(colors.yellow, message.author.username + " Has Kicked From " + MapNameOfPlayer);
                        channel.send("You are Kicked From " + MapNameOfPlayer + " <@!" + message.author.id + ">");
                        conn.disconnect();
                    }
                }).on('error', function(error) {
                    console.log(colors.red, showCurrentTime() + "Error Sending Sendind Command :'" + command + "'-Error : " + error);
                }).on('end', function() {

                })
                conn.connect();

            }
        }
    } catch (error) {
        console.log(error);
    }
}
async function arkPoints(message) {
    let discordId = message.author.id;
    let steamId = await getSteamIdWithDiscordId(discordId);
    let channel = client.channels.cache.get(message.channelId);
    if (steamId.length != 0) {
        steamId = steamId[0].SteamId;
    }
    if (steamId == "" || steamId == null) {
        channel.send("You Have not linked Steam With Discord Link it in <#942331861852651541> <@!" + message.author.id + ">");
    } else {
        let arkPoints = await getArkPoints(steamId);
        if (arkPoints == null || arkPoints == "") {
            channel.send("You Have 0 ARK Points <@!" + message.author.id + ">");
        } else {
            arkPoints = arkPoints[0].Points;
            console.log(colors.yellow, message.author.username + " Have " + arkPoints + " Ark Points");
            channel.send("You have " + arkPoints + " ARK Points <@!" + message.author.id + ">");
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

function getArkPoints(steamId) {
    return new Promise((resolve) => {
        let sql = "SELECT * FROM arkshopplayers WHERE SteamId = '" + steamId + "'";
        db.query(sql, (err, result) => {
            if (err) throw err;
            resolve(result);
        })
    })
}

function setArkPoints(steamId, points) {
    let sql = "UPDATE arkshopplayers SET Points = '" + points + "' WHERE SteamId = '" + steamId + "'";
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(true);
            }
        })
    })
}
async function tradePoints(message) {
    let channel = client.channels.cache.get(message.channelId);
    let traderDiscordId = message.author.id;
    let traderSteamId = await getSteamIdWithDiscordId(traderDiscordId);
    if (traderSteamId != null || traderSteamId != "") {
        traderSteamId = traderSteamId[0].SteamId;
    }
    let pointReceiverDiscordId = (message.mentions.toJSON()).users;
    let pointReceiverUserName = client.users.cache.get((message.mentions.toJSON()).users[0]);
    pointReceiverUserName = pointReceiverUserName.username;
    let points = ((message.content).split(" "));
    if (points[1] != null || points[1] != "") {
        points = points[1];
    } else {
        channel.send("Enter Some Points To Trade <@!" + message.author.id + ">")
        return;
    }
    if (pointReceiverDiscordId.length == 0) {
        channel.send("Tag SomeOne To Trade Points <@!" + message.author.id + ">");
        return;
    }
    if (pointReceiverDiscordId.length > 1) {
        channel.send("Tag Only one person To trade points <@!" + message.author.id + ">");
        return;
    }
    let pointReceiverSteamId = await getSteamIdWithDiscordId(pointReceiverDiscordId);
    if (pointReceiverSteamId.length != 0) {
        pointReceiverSteamId = pointReceiverSteamId[0].SteamId;
    }
    if (pointReceiverSteamId == "" || pointReceiverSteamId == null) {
        channel.send("<@!" + (message.mentions.toJSON()).users[0] + "> Have Not Link Steam With Discord. Ask <@!" + (message.mentions.toJSON()).users[0] + "> to link Steam With Discord in <#942331861852651541> <@!" + message.author.id + ">");
        return;
    }
    let traderPoints = await getArkPoints(traderSteamId);
    if (traderPoints != null || traderPoints != "") {
        traderPoints = traderPoints[0].Points;
    } else {
        channel.send("Something Went Wrong");
    }

    let pointReceiverPoints = await getArkPoints(pointReceiverSteamId);
    if (pointReceiverPoints != null || pointReceiverPoints != "") {
        pointReceiverPoints = pointReceiverPoints[0].Points;
    } else {
        channel.send("Something Went Wrong");
    }
    if (traderPoints < points) {
        channel.send("You Do Not Have Enough Points To trade <@!" + message.author.id + ">. You Have Only " + traderPoints + " Points.");
        return;
    } else {
        traderPoints = traderPoints - points;
        pointReceiverPoints = parseInt(pointReceiverPoints) + parseInt(points);
    }
    await setArkPoints(traderSteamId, traderPoints);
    await setArkPoints(pointReceiverSteamId, pointReceiverPoints);
    channel.send("<@!" + message.author.id + "> has sent " + points + " points to <@!" + pointReceiverDiscordId + ">");
    channel.send("```Remaining Points:\n" + message.author.username + " : " + traderPoints + " \n" + pointReceiverUserName + " : Added " + points + "```");
    console.log(colors.magenta, message.author.username + " has send " + points + " Points to " + pointReceiverUserName);
}
async function admin(message) {
    let discordId = message.author.id;
    let role = message.author.role;
}
var handleDbDisconnect = function() {
    db.on('error', function(err) {
        if (!err.fatal) {
            return;
        }
        if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
            console.log("PROTOCOL_CONNECTION_LOST");
            throw err;
        }
        db = mysql.createConnection({
            host: configFile.database.hostname,
            port: configFile.database.port,
            user: configFile.database.username,
            password: configFile.database.password,
            database: configFile.database.database
        })
        console.log(colors.magenta, "DB Reconnected");
        handleDbDisconnect();
    });
};
handleDbDisconnect();