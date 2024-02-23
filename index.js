require('dotenv').config();
const { Client, GatewayIntentBits, MessageEmbed } = require('discord.js');

const { google } = require('googleapis');
const axios = require('axios');
const express = require('express');
const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent
    ]
})

// Define your application ID
const APPLICATION_ID = process.env.APPLICATION_ID;

// Define your Discord bot token

// Define your Google API key
const googapi = process.env.GOOGLEAPI;

// Define your Google Sheets spreadsheet ID
const spread = process.env.SPREADS;
const discord_api = axios.create({
    baseURL: 'https://discord.com/api/',
    timeout: 3000,
    headers: {
        "Authorization": `Bot ${process.env.TOKEN}`
    }
});

const sheets = google.sheets({
    version: 'v4',
    auth: googapi,
});


const slashCommands = [
    {
        name: 'blacklist',
        description: 'This will blacklist a user on the database',
        options: [
            {
                name: 'username',
                description: 'The username to blacklist',
                type: 'USER',
                required: true,
            },
            {
                name: 'SwitchTo',
                description: 'What you are switching their blacklist state to',
                type: 'STRING',
                required: true,
                choices: [
                    { name: 'Yes', value: 'yes' },
                    { name: 'No', value: 'no' }
                ]
            },
        ],
    },
    {
        name: 'checkuser',
        description: 'This will give all the data on a specific person',
        options: [
            {
                name: 'username',
                description: 'The username to check',
                type: 'STRING',
                required: true,
            },
        ],
    },
    {
        name: 'connectdiscord',
        description: 'Whenever someone joins it will connect their discord with their database var',
        options: [
            {
                name: 'username',
                description: 'The username to connect',
                type: 'USER',
                required: true,
            },
            {
                name: 'vrchat_user',
                description: 'The VRChat username',
                type: 'STRING',
                required: true,
            },
        ],
    }
];
async function findRowIndexByDiscordUsername(username) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spread,
        range: 'Sheet1!F:F',
    });

    const rows = response.data.values;
    if (rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === username) {
                return i + 1;
            }
        }
    }
    return null;
}

async function findRowIndexByUsername(username) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spread,
        range: 'Sheet1!A:A',
    });

    const rows = response.data.values;
    if (rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === username) {
                return i + 1;
            }
        }
    }
    return null;
}

async function connectDiscordHandler(interaction) {
    const discordUsername = interaction.member.user.username;
    const exampleValue = interaction.options.getString('username');

    const rowIndex = await findRowIndexByUsername(exampleValue);
    if (rowIndex) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: spread,
            range: `Sheet1!F${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[discordUsername]],
            },
        });

        await interaction.reply(`${discordUsername} is now connected`);
    } else {
        await interaction.reply(`Failed to connect ${discordUsername}`);
    }
}

async function blacklistHandler(interaction) {
    const username = interaction.options.getString('username').replace('@', '');
    const bool = interaction.options.getString('SwitchTo');

    const rowIndex = await findRowIndexByDiscordUsername(username);

    if (rowIndex) {
        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId: spread,
                range: `Sheet1!K${rowIndex}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[bool]],
                },
            });
            await interaction.reply(`User ${username} has been successfully blacklisted.`);
        } catch (error) {
            console.error('Error updating spreadsheet:', error);
            await interaction.reply('An error occurred while updating the blacklist status.');
        }
    } else {
        await interaction.reply(`User ${username} not found.`);
    }
}

async function checkUserHandler(interaction) {
    const username = interaction.options.getString('username').replace('@', '');
    const rowIndex = await findRowIndexByDiscordUsername(username);

    if (rowIndex) {
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spread,
                range: `Sheet1!A${rowIndex}:R${rowIndex}`,
            });
            const rowData = response.data.values[0];
            const embed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('User Information')
                .addFields(
                    { name: 'Username', value: rowData[0] || 'N/A' },
                    { name: 'Birthday', value: rowData[1] || 'N/A' },
                    { name: 'P_OR_A', value: rowData[2] || 'N/A' },
                    { name: 'Twitter User', value: rowData[3] || 'N/A' },
                    { name: 'Instagram User', value: rowData[4] || 'N/A' },
                    { name: 'Discord User', value: rowData[5] || 'N/A' },
                    { name: 'Reddit User', value: rowData[6] || 'N/A' },
                    { name: 'Youtube User', value: rowData[7] || 'N/A' },
                    { name: 'Email', value: rowData[8] || 'N/A' },
                    { name: 'VIP', value: rowData[9] || 'N/A' },
                    { name: 'Blacklisted', value: rowData[10] || 'N/A' },
                    { name: 'Full Age Verif', value: rowData[11] || 'N/A' },
                    { name: 'Priv Room Usage', value: rowData[12] || 'N/A' },
                    { name: 'Priv Room Access', value: rowData[13] || 'N/A' },
                    { name: 'Warnings', value: rowData[14] || 'N/A' },
                    { name: 'Ext. Notes', value: rowData[15] || 'N/A' },
                    { name: 'Date Added', value: rowData[16] || 'N/A' },
                    { name: 'Days Since Join', value: rowData[17] || 'N/A' }
                );
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error retrieving user information:', error);
            await interaction.reply('An error occurred while retrieving user information.');
        }
    } else {
        await interaction.reply('Username not found.');
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'connectdiscord') {
        await connectDiscordHandler(interaction);
    } else if (interaction.commandName === 'blacklist') {
        await blacklistHandler(interaction);
    } else if (interaction.commandName === 'checkuser') {
        await checkUserHandler(interaction);
    }
});

// Register slash commands
async function registerCommands() {
    try {
        const guildId = process.env.GUILD_ID; // Replace with your guild ID
        const commands = await client.guilds.cache.get(guildId)?.commands.set(slashCommands);
        console.log('Slash commands registered:', commands.map(command => command.name).join(', '));
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

app.post('/register-commands', async (req, res) => {
    

    try {
        const response = await discord_api.put(`/applications/${APPLICATION_ID}/commands`, slashCommands);
        console.log(response.data);
        return res.send('Slash commands registered successfully');
    } catch (error) {
        console.error('Error registering slash commands:', error.response?.data || error.message);
        return res.status(500).send('Error registering slash commands');
    }
});

app.get('/', async (req, res) => {
    return res.send('We chill broski')
})

app.listen(8999, () => {
    console.log('Server is running on port 8999');
    await registerCommands();
});

client.login(process.env.TOKEN);
