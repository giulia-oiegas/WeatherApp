let currentUnit = "metric"; //metric for celsius, imperial for fahrenheit
let lastQuery = null; //saves the type of request (city/coords)

//i18n globals
let currentLang = "en";
let i18nDict = {}; //loaded translation
let i18nErrors = {}; //translated errors
let i18nUnits = {}; //translated weather units

// -------------------------------- I18N helpers -----------------------------
function detectInitialLanguage() {
    const saved = localStorage.getItem("lang");
    if(saved) return saved;

    const browser = navigator.language.substring(0, 2);
    if(["ro", "en", "ar"].includes(browser)) return browser;

    return "en"; //fallback
}

async function loadLanguage(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        const dictionary = await response.json();

        i18nDict = dictionary;
        i18nErrors = dictionary.errors;
        i18nUnits = {
            celsius: dictionary.weather.unit_celsius,
            fahrenheit: dictionary.weather.unit_fahrenheit,
            windMetric: dictionary.weather.wind_metric,
            windImperial: dictionary.weather.wind_imperial
        };

        applyRTL(lang);
        applyStaticTranslations(dictionary);
    } catch(e) {
        console.error("Could not load language file: ", e);
    }
}


function applyRTL(lang) {
    if(lang === "ar") {
        document.body.dir = "rtl";
    } else {
        document.body.dir = "ltr";
    }
}

function applyStaticTranslations(dict) {
    //placeholders
    document.getElementById("cityInput").placeholder = dict.search.placeholder;

    //buttons
    document.getElementById("searchButton").value = dict.search.button;
    document.getElementById("locationButton").value = dict.search.use_location;

    //weather labels
    document.getElementById("humidity").setAttribute("data-label", dict.weather.humidity);
    document.getElementById("wind").setAttribute("data-label", dict.weather.wind);
    document.getElementById("clouds").setAttribute("data-label", dict.weather.clouds);
    document.getElementById("sunrise").setAttribute("data-label", dict.weather.sunrise);
    document.getElementById("sunset").setAttribute("data-label", dict.weather.sunset);
}

// ---------------------------------- LOADING SPINNER ------------------------------------------

//this function displays the spinner inside the .exceptionHandler container
function showLoading() {
    const box = document.querySelector(".exceptionHandling");
    box.innerHTML = `
        <div class="loadingState">
            <img src="assets/spinner.svg" alt="Loading..." width="40">
            <p>${i18nDict.status.loading || "Loading..."}</p>
        </div>
    `;
}

//clears the loading animation
function hideLoading() {
    const box = document.querySelector(".exceptionHandling");
    box.innerHTML = "";
}

// --------------------------------- UNIT TOGGLE --------------------------------------

//celsius/fahrenheit toggler
const unitToggle = document.getElementById("unitToggle");

unitToggle.addEventListener("change", () => {
    if(unitToggle.checked) {
        currentUnit = "imperial"; //Fahrenheit
    } else if(unitToggle.checked == false){
        currentUnit = "metric";
    }

    resendLastRequest();
});

function resendLastRequest() {
    if(!lastQuery) return ;

    if(lastQuery.type === "city") {
        getWeatherByCity(lastQuery.value);
    }

    if(lastQuery.type === "coords") {
        getWeatherByCoordinates(lastQuery.lat, lastQuery.lon);
    }
}

//------------------------------ GEOLOCATION -----------------------------------

//requests the user's geolocation
function getLocation() {
    showLoading();

    if(!navigator.geolocation) {
        showError("geo_unavailable");
        return ;
    }

    navigator.geolocation.getCurrentPosition(success, error);
}

function success(position) {
    hideLoading();

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    //we send the coordinates to the function that makes the api request
    getWeatherByCoordinates(latitude, longitude);
}

//handles geolocation errors
function error(err) {
    if(err.code === 1) {
        showError("geo_denied");
    } else if(err.code === 2) {
        showError("geo_unavailable");
    } else if(err.code === 3) {
        showError("geo_timeout");
    } else {
        showError("unknown");
    }
}

//------------------------ API CALLS ---------------------------------------------

//fetches weather data from OpenWeatherMap
async function getWeatherByCoordinates(lat, lon) {
    showLoading();

    const apiKey = "64b380edaa8151b58ab070f2ec5cfab9"; 
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&lang=${currentLang}&appid=${apiKey}`;

    lastQuery = {type: "coords", lat: lat, lon: lon}; //save query

    try {
        const response = await fetch(url);
        hideLoading();

        if(!response.ok) {
            showError("api_error");
            return ;
        }

        const data = await response.json();
        displayWeather(data);
        console.log(data);
    } catch(e) {
        hideLoading();
        showError("unknown");
        console.error(e);
    }
    

    console.log("Coordinates received: ", lat, lon);
}

async function getWeatherByCity(city) {
    showLoading();

    const apiKey = "64b380edaa8151b58ab070f2ec5cfab9";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${currentUnit}&lang=${currentLang}&appid=${apiKey}`;
    
    lastQuery = {type: "city", value: city}; //save query

    try {
        const response = await fetch(url);

        hideLoading();

        if(!response.ok) {
            //city not found
            if(response.status === 404) {
                showError("not_found");
                return ;
            }

            //general API error
            showError("api_error");
            return ;
        }
        const data = await response.json();
        displayWeather(data); //send data to UI
        console.log(data);
    } catch(error) {
        hideLoading();
        showError("unknown");
        console.error(error);
    }
}

//---------------------------------- ERRORS -----------------------------------------

function showError(messageKey) {
    const box = document.querySelector(".exceptionHandling");
    let message = i18nErrors[messageKey] || i18nErrors.unknown;
    
    box.innerHTML = `
        <div class="errorState">
            <p>${message}</p>
            <button class="retryButton">${i18nDict.status.retry || "Retry."}</button>
        </div>
    `;
}

// -------------------------------- SEARCH ----------------------------------

function searchCity() {
    const city = document.getElementById("cityInput").value.trim();

    //empty field
    if(city === "") {
        showError("city_empty");
        return ;
    }

    getWeatherByCity(city);
}

// -------------------------- DISPLAY WEATHER ----------------------------------

function displayWeather(data) {
    localStorage.setItem("lastCity", data.name);

    const symbol = currentUnit === "metric" ? i18nUnits.celsius : i18nUnits.fahrenheit;
    const now = new Date().getTime() / 1000;
    const description = data.weather[0].description;
    const formattedDescription = description.charAt(0).toUpperCase() + description.slice(1);

    //city
    document.getElementById("cityName").textContent = data.name;
    //temperature (rounded)
    document.getElementById("temperature").textContent = Math.round(data.main.temp) + symbol;
    //weather description
    document.getElementById("description").textContent = formattedDescription;
    //wind
    const windUnit = currentUnit === "metric" ? i18nUnits.windMetric : i18nUnits.windImperial;
    document.getElementById("wind").textContent = `${i18nDict.weather.wind} : ${data.wind.speed} ${windUnit}`;
    //humidity
    document.getElementById("humidity").textContent = `${i18nDict.weather.humidity}: ${data.main.humidity}%`;
    //clouds
    document.getElementById("clouds").textContent =  `${i18nDict.weather.clouds}: ${data.clouds.all}%`;

   
    //weather icon
    const iconCode = data.weather[0].icon;
    const iconElement = document.getElementById("weatherIcon");
    iconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconElement.alt = data.weather[0].description;

    const timezoneOffset = data.timezone;

    function formatLocalTime(timestampUtc, offsetSeconds) {
        //calculates local timestamp
        const localUnix = timestampUtc + offsetSeconds;

        return new Date(localUnix * 1000).toLocaleTimeString(currentLang, {
            hour: '2-digit',
            minute: '2-digit', 
            hour12: false,
            timeZone: "UTC"
        });
    }

    const sunriseUtc = data.sys.sunrise;
    const sunsetUtc = data.sys.sunset;

    const sunriseStr = formatLocalTime(sunriseUtc, timezoneOffset);
    const sunsetStr = formatLocalTime(sunsetUtc, timezoneOffset);

    document.getElementById("sunrise").textContent = `${i18nDict.weather.sunrise}: ${sunriseStr}`;
    document.getElementById("sunset").textContent = `${i18nDict.weather.sunset}: ${sunsetStr}`;


    const nowUtc = Math.floor(Date.now() / 1000);

    const nowLocalUnix = nowUtc + timezoneOffset;
    const sunriseLocalUnix = sunriseUtc + timezoneOffset;
    const sunsetLocalUnix = sunsetUtc + timezoneOffset;
    //reset bg classes (for animation bg)
    document.body.classList.remove("sunny-bg", "cloudy-bg", "rain-bg", "night-bg");

    const isNight = nowLocalUnix >= sunsetLocalUnix || nowLocalUnix <sunriseLocalUnix;
    if(isNight) {
        document.body.classList.add("night-bg");
    }
    //apply classes based on icon code
    if(iconCode.startsWith("01")) {
        document.body.classList.add("sunny-bg");
    } else if (
        iconCode.startsWith("02") ||
        iconCode.startsWith("03") ||
        iconCode.startsWith("04")
    ) {
        document.body.classList.add("cloudy-bg");
    } else if (
        iconCode.startsWith("09") ||
        iconCode.startsWith("10") ||
        iconCode.startsWith("11")
    ) {
        document.body.classList.add("rain-bg");
    }
}

// -------------------- INIT AND EVENT LISTENERS ------------------------------

window.addEventListener("DOMContentLoaded", async () => {
    currentLang = detectInitialLanguage();
    await loadLanguage(currentLang);

    const savedCity = localStorage.getItem("lastCity");
    if(savedCity) {
        getWeatherByCity(savedCity);
    }
});


document.getElementById("locationButton").addEventListener("click", () => {
    getLocation();
});

document.getElementById("locationButton").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        getLocation();
    }
});

//trigger search by clicking the button
document.getElementById("searchButton").addEventListener("click", () => {
    searchCity();
});

//trigger search when pressing Enter in the input field
document.getElementById("cityInput").addEventListener("keyup", (event) => {
    if(event.key === "Enter") {
        searchCity();
    }
});

document.querySelectorAll(".languageSwitcher button").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const lang = btn.dataset.lang;
        currentLang = lang;
        localStorage.setItem("lang", lang);

        await loadLanguage(lang);

        if(lastQuery) resendLastRequest();
    });
});

document.querySelectorAll(".languageSwitcher button").forEach((btn) => {
    btn.addEventListener("keyup", event => {
        if (event.key === "Enter") {
            btn.click();
        }
    });
});

document.addEventListener("click", event => {
    if(event.target.classList.contains("retryButton")) {
        if(lastQuery) resendLastRequest();
    }
});
