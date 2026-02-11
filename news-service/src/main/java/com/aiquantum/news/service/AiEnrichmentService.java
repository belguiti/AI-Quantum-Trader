package com.aiquantum.news.service;

import com.aiquantum.news.model.NewsItem;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@Service
public class AiEnrichmentService {

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    public AiEnrichmentService(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    public void enrich(NewsItem item) {
        String template = """
            Analyze the following financial news and provide a JSON response with:
            - category: One of [FINANCE, REAL_ESTATE, MARKET, GOLD, CRYPTO, FOREX]
            - priority: One of [HIGH, MEDIUM, LOW] (High if major market impact)
            - sentiment: One of [BULLISH, BEARISH, NEUTRAL]
            
            Title: {title}
            Summary: {summary}
            
            Response Format: \\{"category": "...", "priority": "...", "sentiment": "..."\\}
            
            IMPORTANT: Return ONLY the JSON object. No Markdown. No text before or after.
            """;
            
        PromptTemplate promptTemplate = new PromptTemplate(template);
        Prompt prompt = promptTemplate.create(Map.of("title", item.getTitle(), "summary", item.getSummary()));
        
        try {
            String response = chatModel.call(prompt).getResult().getOutput().getContent();
            
            // Robust JSON extraction
            int startIndex = response.indexOf("{");
            int endIndex = response.lastIndexOf("}");
            if (startIndex != -1 && endIndex != -1) {
                response = response.substring(startIndex, endIndex + 1);
            }
            
            Map<String, String> analysis = objectMapper.readValue(response, Map.class);
            
            item.setCategory(analysis.getOrDefault("category", "MARKET"));
            item.setPriority(analysis.getOrDefault("priority", "LOW"));
            item.setSentiment(analysis.getOrDefault("sentiment", "NEUTRAL"));
            
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback
            item.setCategory("MARKET");
            item.setPriority("LOW");
            item.setSentiment("NEUTRAL");
        }
    }
}
