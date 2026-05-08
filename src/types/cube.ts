// Shared types between the Cube's TS layer and the Horadrim backend's contract.
//
// The Rust capture command returns a CaptureResult; the parser turns its
// rawText into an IngestPayload; the API wrapper posts that payload to
// /api/ingest/tooltip. The shapes here mirror the backend's IngestPayloadData.

export type IngestType = 'item' | 'aspect';

export type ItemSlot =
    | 'helm'
    | 'chest'
    | 'gloves'
    | 'boots'
    | 'pants'
    | 'amulet'
    | 'ring'
    | 'weapon'
    | 'offhand'
    | 'two-handed'
    | 'ranged';

export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary' | 'unique' | 'mythic';

export type DiabloClass = 'barbarian' | 'druid' | 'necromancer' | 'rogue' | 'sorcerer' | 'spiritborn';

export interface ItemAffix {
    name: string;
    value: string;
}

export interface ItemPayload {
    type: 'item';
    rarity?: ItemRarity;
    itemPower?: number;
    class?: DiabloClass;
    slot?: ItemSlot;
    name?: string;
    affixes: ItemAffix[];
    imprintedAspectId?: string;
    imprintedAspectRoll?: number;
}

export interface AspectPayload {
    type: 'aspect';
    aspectId?: string;
    aspectName: string;
    imprintRoll?: number;
    slot?: ItemSlot;
    classRestriction?: DiabloClass;
    description?: string;
}

export type IngestPayload = ItemPayload | AspectPayload;

export interface IngestResult {
    status: 'created' | 'updated' | 'unchanged';
    id: number;
}

export interface CaptureResult {
    rawText: string;
    elapsedMs: number;
    pngPath: string;
}

export interface ScreenRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    monitorIndex?: number;
    psm?: number;
}

export type TrayState = 'idle' | 'capturing' | 'success' | 'error';

export interface RegionPreset {
    id: string;
    label: string;
    description: string;
    region: ScreenRegion;
}

export interface AspectCatalogEntry {
    aspectId: string;
    name: string;
    description: string;
    classRestriction: DiabloClass | null;
    validSlots: ItemSlot[];
}

export interface CatalogCache {
    fetchedAt: string;
    entries: AspectCatalogEntry[];
}

export interface CaptureLogEntry {
    id: string;
    capturedAt: string;
    state: TrayState;
    rawText: string;
    payload?: IngestPayload;
    result?: IngestResult;
    error?: string;
    elapsedMs?: number;
}

export interface CubeSettings {
    backendUrl: string;
    hotkey: string;
    region: ScreenRegion;
    presetId: string;
    autoStart: boolean;
}

export const DEFAULT_SETTINGS: CubeSettings = {
    backendUrl: 'https://horadrim.zmuuzn.nl',
    hotkey: 'Ctrl+Shift+H',
    // Ultrawide preset — investor's display.
    // The numbers are starting estimates; the investor confirms on first run.
    // Diablo4Companion's ultrawide tooltip region is anchored to the right side
    // of the screen at the cursor's typical hover position. Adjust in Settings.
    region: {x: 2400, y: 200, width: 700, height: 1100, psm: 6},
    presetId: 'ultrawide-3440',
    autoStart: false,
};

export const REGION_PRESETS: RegionPreset[] = [
    {
        id: 'ultrawide-3440',
        label: 'Ultrawide 3440×1440',
        description: "The investor's display. Anchored right of cursor at typical tooltip position.",
        region: {x: 2400, y: 200, width: 700, height: 1100, psm: 6},
    },
    {
        id: 'ultrawide-2560',
        label: 'Ultrawide 2560×1080',
        description: 'Lower-resolution ultrawide. Tighter tooltip box.',
        region: {x: 1800, y: 150, width: 600, height: 800, psm: 6},
    },
    {
        id: '1440p',
        label: 'QHD 2560×1440',
        description: 'Standard 16:9 QHD. Centered tooltip region.',
        region: {x: 1700, y: 200, width: 600, height: 1000, psm: 6},
    },
    {
        id: '1080p',
        label: 'Full HD 1920×1080',
        description: 'Standard 16:9 FHD. The cramped one — calibrate carefully.',
        region: {x: 1280, y: 150, width: 480, height: 750, psm: 6},
    },
];
