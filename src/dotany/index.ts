import { DotfileCreateOptions } from './types.js';
import { DotfileManager } from './manager.js';
import { DotfileComposer } from './composer.js';

export const dotfile = {
    create(options: DotfileCreateOptions): DotfileManager {
        return new DotfileManager(options);
    },
    compose(managers: DotfileManager[]): DotfileComposer {
        return new DotfileComposer(managers);
    },
};

export * from './types.js';
export { DotfileManager } from './manager.js';
export { DotfileComposer } from './composer.js';
export { FileSystemSource } from './sources/filesystem.js';
export { GitSource } from './sources/git.js';
export { JsonManifest } from './manifest/json.js';
