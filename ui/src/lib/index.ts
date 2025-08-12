export const serverHostname = 'localhost:8443';

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
