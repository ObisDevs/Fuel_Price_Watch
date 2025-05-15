// DOM Elements
const themeToggle = document.querySelector('.theme-toggle');
const modeIcon = document.querySelector('.mode-icon');
const timerText = document.querySelector('.timer-text');
const refreshBtn = document.getElementById('refresh-btn');
const stationSearch = document.getElementById('station-search');
const productFilter = document.getElementById('product-filter');
const stationsContainer = document.getElementById('stations-container');
const loadingOverlay = document.getElementById('loading-overlay');
import { Analytics } from "@vercel/analytics/next"

// Google Sheet URL - Provided by the user
// This should be published as CSV for production use
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1xKxhjcnl6p1V3yeG5u6SeE3Fp-G5bbD9ixPv6UK5ee0/edit?usp=sharing';

// Store the data globally for filtering
let stationsData = [];

// Check for saved theme preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    modeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    modeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
});

// Initialize countdown timer
let countdown = 60;
function updateTimer() {
    timerText.textContent = `${countdown}s`;
    countdown--;
    if (countdown < 0) {
        countdown = 60;
        fetchFuelData(); // Refresh data when timer reaches 0
    }
}

// Fetch data from Google Sheet with minimum 1-second preloader
async function fetchFuelData() {
    // Show the loading overlay
    loadingOverlay.classList.add('active');
    
    // Record the start time to ensure minimum 1-second display
    const startTime = new Date().getTime();
    
    try {
        // Extract the sheet ID from the URL
        const sheetIdMatch = GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/); 
        if (sheetIdMatch && sheetIdMatch[1]) {
            const sheetId = sheetIdMatch[1];
            // Use the export URL format to get the sheet as CSV
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
            
            fetch(csvUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.text();
                })
                .then(csvData => {
                    // Parse CSV data
                    const parsedData = parseCSV(csvData);
                    stationsData = parsedData;
                    
                    // Calculate elapsed time
                    const elapsedTime = new Date().getTime() - startTime;
                    const remainingTime = Math.max(0, 1000 - elapsedTime);
                    
                    // Ensure preloader is visible for at least 1 second
                    setTimeout(() => {
                        renderStations(stationsData);
                        updateAveragePrices(stationsData);
                        
                        // Add a fade-out effect
                        loadingOverlay.style.opacity = '0';
                        setTimeout(() => {
                            loadingOverlay.classList.remove('active');
                            loadingOverlay.style.opacity = '';
                        }, 500);
                    }, remainingTime);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    loadingOverlay.classList.remove('active');
                    alert('Failed to load fuel prices. Please try again later.');
                });
        } else {
            console.error('Invalid Google Sheet URL format');
            
            // Calculate elapsed time for minimum 1-second display
            const elapsedTime = new Date().getTime() - startTime;
            const remainingTime = Math.max(0, 1000 - elapsedTime);
            
            setTimeout(() => {
                loadingOverlay.classList.remove('active');
                alert('Invalid Google Sheet URL format. Please check the URL.');
            }, remainingTime);
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // Calculate elapsed time for minimum 1-second display
        const elapsedTime = new Date().getTime() - startTime;
        const remainingTime = Math.max(0, 1000 - elapsedTime);
        
        setTimeout(() => {
            loadingOverlay.classList.remove('active');
            alert('Failed to load fuel prices. Please try again later.');
        }, remainingTime);
    }
}

// Function to parse CSV data (for real Google Sheets implementation)
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',');
        if (currentLine.length === headers.length) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = currentLine[j].trim();
            }
            result.push(obj);
        }
    }
    
    return result;
}

// Render stations data to the DOM with animations
function renderStations(stations) {
    stationsContainer.innerHTML = '';
    
    if (stations.length === 0) {
        stationsContainer.innerHTML = '<div class="station-card"><h3 class="station-name">No stations found</h3><p class="station-location">Try adjusting your search criteria</p></div>';
        return;
    }
    
    // Add animation delay for each card to create staggered effect
    stations.forEach((station, index) => {
        const stationCard = document.createElement('div');
        stationCard.className = 'station-card';
        
        // Add staggered animation delay
        stationCard.style.opacity = '0';
        stationCard.style.transform = 'translateY(20px)';
        stationCard.style.transition = 'all 0.5s ease';
        
        stationCard.innerHTML = `
            <h3 class="station-name">${station["Station Name"]}</h3>
            <p class="station-location">${station["Location"]}</p>
            <div class="fuel-prices">
                <div class="fuel-type">⛽ Petrol</div>
                <div class="fuel-price">₦${station["Petrol Price"]}</div>
                
                <div class="fuel-type">🛢️ Diesel</div>
                <div class="fuel-price">₦${station["Diesel Price"]}</div>
                
                <div class="fuel-type">🔥 Kerosene</div>
                <div class="fuel-price">₦${station["Kerosene Price"]}</div>
            </div>
            <div class="station-updated">Last updated: ${formatDate(station["Last Updated"])}</div>
        `;
        
        stationsContainer.appendChild(stationCard);
        
        // Trigger animation after a short delay based on index
        setTimeout(() => {
            stationCard.style.opacity = '1';
            stationCard.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// Update average prices in the dashboard with animation
function updateAveragePrices(stations) {
    if (stations.length === 0) return;
    
    // Add an animation effect to price changes
    const animatePriceChange = (element, newValue) => {
        // Add a highlight effect
        element.style.transition = 'none';
        element.style.color = 'var(--highlight)';
        element.style.transform = 'scale(1.1)';
        element.textContent = newValue;
        
        // Revert to normal after a short delay
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.color = '';
            element.style.transform = 'scale(1)';
        }, 50);
    };
    
    // Calculate averages
    const totalPetrol = stations.reduce((sum, station) => sum + parseFloat(station["Petrol Price"]), 0);
    const totalDiesel = stations.reduce((sum, station) => sum + parseFloat(station["Diesel Price"]), 0);
    const totalKerosene = stations.reduce((sum, station) => sum + parseFloat(station["Kerosene Price"]), 0);
    
    const avgPetrol = (totalPetrol / stations.length).toFixed(2);
    const avgDiesel = (totalDiesel / stations.length).toFixed(2);
    const avgKerosene = (totalKerosene / stations.length).toFixed(2);
    
    // Update the DOM with animations
    animatePriceChange(document.getElementById('avg-petrol'), avgPetrol);
    animatePriceChange(document.getElementById('avg-diesel'), avgDiesel);
    animatePriceChange(document.getElementById('avg-kerosene'), avgKerosene);
    
    // Update last updated time
    const now = new Date();
    const formattedTime = formatTime(now);
    document.getElementById('last-updated-time').textContent = formattedTime;
    document.getElementById('last-updated-time-diesel').textContent = formattedTime;
    document.getElementById('last-updated-time-kerosene').textContent = formattedTime;
    
    // For a real app, we would calculate trends based on historical data
    // For now, we'll use static values for the demo
    document.getElementById('petrol-trend').textContent = '2.5%';
    document.getElementById('diesel-trend').textContent = '1.8%';
    document.getElementById('kerosene-trend').textContent = '0.7%';
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as-is if invalid date
    
    return date.toLocaleString('en-NG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to format time
function formatTime(date) {
    return date.toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Filter stations by search query and product type
function filterStations() {
    const searchQuery = stationSearch.value.toLowerCase();
    const productType = productFilter.value;
    
    let filtered = stationsData.filter(station => {
        const nameMatch = station["Station Name"].toLowerCase().includes(searchQuery);
        const locationMatch = station["Location"].toLowerCase().includes(searchQuery);
        
        return nameMatch || locationMatch;
    });
    
    // If a specific product filter is applied, sort by that product's price
    if (productType !== 'all') {
        const priceField = productType.charAt(0).toUpperCase() + productType.slice(1) + " Price";
        filtered.sort((a, b) => parseFloat(a[priceField]) - parseFloat(b[priceField]));
    }
    
    renderStations(filtered);
}

// Event Listeners
refreshBtn.addEventListener('click', fetchFuelData);
stationSearch.addEventListener('input', filterStations);
productFilter.addEventListener('change', filterStations);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchFuelData();
    // Start the 60-second timer
    setInterval(updateTimer, 1000);
});
