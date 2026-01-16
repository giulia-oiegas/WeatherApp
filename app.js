// -------------------- DEFINING GLOBAL VARIABLES --------------------------------

const RUN_TESTS = true; 

let currentUnit = "metric"; //metric for celsius (default), imperial for fahrenheit
let lastQuery = null; //saves the last type of request (city/coords)

//i18n globals
let currentLang = "en";
let i18nDict = {}; //loaded translation
let i18nErrors = {}; //translated errors
let i18nUnits = {}; //translated weather units

//DOM references for error/loading systems
const exceptionOverlay = document.querySelector(".exceptionHandling");
const loadingBox = document.getElementById("loadingState");
const loadingText = document.getElementById("loadingText");
const errorDialog = document.getElementById("errorDialog");
const exceptionMessageEl = document.getElementById("exceptionMessage");
const retryButton = document.getElementById("retryButton");
const cityInput = document.getElementById("cityInput");

// -------------------------------- I18N helpers -----------------------------
function detectInitialLanguage() { //automatic language detection
    const saved = localStorage.getItem("lang"); //if the app was visited before and there's a preferred language
    if(saved) return saved;

    const browser = navigator.language.substring(0, 2); //the app uses the client's (browser's) preferred language
    if(["ro", "en", "ar"].includes(browser)) return browser;

    return "en"; //fallback - english is the default language
}

async function loadLanguage(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`); //loading the json lang file according to the selected language
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
        document.body.dir = "rtl"; //right to left layout
    } else {
        document.body.dir = "ltr";
    }
}

function applyStaticTranslations(dict) { //translating html static elements 
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
    if (loadingText) {
        loadingText.textContent = (i18nDict.status && i18nDict.status.loading) || "Loading...";
    }
    if (exceptionOverlay) {
        exceptionOverlay.style.display = "block";
    }
    if (loadingBox) {
        loadingBox.style.display = "flex";
    }
    if (errorDialog) {
        errorDialog.style.display = "none";
    }
}

//clears the loading animation
function hideLoading() {
    if (loadingBox) {
        loadingBox.style.display = "none";
    }
    // overlay-ul va fi ascuns complet aici; showError îl va reactiva dacă e nevoie
    if (exceptionOverlay) {
        exceptionOverlay.style.display = "none";
    }
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
        // console.log(data);
    } catch(e) {
        hideLoading();
        showError("unknown");
        console.error(e);
    }
    // console.log("Coordinates received: ", lat, lon);
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
        // console.log(data);
    } catch(error) {
        hideLoading();
        showError("unknown");
        console.error(error);
    }
}

//---------------------------------- ERRORS -----------------------------------------

function showError(messageKey) {
    const message =
        (i18nErrors && i18nErrors[messageKey]) ||
        (i18nErrors && i18nErrors.unknown) ||
        "An unexpected error occurred.";

    if (exceptionMessageEl) {
        exceptionMessageEl.textContent = message;
    }

    if (exceptionOverlay) {
        exceptionOverlay.style.display = "block";
    }
    if (loadingBox) {
        loadingBox.style.display = "none";
    }
    if (errorDialog) {
        errorDialog.style.display = "block";
    }
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

retryButton.addEventListener("click", () => {
    // închidem overlay-ul și spinner-ul
    if (exceptionOverlay) {
        exceptionOverlay.style.display = "none";
    }
    if (loadingBox) {
        loadingBox.style.display = "none";
    }

    // „uităm” ultima cerere ca să nu mai refacem orașul greșit
    lastQuery = null;

    // curățăm inputul și punem focus pentru un nou search
    if (cityInput) {
        cityInput.value = "";
        cityInput.focus();
    }
});

// get starting location on load
window.addEventListener("load", () => {
    getLocation();
});

// ------------------------------ TESTS ---------------------------------------

function test(name, fn) { 
    return () => {
        try {
            const result = fn();
            console.log(`✔️ PASS: ${name}`);
        } catch (err) {
            console.error(`❌ FAIL: ${name}\n\t${err}`);
        }
    };
}

function expect(actual) { 
    return {
        toEqual(expected) {
            if (actual === expected) {
                return true;
            }
            else throw `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`; //stringify asigura ca putem vedea si obiecte in output
        }
    };
}

function runAllTests(tests) {
    if (RUN_TESTS) {
        let delay = 2000;
        tests.forEach(testFn => {
            setTimeout(() => { testFn() }, delay);
            delay += 2000;
        });
    }
}

// TEST CASES
if (RUN_TESTS) {
    const dateNow = new Date().getTime() / 1000;


    //primeste ca param array de functii de test si le ruleaza pe toate cu un delay intre ele
    runAllTests([
        //D-WB-02 – Conversie metric/imperial
        test("Temperature display in Celsius", () => {
            currentUnit = "metric"; // setează unitatea de temperatură la Celsius
            const fake = { // obiect fake care simulează datele primite de la API
                name: "Bucharest",
                main: { temp: 12, humidity: 50 },
                weather: [{ description: "cloudy", icon: "03d" }],
                wind: { speed: 8 },
                clouds: { all: 7 },
                sys: { sunrise: dateNow - 3600, sunset: dateNow + 3600 },
                timezone: 0
            };
            displayWeather(fake); // afișează datele simulate în aplicație

            const val = document.getElementById("temperature").textContent;  // citește temperatura afișată în UI
            expect(val).toEqual("12°C"); // verifică dacă temperatura este afișată corect în Celsius
        }),

        test("Temperature display in Fahrenheit", () => {
            currentUnit = "imperial";
            const fake = {
                name: "Paris",
                main: { temp: 72, humidity: 40 },
                weather: [{ description: "sunny", icon: "01d" }],
                wind: { speed: 5 },
                clouds: { all: 5 },
                sys: { sunrise: dateNow - 3600, sunset: dateNow + 3600 },
                timezone: 0
            };
            displayWeather(fake); 

            const val = document.getElementById("temperature").textContent;
            expect(val).toEqual("72°F");
        }),

        //D-WB-01 – Testare ramuri condiționale - input gol in căutare
        test("Conditional branches – empty city input", async () => {
            document.getElementById("cityInput").value = ""; 
            searchCity();
            
            const error = document.getElementById("exceptionMessage").textContent; //Citește mesajul de eroare afișat în interfață (din DOM)
            expect(error).toEqual(i18nErrors["city_empty"]);// Verifică dacă mesajul afișat este cel corect pentru cazul de input gol
        }),

        //D-WB-03 – Tratarea erorilor API – daca orașul nu este găsit
        test("API error handling 404", async () => {
            window.fetch = async () => ({ ok: false, status: 404 }); 
            await getWeatherByCity("InvalidCity"); 

            const error = document.getElementById("exceptionMessage").textContent; 
            expect(error).toEqual(i18nErrors["not_found"]); 
        }),

        //D-WB-05 – Stări loading/error
        test("Loading state transition", () => {
            showLoading(); 
            expect(loadingBox.style.display).toEqual("flex"); 
        }),

        test("Error state transition", () => {
            showError("api_error");

            expect(loadingBox.style.display).toEqual("none"); 
            expect(errorDialog.style.display).toEqual("block");
        }),

        //D-WB-04 – Testare funcție retry 
        test("Retry button resets lastQuery and input", () => {
            lastQuery = { type: "city", value: "Paris" }; 
            cityInput.value = "Paris"; 

            setTimeout(() => { 
                retryButton.click(); 
                expect(lastQuery).toEqual(null); 
                expect(cityInput.value).toEqual("");
            }, 500); 

        }),
    ])
}