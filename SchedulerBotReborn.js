function createDbTables() {
    if (configFile.rconlistplayer.listplayer) {
        if (configFile.database.mysqlIntegration) {
            console.log("rconlistplayer is Under Developing")
            let sql = `CREATE TABLE IF NOT EXISTS onlineplayers (
            id BIGINT(11) NOT NULL AUTO_INCREMENT,
            steamName VARCHAR(500) NOT NULL COLLATE 'utf8mb4_general_ci',
            steamId INT(11) NOT NULL,
            serverName VARCHAR(100) NOT NULL COLLATE 'utf8mb4_general_ci',
            PRIMARY KEY (id),
            UNIQUE INDEX steamId (steamId)
        );
          `;
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err);
                    return;
                } else {
                    console.log(colors.cyan, 'onlineplayers Table');
                    db.query("TRUNCATE onlineplayers");
                }
            })
        } else {
            console.log("rconlistplayer Need Database integration To work");
        }
    }
}
setTimeout(createDbTables, 300)
setInterval(currentTime, 1000);
currentTime();

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

//---------------------------------------------------------------------------------------------------------------------

const fs = require('fs');
const Rcon = require('rcon');
const { Client } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });
const data = fs.readFileSync('./config.json', 'utf-8');
const configFile = JSON.parse(data);
const mysql = require('mysql');
const colors = require("./src/colors.js");
const express = require('express')
const app = express();

const bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
app.use(jsonParser);

// const hwid = require(`node-hwid`)
// hwid({
//     hash: true, // hash id output (sha256), if false - module will return original id
// }).then(id =>
//     console.log(id) // HWID here
// )

if (configFile.discord.discordIntegration) {
    console.log(colors.yellow, "\n Discord Integration On")
    client.login(configFile.discord.discordBotToken);
} else {
    console.log(colors.yellow, "Discord Integration Off\n")
}


//-------------------------------------------------------DISCORD------------------------------------------------
var logChannel = {};
client.on('ready', () => {
    console.log("******************************************************************************************");
    console.log(colors.green, client.user.tag + " Bot Connected");
    try {
        if (client.channels.cache.get(configFile.discord.discordLogChannelId)) {
            logChannel = client.channels.cache.get(configFile.discord.discordLogChannelId)
        } else {
            logChannel.send = function() {}
        }
    } catch (err) {
        console.log(err);
    }
    console.log("******************************************************************************************");
})
client.on('message', (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(configFile.discord.prefix)) {

        message.command = (message.content
            .trim()
            .substring((configFile.discord.prefix).length)
            .trim()
            .split(" "))[0];
        message.args = (message.content
            .trim()
            .substring(configFile.discord.prefix)
            .split(/\s+/));
        message.args.shift();
        let commands = configFile.discord.commands

        if (message.command == (commands.kick).toLowerCase()) {
            kickme(message);
        }
        if (message.command == (commands.arkpoints).toLowerCase()) {
            arkPoints(message);
        }
        if ((message.command) == (commands.tradepoints).toLowerCase()) {
            tradePoints(message);
        }
        if (message.command == (commands.admin).toLowerCase()) {
            admin(message);
        }
    }
})

//-------------------------------------------------------DISCORD------------------------------------------------


//-------------------------------------------------------RCON------------------------------------------------

var rconServers = {};
for (let server in configFile.servers) {
        rconServers[server] = new Rcon(configFile.servers[server].hostname, configFile.servers[server].port, configFile.servers[server].password);
        rconServers[server].on('auth', () => {
            // clearInterval(rconServers[server].reconnect)
            console.log(colors.yellow, "\n------" + server + "-----");
            console.log(colors.green, showCurrentTime() + " RCON Connected\n");
            rconServers[server].authFail = false;
            rconServers[server].ETIMEDOUT = false;
        }).on('error', (err) => {
            // clearInterval(rconServers[server].reconnect)
            if (!rconServers[server].ETIMEDOUT && !rconServers[server].EHOSTUNREACH) {
                console.log(colors.yellow, "------" + server + "-----");
                console.log(colors.red, showCurrentTime() + err + "\n");
                rconServers[server].ETIMEDOUT = false;
                rconServers[server].EHOSTUNREACH = false;
            }
            let error = err + "";
            if (error.search('ECONNRESET') > 0 || error.search('ETIMEDOUT') > 0) {
                rconServers[server].hasAuthed = false;
            }
            if (error.search('Authentication failed') > 0) {
                console.log(colors.yellow, showCurrentTime() + "Enter Correct RCON Password For " + server + "\n");
                rconServers[server].authFail = true;
            } else {
                setTimeout(() => { 
                    try {
                        rconServers[server].connect();
                    }
                    catch (e) {
                        console.log(e);
                    }
                 }, 10000)
            }
            if (!rconServers[server].ETIMEDOUT) {
                if (error.search('ETIMEDOUT') > 0) {
                    rconServers[server].ETIMEDOUT = true
                    console.log(colors.yellow, "------" + server + "-----");
                    console.log(colors.magenta, showCurrentTime() + "Watching For Server To Come Online. Trying To Recconect." + "\n");
                }
            }
            if (error.search('Authentication failed') < 0 && error.search('EHOSTUNREACH') < 0) {
                // rconServers[server].reconnect = setInterval(() => {
                //     rconServers[server].connect();
                // }, 30000)
            }
            if (error.search('EHOSTUNREACH') > 0) {
                // setTimeout(() => { rconServers[server].connect() }, 5000)
                if (!rconServers[server].EHOSTUNREACH) {
                    rconServers[server].EHOSTUNREACH = true
                    console.log(colors.yellow, "------" + server + "-----");
                    console.log(colors.magenta, showCurrentTime() + "Watching For Server To Come Online. Trying To Recconect." + "\n");
                }
            }
        }).on('end', () => {
            console.log(colors.yellow, "------" + server + "-----");
            console.log(colors.red, showCurrentTime() + "Connection Ended");
            if (rconServers[server].authFail == false) {
                try {
                    rconServers[server].connect();
                }
                catch (e) {
                    console.log(e);
                }
            }
        }).on('response', (res) => {
            let lastCommand = rconServers[server].lastCommand;
            if (lastCommand.match(/listplayers/i)) {
                let data = res;
                data = data.split('\n');
                data.shift();
                data.pop();
                let players = [];
                for (let i = 0; data.length > i; i++) {
                    let player = data[i].substr(3);
                    player = player.split(',');
                    let steamName = player[0];
                    let steamId = player[1].trim();
                    player = {
                        "steamName": steamName,
                        "steamId": steamId,
                        "serverName": server
                    }
                    players.push(player);
                }
                if (players.length == 0) {
                    players = {
                        "steamName": "No Player Connected",
                        "steamId": "No Player Connected",
                        "serverName": server
                    };
                }
                rconServers[server].players = players;
                updatePlayerList(players);
            } else if (lastCommand.match(/KeepAlive/i)) {

            } else {
                console.log(colors.yellow, "\n\n------" + server + "-----");
                console.log(colors.yellow, `    ${showCurrentTime()}    `);
                console.log(colors.cyan, "Command Execueted : " + lastCommand);
                console.log(colors.green, res);
            }
        })
        try {
            rconServers[server].connect();
        }
        catch (e) {
            console.log(e);
        }
}

var scheduledCommands = configFile.scheduledCommands;
console.log(colors.yellow, "------------------Commands To be Performed------------------");
for (x in scheduledCommands) {
    console.log(colors.magenta, x);
}
console.log(colors.yellow, "------------------Commands To be Performed------------------");

function checkTimeForWipe() {
    for (scheduledCommand in scheduledCommands) {
        if (currentTimeInSeconds == ((scheduledCommands[scheduledCommand].time[0] * 60 * 60) + (scheduledCommands[scheduledCommand].time[1] * 60) + (scheduledCommands[scheduledCommand].time[2]))) {
            console.log("\n----------------------------------------------");
            console.log(colors.yellow, showCurrentTime() + " Command Triggerred : " + scheduledCommand);
            if (scheduledCommands[scheduledCommand].toServer == 'all') {
                let servers = [];
                for (let server in configFile.servers) {
                    servers.push(server);
                }
                sendCommandToServer(scheduledCommands[scheduledCommand].command, servers);
                if (scheduledCommands[scheduledCommand].discordNotification) {
                    let channelId = scheduledCommands[scheduledCommand].discordNotificationChannelId;
                    let channel = client.channels.cache.get(channelId);
                    channel.send(`\`\`\`CLUSTER : ${scheduledCommands[scheduledCommand].discordmessage}\`\`\``)
                }

            } else {
                sendCommandToServer(scheduledCommands[scheduledCommand].command, scheduledCommands[scheduledCommand].toServer);
                if (scheduledCommands[scheduledCommand].discordNotification) {
                    let channelId = scheduledCommands[scheduledCommand].discordNotificationChannelId;
                    let channel = client.channels.cache.get(channelId);
                    channel.send(`\`\`\`${scheduledCommands[scheduledCommand].toServer} : ${scheduledCommands[scheduledCommand].discordmessage}\`\`\``)
                }
            }
            /*if (scheduledCommandDiscordNotification[i]) {
                sendNotificationToDiscord(scheduledCommandToServer[i], scheduledCommandDiscordNotificationChannelId[i], scheduledCommandDiscordMessages[i]);
            }*/
        }
    }
}

function sendCommandToServer_res(command, toServer, callback) {
    try {
        if (typeof(toServer) == "string") {
            rconServers[toServer].send(command);
            rconServers[toServer].lastCommand = command;
            rconServers[toServer].once('response', (result) => {
                callback({}, result);
            }).once('error', (err) => {
                callback(err, null);
            })
        }
        if (typeof(toServer) == "object") {
            //let results = [];
            //let error = [];
            let results = {};
            let error = {};
            let i = 0;
            for (let x of toServer) {
                rconServers[x].send(command);
                rconServers[x].lastCommand = command;
                rconServers[x].once('response', (result) => {
                    i++;
                    /*results.push({
                        'server': x,
                        'response': result
                    })*/
                    results[x] = {
                        'response': result
                    }
                    sendResponse();
                }).on('error', (err) => {
                    i++;
                    error[x] = {
                            'error': err
                        }
                        /*error.push({
                            'server': x,
                            'error': err
                        })*/
                    sendResponse();
                })
            }

            function sendResponse() {
                if (i == toServer.length) {
                    callback(error, results)
                }
            }
        }

    } catch (error) {
        console.log(colors.red, error);
    }
}

function sendCommandToServer(command, toServer) {
    try {
        let servers = [];
        for (let server in configFile.servers) {
            servers.push(server);
        }
        if (toServer == "ALL") {
            toServer = servers;
        }
        if (typeof(toServer) == "string") {
            if (!servers.includes(toServer)) {
                console.log(colors.red, `${toServer} Have not Configured in Config file`)
                logChannel.send(`\`\`\`ERROR : ${toServer} have not configured in Config File\`\`\``);
                return;
            }
            rconServers[toServer].lastCommand = command;
            rconServers[toServer].send(command);
        }
        if (typeof(toServer) == "object") {
            for (let x of toServer) {
                rconServers[x].lastCommand = command;
                rconServers[x].send(command);
            }
        }
    } catch (error) {
        console.log(colors.red, error);
    }
}
var onlineSteamId

function updatePlayerList(players) {
    for (let i = 0; i < players.length; i++) {
        if (players[i].steamId != "No Player Connected") {
            let sql = `SELECT * FROM onlineplayers WHERE steamId = ${players[i].steamId}`
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err);
                } else if (res.length == 0) {
                    console.log(colors.blue, `
                    ------------${players[i].steamName}------------\n
                    \t Steam ID : ${players[i].steamId}\n
                    \t Server : ${players[i].serverName}\n
                    \t Status : Connected.
                    `)
                    sql = `INSERT IGNORE INTO onlineplayers (steamName,steamId,serverName) VALUES ('${players[i].steamName}',${players[i].steamId},'${players[i].serverName}')`
                    db.query(sql, (err, res) => {
                        if (err) {
                            console.log(err);
                        } else {
                            sql = `DELETE FROM onlineplayers WHERE `
                            db.query()
                        }
                    })

                }
            })
        }
    }
}

if (configFile.rconlistplayer.listplayer == true && configFile.database.mysqlIntegration && false) {
    setInterval(() => { sendCommandToServer("listplayers", 'all') }, parseFloat(configFile.rconlistplayer.checkInterval) * 60 * 1000)
}


//-------------------------------------------------------RCON------------------------------------------------






//--------------------------------------------------DATABASE------------------------------------------------

if (configFile.database.mysqlIntegration) {
    console.log(colors.yellow, "\n Database Integration On")
} else {
    console.log(colors.yellow, "Database Integration Off\n")
}

if (configFile.database.mysqlIntegration) {
    var db = mysql.createConnection({
        host: configFile.database.hostname,
        port: configFile.database.port,
        user: configFile.database.username,
        password: configFile.database.password,
        database: configFile.database.database
    })
try{
    db.connect((err) => {
        if (err) {
            if (err.code == "ER_ACCESS_DENIED_ERROR") {
                console.log(colors.yellow, "\n\n---------DATABASE--------");
                console.log(colors.red, "-----------------------------");
                console.log(colors.red, "|   Database Access Denied  |");
                console.log(colors.red, "-----------------------------");
                return;
            } else if (err.code == "ECONNREFUSED") {
                console.log(colors.yellow, "\n\n---------DATABASE--------");
                console.log(colors.red, "-----------------------------");
                console.log(colors.red, "|  Database Host NOT FOUND  |");
                console.log(colors.red, "-----------------------------");
                return;
            } else {
                console.log(err.code)
                console.log(err.sqlMessage);
                return;
            }
        }
        console.log(colors.yellow, "\n\n---------DATABASE--------");
        console.log(colors.green, "DB Connected\n\n");
    })
}
catch(e){
    console.log(e);
}

    function query(sql) {
        return new Promise((res, rej) => {
            db.query(sql, (err, result) => {
                if (err) {
                    console.log(err);
                    rej(err);
                } else {
                    res(result);
                }
            })
        })
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

}


//--------------------------------------------------DATABASE------------------------------------------------


//-----------------------------------------------DISCORD------------------------------------------------------------------

async function kickme(message) {
    try {
        let discordId = message.author.id;
        let discordUsername = message.author.tag;
        let channel = client.channels.cache.get(message.channelId)
        let steamId = await getSteamIdWithDiscordId(discordId);
        if (steamId == null || steamId == "") {
            channel.send(`You Have not Linked Steam With Discord <@!${discordId}>`);
            return;
        }
        let activeServer = await getActiveServer(steamId);
        if (activeServer == null || activeServer == "") {
            channel.send(`You Are Not Active in any Server <@!${discordId}>`);
            return;
        }
        sendCommandToServer_res(`kickplayer ${steamId}`, activeServer, (err, res) => {
            if (err) {
                console.log(err)
                channel.send(`\`\`\`Something Went Wrong\`\`\`<@!${discordId}>`)
                logChannel.send(`\`\`\`${discordUsername} Initiated kick from ${activeServer} But Something Went Wrong :\n ${err}\`\`\``)
                return;
            }
            channel.send(`\`\`\`You Are Kicked from ${activeServer}\`\`\`<@!${discordId}>`)
            logChannel.send(`\`\`\`${discordUsername} Kicked from ${activeServer}\`\`\``)
        })

    } catch (error) {
        console.log(error);
    }
}


async function arkPoints(message) {
    let discordId = message.author.id;
    let discordUsername = message.author.tag;
    let channel = client.channels.cache.get(message.channelId)
    let steamId = await getSteamIdWithDiscordId(discordId);
    if (steamId == null || steamId == "") {
        channel.send(`You Have not Linked Steam With Discord <@!${discordId}>`);
        return;
    }
    let arkPoints = await getArkPointsWithSteamId(steamId);
    if (arkPoints == null || arkPoints == "") {
        channel.send(`You Have 0 Points <@!${discordId}>`);
        return;
    }
    channel.send(`\`\`\`You Have ${arkPoints}\`\`\`<@!${discordId}>`)
}

async function tradePoints(message) {
    let traderDiscordId = message.author.id;
    let traderSteamId = await getSteamIdWithDiscordId(traderDiscordId);
    if (traderSteamId == "" || traderSteamId == null) {
        message.channel.send(`\`\`\`You Are Not Linked Steam with Discord. Link Steam With Discord before using this Command\`\`\`<@!${traderDiscordId}>`)
        return;
    }
    if (((message.mentions.toJSON()).users).length == 1 && message.args.length == 2) {
        let pointReceiverDiscordId = (message.mentions.toJSON()).users[0];
        if (message.args[1].startsWith('<@!')) {
            message.channel.send(`\`\`\`Tag Some Person or pass Steam ID  to Trade Points.\n
            Format:\n
            Method 1 : ${configFile.discord.prefix+configFile.discord.commands.tradepoints} @ycfm <1000> \n
            OR\n
            Method 2 : ${configFile.discord.prefix+configFile.discord.commands.tradepoints} <Steam ID> <1000>\n
            Leave brackets.
            \`\`\`<@!${traderDiscordId}>`)
            return;
        }
        let pointReceiverSteamId = await getSteamIdWithDiscordId(pointReceiverDiscordId);
        if (pointReceiverSteamId == null || pointReceiverDiscordId == "") {
            message.channel.send(`<@!${pointReceiverDiscordId}> Not Linked Steam with Discord. Ask <@!${pointReceiverDiscordId}> to Link Steam With Discord before using this Command <@!${traderDiscordId}>`)
            return;
        }
        let points = message.args[1]
        if (points <= 0) {
            message.channel.send(`\`\`\` I Got you, Enter Points in Natural number \`\`\``)
            return;
        }
        let lessTraderPoints = await addArkPoints(traderSteamId, -points)
        if (lessTraderPoints == true) {
            let addReceiverPoints = await addArkPoints(pointReceiverSteamId, points)
            if (addReceiverPoints == true) {
                let traderRemainingPoints = await getArkPointsWithSteamId(traderSteamId);
                let receiverRemainingPoints = await getArkPointsWithSteamId(pointReceiverSteamId);
                let pointReceiverDiscordUserName = client.users.cache.get(pointReceiverDiscordId).username
                message.channel.send(`\`\`\`${message.author.username} Has Send ${points} to ${pointReceiverDiscordUserName} \n
                ${message.author.username} : ${traderRemainingPoints} points Remaining \n
                ${pointReceiverDiscordUserName} : Added ${points}
                \`\`\``)
                logChannel.send(`\`\`\`${message.author.username} Has Send ${points} to ${pointReceiverDiscordUserName} \n
                ${message.author.username} : ${traderRemainingPoints} points Remaining\n
                ${pointReceiverDiscordUserName} : ${receiverRemainingPoints} points Remaining
                \`\`\``)
                console.log(colors.magenta, `${message.author.username}(${traderSteamId}) Has Send ${points} Points to ${pointReceiverDiscordUserName}(${pointReceiverSteamId})`)
            }
        } else {
            message.channel.send(lessTraderPoints);
        }

    } else if (((message.mentions.toJSON()).users).length > 1) {
        message.channel.send(`Tag Only one Person to Trade Points <@!${traderDiscordId}>`)
    } else if (message.args.length == 2 && message.args[0].length == 17) {
        let pointReceiverSteamId = message.args[0]
        let points = message.args[1]
        let sql = `SELECT * FROM arkshopplayers WHERE SteamId = '${pointReceiverSteamId}'`
        db.query(sql, async(err, res) => {
            if (err) {
                console.log(err)
                return;
            }
            if (res.length == 0) {
                message.channel.send(`\`\`\`Steam ID : ${pointReceiverSteamId} \n Wrong Steam Id Or ${pointReceiverSteamId} Steam Player never player in ${configFile.clusterName} Server\`\`\``)
                return;
            }
            let traderDiscordId = message.author.id;
            let traderSteamId = await getSteamIdWithDiscordId(traderDiscordId);
            if (traderSteamId == "" || traderSteamId == null) {
                message.channel.send(`\`\`\`You Are Not Linked Steam with Discord. Link Steam With Discord before using this Command\`\`\`<@!${traderDiscordId}>`)
                return;
            }
            if (points <= 0) {
                message.channel.send(`\`\`\` I Got you, Enter Points in Natural number \`\`\``)
                return;
            }
            let lessTraderPoints = await addArkPoints(traderSteamId, -points)
            if (lessTraderPoints == true) {
                let addReceiverPoints = await addArkPoints(pointReceiverSteamId, points)
                if (addReceiverPoints == true) {
                    let traderRemainingPoints = await getArkPointsWithSteamId(traderSteamId);
                    let receiverRemainingPoints = await getArkPointsWithSteamId(pointReceiverSteamId);
                    message.channel.send(`\`\`\`${message.author.username} Has Send ${points} to ${pointReceiverSteamId} \n
                    ${message.author.username} : ${traderRemainingPoints} points Remaining \n
                    ${pointReceiverSteamId} : Added ${points}
                    \`\`\``)
                    logChannel.send(`\`\`\`${message.author.username} Has Send ${points} to ${pointReceiverSteamId} \n
                    ${message.author.username} : ${traderRemainingPoints} points Remaining\n
                    ${pointReceiverSteamId} : ${receiverRemainingPoints} points Remaining
                    \`\`\``)
                    console.log(colors.magenta, `${message.author.username}(${traderSteamId}) Has Send ${points} Points to ${pointReceiverSteamId}`)
                }
            } else {
                message.channel.send(lessTraderPoints);
            }
        })

    } else {
        message.channel.send(`\`\`\`Tag Some Person or pass Steam ID  to Trade Points.\n
        Format:\n
        Method 1 : ${configFile.discord.prefix+configFile.discord.commands.tradepoints} @ycfm <1000> \n
        OR\n
        Method 2 : ${configFile.discord.prefix+configFile.discord.commands.tradepoints} <Steam ID> <1000>\n
        Leave brackets.
        \`\`\`<@!${traderDiscordId}>`);
    }
}



function getSteamIdWithDiscordId(discordId) {
    return new Promise((resolve) => {
        try {
            sql = `SELECT * FROM discordsteamlinks WHERE DiscordId = '${discordId}'`;
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err)
                    return;
                }
                if (res.length > 0) {
                    resolve(res[0].SteamId);
                } else {
                    resolve();
                }
            })
        } catch (err) {
            console.log(err);
        }
    })
}

function getActiveServer(steamId) {
    return new Promise((resolve) => {
        try {
            if (configFile.rconlistplayer.listplayer && false) {

            } else if (configFile.kalscrosschat) {
                sql = `SELECT * FROM currentplayers WHERE SteamId = '${steamId}'`;
                db.query(sql, (err, res) => {
                    if (err) {
                        console.log(err)
                        return;
                    }
                    if (res.length > 0) {
                        resolve(res[0].ServerKey);
                    } else {
                        resolve();
                    }
                })
            } else {
                console.log("rconlistplayer OR kalscrosschat Should Be Active to use this feature")
                resolve();
            }
        } catch (err) {
            console.log(err);
        }
    })
}

function getArkPointsWithSteamId(steamId) {
    let sql = `SELECT * FROM arkshopplayers WHERE SteamId = '${steamId}'`;
    return new Promise((resolve) => {
        try {
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err)
                    return;
                }
                if (res.length > 0) {
                    resolve(res[0].Points)
                } else {
                    resolve()
                }
            })
        } catch (err) {
            console.log(err);
        }
    })
}

function setArkPoints(steamId, point) {
    try {
        return new Promise((resolve) => {
            let points = parseInt(point);
            let sql = `UPDATE arkshopplayers SET Points = ${points} WHERE SteamId = '${steamId}'`
            console.log(sql);
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err)
                    resolve()
                } else {
                    if (res.affectedRows) {
                        resolve(true)
                    } else {
                        resolve();
                    }
                }
            })
        })
    } catch (e) {
        console.log(e)
    }
}
async function addArkPoints(steamId, point) {
    try {
        let oldPoint = await getArkPointsWithSteamId(steamId);
        return new Promise((resolve) => {
            let points = parseInt(point) + oldPoint;
            if (points < 0) {
                resolve('Insufficient Points')
                return;
            }
            let sql = `UPDATE arkshopplayers SET Points = ${points} WHERE SteamId = '${steamId}'`
            db.query(sql, (err, res) => {
                if (err) {
                    console.log(err)
                    resolve()
                } else {
                    if (res.affectedRows) {
                        resolve(true)
                    } else {
                        resolve();
                    }
                }
            })
        })
    } catch (e) {
        console.log(e)
    }
}
//-----------------------------------------------DISCORD----------------------------------------------------------------

//-----------------------------------------------WEB API----------------------------------------------------------------
if (configFile.httpapi.webIntegration) {
    app.listen(configFile.httpapi.port, () => {
        console.log(colors.yellow, "\n\n---------- WEB API INTEGRETION ----------");
        console.log(colors.green, "\tHTTP API Integration ON ");
        console.log(colors.green, `\tListening Request On ${configFile.httpapi.port}`);
        console.log(colors.green, `\tREQUEST Type : ${configFile.httpapi.requestMethod}`);
        console.log(colors.yellow, "---------- WEB API INTEGRETION ----------\n\n");
        app.use(
            express.urlencoded({
                extended: true
            })
        )

        app.use(express.json())
    })
    app.post('/sendrconcommand', (req, res) => {

        if (req.body.username == null || req.body.password == null || req.body.command == null || req.body.server == null) {
            res.status(400).send("Need username, password variable, command variable and server variable");
            console.log(colors.red, `Bad Request Send through Web Api`)
            return;
        }
        if (req.body.username == configFile.httpapi.username && req.body.password == configFile.httpapi.password) {
            try {
                sendCommandToServer_res(req.body.command, req.body.server, (err, response) => {
                    if (err.length > 0 ) {
                        console.log(colors.red,err);
                    }
                    res.status(200).send({"response":response,"error":err});
                    let r = {
                        Command : req.body.command,
                        Server : req.body.server,
                        Response : response
                    }
                    console.log(colors.green,"Response Send For The Request From API");
                    console.log(r);
                })
            } catch (e) {
                console.log(colors.red, e);
                res.status(401).send(e)
            }
        } else {
            res.sendStatus(401);
        }
    })
} else {
    console.log(colors.yellow, "\n\n---------- WEB API INTEGRETION ----------");
    console.log(colors.cyan, "\tHTTP API Integration OFF ");
    console.log(colors.yellow, "---------- WEB API INTEGRETION ----------\n\n");
}




//-----------------------------------------------WEB API----------------------------------------------------------------


setTimeout(() => {
    console.log(colors.yellow,"Join Discord channel : https://discord.gg/ZSMyHH9rxj");
}, 10000);




for (let server in configFile.servers){
    setInterval(()=>{
        try{
            rconServers[server].lastCommand = "KeepAlive"
            rconServers[server].send("KeepAlive");
        }
        catch(e){
            console.log(e);
        }
    },(1000 * 60 * configFile.KeepAliveInterval))
}

setTimeout(()=>{
console.log(colors.yellow,"SchedulerBot-V2.4.0");
},10000)


// setTimeout(()=>{
//     // throw("Dummy Error");
// },1000)