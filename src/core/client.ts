import { ActivityType, Client, Collection, GatewayIntentBits, PresenceUpdateStatus } from 'discord.js';
import type { Command } from '../models/command.js';

export class MusicClient extends Client {
    public commands: Collection<string, Command> = new Collection();

    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
        });
    }

    public updatePresence(): void {
        const guildCount = this.guilds.cache.size;
        this.user?.setPresence({
            activities: [{
                name: `serving ${guildCount} guilds!`,
                type: ActivityType.Custom,
                state: `serving ${guildCount} guilds!`
            }],
            status: PresenceUpdateStatus.Online
        });
    }
}
