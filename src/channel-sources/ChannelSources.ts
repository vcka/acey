import { Dict } from "../base";
import { AppData } from "../app-data";
import { ChannelRepository } from "../channel-repository";
import { TtvApi } from "../ttv-api";
import { ChannelSourceWorker, ChannelSourceInfo } from "./types";
import { AceSourceWorker } from "./source-workers/AceSourceWorker";
import { TtvSourceWorker } from "./source-workers/TtvSourceWorker";

import {
    ChannelSourceConfig,
    AceUrlChannelSourceConfig,
    TtvApiChannelSourceConfig,
} from "../config";

import {
    ChannelGroup,
    ChannelSource,
} from "../types";

class ChannelSources {
    private readonly configs: Map<string, ChannelSourceConfig>;
    private readonly workers: Map<string, ChannelSourceWorker>;

    constructor(
        sourceConfigs: Dict<ChannelSourceConfig>,
        groupsMap: Dict<ChannelGroup>,
        appData: AppData,
        ttvApi: TtvApi,
        channelRepository: ChannelRepository,
    ) {
        this.configs = new Map();
        this.workers = new Map();

        for (const name in sourceConfigs) {
            const config = sourceConfigs[name];

            let worker;

            switch (config.provider) {
                case ChannelSource.Ace: {
                    const c = config as AceUrlChannelSourceConfig;
                    worker = new AceSourceWorker(
                        c.url,
                        c.updateInterval,
                        channelRepository,
                        appData,
                        groupsMap,
                    );
                    break;
                }
                case ChannelSource.Ttv: {
                    const c = config as TtvApiChannelSourceConfig;
                    worker = new TtvSourceWorker(
                        c.updateInterval,
                        channelRepository,
                        appData,
                        groupsMap,
                        ttvApi,
                    );
                    break;
                }
                default:
                    throw new Error(`Unknown source provider: "${config.provider}"`);
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
