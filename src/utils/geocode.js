// Use OpenStreetMap Nominatim API for geocoding

export async function geocode(locationName) {
    if (!locationName) return null;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

export async function fetchLocationSuggestions(query) {
    if (!query || query.length < 3) return [];
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        return data.map(item => ({
            id: item.place_id,
            displayName: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
        }));
    } catch (error) {
        console.error("Suggestion error:", error);
        return [];
    }
}
