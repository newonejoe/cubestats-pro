// localStorage keys
export const STORAGE_KEYS = {
    PROPERTIES: 'properties',
    GII_SOLVED: 'giiSolved',
};

// Get property from localStorage (with default)
export function getProp(key: string, defaultValue: string): string {
    try {
        const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
        if (propsStr) {
            const props = JSON.parse(propsStr);
            if (props[key] !== undefined) {
                return props[key];
            }
        }
    } catch (e) {
        console.warn('[kernel] Failed to get property:', key, e);
    }
    return defaultValue;
}

// Set property in localStorage
export function setProp(key: string, value: string): void {
    try {
        let props: Record<string, any> = {};
        const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
        if (propsStr) {
            props = JSON.parse(propsStr);
        }
        props[key] = value;
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(props));
    } catch (e) {
        console.warn('[kernel] Failed to set property:', key, e);
    }
}
