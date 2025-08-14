<script lang="ts">
	import { serverHost } from '$lib/host';

	import { onMount } from 'svelte';
	import { goto, pushState } from '$app/navigation';

	import crypto from 'crypto-js';
	const { SHA256 } = crypto;

	let serverUrl: string | undefined;

	let domainInput = '';
	let domain: string | undefined;

	let filamentInput: string | undefined;

	let newPassphrase = true;
	let passphrase = '';

	onMount(() => {
		serverUrl = location.protocol + '//' + serverHost;

		newPassphrase = localStorage.getItem('passphrase-verify') == null;

		const params = new URLSearchParams(location.search);

		const domainParam = params.get('domain');
		if (domainParam == null) {
			document.getElementById('domain-input')?.focus();
			return;
		}

		domainInput = domainParam;
		domain = domainParam;

		const filamentParam = params.get('filament');
		if (filamentParam) {
			filamentInput = filamentParam;
			document.getElementById('passphrase-input')?.focus();
		}
	});

	function clear() {
		if (
			confirm(
				'are you sure you want to clear everything? this will delete your passphrase and stored encryption keys.'
			)
		) {
			goto('clear');
		}
	}

	function requestNotificationPermissions() {
		if (Notification.permission === 'granted') {
			alert('notification permissions granted.');
		} else if (Notification.permission === 'denied') {
			alert(
				`notifications were denied. please update this setting in your browser settings for ${location.host}.`
			);
			return;
		}

		Notification.requestPermission();
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const params = new URLSearchParams(location.search);

		const inputtedDomain = domainInput.trim();
		if (inputtedDomain) {
			params.set('domain', inputtedDomain);
			domain = inputtedDomain;
		} else {
			params.delete('domain');
			domain = '';
		}

		if (filamentInput) {
			params.set('filament', filamentInput);
			document.getElementById('passphrase-input')?.focus();
		} else {
			params.delete('filament');
			filamentInput = domain ? '' : undefined;
		}

		if (passphrase) {
			const passphraseVerify = localStorage.getItem('passphrase-verify');
			if (passphraseVerify == null) {
				localStorage.setItem('passphrase-verify', SHA256(passphrase + '-sha256').toString());
			} else if (passphraseVerify != SHA256(passphrase + '-sha256').toString()) {
				alert('incorrect passphrase');
				location.reload();
				return;
			}

			const now = new Date();
			const time = now.getTime();
			const expireTime = time + 30000;
			now.setTime(expireTime);
			document.cookie = `key=${SHA256(passphrase).toString()};expires=${now.toUTCString()};Max-Age=30`;

			goto(`chat?${params.toString()}`);
			return;
		}

		pushState(`?${params.toString()}`, '');
	}

	$: if (domain) {
		if (!filamentInput) {
			filamentInput = '';
			document.getElementById('filament-input')?.focus();
		}
	}
</script>

<head>
	<title>filaments</title>
</head>

<div class="flex-col aic jcc gap-8 w100 h100">
	<form class="fake-form" class:shown={filamentInput == undefined}>
		<input type="text" placeholder="filament" bind:value={filamentInput} readonly tabindex="-1" />
	</form>

	<form class="fake-form" class:shown={filamentInput == undefined}>
		<input
			type={filamentInput == undefined ? 'text' : 'password'}
			placeholder="passphrase"
			bind:value={passphrase}
			readonly
			autocomplete="off"
			tabindex="-1"
		/>
	</form>

	<div class="flex gap-4">
		<button tabindex="-1" on:click={clear}>clear</button>
		<button tabindex="-1" on:click={requestNotificationPermissions}>notifications</button>
	</div>

	<h1>filaments</h1>

	<form id="domain-form" on:submit={handleSubmit}>
		<input id="domain-input" type="text" placeholder="domain" bind:value={domainInput} />
	</form>

	<form id="filament-form" class:shown={filamentInput !== undefined} on:submit={handleSubmit}>
		<input
			id="filament-input"
			type="text"
			placeholder="filament"
			readonly={filamentInput == undefined}
			tabindex={filamentInput == undefined ? -1 : 0}
			bind:value={filamentInput}
		/>
	</form>

	<form id="passphrase-form" class:shown={filamentInput !== undefined} on:submit={handleSubmit}>
		<input
			id="passphrase-input"
			type={filamentInput == undefined ? 'text' : 'password'}
			placeholder="{newPassphrase ? 'new ' : ''}passphrase"
			readonly={filamentInput == undefined}
			tabindex={filamentInput == undefined ? -1 : 0}
			autocomplete={newPassphrase ? 'new-password' : 'current-password'}
			bind:value={passphrase}
		/>
	</form>
</div>

<style>
	.fake-form {
		opacity: 0;
		display: none;

		&.shown {
			display: unset;
		}
	}

	#filament-form {
		opacity: 0;

		&.shown {
			opacity: 1;
		}
	}

	#passphrase-form {
		opacity: 0;

		&.shown {
			opacity: 1;
		}
	}
</style>
