export const replicateMarketplacePrices = async (userId?: string) => {
  const products = (await MarketplaceProduct.find()).map(
    (p: any) => p?._doc || p
  );

  const marketplaces = await Marketplace.find();

  const vinuusMarketplaces = marketplaces.filter(
    (m: any) =>
      m.marketplaceName === "shopify" && m.zeoosName.indexOf("Vinuus") === 0
  );

  const log = await Promise.all(
    products.map(async (product: any) => {
      let log = [] as string[];
      let update = false;
      let error = false;

      if (isNaN(Number(product.sku))) {
        log.push(`<hr>SKU: ${product.sku} IS INVALID`);
        return log;
      }

      log.push(`<hr>SKU: ${product.sku}`);
      console.log(`SKU: ${product.sku}`);

      vinuusMarketplaces.map((vm: any) => {
        if (product.marketplaces[vm.zeoosName]) {
          const price = Number(product.marketplaces[vm.zeoosName].price);
          const vendorPrice = Number(
            product.marketplaces[vm.zeoosName].vendorPrice
          );
          const priceStandard = Number(
            product.marketplaces[vm.zeoosName].priceStandard
          );
          const vendorPriceStandard = Number(
            product.marketplaces[vm.zeoosName].vendorPriceStandard
          );

          if (isNaN(price)) {
            log.push(`${vm.zeoosName}: PRICE IS NOT FOUND!`);
            console.log(`${vm.zeoosName}: PRICE IS NOT FOUND!`);
            error = true;
            return;
          }

          if (isNaN(vendorPrice)) {
            log.push(`${vm.zeoosName}: VENDOR PRICE IS NOT FOUND!`);
            console.log(`${vm.zeoosName}: VENDOR PRICE IS NOT FOUND!`);
            error = true;
            return;
          }

          console.log(
            vm.zeoosName,
            price,
            vendorPrice,
            priceStandard,
            vendorPriceStandard
          );

          const otherMarketplaces = marketplaces.filter(
            (m: any) =>
              (m.marketplaceName !== "shopify" ||
                m.zeoosName.indexOf("Vinuus") !== 0) &&
              m.country === vm.country
          );

          otherMarketplaces.map((om: any) => {
            const otherPrice = Number(
              product.marketplaces[om.zeoosName]?.price
            );
            const otherVendorPrice = Number(
              product.marketplaces[om.zeoosName]?.vendorPrice
            );
            const otherPriceStandard = Number(
              product.marketplaces[om.zeoosName]?.priceStandard
            );
            const otherVendorPriceStandard = Number(
              product.marketplaces[om.zeoosName]?.vendorPriceStandard
            );
            console.log(
              om.zeoosName,
              otherPrice,
              otherVendorPrice,
              otherPriceStandard,
              otherVendorPriceStandard
            );

            if (
              price !== otherPrice ||
              vendorPrice !== otherVendorPrice ||
              (!isNaN(priceStandard) && priceStandard !== otherPriceStandard) ||
              (!isNaN(vendorPriceStandard) &&
                vendorPriceStandard !== otherVendorPriceStandard)
            ) {
              let logPriceStd = priceStandard
                ? `, PriceStandard = ${otherPriceStandard} -> ${priceStandard}`
                : "";
              let logVendorPriceStd = vendorPriceStandard
                ? `, VendorPriceStandard = ${otherVendorPriceStandard} -> ${vendorPriceStandard}`
                : "";
              console.log(
                `${om.zeoosName}: Price = ${otherPrice} -> ${price}, VendorPrice = ${otherVendorPrice} -> ${vendorPrice} ${logPriceStd} ${logVendorPriceStd}`
              );
              log.push(
                `${om.zeoosName}: Price = ${otherPrice} -> ${price}, VendorPrice = ${otherVendorPrice} -> ${vendorPrice} ${logPriceStd} ${logVendorPriceStd}`
              );

              if (!product.marketplaces[om.zeoosName]) {
                product.marketplaces[om.zeoosName] = {};
              }

              product.marketplaces[om.zeoosName].price = price;
              product.marketplaces[om.zeoosName].vendorPrice = vendorPrice;
              if (priceStandard) {
                product.marketplaces[om.zeoosName].priceStandard =
                  priceStandard;
              }
              if (vendorPriceStandard) {
                product.marketplaces[om.zeoosName].vendorPriceStandard =
                  vendorPriceStandard;
              }
              update = true;
            }
          });
        } else {
          console.log(`${vm.zeoosName}: NOT FOUND!`);
          log.push(`${vm.zeoosName}: NOT FOUND!`);
        }

        console.log("-------");
      });

      if (update) {
        const productMarketplaces = product.marketplaces;
        const res = await MarketplaceProduct.updateOne(
          { sku: product.sku },
          { marketplaces: productMarketplaces }
        );
        log.push(`Updated: ${res.nModified}`);
      }

      if (error || update) {
        return log;
      }
    })
  );

  if (userId) {
    const user = await User.findOne({ _id: userId }).select("email");
    sendMail(
      user!.email,
      `Replicate webstores prices`,
      `
			<h3>Price update have finished</h3>
			${log
        .filter((l) => l != undefined)
        .flat(2)
        .join("<br>")}
			`
    );
  }
};