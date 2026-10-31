package com.raahi.service;

import com.raahi.dto.TranslateRequest;
import com.raahi.dto.TranslateResponse;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TranslationService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public TranslateResponse translate(TranslateRequest request) {
        String text = request.getText();
        String source = request.getSource() != null ? request.getSource() : "en";
        String target = request.getTarget() != null ? request.getTarget() : "hi";

        if (source.equalsIgnoreCase(target)) {
            return TranslateResponse.ok(text.trim(), "same-language");
        }

        try {
            String langPair = source + "|" + target;
            String url = "https://api.mymemory.translated.net/get?q=" +
                    URLEncoder.encode(text.trim(), StandardCharsets.UTF_8) +
                    "&langpair=" + URLEncoder.encode(langPair, StandardCharsets.UTF_8);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "RAAHI-Tourist-Safety-App/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            String body = response.body();

            Pattern pattern = Pattern.compile("\"translatedText\"\\s*:\\s*\"(.*?)\"(,\\s*\"|\\})");
            Matcher matcher = pattern.matcher(body);
            if (matcher.find()) {
                String translated = decodeEscapes(matcher.group(1));
                return TranslateResponse.ok(translated, "mymemory");
            }

            return TranslateResponse.ok(text.trim(), "original");
        } catch (Exception e) {
            return TranslateResponse.error("Translation engine is currently offline. Please check your network connection.");
        }
    }

    private String decodeEscapes(String s) {
        return s.replace("\\\"", "\"")
                .replace("\\n", "\n")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">");
    }
}

