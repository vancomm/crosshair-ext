/* eslint-disable no-unused-vars */
import { makeStore } from './common.js';

const MAX_CROSSHAIR_SIZE = 9999;
const CROSSHAIR_SIZE_INCREMENT = 2;

/** @returns {Promise<string|void>} */
async function queryCurrentURL() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Array.isArray(tabs) || tabs.length < 1) {
        return null;
    }
    return tabs[0].url;
}

const defaultSettings = {
    inverse: false,
    color: '#ff0000',
    opacity: '100',
    size: '6',
    absolute: false,
    x: '50',
    y: '50',
    isPlacing: false,
};

const initialSettings = {
    show: false,
    ...defaultSettings,
};

const inputProps = [
    {
        id: 'show',
        type: 'checkbox',
    },
    {
        id: 'inverse',
        type: 'checkbox'
    },
    {
        id: 'color',
        type: 'color'
    },
    {
        id: 'opacity',
        type: 'number',
        max: '100',
    },
    {
        id: 'size',
        type: 'number',
        max: MAX_CROSSHAIR_SIZE,
        increment: CROSSHAIR_SIZE_INCREMENT,
    },
    {
        id: 'absolute',
        type: 'checkbox'
    },
    {
        id: 'x',
        type: 'number',
    },
    {
        id: 'y',
        type: 'number',
    },
];

async function app() {
    if (!chrome) {
        return;
    }

    const url = await queryCurrentURL();
    if (!url || !url.startsWith('http')) {
        const veil = document.getElementById('veil');
        veil.style = '';
        return;
    }

    const storeName = url.split(/(?<![/:])\//, 1)[0];

    const store = makeStore(storeName);

    /** @param {string} id */
    const makeWheelHandler = (id, { increment = 2, min = 0, max = Infinity } = {}) =>
        /**
         * @this {GlobalEventHandlers}
         * @param {WheelEvent} e
         */
        async function handleWheel(e) {
            const delta = increment * -1 * Math.sign(e.deltaY);
            let value = await store.get(id);
            value = Number(value);
            value = value + delta;
            value = Math.min(Math.max(value, min), max);
            value = value.toString();
            this.value = value;
            store.set({ [id]: value });
        };
    

    /** @param {string} id */
    const makeNumberInputHandler = (id, { min = 0, max = Infinity } = {}) => 
        /** @this {GlobalEventHandlers} */
        async function handleNumberInput() {
            let value = this.value.replace(/\D/g, '').replace(/(?<=^)0(?=\d)/, '');
            value = Number(value);
            value = Math.min(Math.max(value, min), max);
            value = value.toString();
            this.value = value;
            store.set({ [id]: value });
        };
    

    const cache = await store.get(null);

    const settings =
    typeof cache !== 'object'
        ? initialSettings
        : { ...initialSettings, ...cache };

    await store.set(settings);

    /** @type {HTMLInputElement} */
    const showCheckbox = document.getElementById('show');
    showCheckbox.checked = settings.show;
    showCheckbox.onchange = function () { store.set({ show: this.checked }); };

    /** @type {HTMLInputElement} */
    const inverseCheckbox = document.getElementById('inverse');
    inverseCheckbox.checked = settings.inverse;
    inverseCheckbox.onchange = function () { store.set({ inverse: this.checked }); };

    /** @type {HTMLInputElement} */
    const colorInput = document.getElementById('color');
    colorInput.checked = settings.color;
    colorInput.onchange = function () { store.set({ color: this.value }); };

    /** @type {HTMLButtonElement} */
    const opacityInput = document.getElementById('opacity');
    opacityInput.value = settings.opacity;
    opacityInput.oninput = makeNumberInputHandler('opacity', { max: 100, min: 0 });
    opacityInput.onwheel = makeWheelHandler('opacity', { max: 100, min: 0 });

    /** @type {HTMLInputElement} */
    const sizeInput = document.getElementById('size');
    sizeInput.value = settings.size;
    sizeInput.oninput = makeNumberInputHandler('size', { max: MAX_CROSSHAIR_SIZE });
    sizeInput.onwheel = makeWheelHandler('size', {
        increment: CROSSHAIR_SIZE_INCREMENT,
        max: MAX_CROSSHAIR_SIZE,
    });

    /** @type {HTMLInputElement} */
    const absoluteCheckbox = document.getElementById('absolute');
    absoluteCheckbox.checked = settings.absolute;
    absoluteCheckbox.onchange = function () { store.set({ absolute: this.checked }); };

    /** @type {HTMLInputElement} */
    const xInput = document.getElementById('x');
    xInput.value = settings.x;
    xInput.oninput = makeNumberInputHandler('x');
    xInput.onwheel = makeWheelHandler('x', { increment: 2 });

    /** @type {HTMLInputElement} */
    const yInput = document.getElementById('y');
    yInput.value = settings.y;
    yInput.oninput = makeNumberInputHandler('y');
    yInput.onwheel = makeWheelHandler('y', { increment: 2 });

    /** @type {HTMLInputElement} */
    const placingToggle = document.getElementById('is-placing');
    placingToggle.checked = settings.isPlacing;
    placingToggle.onchange = function () { store.set({ isPlacing: this.checked }); };

    /** @type {HTMLButtonElement} */
    const restoreButton = document.getElementById('restore');
    restoreButton.onclick = function () {
        store.set(defaultSettings);
    };

    store.addListener((changes) => {
        console.log(`received changes: ${JSON.stringify(changes)}`);
        inputProps.forEach(({ id, type }) => {
            if (!(id in changes.newValue)) {
                return;
            }
            /** @type {HTMLInputElement} */
            const input = document.getElementById(id);
            const update = changes.newValue[id];
            if (input.value === update) {
                return;
            }
            switch (type) {
            case 'number':
            case 'color':
                input.value = update;
                break;
            case 'checkbox':
                input.checked = update;
                break;
            }
        });
    });
}

app();

// chrome.storage.local.clear();
