/**
 * RAAHI Frontend API Integration Service
 * Connects React UI to Java Spring Boot REST Backend
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function getAuthHeader() {
  const token = localStorage.getItem("raahi_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = data?.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, error: errorMsg, data };
    }
    return { ok: true, status: res.status, data: data?.data !== undefined ? data.data : data, raw: data };
  } catch (err) {
    return { ok: false, error: err.message || "Network error", offline: true };
  }
}

// ── Authentication ──
export async function apiLogin(username, password) {
  const res = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (res.ok && res.raw?.token) {
    localStorage.setItem("raahi_token", res.raw.token);
  }
  return res;
}

export async function apiRegister(userData) {
  const res = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData)
  });
  if (res.ok && res.raw?.token) {
    localStorage.setItem("raahi_token", res.raw.token);
  }
  return res;
}

// ── Profile ──
export async function apiGetProfile() {
  return request("/profile");
}

export async function apiUpdateProfile(profileData) {
  return request("/profile", {
    method: "PUT",
    body: JSON.stringify(profileData)
  });
}

// ── Emergency & SOS ──
export async function apiTriggerSos(locationData, notes = "SOS Emergency distress triggered") {
  return request("/emergency/sos", {
    method: "POST",
    body: JSON.stringify({
      latitude: locationData?.lat || null,
      longitude: locationData?.lon || locationData?.lng || null,
      accuracy: locationData?.accuracy || null,
      notes
    })
  });
}

export async function apiGetEmergencyEvents() {
  return request("/emergency/my-events");
}

// ── Emergency Contacts ──
export async function apiGetContacts() {
  return request("/emergency-contacts");
}

export async function apiAddContact(contact) {
  return request("/emergency-contacts", {
    method: "POST",
    body: JSON.stringify(contact)
  });
}

export async function apiDeleteContact(id) {
  return request(`/emergency-contacts/${id}`, {
    method: "DELETE"
  });
}

// ── Saved Places ──
export async function apiGetPlaces() {
  return request("/places");
}

export async function apiAddPlace(place) {
  return request("/places", {
    method: "POST",
    body: JSON.stringify(place)
  });
}

export async function apiDeletePlace(id) {
  return request(`/places/${id}`, {
    method: "DELETE"
  });
}

// ── Trips & Check-Ins ──
export async function apiGetTrips() {
  return request("/trips");
}

export async function apiCreateTrip(trip) {
  return request("/trips", {
    method: "POST",
    body: JSON.stringify(trip)
  });
}

export async function apiCheckInTrip(tripId, checkInData) {
  return request(`/trips/${tripId}/checkin`, {
    method: "POST",
    body: JSON.stringify(checkInData)
  });
}

// ── Incident Reporting (MongoDB) ──
export async function apiGetIncidents() {
  return request("/incidents");
}

export async function apiReportIncident(incident) {
  return request("/incidents", {
    method: "POST",
    body: JSON.stringify(incident)
  });
}

// ── Safety Check Intelligence (MongoDB) ──
export async function apiCheckCitySafety(city) {
  return request(`/safety/check?city=${encodeURIComponent(city)}`);
}

// ── Translation ──
export async function apiTranslate(text, targetLang) {
  return request("/translate", {
    method: "POST",
    body: JSON.stringify({ text, targetLang })
  });
}

