package com.sante.app.controller;

import com.sante.app.dto.response.ApiResponse;
import com.sante.app.dto.response.NewsDto;
import com.sante.app.service.NewsScraperService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsScraperService newsScraperService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NewsDto>>> getNews() {
        List<NewsDto> newsList = newsScraperService.scrapeNews();
        return ResponseEntity.ok(ApiResponse.success(newsList));
    }
}
