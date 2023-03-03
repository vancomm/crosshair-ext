/** @param {string} storeName */
export function makeStore(storeName) {
    /** 
     * @param {string|null} key
     * @returns {Promise<unknown>}
     */
    const get = async (key) => {
        const commonCache = await chrome.storage.local.get(null);
        console.log(`cache is now ${JSON.stringify(commonCache)}`);
        const { [storeName]: cache } = commonCache;
        if (typeof cache !== 'object') {
            console.log(`could not find ${key}`);
            return null;
        }
        const value = key === null 
            ? cache 
            : cache[key] ?? null;
        console.log(`getting key ${key ?? '<all>'} with value ${JSON.stringify(value)}`);
        return value;
    };

    /** 
     * @param {Object<string,any>} changes
     * @returns {Promise<void>}
     */
    const set = async (changes) => {
        const cache = await chrome.storage.local.get(storeName);
        const updated = typeof cache === 'object' && typeof cache[storeName] === 'object'
            ? {[storeName]: {...cache[storeName], ...changes}}
            : {[storeName]: changes};
        console.log(`setting ${JSON.stringify(updated)}`);
        return chrome.storage.local.set(updated);
    };

    /** 
     * @callback ChangeHandler
     * @param {Object} changes
     * @param {string} areaname
     * @returns {void}
     */

    /** 
     * @param {ChangeHandler} callback 
     * @returns {void}
     */
    const addListener = (callback) => {
        /** @type {ChangeHandler} */
        const handler = (changes, areaname) => {
            console.log(`store changes: ${JSON.stringify(changes)}, areaname: ${areaname}`);
            if (!(storeName in changes) || typeof changes[storeName] !== 'object') {
                return callback({}, areaname);
            }
            return callback(changes[storeName], areaname);
        };
        return chrome.storage.onChanged.addListener(handler);
    };

    return {get, set, addListener};
}