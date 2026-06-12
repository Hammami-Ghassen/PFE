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
import javax.net.ssl.*;
import java.security.cert.X509Certificate;

@Service
public class NewsScraperService {
    private static final Logger log = LoggerFactory.getLogger(NewsScraperService.class);
    private static final String URL = "https://santetunisie.rns.tn/fr/toutes-les-actualites?format=feed&type=rss";
    private static final int TIMEOUT_MS = 25000;

    private static void setTrustAllCerts() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return null; }
                    public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                    public void checkServerTrusted(X509Certificate[] certs, String authType) {}
                }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
        } catch (Exception e) {
            log.error("Failed to set trust-all certificate manager", e);
        }
    }

    public List<NewsDto> scrapeNews() {
        List<NewsDto> newsList = new ArrayList<>();
        try {
            setTrustAllCerts();
            Document doc = Jsoup.connect(URL)
                    .timeout(TIMEOUT_MS)
                    .userAgent("Mozilla/5.0")
                    .parser(org.jsoup.parser.Parser.xmlParser())
                    .get();

            Elements items = doc.select("item");
            for (Element item : items) {
                String title = item.select("title").text();
                String link = item.select("link").text();
                String date = item.select("pubDate").text();
                
                String description = item.select("description").text();
                String imageUrl = "";
                if (description != null && !description.isEmpty()) {
                    Document descDoc = Jsoup.parse(description);
                    Element img = descDoc.select("img").first();
                    if (img != null) {
                        imageUrl = img.attr("src");
                        if (!imageUrl.startsWith("http") && !imageUrl.isEmpty()) {
                            imageUrl = "https://santetunisie.rns.tn" + imageUrl;
                        }
                    }
                }
                
                if (title != null && !title.isEmpty()) {
                    newsList.add(NewsDto.builder()
                            .title(title)
                            .link(link)
                            .imageUrl(imageUrl)
                            .date(date)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Failed to scrape news from {}: {}", URL, e.getMessage());
            // Return empty list instead of throwing exception to avoid crashing the client
        }
        return newsList;
    }
}
