
export function registerCommands(bot) {
  const messageCounts = new Map()
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

  // Welcome new members
  bot.on("message:new_chat_members", async (ctx) => {
    if (ctx.chat.type === "private") return

    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot) continue

      await ctx.reply(
        `👋 Welcome, ${member.first_name}!\nWelcome to the group! 🛡️`
      )
    }
  })

  // Moderate group text messages
  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type === "private") return
    if (!ctx.from || ctx.from.is_bot) return

    try {
      const member = await ctx.getChatMember(ctx.from.id)

      // Do not moderate group admins or the owner
      if (
        member.status === "creator" ||
        member.status === "administrator"
      ) return

      const text = ctx.message.text

      // Delete links from regular members
      const hasLink =
        /https?:\/\/\S+|t\.me\/\S+|telegram\.me\/\S+|www\.\S+/i.test(text)

      if (hasLink) {
        await ctx.deleteMessage()
        return
      }

      // Count identical messages per user in each group
      const normalized = text.trim().toLowerCase()
      if (!normalized) return

      const key = `${ctx.chat.id}:${ctx.from.id}:${normalized}`
      const now = Date.now()
      let record = messageCounts.get(key)

      if (!record || now - record.startedAt > WINDOW_MS) {
        record = { startedAt: now, count: 1 }
        messageCounts.set(key, record)
        return
      }

      record.count += 1

      // Delete repeated copies; keep the first message
      await ctx.deleteMessage()

      // Restrict after more than 5 identical messages
      if (record.count > SPAM_LIMIT) {
        await ctx.api.restrictChatMember(
          ctx.chat.id,
          ctx.from.id,
          { can_send_messages: false },
          { until_date: Math.floor(Date.now() / 1000) + 600 }
        )

        messageCounts.delete(key)

        await ctx.reply(
          `🚫 ${ctx.from.first_name} has been restricted for 10 minutes for spam.`
        )
      }
    } catch (error) {
      console.error("Night Guard moderation error:", error)
    }
  })
}
