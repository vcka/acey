import { Dict } from "../base";
import { AppData } from "../app-data";
import { ChannelRepository } from "../channel-repository";
import { ChannelSourceWorker, ChannelSourceInfo } from "./types";
import { AceSource } from "./ace/AceSource";

import {
    ChannelSourceConfig,
    AceChannelSourceConfig,
} from "../config";

import {
    ChannelGroup,
    ChannelSourceType,
} from "../types";

class ChannelSources {
    private readonly configs: Map<string, ChannelSourceConfig>;
    private readonly workers: Map<string, ChannelSourceWorker>;

    constructor(
        sourceConfigs: Dict<ChannelSourceConfig>,
        groupsMap: Dict<ChannelGroup>,
        appData: AppData,
        channelRepository: ChannelRepository,
    ) {
        this.configs = new Map();
        this.workers = new Map();

        for (const name in sourceConfigs) {
            const config = sourceConfigs[name];

            let worker;

            switch (config.type) {
                case ChannelSourceType.Ace: {
                    const c = config as AceChannelSourceConfig;
                    worker = new AceSource(
                        c.url,
                        c.updateInterval,
                        channelRepository,
                        appData,
                        groupsMap,
                    );
                    break;
                }
                default:
                    throw new Error(`Unknown source type: "${config.type}"`);
            }

            this.configs.set(name, config);
            this.workers.set(name, worker);
        }
    }

    async open(): Promise<void> {
        await Promise.all(
            Array.from(this.workers.values()).map(w => w.open())
        );
    }

    async close(): Promise<void> {
        await Promise.all(
            Array.from(this.workers.values()).map(w => w.close())
        );
    }

    getChannels(sources: string[]): ChannelSourceInfo[] {
        const result = new Map<string, ChannelSourceInfo>();

        for (const source of sources) {
            const sourceConfig = this.configs.get(source);

            if (!sourceConfig) {
                continue;
            }

            const worker = this.workers.get(source);

            if (!worker) {
                continue;
            }

            const streams = worker.getChannels();

            for (const stream of streams) {
                if (result.has(stream.name.toLowerCase())) {
                    continue;
                }

                result.set(stream.name.toLowerCase(), {
                    channel: stream,
                    sourceLabel: sourceConfig.label,
                });
            }
        }

        return Array.from(result.values());
    }
}

export { ChannelSources }
