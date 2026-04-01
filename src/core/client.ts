import { ActivityType, Client, Collection, GatewayIntentBits, Options, PresenceUpdateStatus } from 'discord.js';
import type { Command } from '../models/command.js';

export class MusicClient extends Client {
    public commands: Collection<string, Command> = new Collection();
    public isLocked: boolean = false;

    public updatePresence(): void {
        const guildCount = this.guilds.cache.size;
        this.user?.setPresence({
            activities: [{
                name: `/help for commands | sleeping in ${guildCount} servers!`,
                type: ActivityType.Custom,
                state: `/help for commands | sleeping in ${guildCount} servers!`,
            }],
            status: PresenceUpdateStatus.Online,
        });
    }

    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
            makeCache: Options.cacheWithLimits({
                MessageManager: 0,
            }),
        });
    }
}
