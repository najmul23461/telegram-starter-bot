
export function registerCommands(bot) {
  const spamTracker = new Map()
  const WINDOW_MS = 60_000
  const SPAM_LIMIT = 5

  bot.command("start", (ctx) =>
    ctx.reply("🛡️ Night Guard is online!")
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "🛡️ Night Guard commands:\n" +
      "/start - Start bot\n" +
      "/help - Show help\n" +
      "/ping - Check bot\n" +
      "/id - Show IDs\n\n" +
      "Features: Welcome, link deletion, anti-spam."
    )
  )

  bot.command("ping", (ctx) => ctx.reply("pong"))

  bot.command("id", (ctx) =>
    ctx.reply(
      `Chat ID: ${ctx.chat.id}\nYour ID: ${ctx.from?.id ?? "unknown"}`
    )
  )

  // Welcome new members
  bot.on("message:new_chat_members", async (ctx) => {
    if (ctx.chat.type === "private") return

    for (const user of ctx.message.new_chat_members) {
      if (user.is_bot) continue

      await ctx.reply(
        `👋 Welcome, ${user.first_name}! Welcome to the group. 🛡️`
      )
    }
  })

  // Link deletion and anti-spam
  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type === "private") return
    if (!ctx.from || ctx.from.is_bot) return

    try {
      const member = await ctx.getChatMember(ctx.from.id)

      // Do not moderate admins or the group owner
      if (
        member.status === "creator" ||
        member.status === "administrator"
      ) {
        return
      }

      const text = ctx.message.text.trim()
      if (!text) return

      // Delete links posted by regular members
      const hasLink =
        /(https?:\/\/\S+|www\.\S+|t\.me\/\S+|telegram\.me\/\S+)/i.test(text)

      if (hasLink) {
        await ctx.deleteMessage()
        return
      }

      // Count identical messages from the same user in the same group
      const normalized = text.toLowerCase().replace(/\s+/g, " ")
      const key = `${ctx.chat.id}:${ctx.from.id}:${normalized}`
      const now = Date.now()
      let record = spamTracker.get(key)

      // First message starts the 60-second window
      if (!record || now - record.startedAt > WINDOW_MS) {
        spamTracker.set(key, { startedAt: now, count: 1 })
        return
      }

      record.count += 1

      // Delete every repeated copy; keep the first message
      await ctx.deleteMessage()

      // On the 6th identical message, restrict for 10 minutes
      if (record.count > SPAM_LIMIT) {
        await ctx.api.restrictChatMember(
          ctx.chat.id,
          ctx.from.id,
          { can_send_messages: false },
          { until_date: Math.floor(Date.now() / 1000) + 600 }
        )

        spamTracker.delete(key)

        await ctx.reply(
          `🚫 User ${ctx.from.id} restricted for 10 minutes for spam.`
        )
      }
    } catch (err) {
      console.error("Night Guard moderation error:", err)
    }
  })
}
