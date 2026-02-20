const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  MessageFlags
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const config = require("./config");

// Create client with intents including message content
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ================= MESSAGE COMMANDS =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  console.log(`Message received: ${message.content}`); // debug line

  // ===== Ticket Panel Command =====
  if (message.content === "!ticketpanel") {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setThumbnail("https://media.discordapp.net/attachments/1246204157363355750/1474178544048275738/907DBC00-1FCE-40C2-BCD4-8F97393E3F5A.png?ex=69999001&is=69983e81&hm=294c6a1d4666bb86ab55443b6cabbe47525484616a8a3daeb61a802175357725&=&format=webp&quality=lossless&width=968&height=968.png")
      .setTitle("ꜱᴇʟᴀɴɪᴋ ᴀᴋʏᴋʟᴏꜰᴏʀʜᴛᴀ")
      .setDescription("`Πατήστε το κουμπί για να ανοίξετε ticket.`");

    const button = new ButtonBuilder()
      .setCustomId("start_ticket")
      .setLabel("🎫")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({ embeds: [embed], components: [row] });
  }

  // ===== Link Panel Command =====
  if (message.content === "!linkpanel") {
    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setImage("https://media.discordapp.net/attachments/1246204157363355750/1474178544048275738/907DBC00-1FCE-40C2-BCD4-8F97393E3F5A.png?ex=69999001&is=69983e81&hm=294c6a1d4666bb86ab55443b6cabbe47525484616a8a3daeb61a802175357725&=&format=webp&quality=lossless&width=968&height=968.png")
      .setTitle("ꜱᴇʟᴀɴɪᴋ ᴀᴋʏᴋʟᴏꜰᴏʀʜᴛᴀ ᴀᴘᴘʟɪᴄᴀᴛɪᴏɴꜱ")
      .setDescription("`Παρακάτω μπορείτε να επιλέξετε και να μπειτε στο Staff Team μας!`");

    const button = new ButtonBuilder()
      .setLabel("📥")
      .setStyle(ButtonStyle.Link)
      .setURL("https://forms.gle/SH5DxwLjCzhqkQui6"); // <-- Replace with your URL

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {

  // ===== OPEN DROPDOWN =====
  if (interaction.isButton() && interaction.customId === "start_ticket") {

    const existing = interaction.guild.channels.cache.find(
      c => c.name.startsWith("ticket-") && c.topic === interaction.user.id
    );

    if (existing) {
      return interaction.reply({
        content: "❌ You already have an open ticket.",
        flags: MessageFlags.Ephemeral
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_reason")
      .setPlaceholder("Select ticket reason")
      .addOptions([
        { label: "📞Support", value: "📞Support" },
        { label: "📛Staff Complaint", value: "📛Staff Complaint" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    interaction.reply({
      content: "Select the reason:",
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }

  // ===== CREATE TICKET =====
  if (interaction.isStringSelectMenu() && interaction.customId === "select_reason") {

    const reason = interaction.values[0];

    // Count existing tickets in the category
    const ticketChannels = interaction.guild.channels.cache.filter(
      c => c.parentId === config.categoryId && c.name.startsWith("ticket-")
    );
    const ticketNumber = ticketChannels.size + 1;
    const ticketName = `ticket-${ticketNumber.toString().padStart(3, "0")}`;

    const channel = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: interaction.user.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: config.staffRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle(`🎫 Ticket ${ticketName}`)
      .addFields(
        { name: "User", value: `<@${interaction.user.id}>` },
        { name: "Reason", value: reason },
        { name: "Status", value: "Open" }
      );

    const claimBtn = new ButtonBuilder()
      .setCustomId("claim_ticket")
      .setLabel("👮 Claim")
      .setStyle(ButtonStyle.Secondary);

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

    channel.send({
      content: `<@&${config.staffRoleId}>`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      flags: MessageFlags.Ephemeral
    });
  }

  // ===== CLAIM TICKET =====
  if (interaction.isButton() && interaction.customId === "claim_ticket") {

    if (!interaction.member.roles.cache.has(config.staffRoleId)) {
      return interaction.reply({ content: "❌ Staff only.", flags: MessageFlags.Ephemeral });
    }

    const ticketEmbed = interaction.message.embeds[0];
    const embed = EmbedBuilder.from(ticketEmbed)
      .spliceFields(2, 1, { name: "Status", value: `Claimed by ${interaction.user}` });

    await interaction.message.edit({ embeds: [embed] });

    // Lock other staff
    await interaction.channel.permissionOverwrites.edit(config.staffRoleId, {
      SendMessages: false
    });
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      SendMessages: true
    });

    interaction.reply({ content: `👮 Ticket claimed by ${interaction.user}`, flags: MessageFlags.Ephemeral });
  }

  // ===== CLOSE TICKET =====
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.member.roles.cache.has(config.staffRoleId)) {
      return interaction.reply({ content: "❌ Staff only.", flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: "📝 Creating transcript...", flags: MessageFlags.Ephemeral });

    const transcript = await transcripts.createTranscript(interaction.channel);

    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);

    await logChannel.send({
      content: `📁 Ticket closed by ${interaction.user}`,
      files: [transcript]
    });

    setTimeout(() => {
      interaction.channel.delete();
    }, 5000);
  }

});

client.login(config.token);
