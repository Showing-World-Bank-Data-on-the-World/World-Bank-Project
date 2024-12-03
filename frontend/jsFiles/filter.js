document.getElementById('filterButton').addEventListener('click', function() {
    // Tüm checkbox'ları seç
    const checkboxes = document.querySelectorAll('.year-checkbox');
    let selectedYears = [];

    // Seçili olanları kontrol et ve array'e ekle
    checkboxes.forEach(function(checkbox) {
        if (checkbox.checked) {
            selectedYears.push(checkbox.value);
        }
    });

    // Seçilen yıllara göre filtreleme işlemini burada yap
    filterDataByYears(selectedYears);
});

function filterDataByYears(selectedYears) {
    if (selectedYears.length === 0) {
        document.getElementById('filteredResults').innerText = "Lütfen en az bir yıl seçin!";
        return;
    }

    // Burada filtreleme işlemini yapacaksınız
    // Örnek olarak seçilen yılları ekrana yazdırıyoruz
    document.getElementById('filteredResults').innerText = `Seçilen Yıllar: ${selectedYears.join(', ')}`;
    
    // Verilere filtre uygulamak için seçilen yıllara göre API veya veri kaynağından işlem yapabilirsiniz
    // Filtrelenmiş verileri burada kullanabilirsiniz
}

