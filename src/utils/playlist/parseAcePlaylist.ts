import { splitLines } from "../../libs/misc/splitLines";
import { AceChannel, ChannelGroupsParseMap } from "../../types";

function parseAcePlaylist(
    content: string,
    channelGroupsParseMap: ChannelGroupsParseMap,
): AceChannel[] {
    let result: AceChannel[] = [];

    const lines = splitLines(content, true, true);
    const lineCount = lines.length;

    let k = 0;

    while (k < lineCount - 1) {
        const line1 = lines[k];

        if (!line1.startsWith("#EXTINF:")) {
            k++;
            continue;
        }

        const line2 = lines[k + 1];

        if (!line2.startsWith("acestream://")) {
            k++;
            continue;
        }

        const titleIndex = line1.indexOf(",", 8);

        if (titleIndex === -1) {
            k += 2;
            continue;
        }

        const title = line1.slice(titleIndex + 1);
        const categoryStartIndex = title.lastIndexOf("(");
        const categoryEndIndex = title.lastIndexOf(")");

        let name, group;

        if (categoryStartIndex !== -1 && categoryEndIndex !== -1) {
            name = title.slice(0, categoryStartIndex).trim();
            group = channelGroupsParseMap.get(title.slice(categoryStartIndex + 1, categoryEndIndex).trim()) || null;
        }
        else {
            name = title.trim();
            group = null;
        }

        if (!name) {
            k += 2;
            continue;
        }

        const cidStartIndex = line2.lastIndexOf("/");
        const cid = line2.slice(cidStartIndex + 1);

        if (!cid) {
            k += 2;
            continue;
        }

        k += 2;
        result.push({ name, group, cid });
    }

    return result;
}

export { parseAcePlaylist }
