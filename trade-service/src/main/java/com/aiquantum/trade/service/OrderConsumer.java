package com.aiquantum.trade.service;

import com.aiquantum.trade.dto.OrderIntentDTO;
import com.aiquantum.trade.model.Trade;
import com.aiquantum.trade.repository.TradeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumer {

    private final Mt5ConnectorClient mt5Client;
    private final TradeRepository tradeRepository;
    private final ObjectMapper objectMapper;

    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "order.intent", groupId = "trade-service-group")
    public void consumeOrderIntent(String message) {
        try {
            OrderIntentDTO intent = objectMapper.readValue(message, OrderIntentDTO.class);
            log.info("Received Order Intent: {}", intent);

            // Execute on MT5
            Mt5ConnectorClient.OrderIntent mt5Order = new Mt5ConnectorClient.OrderIntent();
            mt5Order.setSymbol(intent.getSymbol());
            mt5Order.setSide(intent.getSide());
            mt5Order.setLot(intent.getQuantity()); // Assuming quantity mapped to lots
            mt5Order.setSl(intent.getSl());
            mt5Order.setTp(intent.getTp());
            mt5Order.setDeviation(20); // Default deviation
            mt5Order.setComment(intent.getComment());

            var response = mt5Client.placeOrder(intent.getMt5BaseUrl(), mt5Order);

            if (response.isSuccess()) {
                log.info("Order Executed Successfully: {}", response.getOrderId());

                // Record Trade
                Trade trade = new Trade();
                trade.setUserId(intent.getUserId());
                trade.setSymbol(intent.getSymbol());
                trade.setSide(intent.getSide());
                trade.setEntryPrice(intent.getSl()); // Approx entry, typically we get this from response
                // Ideally response should contain execution price
                trade.setQuantity(intent.getQuantity());
                trade.setExternalOrderId(response.getOrderId());
                trade.setEntryTime(LocalDateTime.now());
                trade.setSl(intent.getSl());
                trade.setTp(intent.getTp());
                trade.setStatus("EXECUTED");
                if (intent.getOpportunityId() != null && !intent.getOpportunityId().equals("null")) {
                    trade.setOpportunityId(Long.valueOf(intent.getOpportunityId()));
                }

                tradeRepository.save(trade);

                // Publish order.executed event (omitted for brevity)
            } else {
                log.error("Order Failed: {}", response.getMessage());

                // Handle 10027 specifically or generic failure
                String errorMsg = response.getMessage();
                if (errorMsg != null && (errorMsg.contains("10027") || errorMsg.contains("AutoTrading disabled"))) {
                    log.error("CRITICAL: Algo Trading is DISABLED in MT5 Terminal.");

                    Trade failedTrade = new Trade();
                    failedTrade.setUserId(intent.getUserId());
                    failedTrade.setSymbol(intent.getSymbol());
                    failedTrade.setSide(intent.getSide());
                    failedTrade.setQuantity(intent.getQuantity());
                    failedTrade.setEntryTime(LocalDateTime.now());
                    failedTrade.setStatus("FAILED");
                    failedTrade.setStrategyBreakdown(
                            "MT5 Error 10027: Algo Trading Disabled! Please enable 'Algo Trading' in MT5.");
                    if (intent.getOpportunityId() != null && !intent.getOpportunityId().equals("null")) {
                        failedTrade.setOpportunityId(Long.valueOf(intent.getOpportunityId()));
                    }

                    tradeRepository.save(failedTrade);
                    messagingTemplate.convertAndSend("/topic/trades", failedTrade);
                }
            }

        } catch (Exception e) {
            log.error("Error consuming order intent", e);
        }
    }
}
