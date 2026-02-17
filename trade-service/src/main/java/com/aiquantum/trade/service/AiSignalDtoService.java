package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.AiSignalDTO;
import com.aiquantum.trade.model.Opportunity;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiSignalDtoService {

    private final TradeRepository tradeRepository;

    public List<AiSignalDTO> mapToDtos(List<Opportunity> opportunities) {
        // Bulk fetch trades for these opportunities
        List<Long> oppIds = opportunities.stream().map(Opportunity::getId).collect(Collectors.toList());
        List<Trade> trades = tradeRepository.findByOpportunityIdIn(oppIds);

        Map<Long, Trade> tradeMap = trades.stream()
                .filter(t -> t.getOpportunityId() != null)
                .collect(Collectors.toMap(Trade::getOpportunityId, t -> t, (existing, replacement) -> existing));

        return opportunities.stream().map(opp -> {
            AiSignalDTO dto = new AiSignalDTO();
            dto.setId(opp.getId());
            dto.setSymbol(opp.getSymbol());
            dto.setSide(opp.getSide());
            dto.setEntryPrice(opp.getEntryPrice());
            dto.setSl(opp.getSl());
            dto.setTp(opp.getTp());
            dto.setConfidence(opp.getConfidence());
            dto.setStrategyBreakdown(opp.getStrategyBreakdown());
            dto.setCreatedAt(opp.getCreatedAt());
            dto.setStatus(opp.getStatus());

            Trade trade = tradeMap.get(opp.getId());
            if (trade != null) {
                dto.setExitPrice(trade.getExitPrice());
                dto.setPnl(trade.getPnl());
                dto.setExitTime(trade.getExitTime());
                dto.setTradeStatus(trade.getStatus());
            }

            return dto;
        }).collect(Collectors.toList());
    }

    public Page<AiSignalDTO> mapToPage(Page<Opportunity> page) {
        List<AiSignalDTO> content = mapToDtos(page.getContent());
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }
}
