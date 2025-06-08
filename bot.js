colors = {
    red: "\x1b[31m%s\x1b[0m",
    green: "\x1b[32m%s\x1b[0m",
    yellow: "\x1b[33m%s\x1b[0m",
    blue: "\x1b[34m%s\x1b[0m",
    magenta: "\x1b[35m%s\x1b[0m",
    cyan: "\x1b[36m%s\x1b[0m",
};
const prefix = "$asm";
const botToken = "OTQxMzIyNDkyNzEzMjQyNjg0.YgUQ4w.E7p945tNV2zGxBFKdX38teIZuV8";
const { Client, Message, MessageAttachment, MessageEmbed } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });
console.log(colors.yellow, "\n-----------------------------------------------------------------------------");
console.log("Bot Started");

var mysql = require('mysql');
var conn = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "praveen",
    password: "HWi4FI5xbkKC3T8K",
    database: "domination"
})
conn.connect(function(err) {
    if (err) throw err;
    console.log("connected");
})
sql = "SELECT * FROM discordsteamlinks WHERE discordId = '644845627527921674'";
conn.query(sql, function(err, result) {
    if (err) throw err;
    let steamId = result[0].SteamId;
    console.log(steamId);
})
console.log(colors.yellow, "\n-----------------------------------------------------------------------------");
client.on('ready', function() {
    console.log(colors.green, client.user.tag + " Has Logged in");
    console.log(colors.yellow, "\n-----------------------------------------------------------------------------");
}).on('message', function(message) {
    if (prefix == message.content.substring(0, prefix.length) && (message.content).match('tribe-r')) {
        console.log('hello');
    }
}).on('message', function(message) {
    if (message.content == "$kickme") {
        console.log(message.author);
    }
})

client.login(botToken);