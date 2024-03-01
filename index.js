require('dotenv').config();
const { JWT } = require('google-auth-library');
const { ActionRowBuilder, ButtonBuilder, REST,Routes, Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
// Load service account credentials from the JSON key file
const express = require('express');
const { json } = require('express');
const app = express();


const axios = require('axios');
const discord_api = axios.create({
    baseURL: 'https://discord.com/api/',
    timeout: 3000,
    headers: {
        "Authorization": `Bot ${process.env.TOKEN}`
    }
});

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
];

app.use(express.json());

const serviceAccountAuth = new JWT({
    email: process.env.client_email,
    key: process.env.private_key,
        scopes: SCOPES,
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions
    ],
});



// Initialize the GoogleSpreadsheet object
const doc = new GoogleSpreadsheet(process.env.SPREADS, serviceAccountAuth);


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const slashCommands = [
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
                name: 'switch_to',
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
                type: 3,
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
    },
    {
        name: 'connectdiscordcustomer',
        description: 'Whenever someone joins it will connect their discord with our bots',
        options: [
            {
                name: 'username',
                description: 'Your discord Username',
                type: 6,
                required: true,
            },
            {
                name: 'vrchat_user',
                description: 'Your VRChat username',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'investigate',
        description: 'Investigate to make sure everyone is over 18!',
        
    },
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
function calculateAge(today, birthday) {
    var age = today.getFullYear() - birthday.getFullYear();

    if (today.getMonth() < birthday.getMonth() ||
        (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())) {
        age--;
    }

    return age;
}
async function connectDiscordHandler(interaction) {
    try {
        const discordUsername = interaction.member.user.username;
        const exampleValue = interaction.options.getString('vrchat_user');

        // Load the Google Spreadsheet using service account credentials
        
        
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Find the row index by exampleValue (assuming it's in column A)
        const rows = await sheet.getRows();
        let rowIndex = null;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i]._rawData[0] === exampleValue) {
                rowIndex = i + 1; // Adjust for 0-based index
                break;
            }
        }

        if (rowIndex) {
            // Update the corresponding cell in column F with the discordUsername
            await sheet.loadCells(`F${rowIndex}`);
            const cell = sheet.getCellByA1(`F${rowIndex}`);
            cell.value = discordUsername;
            await sheet.saveUpdatedCells();

            // Reply to the interaction
            await interaction.reply({ content:`${discordUsername} is now connected`, ephemeral: true });

            // Add role to the user
            const guild = await interaction.client.guilds.fetch('1210096146823774298'); // Fetch the guild
            const member = await guild.members.fetch({ user: interaction.member.id, force: true }); // Fetch the member
            const role = await guild.roles.fetch('1210743116534124624'); // Fetch the role
            await member.roles.add(role); // Add the role to the member
        } else {
        await interaction.reply({ content: `Failed to connect ${discordUsername}`, ephemeral: true });
        }
    } catch (error) {
        console.error('Error in connectDiscordHandler:', error);
        await interaction.reply('An error occurred while connecting Discord user.');
    }
}

const questions = [
    { text: "Did you find any indications on the user's social media profiles suggesting they are of legal age?", weight: 2 },
    { text: "Have you observed any interactions or conversations indicating the user's maturity level or age?", weight: 3 },
    { text: "Did you come across any official documents or records confirming the user's identity or age?", weight: 1 },
    { text: "Have you found evidence of the user's involvement in communities or forums where members are typically of legal age (18+ communities)?", weight: 2 },
    { text: "Did the information you gathered from various sources align consistently with an indication of the user being 18 and over?", weight: 2 }
];


function createStatusEmbed(username, score) {
    let status = '';
    if (score >= 5) {
        status = 'Over 18';
    } else {
        status = 'Possibly under 18';
    }

    // Quips for each score
    const quips = [
        "Not enough information to determine age. Or they are FOR SURE A MINOR",
        "Definitely under 18.",
        "Likely under 18.",
        "Possibly under 18.",
        "Possibly under 18.",
        "Possibly over 18.",
        "Likely over 18.",
        "Definitely over 18.",
        "Definitely over 18.",
        "Definitely over 18."
    ];

    const quip = quips[score - 1];

    return new EmbedBuilder()
        .setTitle(`${username}'s 18+ Status`)
        .setDescription(`${username} has scored a ${score}.`)
        .addFields({ name: 'Status', value: status },
            { name: 'Rating', value: quip.toString() });
}
async function investigateUsers(interaction) {
    try {

        interaction.reply({ content: "Okay! I just sent you a dm.", time: 99992000, ephemeral: true });
        // Load the Google Spreadsheet using service account credentials
        
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Fetch all rows
        const rows = await sheet.getRows();

        // Filter rows based on column S and Discord username
        const filteredRows = rows.filter(row => row.get("Investigated").toLowerCase() === 'no');
        if (filteredRows.length < 1) {
            const dmChannel = await interaction.user.createDM();
            const message = await dmChannel.send({ content: "It seems there is nothing left to be investigated. Come back later!", time: 99993000 });
            return;
        }
        // Iterate through filtered rows
        for (const row of filteredRows) {
            const discordUsername = interaction.user.username;
            const discordId = interaction.user.id;

            // Send direct message to the user with embed and buttons
            const embed = new EmbedBuilder()
                .setTitle('Investigation')
                .setDescription(`We are going to go through every user who hasn't been investigated. I will provide user information and you will give me things to input after you are done inputting information. Once you're ready, click the button below.`);

            const rowButton = new ButtonBuilder()
                .setCustomId('ready')
                .setLabel('Ready')
                .setStyle(1);

            const rowActionRow = new ActionRowBuilder().addComponents(rowButton);

            const dmChannel = await interaction.user.createDM();
            const message = await dmChannel.send({ embeds: [embed], components: [rowActionRow] });

            // Delete the message after 30 seconds
            setTimeout(() => {
                message.delete();
            }, 30000);

            // Wait for user to click the "Ready" button
            const filter = i => i.customId === 'ready' && i.user.id === discordId;
            const collected = await dmChannel.awaitMessageComponent({ filter, time: 999960000 });



            // If the user clicks "Ready"
            if (collected.customId === 'ready') {
                collected.reply({ content: "Great! I will be going through all the the columns of " + row.get("Username") + ". If there is any missing information I will ask you to reply with your input for the field.", time: 999930000, ephemeral: true });
                // Iterate through columns and prompt for input


                setTimeout(() => {
                   
                }, 6000);

                

                
                const userData = {};
                for (const [column, columnName] of Object.entries(columnMapping)) {
                    if (row.get(columnName) === '') {
                        const [userInput, ifna] = await promptUserInput(discordId, columnName);
                        if (ifna) {
                            userData[columnName] = row.get(columnName);
                        } else {
                            userData[columnName] = userInput;
                        }
                    } else {
                        userData[columnName] = row.get(columnName);
                    }
                }

                // Update the row with userData
                for (const [column, value] of Object.entries(userData)) {
                    row.set(column, value);
                }

                
                // Provide summary to the user
                const summary = buildUserEmbed(row);
                await dmChannel.send({ embeds: [summary] });

                // Prompt user to investigate
                const investigationEmbed = new EmbedBuilder()
                    .setTitle('Investigating')
                    .setDescription("Investigating time! Please look through the user's socials and profile on the Discord server. Once you're ready to proceed, click the button below.");

                const investigationButton = new ButtonBuilder()
                    .setCustomId('investigationReady')
                    .setLabel('Ready')
                    .setStyle(1);

                const investigationActionRow = new ActionRowBuilder().addComponents(investigationButton);

                const investigationMessage = await dmChannel.send({ embeds: [investigationEmbed], components: [investigationActionRow] });

                

                // Wait for user to click the "Ready" button
                const investigationFilter = i => i.customId === 'investigationReady' && i.user.id === discordId;
                const investigationCollected = await dmChannel.awaitMessageComponent({ filter: investigationFilter, time: 999960000 });
                investigationCollected.reply({ content: 'Great! We will now perform a quiz about this patron.', time: 999930000, ephemeral: true });
                // If the user clicks "Ready" for investigation
                if (investigationCollected.customId === 'investigationReady') {
                    // Perform 18 and over quiz
                    const score = await performQuiz(discordId);

                    // Update Full Age Verif with the calculated score
                    row.set('Full Age Verif', score);
                    row.set('Investigated',"Yes")
                    await row.save();
                    const sembed = createStatusEmbed(row.get('Username'), score)
                    dmChannel.send({
                        embeds: [sembed]
                    })

                }
            }
        }
        const dmCchannel = await interaction.user.createDM();
        const message = await dmCchannel.send({ content: "Okay All done investigating! Come back later for more!", time: 99993000 });
    } catch (error) {
        console.error('Error in investigateUsers:', error);
        const dmchannel = await interaction.user.createDM();
        dmchannel.send('Error in investigateUsers:' + error)
    }
}

// Helper functions

async function sendDirectMessage(id, message) {
    try {
        const user = await client.users.fetch(id);
        await user.send(message);
    } catch (error) {
        console.error('Error sending direct message:', error);
    }
}

async function askQuestion(username, question, questionCount) {
    try {
        
        // Fetch the user object based on the username
        const user = await client.users.fetch(username);

        // Create action row with Yes and No buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setStyle(3),
                new ButtonBuilder()
                    .setCustomId('no')
                    .setLabel('No')
                    .setStyle(4)
            );

        // Send the question with buttons
        const message = await user.dmChannel.send({ embeds: [createQuestionEmbed(question, questionCount)], components: [row],time: 9999300000 });

        // Await button interaction from the user
        const filter = i => ['yes', 'no'].includes(i.customId) && i.user.id === username;
        const collected = await message.awaitMessageComponent({ filter, time: 999960000 });

        // Reply with an ephemeral message indicating the user's response
        await collected.reply({ content: `You answered ${collected.customId}.`, ephemeral: true });

        // Return true if the user answered 'yes', false otherwise
        return collected.customId === 'yes';
    } catch (error) {
        console.error('Error waiting for response:', error);
        return false;
    }
}

function createQuestionEmbed(question, questionCount) {
    return new EmbedBuilder()
        .setTitle(`Question ${questionCount}`)
        .setDescription(question);
}

async function promptUserInput(userid, columnName) {
    const user = await client.users.fetch(userid);

    // Create action row with N/A button
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('na')
                .setLabel('N/A')
                .setStyle(2) // Use 'SECONDARY' style for additional actions
        );

    // Create an embed with the prompt message
    const embed = new EmbedBuilder()
        .setTitle('Missing Information')
        .setDescription(`Hm it seems like we are missing information on the user's ${columnName}. Please provide input for ${columnName}: (Say N/A if you don't know what to put or don't have that information)`);

    await user.dmChannel.send({
        embeds: [embed],
        components: [row],
        time: 999930000
    });

   
    const filter = (message) => {
        return message.author.id === user.id;
    };

    const collector = user.dmChannel.createMessageCollector({ filter, time: 999960000 });

    return new Promise((resolve, reject) => {
        collector.on('collect', async message => {
            if (message.content.toLowerCase() === 'n/a') {
                resolve(['N/A', true]);
                collector.stop();
            } else {
                
                resolve([message.content, false]);
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                reject('No response received within the time limit.');
            }
        });
    });
}










// Function to perform the quiz and calculate the score
async function performQuiz(username) {
    let totalScore = 0;
    let questioncount = 1;
    // Ask each question and record the response
    for (const question of questions) {

        const response = await askQuestion(username, question.text,questioncount);
        questioncount++;
        // If the response is 'yes', add the weight to the total score
        if (response) {
            totalScore += question.weight;
        }
    }

    // Return the total score
    return totalScore;
}

// Mapping of column names to column letters
const columnMapping = {
    A: 'Username',
    B: 'Birthday',
    C: 'P_OR_A',
    D: 'Twitter User',
    E: 'Instagram User',
    G: 'Reddit User',
    H: 'Youtube User',
    I: 'Email',
    K: 'Blacklisted',
    M: 'Priv Room Usage',
    N: 'Priv Room Access',
    O: 'Warnings',
    P: 'Ext.Notes'
};

async function connectDiscordHandlerCustomer(interaction) {
    try {
        const discordUsername = interaction.member.user.username;
        const exampleValue = interaction.options.getString('vrchat_user').toLowerCase(); // Convert to lowercase

        // Load the Google Spreadsheet using service account credentials
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Check if any row already has the same Discord username
        const rows = await sheet.getRows();
        const existingRow = rows.find(row => row['Discord User'] === discordUsername);

        if (existingRow) {
            // If the Discord username already exists, add the role and send a message
            const guild = await interaction.client.guilds.fetch('1210096146823774298'); // Fetch the guild
            const member = await guild.members.fetch({ user: interaction.member.id, force: true }); // Fetch the member
            const role = await guild.roles.fetch('1210743116534124624'); // Fetch the role
            await member.roles.add(role); // Add the role to the member

            await interaction.client.channels.cache.get('1210123653992288306').send(`${discordUsername} is already connected`);
            return; // Exit the function early
        }

        // If the Discord username doesn't exist, proceed to ask for the birthday input

        // Parse the birthday and calculate the age
        const birthdayStr = await promptForBirthday(interaction);
        const { year, month, day } = parseBirthday(birthdayStr);
        const age = calculateAge(new Date(), new Date(year, month - 1, day));

        // Format the birthday
        const formattedBirthday = `${month}/${day}/${year} (${age} yrs old)`;

        // Add a new row with the VRChat username, birthday, and Discord username
        await sheet.addRow({
            Username: exampleValue,
            Birthday: formattedBirthday,
            "Discord User": discordUsername
        });

        await interaction.client.channels.cache.get('1210123653992288306').send(`${discordUsername} is now connected`);

        // Check if the calculated age is under 18
        if (age < 18) {
            await requestManualAssistance(interaction, discordUsername, age, year, month, day);
        } else {
            // Add role to the user
            const guild = await interaction.client.guilds.fetch('1210096146823774298'); // Fetch the guild
            const member = await guild.members.fetch({ user: interaction.member.id, force: true }); // Fetch the member
            const role = await guild.roles.fetch('1210743116534124624'); // Fetch the role
            await member.roles.add(role); // Add the role to the member
        }
    } catch (error) {
        console.error('Error in connectDiscordHandlerCustomer:', error);
        await interaction.client.channels.cache.get('1210123653992288306').send('An error occurred while connecting Discord user.');
    }
}

async function blacklistHandler(interaction) {
    try {
        const username = interaction.options.getUser('username');
        const bool = interaction.options.getBoolean('switch_to');

        // Load the Google Spreadsheet using service account credentials
        
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Find the row index by Discord username
        const rows = await sheet.getRows();
        let rowIndex = null;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].get('Discord User').toString().toLowerCase() === username.toString().toLowerCase()) {
                rowIndex = i + 2; // Adjust for 0-based index and header row
                break;
            }
        }

        if (rowIndex) {
            // Update the corresponding cell in column K with the blacklist status
            await sheet.loadCells(`K${rowIndex}`);
            const cell = sheet.getCellByA1(`K${rowIndex}`);
            cell.value = bool;
            await sheet.saveUpdatedCells();

            await interaction.reply({ content: `User ${username} has been successfully blacklisted.`, ephemeral: true });
        } else {
        await interaction.reply({content: `User ${username} not found.`, ephemeral: true });
        }
    } catch (error) {
        console.error('Error in blacklistHandler:', error);
        await interaction.reply({ content: 'An error occurred while updating the blacklist status.', ephemeral: true });
    }
}

async function checkUserHandler(interaction) {
    try {
        const username = interaction.options.getString('username');

        // Load the Google Spreadsheet using service account credentials
        
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Find the row index by Discord username
        const rows = await sheet.getRows();
        let userRow = null;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].get('Username').toString().toLowerCase() === username.toLowerCase()) {
                userRow = rows[i];
                break;
            }
        }

        if (userRow) {
            // Build and send embed with user information
            const embed = buildUserEmbed(userRow);
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({content:'Username not found.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error in checkUserHandler:', error);
        await interaction.reply({ content: 'An error occurred while retrieving user information.', ephemeral: true });
    }
}

// Helper functions
async function promptForBirthday(interaction) {
    await interaction.reply({ content: 'Please respond with your birthday in the format "year/month/day" to proceed.', ephemeral: true });

    const birthdayResponse = await interaction.channel.awaitMessages({ max: 1, time: 999960000, errors: ['time'] });
    return birthdayResponse.first().content.trim();
}

function parseBirthday(birthdayStr) {
    const [year, month, day] = birthdayStr.split('/');
    console.log('Year:', year);
    console.log('Month:', month);
    console.log('Day:', day);
    return { year, month, day };
}

function calculateAge(today, birthday) {
    let age = today.getFullYear() - birthday.getFullYear();

    if (today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())) {
        age--;
    }

    return age;
}

async function requestManualAssistance(interaction, discordUsername, age, year,month,day) {
    const user = interaction.member.user;
    const assistanceChannel = interaction.client.channels.cache.get('1210123653992288306'); // Fetch the assistance channel

    const manualAssistanceMessage = `<@1210117292894191656> Please manually assist ${user}.`;
    await assistanceChannel.send(manualAssistanceMessage);

    const daysUntil18 = Math.ceil((new Date(new Date().getFullYear() + 18, month - 1, day) - new Date(year, month - 1, day)) / (1000 * 60 * 60 * 24));
    const embed = buildManualAssistanceEmbed(user.username, age, daysUntil18);

    await assistanceChannel.send({ embeds: [embed] });
}

function buildUserEmbed(userData) {
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('User Information')
        .addFields(
            { name: `${userData.get('Username')}'s Birthday`, value: userData.get('Birthday') || 'N/A' },
            { name: 'Platform', value: `They are on the ${userData.get('P_OR_A')} platform` || 'N/A' },
            { name: 'Twitter', value: `Twitter: ${userData.get('Twitter User')}` || 'N/A' },
            { name: 'Instagram', value: `Instagram: ${userData.get('Instagram User')}` || 'N/A' },
            { name: 'Discord', value: `Discord: ${userData.get('Discord User')}` || 'N/A' },
            { name: 'Reddit', value: `Reddit: ${userData.get('Reddit User')}` || 'N/A' },
            { name: 'Youtube', value: `Youtube: ${userData.get('Youtube Channel')}` || 'N/A' },
            { name: 'Email', value: `Email: ${userData.get('Email')}` || 'N/A' },
            { name: 'VIP Status', value: `VIP: ${userData.get('VIP')}` || 'N/A' },
            { name: 'Blacklisted', value: `Blacklisted: ${userData.get('Blacklisted')}` || 'N/A' },
            { name: 'Full Age Verification', value: `Full Age Verification: ${userData.get('Full Age Verif')}` || 'N/A' },
            { name: 'Private Room Usage', value: `Private Room Usage: ${userData.get('Priv Room Usage')}` || 'N/A' },
            { name: 'Private Room Access', value: `Private Room Access: ${userData.get('Priv Room Access')}` || 'N/A' },
            { name: 'Warnings', value: `Warnings: ${userData.get('Warnings')}` || 'N/A' },
            { name: 'Notes', value: `Notes: ${userData.get('Ext.Notes')}` || 'N/A' },
            { name: 'Date Added', value: `Date Added: ${userData.get('dateAdded')}` || 'N/A' },
            { name: 'Days Since Joining', value: `Days Since Joining: ${userData.get('DaysSinceJoin')}` || 'N/A' }
        );

    return embed;
}

function buildManualAssistanceEmbed(username, age, daysUntil18) {
    // Build and return the embed for manual assistance
    // Example:
    return new EmbedBuilder()
        .setTitle(username)
        .setDescription(`This user needs manual assistance regarding their birthday. They are ${age} years old and not set to turn 18 for ${daysUntil18} days.`);
}




// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
// Register slash commands
async function registerCommands() {
    try {
        const guildId = process.env.GUILD_ID; // Replace with your guild ID
        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), {
            body: slashCommands
        }
        );
        console.log('Slash commands registered:');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

client.on('ready', () => {
    console.log('${client.user.tag} has logged in')
    registerCommands();
});

client.on('interactionCreate', interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'connectdiscord') {
        connectDiscordHandler(interaction);
    } else if (interaction.commandName === 'blacklist') {
        blacklistHandler(interaction);
    } else if (interaction.commandName === 'checkuser') {
        checkUserHandler(interaction);
    } else if (interaction.commandName === 'connectdiscordcustomer') {
        connectDiscordHandlerCustomer(interaction);
    } else if (interaction.commandName === 'investigate') {
        investigateUsers(interaction);
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.login(process.env.TOKEN);
