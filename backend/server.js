// Gerekli paketleri yükleme
require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');

app.use(cors());
app.use(express.json());

// MongoDB bağlantısını yapma
mongoose.connect('mongodb+srv://emre23askin:753159@cluster0.qflx0.mongodb.net/Vtys?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(error => console.error('MongoDB bağlantı hatası:', error));

// Şema tanımlama
const countrySchema = new mongoose.Schema({
  country: String,
  date: Date,
  enflasyonOrani: Number,
  intiharOrani: Number,
  dogumOrani: Number,
  bebekOlumOrani: Number,
  saglikHarcamalari: Number,
  yasamSuresi: Number,
  ilkokulKaydiOrani: Number,
  issizlikOrani: Number,
  kisiBasiGsyih: Number,
  coordinates: Array
}, { collection: 'Ulkeler' });  // Koleksiyon adı 'Ulkeler' olarak ayarlandı

const Country = mongoose.model('Country', countrySchema);

// Seçilen metriklere, yıla ve ülke adına göre veri getiren API
app.get('/countries', async (req, res) => {
  const { year, countryName, metrics } = req.query;

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

  try {
    // Filtreleme koşulları
    const matchStage = {};
    if (countryName) matchStage.country = countryName;

    // Yıl belirtilmemişse en güncel yılın verisini bul
    if (year) {
      matchStage.date = new Date(`${year}-01-01`);
    } else {
      const latestRecord = await Country.findOne(matchStage).sort({ date: -1 });
      if (latestRecord) {
        matchStage.date = latestRecord.date;
      } else {
        return res.status(404).json({ message: "Veri bulunamadı." });
      }
    }

    // İstenen metriklere göre projection ayarlama
    let projectionStage = { country: 1, date: 1 };
    if (metrics) {
      const selectedMetrics = metrics.split(',').map(metric => metric.trim());
      selectedMetrics.forEach(metric => {
        const dbField = metricMapping[metric];
        if (dbField) projectionStage[dbField] = 1;
      });
    }

    // Sıralama metriği olarak ilk metriği veya varsayılanı kullanın
    const sortMetric = metrics ? metricMapping[metrics.split(',')[0].trim()] : metricMapping['kisiBasiGsyih'];

    // Aggregation pipeline ile veriyi getirme
    let countries = await Country.aggregate([
      { $match: matchStage },
      { $project: projectionStage },
      { $sort: { [sortMetric]: -1 } }
    ]);

    

    if (countries.length === 0) {
      return res.status(404).json({ message: "Veri bulunamadı." });
    }

    res.json(countries);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: error.message });
  }
});





// Kişi başına gelir verilerini her ülke için yıl parametresi opsiyonel olan API
app.get('/countries/income', async (req, res) => {
  const { year } = req.query;

  try {
    // Eğer 'year' parametresi verilmişse belirtilen yıl ve kişi başına gelir dolu olanları eşleştir
    const matchStage = year
      ? { $match: { date: new Date(`${year}-01-01`), "Kişi Başına GSYİH (ABD Doları)": { $ne: null } } } // Belirtilen yıl ve dolu gelir verileri
      : { $match: { "Kişi Başına GSYİH (ABD Doları)": { $ne: null } } }; // Yıl belirtilmezse en güncel dolu gelir verilerini al

    const sortStage = year
      ? { $sort: { "Kişi Başına GSYİH (ABD Doları)": -1 } } // Eğer yıl belirtilmişse kişi başına gelirle sıralama
      : { $sort: { date: -1, "Kişi Başına GSYİH (ABD Doları)": -1 } }; // En güncel yılı bulmak için tarihe göre sıralama

    const countries = await Country.aggregate([
      matchStage,
      sortStage,
      {
        $group: {
          _id: "$country",
          kisiBasiGsyih: { $first: "$Kişi Başına GSYİH (ABD Doları)" },
          country: { $first: "$country" },
          date: { $first: "$date" }
        }
      },
      { $sort: { kisiBasiGsyih: -1 } }
    ]);

    if (countries.length === 0) {
      return res.status(404).json({ message: "Kişi başına gelir verisi bulunamadı." });
    }

    res.json(countries);
  } catch (error) {
    console.error('Error fetching income data:', error);
    res.status(500).json({ message: error.message });
  }
});




// Ülke adına göre verileri getiren API
app.get('/countries/find-by-name', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: "Ülke adı gereklidir." });
  }

  try {
    // Ülke adına göre MongoDB'den veri çekme
    const country = await Country.findOne({ country: name });

    if (country) {
      res.json(country);
    } else {
      res.status(404).json({ message: "Ülke bulunamadı." });
    }
  } catch (error) {
    console.error('Error fetching country by name:', error);
    res.status(500).json({ message: error.message });
  }
});

// Sunucuyu başlatmak için port belirleme
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
