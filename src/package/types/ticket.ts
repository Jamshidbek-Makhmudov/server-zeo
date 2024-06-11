export enum TicketStatus {
	CLOSED = "CLOSED",
	OPEN = "OPEN",
}

export type Ticket = {
	_id: string;

	status: TicketStatus;
	reason: string;
	seller: string;
	users: string[];

	description: string;

	initiator: string;

	created: string;
	updated: string;
};

export type TicketMessage = {
	_id: string;
	ticketId: string;
	sender:
		| string
		| {
				_id: string;
				username: string;
				profileImage: string;
		  };

	text: string;
	file?: string;
	fileName?: string;

	created: string;
};

export type TicketNotification = {
	_id: string;
	user: string;
	ticket: string;
	wasRead: boolean;
	created: string;
};
