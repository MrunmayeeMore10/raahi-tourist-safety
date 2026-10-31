package com.raahi.dto;

public class ProfileUpdateRequest {
    private String name;
    private String username;
    private String email;
    private String phone;
    private String phoneCode;
    private String gender;
    private String country;
    private String address;
    private String emergency;
    private String emgCode;
    private String medical;
    private String idType;
    private String photo;
    private String password;

    public ProfileUpdateRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPhoneCode() { return phoneCode; }
    public void setPhoneCode(String phoneCode) { this.phoneCode = phoneCode; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergency() { return emergency; }
    public void setEmergency(String emergency) { this.emergency = emergency; }

    public String getEmgCode() { return emgCode; }
    public void setEmgCode(String emgCode) { this.emgCode = emgCode; }

    public String getMedical() { return medical; }
    public void setMedical(String medical) { this.medical = medical; }

    public String getIdType() { return idType; }
    public void setIdType(String idType) { this.idType = idType; }

    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

