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

        // Convert blob to URL and sort descending (newest first)
        return records.reverse().map(record => ({
            ...record.analysis,
            fileUrl: URL.createObjectURL(record.file)
        }));
    },

    async deleteTrack(id: string) {
        const db = await this.initDB();
        await db.delete(STORE_NAME, id);
    }
};
