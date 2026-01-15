# 🌤️ WeatherApp

WeatherApp este o aplicație web care afișează starea vremii în timp real pentru orice oraș din lume, folosind API-ul **OpenWeatherMap**.  
Aplicația este gândită ca un mic produs real: are suport pentru mai multe limbi, mod zi/noapte, fundal dinamic și posibilitatea de a alege între grade **Celsius** și **Fahrenheit**.

---

## ✨ Funcționalități principale

- 🔍 **Căutare după oraș**  
  Introduci numele unui oraș și aplicația îți afișează:
  - temperatura curentă  
  - descrierea condițiilor meteo  
  - umiditatea  
  - viteza vântului  
  - nebulozitatea (procent nori)  
  - ora locală de **răsărit** și **apus**

- 📍 **Folosirea locației curente (Geolocation)**
  Poți folosi butonul pentru locația curentă, iar aplicația:
  - cere permisiunea de acces la locație  
  - detectează coordonatele (lat, lon)  
  - afișează vremea pentru poziția ta actuală  

- 🌐 **Suport pentru 3 limbi (i18n)**  
  Aplicația oferă interfață tradusă în:
  - 🇷🇴 Română  
  - 🇬🇧 Engleză  
  - 🇸🇦 Arabă (cu suport RTL – text de la dreapta la stânga)  

- 🌡️ **Comutare între Celsius și Fahrenheit**  
  Un slider îți permite să comuți între:
  - sistemul metric (**°C**, m/s)  
  - sistemul imperial (**°F**, mph)  
  La schimbarea unității, aplicația retrimite automat ultimul request (oraș sau coordonate).

- 🎨 **Fundal dinamic & mod noapte**  
  Fundalul paginii se schimbă în funcție de:
  - tipul vremii (senin, înnorat, ploaie)  
  - **momentul zilei** în orașul selectat (zi/noapte), calculat corect folosind `sunrise`, `sunset` și `timezone` primite de la API.

- 💾 **Persistența ultimului oraș**  
  Ultimul oraș căutat este salvat în `localStorage`, astfel încât la refresh sau la o nouă deschidere:
  - aplicația încarcă automat vremea pentru acel oraș.

- ⚠️ **Mesaje de eroare & popup dedicat**  
  Aplicația tratează mai multe tipuri de erori:
  - câmp de oraș gol  
  - oraș inexistent (404)  
  - probleme cu geolocația (refuzat, indisponibil, timeout)  
  - erori generale ale API-ului sau de rețea  

  Erorile sunt afișate într-un **popup** central, cu mesaj tradus în limba curentă și buton de „Retry”.

---

## 🧰 Tehnologii folosite

- **HTML5** – structură semantică a paginii  
- **CSS3** – layout, responsive design, animații simple, stilizare card meteo  
  - `css/style.css` – layout general, navbar, fundaluri dinamice, popup-uri  
  - `css/weather_card.css` – stil pentru cardul de vreme  
- **JavaScript (Vanilla)** – logica aplicației:
  - consum API OpenWeatherMap (fetch)  
  - geolocație (`navigator.geolocation`)  
  - i18n (încărcare fișiere JSON de limbă)  
  - gestionarea stării (unități, limbă, ultimul request)  
  - actualizare DOM (afişarea datelor meteo, popup erori, loading)
- **OpenWeatherMap API** – sursa datelor meteo în timp real  

---

## 📁 Structura proiectului

Structură de bază a repo-ului:

```text
WeatherApp/
│
├── index.html          # Punctul de intrare al aplicației
├── app.js              # Logica aplicației (API, i18n, UI, erori, etc.)
│
├── css/
│   ├── style.css       # Stiluri generale (layout, navbar, background-uri, popup)
│   └── weather_card.css# Stiluri specifice pentru cardul cu informații meteo
│
├── lang/
│   ├── en.json         # Traduceri pentru limba engleză
│   ├── ro.json         # Traduceri pentru limba română
│   └── ar.json         # Traduceri pentru limba arabă (RTL)
│
└── assets/
    └── spinner.svg     # Icon pentru animația de loading
