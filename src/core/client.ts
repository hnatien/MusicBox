import { Client, Collection, GatewayIntentBits } from 'discord.js';
import type { Command } from '../models/command.js';

export class MusicClient extends Client {
    public commands: Collection<string, Command> = new Collection();

    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
        });
    }
}
