/* eslint-disable no-unused-vars */
import { makeStore } from './common.js';

const CH_CLASSNAME = 'crosshair';

function render({ 
    show, dot, lines,
    thickness, length,
    invert, color, opacity, 
    absolute, x, y 
}) {
    const staleElements = document.getElementsByClassName(CH_CLASSNAME);
    [...staleElements].forEach((el) => el.remove());

    if (!show || !(dot || lines)) {
        return;
    }

    /** @param {HTMLElement} el */
    const setColor = (el) => {
        el.style.background = color;
        el.style.opacity = `${opacity}%`;

        if (invert) {
            el.style.background = 'transparent';
            el.style.backdropFilter = 'invert(100%)';
        }
    };

    const container = document.createElement('div');

    container.className = CH_CLASSNAME;

    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';

    if (absolute) {
        container.style.top = `${y}px`;
        container.style.left = `${x}px`;
    }

    container.style.zIndex = '9999999';

    container.style.width = `${thickness}px`;
    container.style.aspectRatio = '1 / 1';

    container.style.translate = '-50% -50%';

    container.style.background = 'transparent';

    if (lines) {
        const lines = Array.from(
            { length: 4 }, 
            () => document.createElement('div')
        );
        
        lines[0].style.top = '0';
        lines[0].style.left = '100%';
        lines[0].style.width = `${length}px`;
        lines[0].style.height = `${thickness}px`;

        lines[1].style.bottom = '100%';
        lines[1].style.left = '0';
        lines[1].style.width = `${thickness}px`;
        lines[1].style.height = `${length}px`;

        lines[2].style.top = '0';
        lines[2].style.right = '100%';
        lines[2].style.width = `${length}px`;
        lines[2].style.height = `${thickness}px`;

        lines[3].style.top = '100%';
        lines[3].style.left = '0';
        lines[3].style.width = `${thickness}px`;
        lines[3].style.height = `${length}px`;

        lines.forEach((line) => {
            setColor(line);
            line.style.position = 'absolute';
            container.appendChild(line);
        });
    }

    if (dot) {
        const dotEl = document.createElement('div');

        dotEl.className = CH_CLASSNAME;

        dotEl.style.position = 'absolute';
        dotEl.style.top = '0';
        dotEl.style.left = '0';

        dotEl.style.width = `${thickness}px`;
        dotEl.style.aspectRatio = '1 / 1';
        
        setColor(dotEl);

        container.appendChild(dotEl);
    }

    document.body.appendChild(container);
} 

export async function main() {
    const storeName = window.location.href.split(/(?<![/:])\//, 1)[0];
    const store = makeStore(storeName);

    const cache = await store.get(null);
    const state = new Proxy(cache, { 
        set: (target, key, value) => {
            const oldValue = target[key];
            if (oldValue !== value) {
                target[key] = value;
                render(target);
            }
            return true;
        }
    });

    render(state);

    /**
     * @this {HTMLElement}
     * @param {MouseEvent} e 
     */
    const handlePlaceWithMouse = function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        store.set({ 
            x: e.clientX, 
            y: e.clientY,
            place: false,
        });
    };

    if (state.place) {
        window.addEventListener('click', handlePlaceWithMouse, { capture: true, once: true });
    }
    
    store.addListener((changes) => {
        if (typeof changes.newValue !== 'object') {
            return;
        }
        for (const key in changes.newValue) {
            state[key] = changes.newValue[key];
        }
        if (state.place) {
            window.addEventListener('click', handlePlaceWithMouse, { capture: true, once: true });
        }
    });
}
