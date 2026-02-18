import { openDB, type DBSchema } from 'idb';
import type { AudioAnalysis } from '../types';

interface MusicTilesDB extends DBSchema {
    tracks: {
        key: string;
        value: {
            id: string;
            analysis: Omit<AudioAnalysis, 'fileUrl'>;
            file: Blob;
            timestamp: number;
        };
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'music_tiles_db';
const STORE_NAME = 'tracks';

export const storageService = {
    async initDB() {
        return openDB<MusicTilesDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
    },

    async saveTrack(analysis: AudioAnalysis, file: Blob) {
        const db = await this.initDB();
        // Remove transient URL before saving
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileUrl, ...rest } = analysis;

        await db.put(STORE_NAME, {
            id: analysis.id,
            analysis: rest,
            file,
            timestamp: Date.now(),
        });
    },

    async getAllTracks(): Promise<AudioAnalysis[]> {
        const db = await this.initDB();
        const records = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');

        // Convert blob to URL and sort descending (lastPlayed first, then timestamp)
        return records
            .map(record => ({
                ...record.analysis,
                fileUrl: URL.createObjectURL(record.file)
            }))
            .sort((a, b) => {
                // Priority 1: lastPlayed (most recent first)
                if (a.lastPlayed || b.lastPlayed) {
                    const timeA = a.lastPlayed || 0;
                    const timeB = b.lastPlayed || 0;
                    if (timeA !== timeB) return timeB - timeA;
                }
                // Priority 2: timestamp (most recent upload first)
                const tsA = a.timestamp || 0;
                const tsB = b.timestamp || 0;
                return tsB - tsA;
            });
    },

    async deleteTrack(id: string) {
        const db = await this.initDB();
        await db.delete(STORE_NAME, id);
    },

    async updateTrackStats(id: string, updates: Partial<AudioAnalysis>) {
        const db = await this.initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record = await store.get(id);
        if (!record) return;

        const updatedRecord = {
            ...record,
            analysis: {
                ...record.analysis,
                ...updates
            }
        };

        await store.put(updatedRecord);
        await store.put(updatedRecord);
        await tx.done;
    },

    async clearAllData() {
        const db = await this.initDB();
        await db.clear(STORE_NAME);
    }
};
