import { ActivityType, Client, Collection, GatewayIntentBits, PresenceUpdateStatus } from 'discord.js';
import type { Command } from '../models/command.js';

export class MusicClient extends Client {
    public commands: Collection<string, Command> = new Collection();

    public updatePresence(): void {
        const guildCount = this.guilds.cache.size;
        this.user?.setPresence({
            activities: [{
                name: `meowing in ${guildCount} servers!`,
                type: ActivityType.Custom,
                state: `meowing in ${guildCount} servers!`,
            }],
            status: PresenceUpdateStatus.Online,
        });
    }

    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
        });
    }
}
