// ==UserScript==
// @name           Twitch [Chatters Count]
// @name:pl        Twitch [Ilość osób na czacie]
// @namespace      https://github.com/pabli24
// @version        1.0.2
// @description    Shows the amount of people in the chat
// @description:pl Pokazuje liczbę użytkowników na czacie
// @author         Pabli
// @license        MIT
// @match          https://www.twitch.tv/*
// @icon           data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHBhdGggZmlsbD0iI2ZmODI4MCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTU2LjYgMTk2LjNhOTkuNCA5OS40IDAgMSAxIDEyMy4xIDk2LjUgMzkuNyAzOS43IDAgMCAwIDM1LjkgMjIuN2gxOS45YTU5LjYgNTkuNiAwIDAgMSA1OS42IDU5LjZ2MzkuOGgtMzkuOHYtMzkuOGMwLTExLTguOS0xOS45LTE5LjktMTkuOWgtMTkuOWE3OS40IDc5LjQgMCAwIDEtNTkuNi0yNi45IDc5LjUgNzkuNSAwIDAgMS01OS42IDI2LjloLTE5LjljLTExIDAtMTkuOSA4LjktMTkuOSAxOS45djM5LjhoLTM5Ljh2LTM5LjhhNTkuNiA1OS42IDAgMCAxIDU5LjYtNTkuNmgxOS45YzE1LjQgMCAyOS40LTguOCAzNS45LTIyLjdhOTkuNCA5OS40IDAgMCAxLTc1LjctOTYuNlpNMjU2IDI1NmE1OS42IDU5LjYgMCAxIDEgMC0xMTkuMiA1OS42IDU5LjYgMCAwIDEgMCAxMTkuMloiLz48cGF0aCBmaWxsPSIjZmY4MjgwIiBkPSJNMCA1MTJWMGgxMTYuOHYzNi4xSDQzLjN2NDQxLjNoNzMuNlY1MTJIMFpNNTEyIDB2NTEySDM5NS4ydi0zNi4xaDczLjZWMzQuNmgtNzMuNlYwSDUxMloiLz48L3N2Zz4=
// @run-at         document-end
// @grant          GM_xmlhttpRequest
// @grant          GM_info
// @grant          GM_notification
// @grant          GM_openInTab
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_registerMenuCommand
// @grant          GM_unregisterMenuCommand
// ==/UserScript==

(async () => {
'use strict';

let settings = {
	previewCards: {
		value: await GM_getValue('previewCards', true),
		label: 'Show for preview cards in the main/directory page',
	},
	underPlayer: {
		value: await GM_getValue('underPlayer', true),
		label: 'Show under the player next to the viewer count',
	},
	theatreMode: {
		value: await GM_getValue('theatreMode', true),
		label: 'Show in the theatre mode when mousing over the player',
	},
	topChat: {
		value: await GM_getValue('topChat', false),
		label: 'Show at the top of the chat',
	},
	numberFormat: {
		value: await GM_getValue('numberFormat', true),
		label: 'Number format based on your language (en-US if disabled)',
	},
};
let menuCommands = {};
async function updateMenu() {
	Object.keys(menuCommands).forEach(key => GM_unregisterMenuCommand(menuCommands[key]));
	Object.entries(settings).forEach(([key, config]) => {
		menuCommands[key] = GM_registerMenuCommand(
			`${config.value ? '☑' : '☐'} ${config.label}`,
			async () => {
				settings[key].value = !settings[key].value;
				await GM_setValue(key, settings[key].value);
				GM_notification(`${config.label} is now ${config.value ? 'enabled' : 'disabled'}`, GM_info.script.name, GM_info.script.icon);
				updateMenu();
			}
		);
	});
}
updateMenu();

let updater = null;
let currentChannel = '';

setInterval(() => {
	const path = window.location.pathname;
	
	if (settings.previewCards.value && (path === '/' || path.startsWith('/directory'))) {
		checkForNewCards();
		return;
	}
	
	let channelName = path.split('/')[1];
	if (!channelName || ['settings', 'subscriptions', 'inventory', 'wallet', 'privacy', 'turbo', 'downloads', 'p', 'annual-recap'].includes(channelName)) return;
	
	if (channelName === 'popout') {
		channelName = path.split('/')[2];
	}
	
	if (currentChannel !== channelName) {
		currentChannel = channelName;
		if (updater) {
			clearInterval(updater);
			updater = null;
		}
	}
	
	if (settings.underPlayer.value) {
		chattersCount();
	} else if (ct) {
		ct.remove();
		ct = null;
	}
	if (settings.theatreMode.value) {
		tmChattersCount();
	} else if (tmCt) {
		tmCt.remove();
		tmCt = null;
	}
	if (settings.topChat.value) {
		chatChattersCount();
	} else if (chatCt) {
		chatCt.remove();
		chatCt = null;
	}
	
	if (!updater) {
		updateCount(channelName);
		updater = setInterval(() => updateCount(channelName), 60000);
	}
}, 1000);

let ct = null;
let tmCt = null;
let chatCt = null;
let chatters = '⏳';

async function updateCount(channelName) {
	chatters = await getChatters(channelName);
	
	[ct, tmCt, chatCt].forEach(el => { 
		if (el) el.textContent = `[${chatters}]`;
	});
}

function createChattersCounter(id) {
	const counter = document.createElement('span');
	counter.id = id;
	counter.title = 'Chatters Count';
	counter.textContent = `[${chatters}]`;
	counter.style.cssText = `
		color: var(--color-text-live, #ff8280);
		font-size: var(--font-size-base, 1.3rem);
		font-weight: var(--font-weight-semibold, 600);
		font-feature-settings: "tnum";
		line-height: var(--line-height-body, 1.5);
		margin-left: 0.5rem;
		align-content: center;
	`;
	return counter;
}

function chattersCount() {
	ct = document.getElementById('chatters-count');
	if (ct != null) return;
	const viewersCount = document.querySelector('main [data-a-target="animated-channel-viewers-count"]')?.parentElement;
	if (!viewersCount) return;
	
	ct = createChattersCounter('chatters-count');
	viewersCount.appendChild(ct);
}

function tmChattersCount() {
	tmCt = document.getElementById('tm-chatters-count');
	if (tmCt != null) return;
	const tmInfoCard = document.querySelector('p[data-test-selector="stream-info-card-component__description"]');
	if (!tmInfoCard) return;
	
	tmCt = createChattersCounter('tm-chatters-count');
	tmInfoCard.appendChild(tmCt);
}

function chatChattersCount() {
	chatCt = document.getElementById('chat-chatters-count');
	if (chatCt != null) return;
	const chatHeader = document.querySelector('button[data-test-selector="chat-viewer-list"]')?.parentElement;
	if (!chatHeader) return;
	
	chatCt = createChattersCounter('chat-chatters-count');
	chatHeader.prepend(chatCt);
}

function checkForNewCards() {
	const previewCards = document.querySelectorAll('a[data-a-target="preview-card-image-link"]');
	previewCards.forEach(addChattersToCard);
}

async function addChattersToCard(card) {
	const cardStat = card.querySelector('div.tw-media-card-stat');
	if (!cardStat || cardStat.querySelector('.directory-chatters-count') || card.dataset.chattersLoading === 'true') return;
	
	card.dataset.chattersLoading = 'true';
	
	const channelName = card.getAttribute('href').slice(1);
	
	const counter = document.createElement('span');
	counter.className = 'directory-chatters-count';
	counter.style.paddingLeft = '0.4rem';
	
	const count = await getChatters(channelName);
	counter.textContent = `[${count}]`;
	
	cardStat.appendChild(counter);
	delete card.dataset.chattersLoading;
}

let lang = settings.numberFormat.value ? '' : 'en-US';
async function getChatters(channel) {
	if (!lang) lang = document.documentElement.getAttribute('lang') || 'en-US';
	
	return new Promise((resolve) => {
		GM_xmlhttpRequest({
			method: 'POST',
			url: 'https://gql.twitch.tv/gql',
			headers: {
				'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
				'Content-Type': 'application/json'
			},
			data: JSON.stringify({
				query: `query { channel(name: "${channel}") { chatters { count } } }`
			}),
			onload: response => {
				const data = JSON.parse(response.responseText);
				const count = data?.data?.channel?.chatters?.count;
				resolve(count != null && !isNaN(count) ? new Intl.NumberFormat(lang).format(count) : 'N/A');
			}
		});
	});
}

})();
