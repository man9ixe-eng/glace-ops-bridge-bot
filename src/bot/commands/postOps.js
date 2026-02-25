"use strict";

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { ALLOWED_POSTER_ROLE_IDS, hasAnyRole } = require("../../config/roles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("post-ops")
    .setDescription("Post the Glace Ops Panel link button in the ops channel.")
    .setDMPermission(false),

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const guildId = process.env.GUILD_ID;
    if (!interaction.guild || interaction.guild.id !== guildId) {
      return interaction.reply({ content: "❌ This bot is locked to Glace only.", ephemeral: true });
    }

    const member = interaction.member;
    const memberRoleIds = member?.roles?.cache?.map(r => r.id) || [];

    if (!hasAnyRole(memberRoleIds, ALLOWED_POSTER_ROLE_IDS)) {
      return interaction.reply({
        content: "❌ You don’t have permission to post the Ops Panel.",
        ephemeral: true
      });
    }

    const opsChannelId = process.env.PUBLIC_OPS_CHANNEL_ID;
    const opsUrl = process.env.OPS_PORTAL_URL || "https://example.com/sign-in";

    const channel = await interaction.guild.channels.fetch(opsChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({
        content: "❌ Ops channel not found or not a text channel. Check PUBLIC_OPS_CHANNEL_ID.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🧊 Glace Ops Panel")
      .setDescription(
        [
          "Use this panel to access Glace operations tools:",
          "• Activity tracking",
          "• Logbook",
          "• Session tools",
          "",
          "Click below to sign in with Discord."
        ].join("\n")
      )
      .setFooter({ text: "Glace Hotels — Ops" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Ops Panel")
        .setStyle(ButtonStyle.Link)
        .setURL(opsUrl)
    );

    await channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: "✅ Posted the Ops Panel button.", ephemeral: true });
  }
};
