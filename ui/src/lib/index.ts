export const serverHostname = 'vigilant-space-yodel-pqp7wj9994p37rpw-8443.app.github.dev';

interface Filament {
	domain: string;
	name: string;
}

export interface MessageBlock {
	filament: Filament;
	message: string;
}

export interface Message {
	user: string;
	text: string;
}
