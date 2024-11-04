const startTime = Date.now();

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

console.log('Script started');

// Set a timeout to exit the process if it takes too long
const exitTimeout = setTimeout(() => {
    console.error('Script execution timed out after 180 seconds');
    process.exit(1);
}, 180000);

let client, fs, util, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType;

try {
    console.log('Attempting to load modules');
    const { Client, GatewayIntentBits, Partials } = require('discord.js');
    ({ EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js'));
    fs = require('fs');
    util = require('util');
    console.log('All modules loaded successfully');

    // Create a log file stream
    const logFile = fs.createWriteStream('bot.log', { flags: 'a' });
    // Override console.log and console.error
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = function() {
        const message = util.format.apply(null, arguments);
        logFile.write(message + '\n');
        originalConsoleLog.call(console, `[${Date.now() - startTime}ms]`, message);
    };
    console.error = function() {
        const message = util.format.apply(null, arguments);
        logFile.write('ERROR: ' + message + '\n');
        originalConsoleError.call(console, `[${Date.now() - startTime}ms]`, 'ERROR:', message);
    };

    console.log('Creating Discord client');
    client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });
  console.log('Client created successfully');
} catch (error) {
  console.error('Error during initialization:', error);
  process.exit(1);
}

console.log('Modules loaded and client created');

// Load environment variables
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

if (!TOKEN || !CHANNEL_ID || !STAFF_ROLE_ID) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

console.log(`BOT_TOKEN length: ${TOKEN.length}`);
console.log(`BOT_TOKEN starts with: ${TOKEN.substring(0, 5)}...`);
console.log(`BOT_TOKEN ends with: ...${TOKEN.substring(TOKEN.length - 5)}`);

const CATEGORIES = ['Technical Support', 'HWID Reset', 'Selling'];

let tickets = {};
let sentMessages = new Set();

function sendUniqueMessage(user, content) {
  const messageKey = `${user.id}:${content}`;
  if (!sentMessages.has(messageKey)) {
    user.send(content)
      .then(message => {
        sentMessages.add(messageKey);
        message.react('✅');
      })
      .catch(console.error);
  }
}

console.log('Checking for tickets.json');
if (fs.existsSync('tickets.json')) {
  console.log('tickets.json found, parsing...');
  try {
    tickets = JSON.parse(fs.readFileSync('tickets.json', 'utf8'));
    console.log('tickets.json parsed successfully');
  } catch (error) {
    console.error('Error parsing tickets.json:', error);
  }
} else {
  console.log('tickets.json not found');
}

client.once('ready', async () => {
  console.log('Bot is ready!');
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);
  
  // Clear the timeout
  clearTimeout(exitTimeout);
  
  // Register slash commands
  const commands = [
    {
      name: 'ticket',
      description: 'Create a new support ticket',
    },
  ];

  await client.application.commands.set(commands);
  console.log('Slash commands registered');
  
  // Log the registered slash commands
  console.log(`Slash commands: ${client.application.commands.cache.map(cmd => cmd.name).join(', ')}`);
});

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

client.on('error', error => {
	console.error('The WebSocket encountered an error:', error);
});

client.on('warn', info => {
	console.log('Warning:', info);
});

client.on('debug', info => {
	console.log('Debug:', info);
});

console.log('Attempting to log in...');
client.on('shardReady', (shardId) => {
  console.log(`Shard ${shardId} is ready`);
});

client.on('shardError', (error, shardId) => {
  console.error(`Shard ${shardId} encountered an error:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
  console.log(`Shard ${shardId} disconnected:`, event);
});

client.on('shardReconnecting', (shardId) => {
  console.log(`Shard ${shardId} is reconnecting`);
});

client.on('shardResume', (shardId, replayedEvents) => {
  console.log(`Shard ${shardId} resumed. Replayed ${replayedEvents} events.`);
});

// Test function removed

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  if (interaction.commandName === 'ticket') {
    const embed = new EmbedBuilder()
      .setTitle('Create a Ticket')
      .setDescription('Please select a category for your ticket:')
      .setColor('#00FF00');

    const row = new ActionRowBuilder();

    CATEGORIES.forEach(category => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`create_ticket_${category}`)
          .setLabel(category)
          .setStyle(ButtonStyle.Primary)
      );
    });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  } else if (interaction.customId.startsWith('create_ticket_')) {
    const category = interaction.customId.replace('create_ticket_', '');

    // Defer the reply to allow time for processing
    await interaction.deferUpdate();

    try {
      const channel = await interaction.guild.channels.fetch(CHANNEL_ID);
      console.log(`Fetched channel: ${channel.name} (ID: ${channel.id}), Type: ${channel.type}`);

      // Check if the channel is a text channel
      if (channel.type !== ChannelType.GuildText) {
        await interaction.followUp({ embeds: [new EmbedBuilder().setDescription('Error: The specified channel is not a text channel.').setColor('#FF0000')], ephemeral: true });
        return;
      }

      // Check if the bot has necessary permissions
      const permissions = channel.permissionsFor(interaction.guild.members.me);
      if (!permissions.has('ManageThreads') || !permissions.has('SendMessages')) {
        await interaction.followUp({ embeds: [new EmbedBuilder().setDescription('Error: The bot does not have the necessary permissions to create threads or send messages in the specified channel.').setColor('#FF0000')], ephemeral: true });
        return;
      }

      // Create the thread
      const thread = await channel.threads.create({
        name: `${category} - ${interaction.user.username}`,
        autoArchiveDuration: 60, // Auto-archive after 60 minutes
        type: ChannelType.PrivateThread,
      });

      console.log(`Created thread: ${thread.name} (ID: ${thread.id})`);

      const ticketId = Date.now().toString();
      tickets[ticketId] = {
        userId: interaction.user.id,
        threadId: thread.id,
        category: category,
        status: 'open',
      };

      fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2));

      const threadEmbed = new EmbedBuilder()
        .setTitle('New Ticket')
        .setDescription(`A new ticket has been created in the ${category} category.`)
        .setColor('#00FF00')
        .addFields(
          { name: 'User', value: interaction.user.username },
          { name: 'Category', value: category }
        );

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      const staffMessage = await thread.send({ embeds: [threadEmbed], components: [row] });
      await staffMessage.react('✅');

      // Notify staff members
      const staffRole = interaction.guild.roles.cache.get(STAFF_ROLE_ID);
      if (staffRole) {
        await thread.send({ content: `${staffRole} A new ticket has been created and requires your attention.` });
      }

      const userEmbed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`Your ticket in the ${category} category has been created. Please reply to this message to communicate with the staff.`)
        .setColor('#00FF00');

      sendUniqueMessage(interaction.user, { embeds: [userEmbed] });

      await interaction.followUp({ content: 'Ticket created successfully! Please check your DMs.', ephemeral: true });

      // Set up message relay
      const filter = m => !m.author.bot;
      const threadCollector = thread.createMessageCollector({ filter });
      const dmCollector = (await interaction.user.createDM()).createMessageCollector({ filter });

      threadCollector.on('collect', async (message) => {
        try {
          const relayEmbed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content)
            .setColor('#0099ff')
            .setTimestamp();
          const files = await handleAttachments(message);
          const sentMessage = await sendUniqueMessage(interaction.user, { embeds: [relayEmbed], files });
          if (sentMessage) await sentMessage.react('✅');
          await message.react('✅');
        } catch (error) {
          console.error('Error relaying message from thread to user:', error);
        }
      });

      dmCollector.on('collect', async (message) => {
        try {
          const relayEmbed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content)
            .setColor('#00ff00')
            .setTimestamp();
          const files = await handleAttachments(message);
          const sentMessage = await thread.send({ embeds: [relayEmbed], files });
          await sentMessage.react('✅');
          await message.react('✅');
        } catch (error) {
          console.error('Error relaying message from user to thread:', error);
        }
      });
    } catch (error) {
      console.error('Error creating ticket thread:', error);
      await interaction.followUp({ embeds: [new EmbedBuilder().setDescription('Error: Unable to create the ticket thread. Please contact an administrator.').setColor('#FF0000')], ephemeral: true });
    }
  } else if (interaction.customId === 'close_ticket') {
    // Handle closing the ticket
    const thread = interaction.channel;
    if (thread.isThread()) {
      const ticketId = Object.keys(tickets).find(key => tickets[key].threadId === thread.id);
      if (ticketId) {
        tickets[ticketId].status = 'closed';
        fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2));

        const embed = new EmbedBuilder()
          .setTitle('Ticket Closed')
          .setDescription('This ticket has been closed.')
          .setColor('#FF0000');

        await interaction.reply({ embeds: [embed] });

        // Send a message to the user
        const user = await client.users.fetch(tickets[ticketId].userId);
        const closureEmbed = new EmbedBuilder()
          .setTitle('Ticket Closed')
          .setDescription(`Your ticket in the ${tickets[ticketId].category} category has been closed by a staff member. Thank you for using our support system!`)
          .setColor('#FF0000')
          .setTimestamp();
        const sentMessage = await sendUniqueMessage(user, { embeds: [closureEmbed] });
        if (sentMessage) await sentMessage.react('✅');

        // Archive the thread
        await thread.setArchived(true);
      } else {
        await interaction.reply({ content: 'Error: This thread is not associated with a ticket.', ephemeral: true });
      }
    } else {
      await interaction.reply({ content: 'Error: This command can only be used in a ticket thread.', ephemeral: true });
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if the message is in a ticket thread
  const ticketId = Object.keys(tickets).find(key => tickets[key].threadId === message.channel.id);
  if (ticketId) {
    const ticket = tickets[ticketId];
    if (ticket.status === 'open') {
      // Relay the message to the user's DM if it's from staff
      if (message.member && message.member.roles.cache.has(STAFF_ROLE_ID)) {
        const user = await client.users.fetch(ticket.userId);
        const relayEmbed = new EmbedBuilder()
          .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
          .setDescription(message.content)
          .setColor('#0099ff')
          .setTimestamp();
        const files = await handleAttachments(message);
        const sentMessage = await sendUniqueMessage(user, { embeds: [relayEmbed], files });
        if (sentMessage) await sentMessage.react('✅');
        await message.react('✅');
      } else if (message.channel.type === ChannelType.DM) {
        // Relay user's DM to the ticket thread
        const thread = await client.channels.fetch(ticket.threadId);
        const relayEmbed = new EmbedBuilder()
          .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
          .setDescription(message.content)
          .setColor('#00ff00')
          .setTimestamp();
        const files = await handleAttachments(message);
        const sentMessage = await thread.send({ embeds: [relayEmbed], files });
        await sentMessage.react('✅');
        await message.react('✅');
      }
    }
  }
});

// Function to send a unique message
async function sendUniqueMessage(user, content) {
  const messageKey = `${user.id}:${JSON.stringify(content)}`;
  if (!sentMessages.has(messageKey)) {
    let sentMessage;
    if (content.files) {
      // If there are attachments, send them along with the message
      sentMessage = await user.send({ ...content, files: content.files });
    } else {
      sentMessage = await user.send(content);
    }
    sentMessages.add(messageKey);
    return sentMessage;
  }
  return null;
}

// Helper function to handle attachments
async function handleAttachments(message) {
  const attachments = Array.from(message.attachments.values());
  if (attachments.length > 0) {
    return attachments.map(attachment => ({
      attachment: attachment.url,
      name: attachment.name
    }));
  }
  return null;
}

client.login(TOKEN).catch(error => {
  console.error('Failed to log in:', error);
  process.exit(1);
});
