package com.sante.app.service;

import com.sante.app.dto.response.NewsDto;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;


import java.util.ArrayList;
import java.util.List;

@Service
public class NewsScraperService {
    private static final Logger log = LoggerFactory.getLogger(NewsScraperService.class);
    private static final String URL = "https://santetunisie.rns.tn/fr/";
    private static final int TIMEOUT_MS = 5000;

    public List<NewsDto> scrapeNews() {
        List<NewsDto> newsList = new ArrayList<>();
        try {
            Document doc = Jsoup.connect(URL)
                    .timeout(TIMEOUT_MS)
                    .userAgent("Mozilla/5.0")
                    .get();

            Element slider = doc.getElementById("btcontentslider97");
            if (slider != null) {
                Elements items = slider.select(".fc-item");
                for (Element item : items) {
                    String title = item.select(".fc-item-title a").text();
                    String link = item.select(".fc-item-title a").attr("href");
                    if (!link.startsWith("http")) {
                        link = "https://santetunisie.rns.tn" + link;
                    }
                    
                    String imageUrl = item.select(".fc-item-image img").attr("src");
                    if (!imageUrl.startsWith("http") && !imageUrl.isEmpty()) {
                        imageUrl = "https://santetunisie.rns.tn" + imageUrl;
                    }
                    
                    String date = item.select(".fc-item-date").text();
                    
                    if (title != null && !title.isEmpty()) {
                        newsList.add(NewsDto.builder()
                                .title(title)
                                .link(link)
                                .imageUrl(imageUrl)
                                .date(date)
                                .build());
                    }
                }
            } else {
                log.warn("News slider element 'btcontentslider97' not found on the page.");
            }
        } catch (Exception e) {
            log.error("Failed to scrape news from {}: {}", URL, e.getMessage());
            // Return empty list instead of throwing exception to avoid crashing the client
        }
        return newsList;
    }
}
