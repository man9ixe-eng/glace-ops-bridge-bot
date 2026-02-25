"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection
} = require("discord.js");

const { computeTier } = require("./config/roles");

function env(name, required = true) {
  const v = process.env[name];
  if (!v && required) throw new Error(`[ENV] Missing ${name}`);
  return v || "";
}

const DISCORD_TOKEN = env("DISCORD_TOKEN");
const CLIENT_ID = env("CLIENT_ID");
const GUILD_ID = env("GUILD_ID");
const OPS_SHARED_SECRET = env("OPS_SHARED_SECRET");
const PORT = Number(process.env.PORT || 10000);

// ===== Discord client =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

function loadCommands() {
  const commandsDir = path.join(__dirname, "bot", "commands");
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith(".js"));

  const jsonForRegister = [];

  for (const file of files) {
    const full = path.join(commandsDir, file);
    const mod = require(full);

    const hasData = !!mod?.data?.name && typeof mod.data.toJSON === "function";
    const hasExec = typeof mod?.execute === "function";

    if (!hasData || !hasExec) {
      console.error(
        `[OPS BRIDGE] ❌ Command file invalid: ${file} | data=${hasData} execute=${hasExec}`
      );
      continue;
    }

    client.commands.set(mod.data.name, mod);
    jsonForRegister.push(mod.data.toJSON());
  }

  if (jsonForRegister.length === 0) {
    throw new Error("[OPS BRIDGE] No valid command modules loaded. Check src/bot/commands/*.js exports.");
  }

  return jsonForRegister;
}

async function registerCommands(body) {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  console.log(`[OPS BRIDGE] ✅ Registered ${body.length} slash commands to guild ${GUILD_ID}`);
}

// Hard-lock: leave any server not Glace
client.on("guildCreate", async (guild) => {
  try {
    if (guild.id !== GUILD_ID) {
      console.log(`[OPS BRIDGE] 🔒 Joined non-Glace guild (${guild.id}). Leaving immediately.`);
      await guild.leave();
    }
  } catch (e) {
    console.error("[OPS BRIDGE] guildCreate leave error:", e);
  }
});

client.once("ready", async () => {
  console.log(`[OPS BRIDGE] ✅ Logged in as ${client.user.tag}`);

  const body = loadCommands();
  await registerCommands(body);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild || interaction.guild.id !== GUILD_ID) {
      return interaction.reply({ content: "❌ This bot is locked to Glace only.", ephemeral: true });
    }

    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) {
      return interaction.reply({ content: "❌ Command not found (bot not synced).", ephemeral: true });
    }

    await cmd.execute(interaction);
  } catch (err) {
    console.error("[OPS BRIDGE] interaction error:", err);
    if (interaction.isRepliable()) {
      const msg = "❌ Something errored. Try again or contact Corporate.";
      if (interaction.deferred || interaction.replied) {
        interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      } else {
        interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
});

// ===== Internal API =====
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/internal/roles", async (req, res) => {
  try {
    const auth = req.header("authorization") || "";
    if (auth !== `Bearer ${OPS_SHARED_SECRET}`) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const userId = String(req.query.userId || "").trim();
    if (!userId) return res.status(400).json({ ok: false, error: "missing userId" });

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) return res.status(404).json({ ok: false, error: "member_not_found" });

    const roleIds = member.roles.cache.map(r => r.id);
    const tier = computeTier(roleIds);

    return res.json({ ok: true, userId, guildId: GUILD_ID, roleIds, tier });
  } catch (e) {
    console.error("[OPS BRIDGE] /internal/roles error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

app.listen(PORT, () => console.log(`[OPS BRIDGE] 🌐 API listening on :${PORT}`));

client.login(DISCORD_TOKEN).catch(err => {
  console.error("[OPS BRIDGE] Login failed:", err);
  process.exit(1);
});
