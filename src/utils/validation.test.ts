import { describe, it, expect } from 'vitest';
import { isValidYouTubeUrl, isPlaylistUrl, isMixUrl, sanitizeQuery } from './validation.js';

describe('isValidYouTubeUrl', () => {
  it('accepts standard youtube.com/watch URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts youtu.be short URL', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts youtube.com/playlist URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/playlist?list=PLxxx')).toBe(true);
  });

  it('accepts youtube.com/shorts URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts music.youtube.com URL', () => {
    expect(isValidYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts URL without www', () => {
    expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects non-YouTube URL', () => {
    expect(isValidYouTubeUrl('https://spotify.com/track/abc')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidYouTubeUrl('')).toBe(false);
  });

  it('rejects plain search query', () => {
    expect(isValidYouTubeUrl('never gonna give you up')).toBe(false);
  });

  it('trims leading/trailing whitespace before checking', () => {
    expect(isValidYouTubeUrl('  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ')).toBe(true);
  });
});

describe('isPlaylistUrl', () => {
  it('accepts explicit playlist page URL', () => {
    expect(
      isPlaylistUrl('https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Rb0zTAYIIjSF8YSo'),
    ).toBe(true);
  });

  it('rejects video URL with list param (has v=)', () => {
    expect(
      isPlaylistUrl(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrEnWoR732-BHrPp_Rb0zTAYIIjSF8YSo',
      ),
    ).toBe(false);
  });

  it('rejects mix URL (list=RD)', () => {
    expect(isPlaylistUrl('https://www.youtube.com/watch?v=xxx&list=RDxxx')).toBe(false);
  });

  it('rejects shorts URL with list param', () => {
    expect(isPlaylistUrl('https://www.youtube.com/shorts/xxx?list=PLxxx')).toBe(false);
  });

  it('rejects plain video URL without list', () => {
    expect(isPlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isPlaylistUrl('')).toBe(false);
  });

  it('rejects non-YouTube URL', () => {
    expect(isPlaylistUrl('https://spotify.com/playlist/abc')).toBe(false);
  });
});

describe('isMixUrl', () => {
  it('accepts URL with list=RD prefix', () => {
    expect(isMixUrl('https://www.youtube.com/watch?v=xxx&list=RDxxx')).toBe(true);
  });

  it('accepts URL where list=RD is first param', () => {
    expect(isMixUrl('https://www.youtube.com/watch?list=RDxxx&v=xxx')).toBe(true);
  });

  it('rejects regular playlist URL', () => {
    expect(isMixUrl('https://www.youtube.com/playlist?list=PLxxx')).toBe(false);
  });

  it('rejects plain video URL', () => {
    expect(isMixUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isMixUrl('')).toBe(false);
  });

  it('trims whitespace before checking', () => {
    expect(isMixUrl('  https://www.youtube.com/watch?v=xxx&list=RDxxx  ')).toBe(true);
  });
});

describe('sanitizeQuery', () => {
  it('returns the query trimmed', () => {
    expect(sanitizeQuery('  hello world  ')).toBe('hello world');
  });

  it('truncates query to default maxLength of 200', () => {
    const longQuery = 'a'.repeat(250);
    expect(sanitizeQuery(longQuery)).toHaveLength(200);
  });

  it('does not truncate query shorter than maxLength', () => {
    expect(sanitizeQuery('short query')).toBe('short query');
  });

  it('respects custom maxLength', () => {
    expect(sanitizeQuery('hello world', 5)).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeQuery('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeQuery('   ')).toBe('');
  });
});
