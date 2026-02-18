export interface Song {
    title: string;
    url: string;
    duration: number; // Duration in seconds
    durationFormatted: string;
    thumbnail: string;
    channelName: string;
    requestedBy: string; // User ID who requested the song
}
