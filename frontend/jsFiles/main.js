// Erişim tokeninizi buraya ekleyin
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwN2VhNzQyNy00ZDQ3LTQxMGYtYmMyMi03NjkyMGViZTI0OTkiLCJpZCI6MjQ2Mjc3LCJpYXQiOjE3MjgyNDM2MjF9.VGB3PP47uc9MLLHpDdtxO50yHd6terivkjblSFLMk6c';
// CesiumJS Viewer Başlat
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: Cesium.createWorldTerrain(),
    baseLayerPicker: true,
    animation: false,
    timeline: false
});

// Güneş ışığı efektini etkinleştir
viewer.scene.globe.enableLighting = true;

// GeoJSON dosyasını ekle
const geojsonUrl = 'countries.geo.json';  // GeoJSON dosyanızın yolu

fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
        // GeoJSON verilerini Cesium'a ekle ve sınırları beyaz yap
        const dataSource = Cesium.GeoJsonDataSource.load(data, {
            stroke: Cesium.Color.WHITE,      // Ülke sınırlarını beyaz yap
            strokeWidth: 2,                  // Sınır çizgisi kalınlığı
            fill: Cesium.Color.TRANSPARENT   // Ülke içini doğal renkte tut
        });
        
        viewer.dataSources.add(dataSource);
        viewer.flyTo(dataSource);  // Veriye yakınlaştır
        
        // Fare hareketini izlemek için bir işlem ekle
        let tooltipTimeout;  // Tooltip için zamanlayıcı
        let isInteracting = false; // Etkileşim durumu
        let rotationInterval; // Döndürme intervali

        // Fare hareketi ile etkileşimi izleme
        viewer.screenSpaceEventHandler.setInputAction(function (movement) {
            const cartesian = viewer.camera.pickEllipsoid(movement.endPosition);
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = Cesium.Math.toDegrees(cartographic.latitude);

                // Koordinatın hangi ülkenin sınırları içinde olduğunu kontrol et
                const countryName = findCountry(latitude, longitude, data);
                
                if (countryName) {
                    // Tooltip'i göster
                    clearTimeout(tooltipTimeout);  // Önceki zamanlayıcıyı temizle
                    tooltipTimeout = setTimeout(() => {
                        showTooltip(movement.endPosition, countryName); // Tooltip'i göster
                    }, 300); // 300ms sonra göster
                } else {
                    hideTooltip();  // Ülke bulunamazsa tooltip'i gizle
                    clearTimeout(tooltipTimeout);  // Zamanlayıcıyı temizle
                }
            }

            // Etkileşimi başlat
            if (!isInteracting) {
                isInteracting = true; // Etkileşim durumu güncelle
                stopRotation(); // Döndürmeyi durdur
            }

            // 4 saniye sonra döndürmeyi tekrar başlat
            resetRotationTimer();
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Tıklama işlemi için bir event ekle
        viewer.screenSpaceEventHandler.setInputAction(function (click) {
            const cartesian = viewer.camera.pickEllipsoid(click.position);
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        
                // Tıklanan noktadaki ülkeyi bul
                const countryName = findCountry(latitude, longitude, data);
                
                if (countryName) {
                    askForDetails(countryName);  // Ülke hakkında bilgiyi modal ile göster
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        

        let rotationTimeout; // Rotasyon zamanlayıcısı

        // 4 saniye sonra döndürmeyi tekrar başlat
        function resetRotationTimer() {
            clearTimeout(rotationTimeout);
            rotationTimeout = setTimeout(() => {
                isInteracting = false; // Etkileşim durumu sıfırla
                startRotation(); // Döndürmeyi başlat
            }, 4000); // 4 saniye
        }

        // Döndürmeyi başlatma fonksiyonu
        function startRotation() {
            if (!rotationInterval) { // Zaten dönmüyorsa başlat
                rotationInterval = setInterval(() => {
                    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Y, Cesium.Math.toRadians(0.5)); // Y ekseninde döndür
                }, 100); // 100ms aralıklarla döndür
            }
        }

        // Döndürmeyi durdurma fonksiyonu
        function stopRotation() {
            clearInterval(rotationInterval);
            rotationInterval = null; // Intervali sıfırla
        }

        // İlk olarak döndürmeyi başlat
        startRotation();
    })
    .catch(error => {
        console.error('GeoJSON verisi yüklenirken hata oluştu:', error);
    });
    
// Belirli bir koordinatın hangi ülke sınırları içinde olduğunu bulan fonksiyon
function findCountry(lat, lon, geoJsonData) {
    let foundCountry = null;

    geoJsonData.features.forEach(feature => {
        const geometryType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;

        if (geometryType === "Polygon") {
            // Eğer poligon ise tek bir sınır var
            if (pointInPolygon([lon, lat], coordinates[0])) {
                foundCountry = feature.properties.name;
            }
        } else if (geometryType === "MultiPolygon") {
            // Eğer MultiPolygon ise birden fazla poligon var
            coordinates.forEach(polygon => {
                if (pointInPolygon([lon, lat], polygon[0])) {
                    foundCountry = feature.properties.name;
                }
            });
        }
    });

    return foundCountry;
}

// Point-in-Polygon algoritması (Ray-casting yöntemi)
function pointInPolygon(point, vs) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Tooltip oluşturma
const tooltip = document.createElement('div');
tooltip.className = 'tooltip'; // CSS sınıfını ekle
document.body.appendChild(tooltip);

// Tooltip'i gösterme fonksiyonu
function showTooltip(position, countryName) {
    const canvas = viewer.scene.canvas;
    const rect = canvas.getBoundingClientRect(); // Haritanın sınırlarını al
    const mappedName = country_translation_map[countryName] || countryName;
    tooltip.style.display = 'block';
    tooltip.style.left = position.x + rect.left + 10 + 'px';  // Fare pozisyonuna göre ayarla
    tooltip.style.top = position.y + rect.top + 10 + 'px';    // Haritanın üstten konumunu da dikkate al
    tooltip.innerHTML = `<strong>${mappedName}</strong>`;    // Ülke ismini göster
}

// Tooltip'i gizleme fonksiyonu
function hideTooltip() {
    tooltip.style.display = 'none';  // Ülke yoksa gizle
}



country_translation_map = {
    'Afghanistan': 'Afganistan',
    'Angola': 'Angola',
    'Albania': 'Arnavutluk',
    'United Arab Emirates': 'Birleşik Arap Emirlikleri',
    'Argentina': 'Arjantin',
    'Armenia': 'Ermenistan',
    'Antarctica': 'Antarktika',
    'French Southern and Antarctic Lands': 'Fransız Güney ve Antarktika Toprakları',
    'Australia': 'Avustralya',
    'Austria': 'Avusturya',
    'Azerbaijan': 'Azerbaycan',
    'Burundi': 'Burundi',
    'Belgium': 'Belçika',
    'Benin': 'Benin',
    'Burkina Faso': 'Burkina Faso',
    'Bangladesh': 'Bangladeş',
    'Bulgaria': 'Bulgaristan',
    'Bahamas': 'Bahamalar',
    'Bosnia and Herzegovina': 'Bosna-Hersek',
    'Belarus': 'Belarus',
    'Belize': 'Belize',
    'Bolivia': 'Bolivya',
    'Brazil': 'Brezilya',
    'Brunei': 'Brunei',
    'Bhutan': 'Butan',
    'Botswana': 'Botsvana',
    'Central African Republic': 'Orta Afrika Cumhuriyeti',
    'Canada': 'Kanada',
    'Switzerland': 'İsviçre',
    'Chile': 'Şili',
    'China': 'Çin',
    'Ivory Coast': 'Fildişi Sahili',
    'Cameroon': 'Kamerun',
    'Democratic Republic of the Congo': 'Kongo Demokratik Cumhuriyeti',
    'Republic of the Congo': 'Kongo Cumhuriyeti',
    'Colombia': 'Kolombiya',
    'Costa Rica': 'Kosta Rika',
    'Cuba': 'Küba',
    'Northern Cyprus': 'Kuzey Kıbrıs',
    'Cyprus': 'Kıbrıs',
    'Czech Republic': 'Çek Cumhuriyeti',
    'Germany': 'Almanya',
    'Djibouti': 'Cibuti',
    'Denmark': 'Danimarka',
    'Dominican Republic': 'Dominik Cumhuriyeti',
    'Algeria': 'Cezayir',
    'Ecuador': 'Ekvador',
    'Egypt': 'Mısır',
    'Eritrea': 'Eritre',
    'Spain': 'İspanya',
    'Estonia': 'Estonya',
    'Ethiopia': 'Etiyopya',
    'Finland': 'Finlandiya',
    'Fiji': 'Fiji',
    'Falkland Islands': 'Falkland Adaları',
    'France': 'Fransa',
    'Gabon': 'Gabon',
    'United Kingdom': 'Birleşik Krallık',
    'Georgia': 'Gürcistan',
    'Ghana': 'Gana',
    'Guinea': 'Gine',
    'Gambia': 'Gambiya',
    'Guinea Bissau': 'Gine-Bissau',
    'Equatorial Guinea': 'Ekvator Ginesi',
    'Greece': 'Yunanistan',
    'Greenland': 'Grönland',
    'Guatemala': 'Guatemala',
    'Guyana': 'Guyana',
    'Honduras': 'Honduras',
    'Croatia': 'Hırvatistan',
    'Haiti': 'Haiti',
    'Hungary': 'Macaristan',
    'Indonesia': 'Endonezya',
    'India': 'Hindistan',
    'Ireland': 'İrlanda',
    'Iran': 'İran',
    'Iraq': 'Irak',
    'Iceland': 'İzlanda',
    'Israel': 'İsrail',
    'Italy': 'İtalya',
    'Jamaica': 'Jamaika',
    'Jordan': 'Ürdün',
    'Japan': 'Japonya',
    'Kazakhstan': 'Kazakistan',
    'Kenya': 'Kenya',
    'Kyrgyzstan': 'Kırgızistan',
    'Cambodia': 'Kamboçya',
    'South Korea': 'Güney Kore',
    'North Korea': 'Kuzey Kore',
    'Kosovo': 'Kosova',
    'Kuwait': 'Kuveyt',
    'Laos': 'Laos',
    'Lebanon': 'Lübnan',
    'Liberia': 'Liberya',
    'Libya': 'Libya',
    'Sri Lanka': 'Sri Lanka',
    'Lesotho': 'Lesoto',
    'Lithuania': 'Litvanya',
    'Luxembourg': 'Lüksemburg',
    'Latvia': 'Letonya',
    'Morocco': 'Fas',
    'Moldova': 'Moldova',
    'Madagascar': 'Madagaskar',
    'Mexico': 'Meksika',
    'Macedonia': 'Makedonya',
    'Mali': 'Mali',
    'Malta': 'Malta',
    'Myanmar': 'Myanmar',
    'Montenegro': 'Karadağ',
    'Mongolia': 'Moğolistan',
    'Mozambique': 'Mozambik',
    'Mauritania': 'Moritanya',
    'Malawi': 'Malavi',
    'Malaysia': 'Malezya',
    'Namibia': 'Namibya',
    'New Caledonia': 'Yeni Kaledonya',
    'Niger': 'Nijer',
    'Nigeria': 'Nijerya',
    'Nicaragua': 'Nikaragua',
    'Netherlands': 'Hollanda',
    'Norway': 'Norveç',
    'Nepal': 'Nepal',
    'New Zealand': 'Yeni Zelanda',
    'Oman': 'Umman',
    'Pakistan': 'Pakistan',
    'Panama': 'Panama',
    'Peru': 'Peru',
    'Philippines': 'Filipinler',
    'Papua New Guinea': 'Papua Yeni Gine',
    'Poland': 'Polonya',
    'Puerto Rico': 'Porto Riko',
    'North Macedonia': 'Kuzey Makedonya',
    'Portugal': 'Portekiz',
    'Paraguay': 'Paraguay',
    'Palestine': 'Filistin',
    'Russia':'Rusya',
    'Qatar': 'Katar',
    'Romania': 'Romanya',
    'Rwanda': 'Ruanda',
    'Western Sahara': 'Batı Sahra',
    'Saudi Arabia': 'Suudi Arabistan',
    'Sudan': 'Sudan',
    'South Sudan': 'Güney Sudan',
    'Senegal': 'Senegal',
    'Solomon Islands': 'Solomon Adaları',
    'Sierra Leone': 'Sierra Leone',
    'El Salvador': 'El Salvador',
    'Somaliland': 'Somali',
    'Somalia': 'Somali',
    'Serbia': 'Sırbistan',
    'Suriname': 'Surinam',
    'Slovakia': 'Slovakya',
    'Slovenia': 'Slovenya',
    'Sweden': 'İsveç',
    'Eswatini': 'Esvatini',
    'Syria': 'Suriye',
    'Chad': 'Çad',
    'Togo': 'Togo',
    'Thailand': 'Tayland',
    'Tajikistan': 'Tacikistan',
    'Turkmenistan': 'Türkmenistan',
    'Timor Leste': 'Doğu Timor',
    'Trinidad and Tobago': 'Trinidad ve Tobago',
    'Tunisia': 'Tunus',
    'Turkey': 'Türkiye',
    'Taiwan': 'Tayvan',
    'United Republic of Tanzania': 'Tanzanya',
    'Uganda': 'Uganda',
    'Ukraine': 'Ukrayna',
    'Uruguay': 'Uruguay',
    'United States of America': 'Amerika Birleşik Devletleri',
    'Uzbekistan': 'Özbekistan',
    'Venezuela': 'Venezuela',
    'Vietnam': 'Vietnam',
    'Vanuatu': 'Vanuatu',
    'Yemen': 'Yemen',
    'South Africa': 'Güney Afrika',
    'Zambia': 'Zambiya',
    'Zimbabwe': 'Zimbabve'
}

const countryISOMap = {
    "Afghanistan": "af",
    "Angola": "ao",
    "Albania": "al",
    "United Arab Emirates": "ae",
    "Argentina": "ar",
    "Armenia": "am",
    "Antarctica": "aq",
    "Australia": "au",
    "Austria": "at",
    "Azerbaijan": "az",
    "Burundi": "bi",
    "Belgium": "be",
    "Benin": "bj",
    "Burkina Faso": "bf",
    "Bangladesh": "bd",
    "Bulgaria": "bg",
    "Bahamas": "bs",
    "Bosnia and Herzegovina": "ba",
    "Belarus": "by",
    "Belize": "bz",
    "Bolivia": "bo",
    "Brazil": "br",
    "Brunei": "bn",
    "Bhutan": "bt",
    "Botswana": "bw",
    "Central African Republic": "cf",
    "Canada": "ca",
    "Switzerland": "ch",
    "Chile": "cl",
    "China": "cn",
    "Ivory Coast": "ci",
    "Cameroon": "cm",
    "Democratic Republic of the Congo": "cd",
    "Republic of the Congo": "cg",
    "Colombia": "co",
    "Costa Rica": "cr",
    "Cuba": "cu",
    "Cyprus": "cy",
    "Czech Republic": "cz",
    "Germany": "de",
    "Djibouti": "dj",
    "Denmark": "dk",
    "Dominican Republic": "do",
    "Algeria": "dz",
    "Ecuador": "ec",
    "Egypt": "eg",
    "Spain": "es",
    "Ethiopia": "et",
    "Finland": "fi",
    "Fiji": "fj",
    "France": "fr",
    "Gabon": "ga",
    "United Kingdom": "gb",
    "Georgia": "ge",
    "Ghana": "gh",
    "Guinea": "gn",
    "Greece": "gr",
    "Greenland": "gl",
    "Guatemala": "gt",
    "Honduras": "hn",
    "Croatia": "hr",
    "Haiti": "ht",
    "Hungary": "hu",
    "Indonesia": "id",
    "India": "in",
    "Ireland": "ie",
    "Iran": "ir",
    "Iraq": "iq",
    "Iceland": "is",
    "Israel": "il",
    "Italy": "it",
    "Jamaica": "jm",
    "Japan": "jp",
    "Jordan": "jo",
    "Kenya": "ke",
    "Kyrgyzstan": "kg",
    "South Korea": "kr",
    "North Korea": "kp",
    "Kuwait": "kw",
    "Laos": "la",
    "Lebanon": "lb",
    "Liberia": "lr",
    "Libya": "ly",
    "Sri Lanka": "lk",
    "Lithuania": "lt",
    "Luxembourg": "lu",
    "Latvia": "lv",
    "Morocco": "ma",
    "Moldova": "md",
    "Madagascar": "mg",
    "Mexico": "mx",
    "Mongolia": "mn",
    "Mozambique": "mz",
    "Myanmar": "mm",
    "Namibia": "na",
    "Nepal": "np",
    "Netherlands": "nl",
    "New Zealand": "nz",
    "Niger": "ne",
    "Nigeria": "ng",
    "Norway": "no",
    "Pakistan": "pk",
    "Panama": "pa",
    "Peru": "pe",
    "Philippines": "ph",
    "Poland": "pl",
    "Portugal": "pt",
    "Qatar": "qa",
    "Romania": "ro",
    "Russia": "ru",
    "Rwanda": "rw",
    "Saudi Arabia": "sa",
    "Senegal": "sn",
    "Serbia": "rs",
    "Slovakia": "sk",
    "Slovenia": "si",
    "Somalia": "so",
    "South Africa": "za",
    "Sudan": "sd",
    "Sweden": "se",
    "Switzerland": "ch",
    "Syria": "sy",
    "Taiwan": "tw",
    "Tajikistan": "tj",
    "Thailand": "th",
    "Togo": "tg",
    "Tunisia": "tn",
    "Turkey": "tr",
    "Uganda": "ug",
    "Ukraine": "ua",
    "United States of America": "us",
    "Uruguay": "uy",
    "Uzbekistan": "uz",
    "Venezuela": "ve",
    "Vietnam": "vn",
    "Zambia": "zm",
    "Zimbabwe": "zw",
    "Northern Cyprus": "cy",
    "Kosovo": "xk",
    "South Sudan": "ss",
    "Western Sahara": "eh",
    "Palestine": "ps",
    'Kazakhstan': 'kz'
};



function askForDetails(countryName) {
    console.log(`askForDetails fonksiyonu ${countryName} için çağrıldı.`);

    // Modal başlığını ve bayrağı ayarla
    const mappedName = country_translation_map[countryName] || countryName;
    const countryCode = countryISOMap[countryName];
    const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;

    const modalTitle = document.getElementById('staticBackdropLabel');
    const modalBody = document.querySelector('.modal-body');

    modalTitle.innerHTML = `${mappedName} <img src="${flagUrl}" alt="${countryName} Bayrağı" style="width:30px; height:20px; margin-left:10px;" />`;

    // Vikipedi API'den bilgi çekme
    fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${mappedName}`)
        .then(response => response.json())
        .then(data => {
            if (data.extract) {
                modalBody.textContent = data.extract;
            } else {
                modalBody.textContent = "Bu ülke hakkında Türkçe bilgi bulunamadı.";
            }
        })
        .catch(error => {
            console.error('Wikipedia API isteğinde hata:', error);
            modalBody.textContent = "Ülke bilgisi alınırken bir hata oluştu.";
        });

    // "Tamam" butonuna olay dinleyicisi ekle
    const tamamButton = document.querySelector('.modal-footer .tamam-button');
    tamamButton.onclick = function () {
        fetchDataFromDatabase(countryName);
        closeModal();  // Modalı kapat
    };

    // Bootstrap modal'ı aç
    const modal = new bootstrap.Modal(document.getElementById('staticBackdrop'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

// Modal kapanma fonksiyonu
function closeModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
    modal.hide();
}

// API'den veriyi çek ve tabloyu güncelle
function fetchDataFromDatabase(countryName) {
    const url = `http://localhost:5000/countries/find-by-name?name=${countryName}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Veri bulunamadı (HTTP ${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                console.log("Veri başarıyla çekildi:", data);
                updateTableWithDatabaseData(data);
            } else {
                console.error("Veri bulunamadı.");
            }
        })
        .catch(error => {
            console.error("Veri tabanından veri alınırken hata:", error);
        });
}

// Tabloyu güncelleme fonksiyonu
function updateTableWithDatabaseData(countryData) {
    const metricTableContainer = document.getElementById('metricTableContainer');
    const metricTableBody = document.getElementById('metricTableBody');
    metricTableBody.innerHTML = "";  // Önceki verileri temizle

    console.log("Gelen Veri:", countryData); // Tam veri çıktısı

    // Doğru etiket karşılıkları
    const correctMapping = {
        "Enflasyon Oranı (%)": "Enflasyon Oranı (%)",
        "intiharOrani": "İntihar Oranı (%)",
        "Doğum Oranı (1000 Kişi Başına)": "Doğum Oranı (1000 Kişi Başına)",
        "Bebek Ölüm Oranı (1000 Canlı Doğum Başına)": "Bebek Ölüm Oranı (1000 Canlı Doğum Başına)",
        "Sağlık Harcamaları (% GSYİH)": "Sağlık Harcamaları (% GSYİH)",
        "Doğumda Beklenen Yaşam Süresi (yıl)": "Doğumda Beklenen Yaşam Süresi (yıl)",
        "İlkokul Kaydı Oranı (%)": "İlkokul Kaydı Oranı (%)",
        "Kişi Başına GSYİH (ABD Doları)": "Kişi Başına GSYİH (ABD Doları)",
        "İşsizlik Oranı (%)": "İşsizlik Oranı (%)"
    };

    // Her bir metrik için tabloyu güncelle
    for (const [key, value] of Object.entries(countryData)) {
        const label = correctMapping[key] || key; // Eğer karşılık yoksa doğrudan key kullan
        console.log(`Anahtar: ${key}, Etiket: ${label}, Değer: ${value}`);

        if (correctMapping[key] && value !== undefined && value !== null) {
            const row = `
                <tr>
                    <td>${label}</td>
                    <td>${value}</td>
                </tr>
            `;
            metricTableBody.innerHTML += row;
        } else {
            console.error(`Eksik veya tanımsız veri: ${key}`);
        }
    }

    // Tabloyu göster
    metricTableContainer.style.display = "block";
}


    




