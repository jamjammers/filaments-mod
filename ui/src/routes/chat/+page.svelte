<script lang="ts">
	import crypto from 'crypto-js';
	const { AES, SHA256 } = crypto;

	import { goto } from '$app/navigation';
	import { type Message, type MessageBlock } from '$lib';
	import { serverHost } from '$lib/host';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let domain: string | undefined;
	let filament: string | undefined;
	let key: string | undefined;
	let encryptionKey: string | undefined;

	let nick = '';
	let message = '';

	let ws: WebSocket;
	let messages: Message[] = [];

	let mute = false;
	let notificationsPermitted = false;

	function getCookie(name: string): string | undefined {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) {
			return parts.pop()?.split(';').shift();
		}
		return undefined;
	}

	onMount(() => {
		const params = new URLSearchParams(location.search);

		domain = params.get('domain')?.trim();
		filament = params.get('filament')?.trim();
		key = getCookie('key');
		document.cookie = `key=,expires=${new Date().toUTCString()};Max-Age=0`;

		if (!domain || !filament || !key) {
			goto(`/?${params.toString()}`);
			return;
		}

		const encryptedEncryptionKey = localStorage.getItem(`${domain}/${filament}`);

		if (encryptedEncryptionKey == null) {
			const encryptionPassphrase = prompt(
				`enter the encryption passphrase for ${domain}/${filament}:`
			);

			if (encryptionPassphrase != null) {
				localStorage.setItem(
					`${domain}/${filament}`,
					AES.encrypt(SHA256(encryptionPassphrase).toString(), key).toString()
				);
			}

			const now = new Date();
			const time = now.getTime();
			const expireTime = time + 30000;
			now.setTime(expireTime);
			document.cookie = `key=${key};expires=${now.toUTCString()};Max-Age=30`;
			location.reload();
			return;
		}

		encryptionKey = AES.decrypt(encryptedEncryptionKey, key).toString(crypto.enc.Utf8);
		key = undefined;

		const storednick = localStorage.getItem('nick');
		if (storednick != null) {
			nick = storednick;
		}

		ws = new WebSocket(
			`${location.protocol.replace('http', 'ws')}//${serverHost}/${domain}/${filament}`
		);

		ws.onopen = () => {
			setInterval(() => {
				ws.send('ping');
			}, 30000);

			message = `<joined the chat>`;
			send(undefined);
			document.getElementById('message-input')?.focus();
		};

		const messagesEl = document.getElementById('messages');
		ws.onmessage = (event) => {
			const data = event.data;

			if (data.toString() == 'pong') {
				return;
			}

			const msg = AES.decrypt(data, encryptionKey!).toString(crypto.enc.Utf8);

			if (!msg) {
				localStorage.removeItem(`${domain}/${filament}`);
				alert('incorrect encryption key');
				goto(`/?${params.toString()}`);
				return;
			}

			const message = JSON.parse(msg) as Message;
			messages = [...messages, message];
			if (messages.length > 100) {
				messages = messages.slice(-100);
			}

			if (document.visibilityState !== 'visible' && !mute) {
				new Notification(`${message.user}@${domain}/${filament}`, {
					body: message.text,
					icon: '/logo-256px.png'
				});
			}

			setTimeout(() => {
				messagesEl?.scrollTo(0, messagesEl.scrollHeight || document.body.scrollHeight);
			}, 0);
		};

		ws.onclose = (event) => {
			let reason = event.reason;
			if (!reason) {
				reason = 'WebSocket connection dropped unexpectedly.';
			}
			alert(reason);
			goto(`/?${params.toString()}`);
		};

		notificationsPermitted = Notification.permission === 'granted';
	});

	function requestNotificationPermissions() {
		if (Notification.permission === 'granted') {
			alert('notification permissions granted.');
		} else if (Notification.permission === 'denied') {
			alert(
				`notifications were denied. please update this setting in your browser settings for ${location.host}.`
			);
			return;
		}

		Notification.requestPermission().then((permission) => {
			notificationsPermitted = permission === 'granted';
		});
	}

	function send(event: Event | undefined) {
		event?.preventDefault();

		if (!message) {
			return;
		}

		const msg: Message = {
			user: `${nick.trim() ? nick.trim() : 'anonymous'}`,
			text: message
		};

		const block: MessageBlock = {
			filament: {
				domain: domain!,
				name: filament!
			},
			message: AES.encrypt(JSON.stringify(msg), encryptionKey!).toString()
		};

		ws.send(JSON.stringify(block));
		message = '';
	}

	$: if (nick) {
		if (browser) {
			localStorage.setItem('nick', nick);
		}
	}
</script>

<svelte:head>
	<title>{domain || 'filaments'}/{filament || 'loading...'}</title>
</svelte:head>

<div id="container" class="flex-col">
	<div id="messages-container">
		<div id="messages">
			{#each messages as message}
				<p>&lt;{message.user}&gt;: {message.text}</p>
			{/each}
		</div>
	</div>

	<div id="inputs" class="flex aic gap-2">
		<input
			id="nick-input"
			type="text"
			placeholder="nick"
			tabindex="-1"
			autocomplete="off"
			bind:value={nick}
		/>

		<form on:submit={send}>
			<input
				id="message-input"
				type="text"
				placeholder="message"
				autocomplete="off"
				bind:value={message}
			/>
		</form>

		<div>|</div>

		{#if notificationsPermitted}
			<label for="mute-toggle">mute</label>
			<input type="checkbox" id="mute-toggle" name="mute-toggle" bind:checked={mute} />
		{:else}
			<button tabindex="-1" on:click={requestNotificationPermissions}>notifications</button>
		{/if}
	</div>
</div>

<style>
	#container {
		width: 100vw;
		height: 100vh;
		overflow-y: hidden;

		#messages-container {
			overflow: auto;
			flex: 1 1 auto;

			#messages {
				height: 100%;
				overflow-y: auto;
				padding-bottom: 0.4rem;
			}
		}

		#inputs {
			width: 100%;

			#nick-input {
				width: min(20vw, 8rem);
			}

			form {
				width: 100%;

				#message-input {
					width: 100%;
				}
			}
		}
	}
</style>
