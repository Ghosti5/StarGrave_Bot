
// const { clientId, guildId, token, publicKey } = require('./config.json');
require('dotenv').config()
const APPLICATION_ID = process.env.APPLICATION_ID 
const TOKEN = process.env.TOKEN 
const PUBLIC_KEY = process.env.PUBLIC_KEY || 'not set'
const GUILD_ID = process.env.GUILD_ID 

const googapi = process.env.GOOGLEAPI
const spread = process.env.SPREADS


const axios = require('axios')
const express = require('express');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const { google } = require('googleapis');
const sheets = google.sheets({
    version: 'v4',
    auth: googapi, // Replace with your API key or OAuth 2.0 credentials
});


const app = express();
// app.use(bodyParser.json());

const discord_api = axios.create({
  baseURL: 'https://discord.com/api/',
  timeout: 3000,
  headers: {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
	"Access-Control-Allow-Headers": "Authorization",
	"Authorization": `Bot ${TOKEN}`
  }
});


// Function to find a row index based on Discord username
async function findRowIndexByDiscordUsername(username) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spread,
        range: 'Sheet1!F:F', // Assuming Discord usernames are in column F
    });

    const rows = response.data.values;
    if (rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === username) {
                return i + 1; // Adding 1 because row indices are 1-based in Sheets API
            }
        }
    }
    return null; // Username not found
}

async function findRowIndexByUsername(username) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spread,
        range: 'Sheet1!A:A', // Assuming Discord usernames are in column F
    });

    const rows = response.data.values;
    if (rows) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === username) {
                return i + 1; // Adding 1 because row indices are 1-based in Sheets API
            }
        }
    }
    return null; // Username not found
}

// Command handler for /connectdiscord
async function connectDiscordHandler(interaction) {
    const discordUsername = interaction.member.user.username;
    const exampleValue = interaction.data.options[0].value;

    const rowIndex = await findRowIndexByUsername(exampleValue);
    if (rowIndex) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: spread,
            range: `Sheet1!F${rowIndex}`, // Update column F of the corresponding row
            valueInputOption: 'RAW',
            requestBody: {
                values: [[discordUsername]],
            },
        });

        // Sending reply to the user in the server
        await interaction.reply(`${discordUsername} is now connected`);

        // Send appropriate response
    } else {
        // Sending reply to the user in the server
        await interaction.reply(`We seemed to have failed to connect ${discordUsername}`);

        // Handle case where username is not found
    }
}

async function blacklistHandler(interaction) {
    const username = interaction.data.options[0].value.replace('@', '');
    const bool = interaction.data.options[1].value; // Assuming the value is 'yes' or 'no'
    const rowIndex = await findRowIndexByDiscordUsername(username);

    if (rowIndex) {
        try {
            // Update column K with the provided boolean value
            await sheets.spreadsheets.values.update({
                spreadsheetId: spread,
                range: `Sheet1!K${rowIndex}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[bool]],
                },
            });
            // Send success message
            interaction.send(`User ${username} has been successfully blacklisted.`);
        } catch (error) {
            // Handle error
            console.error('Error updating spreadsheet:', error);
            interaction.send('An error occurred while updating the blacklist status.');
        }
    } else {
        // Handle case where username is not found
        interaction.send(`User ${username} not found.`);
    }
}

async function checkUserHandler(interaction) {
    const username = interaction.data.options[0].value.replace('@', '');
    const rowIndex = await findRowIndexByDiscordUsername(username);

    if (rowIndex) {
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: 'YOUR_SPREADSHEET_ID',
                range: `Sheet1!A${rowIndex}:R${rowIndex}`, // Range for the entire row
            });
            const rowData = response.data.values[0]; // Assuming we only have one row of data
            const embed = new MessageEmbed()
                .setColor('#ff0000') // Red color
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
            interaction.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error retrieving user information:', error);
            // Handle error
        }
    } else {
        interaction.send('Username not found.');
    }
}


app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        console.log(interaction.data.name);

        if (interaction.data.name === 'connectdiscord') {
            await connectDiscordHandler(interaction);
        }

        if (interaction.data.name === 'blacklist') {
            await blacklistHandler(interaction);
        }

        if (interaction.data.name === 'checkuser') {
            await checkUserHandler(interaction);
        }
    }

});



app.get('/register_commands', async (req, res) => {
    let slash_commands = [
        {
            name: 'blacklist',
            description: 'This will blacklist a user on the database',
            options: [
                {
                    name: 'username',
                    description: 'The username to blacklist',
                    type: 6,
                    required: true,
                },
                {
                    name: 'SwitchTo',
                    description: 'What you are switching their blacklist state to',
                    type: 5,
                    required: true,
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
                    type: 6,
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
                    type: 6,
                    required: true,
                },
                {
                    name: 'vrchat_user',
                    description: 'The VRChat username',
                    type: 3,
                    required: true,
                },
            ],
        }
    ];

    try {
        // api docs - https://discord.com/developers/docs/interactions/application-commands#create-global-application-command
        let discord_response = await discord_api.put(
            `/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
            slash_commands
        );
        console.log(discord_response.data);
        return res.send('commands have been registered');
    } catch (e) {
        console.error(e.code);
        console.error(e.response?.data);
        return res.send(`${e.code} error from discord`);
    }
});



app.get('/', async (req,res) =>{
  return res.send('Follow documentation ')
})


app.listen(8999, () => {

})

