/* eslint-disable no-unused-vars */
import { makeStore } from './common.js';

/**
 * @param {Array<HTMLInputElement>} inputs 
 * @param {string} key
 * @returns {Object<string, any>}
 */
function extractDataAttributes(inputs, key) {
    return inputs.reduce((acc, input) => {
        if (!(key in input.dataset)) {
            return acc;
        }
        let value = input.dataset[key];
        if (input.type === 'checkbox') {
            value = value === 'true' ? true : false;
        }
        return { [input.id]: value, ...acc };
    }, {});
}

/** @returns {Promise<string|void>} */
async function queryCurrentURL() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Array.isArray(tabs) || tabs.length < 1) {
        return null;
    }
    return tabs[0].url;
}

/** @type {Array<HTMLInputElement>} */
const inputs = [...document.querySelectorAll('#settings input')];

const defaultSettings = extractDataAttributes(inputs, 'defaultValue');

const initialSettings = { 
    ...extractDataAttributes(inputs, 'initialValue'), 
    ...defaultSettings
};

async function app() {
    if (!window.chrome) {
        return;
    }

    const url = await queryCurrentURL();

    if (!url || !url.startsWith('http')) {
        const veil = document.getElementById('veil');
        veil.dataset.show = 'true';
        return;
    }

    const storeName = url.split(/(?<![/:])\//, 1)[0];
    const store = makeStore(storeName);
    
    const cache = await store.get(null);
    const settings = typeof cache !== 'object'
        ? initialSettings
        : { ...initialSettings, ...cache };

    await store.set(settings);

    /** @type {Array<HTMLInputElement>} */
    const collapseInputs = [...document.getElementsByClassName('collapse-input')];

    collapseInputs.forEach((input) => {
        /** @type {HTMLElement|null} */
        const collapsible = document.querySelector(`.collapsible[data-id='${input.id}']`);
        console.log(collapsible);
        if (!collapsible) {
            return;
        }
        collapsible.style.maxHeight = `${collapsible.offsetHeight}px`;
        collapsible.dataset.collapsed = settings[input.id];
        input.addEventListener('change', function () {
            collapsible.dataset.collapsed = this.checked;
        });
    });

    /** @param {string} storeId */
    const makeNumberInputHandler = (storeId, { min = 0, max = Infinity } = {}) => 
        /** @this {GlobalEventHandlers} */
        async function handleNumberInput() {
            min = Number(min);
            max = Number(max);
            let value = this.value.replace(/\D/g, '').replace(/(?<=^)0(?=\d)/, '');
            value = Number(value);
            value = Math.min(Math.max(value, min), max);
            value = value.toString();
            this.value = value;
            store.set({ [storeId]: value });
        };

    /** @param {string} storeId */
    const makeWheelHandler = (storeId, { step = 2, min = 0, max = Infinity } = {}) =>
        /**
         * @this {GlobalEventHandlers}
         * @param {WheelEvent} e
         */
        async function handleWheel(e) {
            min = Number(min);
            max = Number(max);
            step = Number(step);
            const delta = step * -1 * Math.sign(e.deltaY);
            let value = await store.get(storeId);
            value = Number(value);
            console.log(`on wheel: ${value+delta}/${max}`);
            value = value + delta;
            value = Math.min(Math.max(value, min), max);
            value = value.toString();
            this.value = value;
            store.set({ [storeId]: value });
        };

    inputs.forEach((input) => {
        const { id, type, } = input;
        switch (type) {
        case 'number':
            input.value = settings[id];
            input.oninput = makeNumberInputHandler(id, input);
            input.onwheel = makeWheelHandler(id, input);
            break;
        case 'color':
        case 'text':
            input.value = settings[id];
            input.oninput = function handleInput() { 
                store.set({ [id]: this.value }); 
            };
            break;
        case 'checkbox':
            input.checked = settings[id];
            input.onchange = function handleInput() { 
                store.set({ [id]: this.checked }); 
            };
            break;
        }
    });

    store.addListener((changes) => {
        console.log(`received changes: ${JSON.stringify(changes)}`);
        inputs.forEach((input) => {
            const { id, type } = input;
            if (!(id in changes.newValue)) {
                return;
            }
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

    /** @type {HTMLButtonElement} */
    const restoreButton = document.getElementById('restore');
    restoreButton.onclick = function () {
        store.set(defaultSettings);
    };
}

app();

// chrome.storage.local.clear();
