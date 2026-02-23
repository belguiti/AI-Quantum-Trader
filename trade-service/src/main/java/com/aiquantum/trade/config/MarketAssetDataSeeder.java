package com.aiquantum.trade.config;

import com.aiquantum.trade.model.MarketAsset;
import com.aiquantum.trade.repository.MarketAssetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MarketAssetDataSeeder implements CommandLineRunner {

    private final MarketAssetRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            log.info("Seeding Market Assets...");

            List<MarketAsset> assets = Arrays.asList(
                    createAsset("BTCUSD", "BTCUSD", MarketAsset.AssetClass.CRYPTO),
                    createAsset("ETHUSD", "ETHUSD", MarketAsset.AssetClass.CRYPTO),
                    createAsset("EURUSD", "EURUSD", MarketAsset.AssetClass.FOREX),
                    createAsset("GBPUSD", "GBPUSD", MarketAsset.AssetClass.FOREX),
                    createAsset("USDJPY", "USDJPY", MarketAsset.AssetClass.FOREX),
                    createAsset("XAUUSD", "XAUUSD", MarketAsset.AssetClass.COMMODITY), // Gold
                    createAsset("XTIUSD", "XTIUSD", MarketAsset.AssetClass.COMMODITY), // Crude Oil
                    createAsset("US100", "US100", MarketAsset.AssetClass.INDEX), // Nasdaq
                    createAsset("US500", "US500", MarketAsset.AssetClass.INDEX), // S&P 500
                    createAsset("DE40", "DE40", MarketAsset.AssetClass.INDEX) // DAX
            );

            repository.saveAll(assets);
            log.info("Seeding completed. Added {} assets.", assets.size());
        }
    }

    private MarketAsset createAsset(String symbol, String brokerSymbol, MarketAsset.AssetClass assetClass) {
        MarketAsset asset = new MarketAsset();
        asset.setSymbol(symbol);
        asset.setBrokerSymbol(brokerSymbol);
        asset.setAssetClass(assetClass);
        asset.setActive(true);
        return asset;
    }
}
