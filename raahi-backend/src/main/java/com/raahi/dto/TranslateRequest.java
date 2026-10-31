package com.raahi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TranslateRequest {

    @NotBlank(message = "Text to translate is required")
    @Size(max = 5000, message = "Text cannot exceed 5000 characters")
    private String text;

    private String source = "en";
    private String target = "hi";

    public TranslateRequest() {}

    public TranslateRequest(String text, String source, String target) {
        this.text = text;
        this.source = source;
        this.target = target;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
}

