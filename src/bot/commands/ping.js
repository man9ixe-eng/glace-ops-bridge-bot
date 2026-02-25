"use strict";

const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ops-ping")
    .setDescription("Check if the Glace Ops Bridge bot is online.")
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({ content: "✅ Glace Ops Bridge is online.", ephemeral: true });
  }
};
