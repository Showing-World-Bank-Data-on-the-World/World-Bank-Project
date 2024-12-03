// Ülke verileri (Kişi başına gelir ve metrikler)
const countries = [
    { name: 'Türkiye', income: 45000, metrics: { enflasyon: 10, intihar: 5, dogum: 20, bebekOlum: 8, saglikHarcama: 15, yasamSuresi: 75, ilkOkulKayit: 90, kisiBasiGelir: 45000, nufusArtisi: 1.2 } },
    { name: 'Almanya', income: 60000, metrics: { enflasyon: 2, intihar: 12, dogum: 8, bebekOlum: 5, saglikHarcama: 11, yasamSuresi: 81, ilkOkulKayit: 100, kisiBasiGelir: 60000, nufusArtisi: 0.5 } },
    { name: 'Fransa', income: 48000, metrics: { enflasyon: 3, intihar: 10, dogum: 14, bebekOlum: 6, saglikHarcama: 13, yasamSuresi: 79, ilkOkulKayit: 95, kisiBasiGelir: 48000, nufusArtisi: 0.8 } },
    { name: 'Türkiye', income: 45000, metrics: { enflasyon: 10, intihar: 5, dogum: 20, bebekOlum: 8, saglikHarcama: 15, yasamSuresi: 75, ilkOkulKayit: 90, kisiBasiGelir: 45000, nufusArtisi: 1.2 } },
    { name: 'Almanya', income: 60000, metrics: { enflasyon: 2, intihar: 12, dogum: 8, bebekOlum: 5, saglikHarcama: 11, yasamSuresi: 81, ilkOkulKayit: 100, kisiBasiGelir: 60000, nufusArtisi: 0.5 } },
    { name: 'Fransa', income: 48000, metrics: { enflasyon: 3, intihar: 10, dogum: 14, bebekOlum: 6, saglikHarcama: 13, yasamSuresi: 79, ilkOkulKayit: 95, kisiBasiGelir: 48000, nufusArtisi: 0.8 } },
    { name: 'Türkiye', income: 45000, metrics: { enflasyon: 10, intihar: 5, dogum: 20, bebekOlum: 8, saglikHarcama: 15, yasamSuresi: 75, ilkOkulKayit: 90, kisiBasiGelir: 45000, nufusArtisi: 1.2 } },
    { name: 'Almanya', income: 60000, metrics: { enflasyon: 2, intihar: 12, dogum: 8, bebekOlum: 5, saglikHarcama: 11, yasamSuresi: 81, ilkOkulKayit: 100, kisiBasiGelir: 60000, nufusArtisi: 0.5 } },
    { name: 'Fransa', income: 48000, metrics: { enflasyon: 3, intihar: 10, dogum: 14, bebekOlum: 6, saglikHarcama: 13, yasamSuresi: 79, ilkOkulKayit: 95, kisiBasiGelir: 48000, nufusArtisi: 0.8 } }
];

// İlk tabloyu kişi başına gelire göre sıralayıp doldurma
function loadIncomeTable() {
    // API'den veriyi çek
    fetch('http://localhost:5000/countries/income')
        .then(response => {
            if (!response.ok) {
                throw new Error("Veri çekme işlemi başarısız oldu.");
            }
            return response.json();
        })
        .then(countries => {
            const incomeTableBody = document.getElementById('incomeTableBody');
            incomeTableBody.innerHTML = ''; // Tabloyu sıfırla

            // Gelen veriyi kişi başına gelire göre sıralayın
            const sortedCountries = [...countries].sort((a, b) => (b.kisiBasiGsyih || 0) - (a.kisiBasiGsyih || 0));

            // Her ülke için tabloya satır ekleyin
            sortedCountries.forEach((country, index) => {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${country.country}</td>
                        <td>${country.kisiBasiGsyih ? country.kisiBasiGsyih.toFixed(2) : "Veri yok"}</td>
                    </tr>
                `;
                incomeTableBody.innerHTML += row; // Tablonun gövdesine satır ekle
            });
        })
        .catch(error => {
            console.error('API isteğinde hata:', error);
        });
}


// Checkbox'ların seçimini dinle
const checkboxes = document.querySelectorAll('.form-check-input');
checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener('change', function() {
        const selectedMetrics = [];
        checkboxes.forEach((cb, i) => {
            if (cb.checked) {
                selectedMetrics.push(i); // Seçilen metriklerin index'lerini tut
            }
        });
        updateMetricTable(selectedMetrics); // Metrik tablosunu güncelle
    });
});

function updateMetricTable(selectedMetrics, year, countryName) {
    const metricTableContainer = document.getElementById('metricTableContainer');
    const metricTableHead = document.getElementById('metricTableHead');
    const metricTableBody = document.getElementById('metricTableBody');

    // Eğer hiçbir metrik seçilmemişse tabloyu gizle
    if (selectedMetrics.length === 0) {
        metricTableContainer.style.display = 'none';
        return;
    }

    // Seçilen metriklere göre tabloyu göster ve başlıkları güncelle
    metricTableContainer.style.display = 'inline-block';
    metricTableHead.innerHTML = '<th>Ülke</th>';

    // Veritabanındaki alan adlarını basitleştirilmiş metrik adlarıyla eşleme
const metricMapping = {
    enflasyonOrani: "Enflasyon Oranı (%)",
    intiharOrani: "intiharOrani",
    dogumOrani: "Doğum Oranı (1000 Kişi Başına)",
    bebekOlumOrani: "Bebek Ölüm Oranı (1000 Canlı Doğum Başına)",
    saglikHarcamalari: "Sağlık Harcamaları (% GSYİH)",
    yasamSuresi: "Doğumda Beklenen Yaşam Süresi (yıl)",
    ilkokulKayitOrani: "İlkokul Kaydı Oranı (%)",
    isizlikOrani: "İşsizlik Oranı (%)",
    kisiBasiGsyih: "Kişi Başına GSYİH (ABD Doları)"
};
    // Metriklerin tam adları (checkbox'lara göre)
    const metrics = [
        { key: 'enflasyonOrani', short: 'Enf', full: 'Enflasyon Oranı' },
        { key: 'intiharOrani', short: 'İnt', full: 'İntihar Oranı' },
        { key: 'dogumOrani', short: 'Doğ', full: 'Doğum Oranı' },
        { key: 'bebekOlumOrani', short: 'Beb', full: 'Bebek Ölüm Oranı' },
        { key: 'saglikHarcamalari', short: 'Sağ', full: 'Sağlık Harcamaları' },
        { key: 'yasamSuresi', short: 'Yaş', full: 'Yaşam Süresi' },
        { key: 'ilkokulKayitOrani', short: 'İlk', full: 'İlkokul Kayıt Oranı' },
        { key: 'kisiBasiGsyih', short: 'GSYİH', full: 'Kişi Başına Gelir' },
        { key: 'nufusArtisHizi', short: 'Nüf', full: 'Nüfus Artış Hızı' }
    ];

    // Başlıkları ekle
    selectedMetrics.forEach(metricIndex => {
        metricTableHead.innerHTML += `<th>${metrics[metricIndex].short}</th>`;
    });

    // İstek URL'sini oluşturun ve seçilen metrikleri query parametrelerine ekleyin
    const metricsQuery = selectedMetrics.map(i => metrics[i].key).join(',');
    const url = `http://localhost:5000/countries?year=${year || ''}&countryName=${countryName || ''}&metrics=${metricsQuery}`;

    // API'den veriyi çek
    fetch(url)
        .then(response => response.json())
        .then(countries => {
            metricTableBody.innerHTML = ''; // Tablo gövdesini temizleyin

            // Her ülke için seçilen metrikleri tabloya ekleyin
            countries.forEach((country, index) => {
                let row = `<tr><td>${country.country}</td>`;
                
                selectedMetrics.forEach(metricIndex => {
                    const metricKey = metrics[metricIndex].key;
                    row += `<td>${country[metricMapping[metricKey]] !== undefined ? country[metricMapping[metricKey]] : "Veri yok"}</td>`;
                });
                
                row += '</tr>';
                metricTableBody.innerHTML += row; // Satırı tabloya ekleyin
            });
        })
        .catch(error => {
            console.error('API isteğinde hata:', error);
        });
}


// Sayfa yüklendiğinde ilk tabloyu göster
loadIncomeTable();
