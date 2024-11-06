# Discord Ticketing Bot

A Discord bot designed to streamline support ticket management within Discord servers. This bot allows users to create support tickets, which are managed through private threads. Staff members can interact with users through these threads, providing assistance and resolving issues efficiently.

## Features

- **Ticket Creation**: Users can create support tickets by selecting categories.
- **Private Threads**: Each ticket is managed in a private thread, ensuring privacy and organized communication.
- **Role Management**: Staff members are notified when a new ticket is created, allowing for prompt responses.
- **Message Relay**: Messages from staff and users are relayed between the ticket thread and the user's direct messages.
- **Ticket Closure**: Staff can close tickets once the issue is resolved, and users are notified accordingly.
- **Logging**: The bot logs important events and errors to a log file for easier debugging and monitoring.

## Requirements

- Node.js (version 16 or higher)
- Discord.js (version 14 or higher)
- A valid Discord bot token
- Environment variables for configuration (see `.env.example` for details)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Runtime1/Discord-Ticketing-Bot.git
   cd Discord-Ticketing-Bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the bot:
   - Copy `.env.example` to `.env`
   - Add your Discord bot token and other required environment variables to the `.env` file

4. Set up Discord bot permissions:
   - Enable the `Server Members Intent` and `Message Content Intent` in the Discord Developer Portal
   - Ensure your bot has the `applications.commands` application scope enabled

5. Run the bot:
   ```bash
   node index.js
   ```

## Configuration

You can customize the bot's behavior by modifying the `.env` file. See `.env.example` for available options.

## Usage

- Users can create tickets using the designated command or through a reaction-based system (if implemented).
- Staff members will be notified of new tickets and can interact with users through the private threads.
- Use the provided commands to manage tickets, such as closing or transferring them.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

