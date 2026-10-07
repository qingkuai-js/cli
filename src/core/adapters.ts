import nodeFs from "node:fs";
import nodePath from "node:path";

import {
    createAdapterFsWithNodeFs,
    createAdapterPathWithNodePath,
} from "qingkuai-language-service/adapters";

export const ADAPTER_FS = createAdapterFsWithNodeFs(nodeFs);
export const ADAPTER_PATH = createAdapterPathWithNodePath(nodePath);
