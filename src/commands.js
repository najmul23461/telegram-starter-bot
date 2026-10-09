export function registerCommands(bot) {
  const spamTracker = new Map()
  const WINDOW_MS = 60_000
  const SPAM_LIMIT = 5

  bot.command("start", (ctx) =>
    ctx.reply("🛡️ Night Guard is online!")
  )

  bot.command("help", (ctx) =>
    ctx.reply(
      "Night Guard commands:\n" +
      "/start - Start bot\n" +
      "/help - Help\n" +
      "/ping - Check bot\n" +
      "/id - Show IDs"
    )
  )

  bot.command("ping", (ctx) => ctx.reply("pong"))

  bot.command("id", (ctx) =>
    ctx.reply(
      `Chat id: ${ctx.chat.id}\nYour id: ${ctx.from?.id ?? "unknown"}`
    )
  )

  // Welcome new human members
  bot.on("message:new_chat_members", async (ctx) => {
    if (ctx.chat.type === "private") return

    for (const user of ctx.message.new_chat_members) {
      if (user.is_bot) continue

      await ctx.reply(
        `👋 Welcome, ${user.first_name}! Welcome to the group.`
      )
    }
  })

  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type === "private") return
    if (!ctx.from || ctx.from.is_bot) return

    try {
      const member = await ctx.getChatMember(ctx.from.id)

      // Ignore admins and group owner
      if (
        member.status === "creator" ||
        member.status === "administrator"
      ) return

      const text = ctx.message.text.trim()
      if (!text) return

      // Delete links from regular members
      const hasLink =
        /https?:\/\/\S+|www\.\S+|t\.me\/\S+|telegram\.me\/\S+/i.test(text)

      if (hasLink) {
        await ctx.deleteMessage()
        return
      }

      // Detect repeated identical messages within 60 seconds
      const normalized = text.toLowerCase().replace(/\s+/g, " ")
      const key = `${ctx.chat.id}:${ctx.from.id}:${normalized}`
      const now = Date.now()
      let record = spamTracker.get(key)

      if (!record || now - record.startedAt > WINDOW_MS) {
        record = { startedAt: now, count: 1 }
        spamTracker.set(key, record)
        return
      }

      record.count += 1

      // Delete each repeated copy; keep the first message
      await ctx.deleteMessage()

      if (record.count > SPAM_LIMIT) {
        await ctx.api.restrictChatMember(
          ctx.chat.id,
          ctx.from.id,
          { can_send_messages: false },
          { until_date: Math.floor(Date.now() / 1000) + 600 }
        )

        spamTracker.delete(key)
      }
    } catch (err) {
      console.error("Night Guard moderation error:", err)
    }
  })
}
