import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import type { MusicClient } from '../core/client.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    cooldown?: number; // Cooldown in seconds
    execute(interaction: ChatInputCommandInteraction, client: MusicClient): Promise<void>;
    autocomplete?(interaction: AutocompleteInteraction, client: MusicClient): Promise<void>;
}
