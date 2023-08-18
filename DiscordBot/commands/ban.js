const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");
const tokens = require("../../model/tokens.js");
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "Config", "config.json")).toString());

module.exports = {
    commandInfo: {
        name: "ban",
        description: "Ban a user from the backend by their username.",
        options: [
            {
                name: "username",
                description: "Target username.",
                required: true,
                type: 3 // string
            }
        ]
    },
    execute: async (interaction) => {
        let msg = "";
        
        if (!config.moderators.includes(interaction.user.id)) return interaction.reply({ content: "You do not have moderator permissions.", ephemeral: true });
    
        const { options } = interaction;
        const targetUser = await User.findOne({ username_lower: (options.get("username").value).toLowerCase() });
    
        if (!targetUser) msg = "The account username you entered does not exist.";
        else if (targetUser.banned == true) msg = "This account is already banned.";
    
        if (targetUser && targetUser.banned != true) {
            await targetUser.updateOne({ $set: { banned: true } });

            var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true } });

            if (jwtTokens.accessTokens.find(i => i.accountId == targetUser.accountId)) {
                let index = jwtTokens.accessTokens.findIndex(i => i.accountId == targetUser.accountId);
                await jwtTokens.updateOne({ [`accessTokens.${index}`]: [] });
                await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
            }

            if (jwtTokens.refreshTokens.find(i => i.accountId == targetUser.accountId)) {
                let index = jwtTokens.refreshTokens.findIndex(i => i.accountId == targetUser.accountId);
                await jwtTokens.updateOne({ [`refreshTokens.${index}`]: [] });
                await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
            }

            if (global.Clients.find(client => client.accountId == targetUser.accountId)) {
                var ClientData = global.Clients.find(client => client.accountId == targetUser.accountId);

                ClientData.client.close();
            }

            msg = `Successfully banned ${targetUser.username}`;
        }
    
        let embed = new MessageEmbed()
        .setAuthor({ name: "Moderation", iconURL: "https://cdn.discordapp.com/attachments/927739901540188200/1020458073019666492/unknown.png" })
        .setFields(
            { name: "Message", value: msg },
        )
        .setTimestamp()

        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}