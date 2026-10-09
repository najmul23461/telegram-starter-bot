export function registerCommands(bot) {
  bot.command("start", (ctx) =>
    ctx.reply("🛡️ Night Guard is online!")
  );

  bot.command("help", (ctx) =>
    ctx.reply("Night Guard link protection is active.")
  );

  bot.command("ping", (ctx) =>
    ctx.reply("pong")
  );

  bot.command("id", (ctx) =>
    ctx.reply(`Chat ID: ${ctx.chat.id}\nYour ID: ${ctx.from.id}`)
  );

  bot.on("message", async (ctx) => {
    if (!["group", "supergroup"].includes(ctx.chat.type)) return;
    if (ctx.from?.is_bot) return;

    const text = [
      ctx.message.text,
      ctx.message.caption,
      ...(ctx.message.entities || []).map(e =>
        e.type === "url" ? ctx.message.text?.slice(e.offset, e.offset + e.length) : ""
      ),
      ...(ctx.message.caption_entities || []).map(e =>
        e.type === "text_link" ? e.url : ""
      )
    ].filter(Boolean).join(" ");

    const hasLink =
      /https?:\/\/\S+|www\.\S+|t\.me\/\S+|telegram\.me\/\S+/i.test(text) ||
      (ctx.message.entities || []).some(e => e.type === "text_link") ||
      (ctx.message.caption_entities || []).some(e => e.type === "text_link");

    if (!hasLink) return;

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.error("Link deletion failed:", error.message);
    }
  });
}
