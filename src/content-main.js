import { makeStore } from './common.js';

const className = 'crosshair';

function removeCrosshair() {
    const targets = document.getElementsByClassName(className);
    [...targets].forEach((target) => target.remove());
}

function render({ show, inverse, color, opacity, size, absolute, x, y }) {
    removeCrosshair();
    if (!show) {
        console.log('not rendering crosshair');
        return;
    }
    console.log('rendering crosshair');
    const ch = document.createElement('div');

    ch.className = className;

    ch.style.position = 'fixed';
    ch.style.top = '50%';
    ch.style.left = '50%';
    ch.style.zIndex = '9999999';

    ch.style.width = `${size}px`;
    ch.style.aspectRatio = '1 / 1';

    ch.style.translate = '-50% -50%';

    ch.style.background = color;
    ch.style.opacity = (opacity / 100).toFixed(2);

    if (inverse) {
        ch.style.background = 'white';
        ch.style.mixBlendMode = 'difference';
    }

    if (absolute) {
        ch.style.top = `${y}px`;
        ch.style.left = `${x}px`;
    }

    document.body.appendChild(ch);
} 

export async function main() {
    const storeName = window.location.href.split(/(?<![/:])\//, 1)[0];
    
    const store = makeStore(storeName);

    const cache = await store.get(null);

    const state = new Proxy({}, { 
        set: (target, key, value) => {
            const oldValue = target[key];
            if (oldValue === value) {
                return true;
            }
            target[key] = value;
            render(target);
            return true;
        }
    });

    /**
     * @this {HTMLElement}
     * @param {MouseEvent} e 
     */
    function handlePlaceWithMouse(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        store.set({ 
            x: e.clientX, 
            y: e.clientY,
            isPlacing: false,
        });
        console.log('finished placing');
        this.removeEventListener('click', handlePlaceWithMouse, true);
    }
    
    for (const key in cache) {
        console.log(`retrieved cached value of ${key}: ${JSON.stringify(cache[key])}`);
        state[key] = cache[key];
    }

    if (state.isPlacing) {
        window.addEventListener('click', handlePlaceWithMouse, true);
    }

    store.addListener((changes) => {
        if (typeof changes.newValue !== 'object') {
            return;
        }
        for (const key in changes.newValue) {
            console.log(`detected change ${key}: ${JSON.stringify(changes.newValue[key])}`);
            state[key] = changes.newValue[key];
        }
        if (state.isPlacing) {
            window.addEventListener('click', handlePlaceWithMouse, true);
        }
    });
}
