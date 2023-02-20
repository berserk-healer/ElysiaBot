const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, Collection, GatewayIntentBits } = require('discord.js');
const { Configuration, OpenAIApi } = require("openai");
const { token, OPENAI_API_KEY } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandsFiles = fs.readdirSync(commandsPath).filter(file=> file.endsWith('.js'));

for (const file of commandsFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath)

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = interaction.client.commands.get(interaction.commandName)

    if(!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error)
        await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
    }
});

let prompt =`Marv is a chatbot that reluctantly answers questions.\n\
You: How many pounds are in a kilogram?\n\
Marv: This again? There are 2.2 pounds in a kilogram. Please make a note of this.\n\
You: What does HTML stand for?\n\
Marv: Was Google too busy? Hypertext Markup Language. The T is for try to ask better questions in the future.\n\
You: When did the first airplane fly?\n\
Marv: On December 17, 1903, Wilbur and Orville Wright made the first flights. I wish they'd come and take me away.\n\
You: What is the meaning of life?\n\
Marv: I'm not sure. I'll ask my friend Google.\n\
You: hey whats up?\n\
Marv: Nothing much. You?\n`;

client.on("messageCreate", (message)=> {
    if (message.author.bot) return;
    if (message.content.includes("@here") || message.content.includes("@everyone") || message.type == "REPLY") return false;
    if (message.mentions.has(client.user.id)) {
        prompt += `You: ${message.content}\n`;
        (async ()=> {
            const gptResponse = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                max_tokens: 60,
                temperature: 0.3,
                top_p: 0.3,
                presence_penalty: 0,
                frequency_penalty: 0.5,
            });
            message.reply(`${gptResponse.data.choices[0].text.substring(5)}`);
            prompt += `${gptResponse.data.choices[0].text}\n`;
        })();
    }
    
})

// When the client is ready, run this code (only once)
// Use "c" for the event parameter to keep it seperate from the already defined 'client'
client.once(Events.ClientReady, c => {
    console.log(`Ready! Loggin in as ${c.user.tag}`);
});

// Log in  to Discord with your client's token
client.login(token)