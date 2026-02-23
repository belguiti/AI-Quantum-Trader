package com.aiquantum.trade.controller;

import com.aiquantum.trade.model.MarketAsset;
import com.aiquantum.trade.repository.MarketAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market-assets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allow frontend access
public class MarketAssetController {

    private final MarketAssetRepository repository;

    @GetMapping
    public List<MarketAsset> getAllAssets() {
        return repository.findAll();
    }

    @PostMapping
    public MarketAsset createAsset(@RequestBody MarketAsset asset) {
        return repository.save(asset);
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<MarketAsset> toggleAsset(@PathVariable Long id) {
        return repository.findById(id).map(asset -> {
            asset.setActive(!asset.isActive());
            return ResponseEntity.ok(repository.save(asset));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAsset(@PathVariable Long id) {
        return repository.findById(id).map(asset -> {
            repository.delete(asset);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
