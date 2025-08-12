<script lang="ts">
	import crypto from 'crypto-js';
	const { AES, SHA256 } = crypto;

	import { goto } from '$app/navigation';
	import { serverHostname, type Message, type MessageBlock } from '$lib';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let domain: string | undefined;
	let filament: string | undefined;
	let key: string | undefined;
	let encryptionKey: string | undefined;

	let username = '<anonymous>';
	let message = '';

	let ws: WebSocket;
	let messages: Message[] = [];

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

		const storedUsername = localStorage.getItem('username');
		if (storedUsername != null) {
			username = storedUsername;
		}

		ws = new WebSocket(
			`${location.protocol.replace('http', 'ws')}//${serverHostname}/${domain}/${filament}`
		);

		ws.onmessage = (event) => {
			const msg = AES.decrypt(event.data, encryptionKey!).toString(crypto.enc.Utf8);

			if (!msg) {
				localStorage.removeItem(`${domain}/${filament}`);
				alert('incorrect encryption key');
				goto(`/?${params.toString()}`);
				return;
			}

			messages = [JSON.parse(msg) as Message, ...messages];
		};

		ws.onclose = (event) => {
			let reason = event.reason;
			if (!reason) {
				reason = 'WebSocket connection dropped unexpectedly.';
			}
			alert(reason);
			goto(`/?${params.toString()}`);
		};
	});

	function send() {
		const msg: Message = {
			user: username,
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

	$: if (browser) {
		localStorage.setItem('username', username);
	}
</script>

{#each messages as message}
	<p>{message.user}: {message.text}</p>
{/each}
