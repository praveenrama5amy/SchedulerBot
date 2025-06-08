const { Client } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });
var discord = {};


discord.status = false;

discord.loginDiscordBot = async function(token) {
    return new Promise((resolve, reject) => {
        client.login(token);
        client.on('ready', () => {
            console.log("Bot Connected");
        })
    })
}
module.exports = discord;