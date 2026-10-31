package com.raahi.dto;

public class TranslateResponse {
    private boolean success;
    private String translation;
    private String provider;
    private String error;

    public TranslateResponse() {}

    public TranslateResponse(boolean success, String translation, String provider, String error) {
        this.success = success;
        this.translation = translation;
        this.provider = provider;
        this.error = error;
    }

    public static TranslateResponse ok(String translation, String provider) {
        return new TranslateResponse(true, translation, provider, null);
    }

    public static TranslateResponse error(String error) {
        return new TranslateResponse(false, null, null, error);
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getTranslation() { return translation; }
    public void setTranslation(String translation) { this.translation = translation; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

