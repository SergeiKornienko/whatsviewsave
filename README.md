# WhatsView

A fast, private viewer for **exported WhatsApp chats**. Drop in your exported `.zip`
and read your conversation back in a clean, WhatsApp-style interface — complete with
images, videos, voice notes, documents, and stickers.

**100% local.** Everything runs in your browser. Your chat never gets uploaded to a
server — there are no servers, no accounts, and no tracking.

🔗 **Live:** [whatsview.vercel.app](https://whatsview.vercel.app/)

## Features

- 🔒 **Private by design** — the file is parsed entirely in your browser; nothing leaves your device
- ⚡ **Handles big exports** — virtualized rendering + on-demand media extraction stay smooth on chats with tens of thousands of messages
- 🖼️ **All media types** — inline images, videos, voice notes, stickers, and a viewer for documents/PDFs
- 🔍 **Search** — find any message and jump between matches
- 📊 **Stats** — messages per person, busiest hour and day, media counts, and date range
- 🙋 **"You" picker** — pick which participant is you so your messages line up on the right (auto-detected for 1:1 chats)
- 🌍 **Format-tolerant parser** — Android & iOS exports, day/month order auto-detected, 12h/24h clocks, edited/deleted markers
- 🆓 Free and open source

## How to export a chat from WhatsApp

1. Open the chat in WhatsApp
2. Tap **⋮ → More → Export chat**
3. Choose **Include media** (or without media — both work)
4. Save the `.zip`, then drag it onto WhatsView

## Tech stack

React + Vite, Tailwind CSS, [JSZip](https://stuk.github.io/jszip/) for in-browser
archive reading, and [`@tanstack/react-virtual`](https://tanstack.com/virtual) for
virtualized message rendering.

## Run locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # lint
```

## License

MIT
