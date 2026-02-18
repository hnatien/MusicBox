import type { Collection } from 'discord.js';
import type { Command } from '../models/command.js';

// Augment the discord.js Client type
declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
