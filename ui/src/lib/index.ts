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
