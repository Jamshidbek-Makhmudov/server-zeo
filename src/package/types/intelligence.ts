export type OveriewItem = {
	seller: string;
	sellerId: number;
	totalProducts: number;
	totalMarketplaces: number;
	totalBuyboxProducts: number;
	totalPriceSuggestions: number;
	updatedAt: string;
};

export type ProductMarketplaceData = {
	stock: number;
	price: string;
	buybox: string;
	rank: string;
};

export type PaginatedProducts = {
	data: Product[];
	perPage: number;
	page: number;
	total: number;
	lastPage: number;
};

export type Product = {
	id: number;
	sku: string;
	ean: string;
	title: string;
	marketplaces: {
		[key: string]: ProductMarketplaceData;
	};
};

export type ClientRobot = {
	seller: string;
	sellerId: number;

	marketplaces: {
		zeoosName: string;
		totalProducts: number;
		processes: {
			processId: number;
			status: boolean;
			totalProducts: number;
			type: string;
		}[];
	}[];
};

export type PaginatedClientRobot = {
	data: ClientRobot[];
	perPage: number;
	page: number;
	total: number;
	lastPage: number;
};

// Robot = Process
export type Robot = {
	id: number;
	totalProducts: number;
	status: boolean;
	type: string;
	setup: boolean;
	onlyBuybox: boolean;
	manager?: string;
	estimatedTime?: string;
	creator?: string;
	createdAt?: string;
	scheduleItems: ScheduleItem[];

	seller: string;
	sellerId: number;

	zeoosName: string;
	totalProductsOnMarketplace: number;
};

export type ScheduleItem = {
	id: number;
	frequency: string;
	startsAt: string;
	status: boolean;
	updatedAt: string;
	vps: string;
};

export type Category = {
	id: number;
	zeoosName: string;
	department: string;
	internalName: string;
	externalName: string;
	platformId: number;
};

export type ProductToCreate = {
	sku: string;
	name: string;
	barcode: string;

	odooPrice: string;
	price: string;
	stock: number;

	link: string;
	enabled: boolean;
};

export type RobotToCreate = {
	id?: number;
	setup: boolean;
	onlyBuybox: boolean;
	sellerId: number;
	zeoosName: string;

	zeoosRate: number;
	margin: number;
	markupDiscount: number;
};
