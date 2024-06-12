import { Schema, model } from "mongoose";

export const rankingZeoosSchema = new Schema({
		sku:  { type: "String", required: true, unique: true },
		marketplaces: { type: Map, of: [Object] },
	},
	{ collection: "rankingZeoos" }
);

export const RankingZeoos = model("RankingZeoos", rankingZeoosSchema);

export const logRankingZeoos = async (sku: string, zeoosName: string, data: any) => {
	if (!await RankingZeoos.countDocuments({ sku })) {
		await RankingZeoos.create({ sku });
	}

	await RankingZeoos.updateOne(
		{ sku },
		{
			$push: { [`marketplaces.${zeoosName}`]: data }
		}
	);
}

export const winnerRankingZeoosDate = async (prod: any, zeoosName: string, date: Date) => {
	console.log(prod.sku, zeoosName, date);
	const ranking = await RankingZeoos.findOne({ sku: prod.sku })
		.select([`marketplaces.${zeoosName}`]);

  const winner = ranking?.marketplaces?.get(zeoosName)
    ?.reverse().find(
      (p:any) => p.date?.getTime() < date?.getTime()
    );

  if (winner) {
    return {
      ...winner,
      seller: { id: winner.seller }
    }
  }
}

export const winnerRankingZeoosDate_old = async (sku: string, zeoosName: string, date: Date) => {
	console.log(sku, zeoosName, date);
	const ranking = await RankingZeoos.findOne({sku})
		.select([`marketplaces.${zeoosName}`]);

	return ranking?.marketplaces?.get(zeoosName)
		?.reverse().find(
			(p:any) => p.date?.getTime() < date?.getTime()
		);
}

//TODO: Remodeling
export const getCurrentWinnerLog = async (sku: string, zeoosName: string) => {
  const current = await RankingZeoos.aggregate([
    {
      $match: { sku }
    },
    {
      $project: {
        price: { $arrayElemAt: [ `$marketplaces.${zeoosName}`, -1 ] }
      }
    }
  ]);
  if (current.length) return current[0].price;
}
