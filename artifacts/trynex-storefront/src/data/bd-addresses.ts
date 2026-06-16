export interface BDAddressData {
  divisions: Record<string, string[]>;
  upazilas: Record<string, string[]>;
}

export const BD_DIVISIONS: Record<string, string[]> = {
  "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  "Chittagong": ["Bandarban", "Brahmanbaria", "Chandpur", "Chittagong", "Comilla", "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
  "Rajshahi": ["Bogra", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Nawabganj", "Pabna", "Rajshahi", "Sirajganj"],
  "Khulna": ["Bagerhat", "Chuadanga", "Jessore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  "Barisal": ["Barguna", "Barisal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

export const BD_UPAZILAS: Record<string, string[]> = {
  "Dhaka": ["Adabor", "Badda", "Bangshal", "Cantonment", "Dhanmondi", "Gulshan", "Jatrabari", "Kafrul", "Keraniganj", "Khilgaon", "Lalbagh", "Mirpur", "Mohammadpur", "Motijheel", "Pallabi", "Ramna", "Sabujbagh", "Savar", "Shyampur", "Tejgaon", "Uttara", "Wari"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Tongi"],
  "Narayanganj": ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
  "Narsingdi": ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
  "Tangail": ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"],
  "Kishoreganj": ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
  "Manikganj": ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shivalaya", "Singair"],
  "Munshiganj": ["Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"],
  "Rajbari": ["Baliakandi", "Goalandaghat", "Kalukhali", "Pangsha", "Rajbari Sadar"],
  "Madaripur": ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Shariatpur": ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zanjira"],
  "Faridpur": ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
  "Chittagong": ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Chittagong Sadar", "Double Mooring", "Fatikchhari", "Hathazari", "Karnaphuli", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"],
  "Comilla": ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Comilla Sadar", "Daudkandi", "Debidwar", "Homna", "Laksam", "Meghna", "Monohorgonj", "Muradnagar", "Nangalkot", "Titas"],
  "Cox's Bazar": ["Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"],
  "Brahmanbaria": ["Akhaura", "Bancharampur", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
  "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
  "Feni": ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
  "Lakshmipur": ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
  "Noakhali": ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar"],
  "Khagrachhari": ["Dighinala", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
  "Rangamati": ["Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"],
  "Bandarban": ["Ali Kadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
  "Rajshahi": ["Bagha", "Bagmara", "Boalia", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Motihar", "Paba", "Puthia", "Rajpara", "Shah Makhdum", "Tanore"],
  "Bogra": ["Adamdighi", "Bogra Sadar", "Dhunat", "Dupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
  "Chapainawabganj": ["Bholahat", "Chapainawabganj Sadar", "Gomastapur", "Nachole", "Shibganj"],
  "Naogaon": ["Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadebpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
  "Natore": ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra"],
  "Nawabganj": ["Bholahat", "Gomastapur", "Nachole", "Nawabganj Sadar", "Shibganj"],
  "Pabna": ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"],
  "Joypurhat": ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
  "Sirajganj": ["Belkuchi", "Chauhali", "Kamarkhand", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"],
  "Khulna": ["Batiaghata", "Dacope", "Dumuria", "Dighalia", "Khalishpur", "Khan Jahan Ali", "Khulna Sadar", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Sonadanga", "Terokhada"],
  "Jessore": ["Abhaynagar", "Bagherpara", "Chaugachha", "Jessore Sadar", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
  "Satkhira": ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"],
  "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
  "Kushtia": ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Meherpur": ["Gangni", "Meherpur Sadar", "Mujibnagar"],
  "Narail": ["Kalia", "Lohagara", "Narail Sadar"],
  "Chuadanga": ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
  "Jhenaidah": ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
  "Barisal": ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barisal Sadar", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
  "Bhola": ["Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
  "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],
  "Patuakhali": ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"],
  "Pirojpur": ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Pirojpur Sadar", "Zianagar"],
  "Barguna": ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"],
  "Sylhet": ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshin Surma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "South Surma", "Sylhet Sadar", "Zakiganj"],
  "Habiganj": ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shaistaganj"],
  "Moulvibazar": ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
  "Sunamganj": ["Bishwambarpur", "Chhatak", "Derai", "Dharamapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Shalla", "South Sunamganj", "Sunamganj Sadar", "Tahirpur"],
  "Rangpur": ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"],
  "Dinajpur": ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur", "Phulbari"],
  "Kurigram": ["Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Phulbari", "Rajarhat", "Raumari", "Ulipur"],
  "Gaibandha": ["Fulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
  "Nilphamari": ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"],
  "Lalmonirhat": ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
  "Thakurgaon": ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"],
  "Panchagarh": ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
  "Mymensingh": ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Mymensingh Sadar", "Nandail", "Phulpur", "Trishal"],
  "Jamalpur": ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"],
  "Netrokona": ["Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Khaliajuri", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"],
  "Sherpur": ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"],
};

export const BD_POST_CODES: Record<string, string> = {
  "Dhaka": "1000", "Gazipur": "1700", "Narayanganj": "1400", "Narsingdi": "1600",
  "Tangail": "1900", "Kishoreganj": "2300", "Manikganj": "1800", "Munshiganj": "1500",
  "Rajbari": "7700", "Madaripur": "7900", "Gopalganj": "8100", "Shariatpur": "8000",
  "Faridpur": "7800", "Chittagong": "4000", "Comilla": "3500", "Cox's Bazar": "4700",
  "Brahmanbaria": "3400", "Chandpur": "3600", "Feni": "3900", "Lakshmipur": "3700",
  "Noakhali": "3800", "Khagrachhari": "4400", "Rangamati": "4500", "Bandarban": "4600",
  "Rajshahi": "6000", "Bogra": "5800", "Chapainawabganj": "6300", "Naogaon": "6500",
  "Natore": "6400", "Nawabganj": "6300", "Pabna": "6600", "Joypurhat": "5900",
  "Sirajganj": "6700", "Khulna": "9100", "Jessore": "7400", "Satkhira": "9400",
  "Bagerhat": "9300", "Kushtia": "7000", "Magura": "7600", "Meherpur": "7100",
  "Narail": "7500", "Chuadanga": "7200", "Jhenaidah": "7300", "Barisal": "8200",
  "Bhola": "8300", "Jhalokati": "8400", "Patuakhali": "8600", "Pirojpur": "8500",
  "Barguna": "8700", "Sylhet": "3100", "Habiganj": "3300", "Moulvibazar": "3200",
  "Sunamganj": "3000", "Rangpur": "5400", "Dinajpur": "5200", "Kurigram": "5600",
  "Gaibandha": "5700", "Nilphamari": "5500", "Lalmonirhat": "5500", "Thakurgaon": "5100",
  "Panchagarh": "5100", "Mymensingh": "2200", "Jamalpur": "2000", "Netrokona": "2400",
  "Sherpur": "2100",
};

export const BD_UPAZILA_POST_CODES: Record<string, Record<string, string>> = {
  /* ── DHAKA DIVISION ─────────────────────────────────── */
  "Dhaka": {
    "Savar": "1340", "Uttara": "1230", "Mirpur": "1216", "Dhanmondi": "1205",
    "Gulshan": "1212", "Motijheel": "1000", "Mohammadpur": "1207", "Tejgaon": "1215",
    "Keraniganj": "1310", "Pallabi": "1216", "Kafrul": "1206", "Ramna": "1000",
    "Lalbagh": "1211", "Wari": "1203", "Jatrabari": "1204", "Khilgaon": "1219",
    "Badda": "1212", "Shyampur": "1204", "Sabujbagh": "1214", "Adabor": "1207",
    "Cantonment": "1206", "Bangshal": "1100",
  },
  "Gazipur": {
    "Tongi": "1710", "Gazipur Sadar": "1700", "Sreepur": "1740",
    "Kaliakair": "1750", "Kaliganj": "1720", "Kapasia": "1730",
  },
  "Narayanganj": {
    "Narayanganj Sadar": "1400", "Rupganj": "1460", "Sonargaon": "1440",
    "Araihazar": "1450", "Bandar": "1410",
  },
  "Narsingdi": {
    "Narsingdi Sadar": "1600", "Belabo": "1610", "Monohardi": "1620",
    "Palash": "1630", "Raipura": "1640", "Shibpur": "1650",
  },
  "Tangail": {
    "Tangail Sadar": "1900", "Madhupur": "1996", "Mirzapur": "1990",
    "Bhuapur": "1910", "Delduar": "1920", "Ghatail": "1985",
    "Gopalpur": "1930", "Kalihati": "1970", "Nagarpur": "1940",
    "Sakhipur": "1950", "Basail": "1960", "Dhanbari": "1980",
  },
  "Kishoreganj": {
    "Kishoreganj Sadar": "2300", "Bhairab": "2350", "Bajitpur": "2320",
    "Kuliarchar": "2380", "Katiadi": "2370", "Hossainpur": "2330",
    "Karimganj": "2360", "Austagram": "2310", "Itna": "2340",
    "Mithamain": "2390", "Nikli": "2395", "Pakundia": "2398", "Tarail": "2399",
  },
  "Manikganj": {
    "Manikganj Sadar": "1800", "Saturia": "1810", "Daulatpur": "1820",
    "Ghior": "1830", "Harirampur": "1840", "Shivalaya": "1850", "Singair": "1860",
  },
  "Munshiganj": {
    "Munshiganj Sadar": "1500", "Gazaria": "1510", "Lohajang": "1520",
    "Sreenagar": "1530", "Sirajdikhan": "1540", "Tongibari": "1550",
  },
  "Rajbari": {
    "Rajbari Sadar": "7700", "Pangsha": "7710", "Baliakandi": "7720",
    "Kalukhali": "7730", "Goalandaghat": "7740",
  },
  "Madaripur": {
    "Madaripur Sadar": "7900", "Shibchar": "7910", "Kalkini": "7920", "Rajoir": "7930",
  },
  "Gopalganj": {
    "Gopalganj Sadar": "8100", "Tungipara": "8110", "Kashiani": "8120",
    "Kotalipara": "8130", "Muksudpur": "8140",
  },
  "Shariatpur": {
    "Shariatpur Sadar": "8000", "Naria": "8010", "Zanjira": "8020",
    "Gosairhat": "8030", "Damudya": "8040", "Bhedarganj": "8050",
  },
  "Faridpur": {
    "Faridpur Sadar": "7800", "Bhanga": "7810", "Alfadanga": "7820",
    "Boalmari": "7830", "Madhukhali": "7840", "Saltha": "7850",
    "Nagarkanda": "7860", "Charbhadrasan": "7870", "Sadarpur": "7880",
  },

  /* ── CHITTAGONG DIVISION ────────────────────────────── */
  "Chittagong": {
    "Chittagong Sadar": "4000", "Double Mooring": "4000", "Hathazari": "4330",
    "Sitakunda": "4310", "Mirsharai": "4320", "Fatikchhari": "4338",
    "Raozan": "4340", "Sandwip": "4352", "Rangunia": "4360",
    "Patiya": "4370", "Anwara": "4376", "Karnaphuli": "4376",
    "Boalkhali": "4366", "Chandanaish": "4386", "Satkania": "4392",
    "Lohagara": "4393", "Banshkhali": "4390",
  },
  "Comilla": {
    "Comilla Sadar": "3500", "Daudkandi": "3516", "Laksam": "3570",
    "Burichang": "3520", "Chandina": "3530", "Chauddagram": "3540",
    "Debidwar": "3550", "Homna": "3560", "Meghna": "3580",
    "Muradnagar": "3585", "Nangalkot": "3588", "Barura": "3510",
    "Brahmanpara": "3590", "Titas": "3584", "Monohorgonj": "3582",
  },
  "Cox's Bazar": {
    "Cox's Bazar Sadar": "4700", "Ramu": "4726", "Pekua": "4728",
    "Chakaria": "4730", "Maheshkhali": "4710", "Kutubdia": "4750",
    "Ukhia": "4752", "Teknaf": "4760",
  },
  "Brahmanbaria": {
    "Brahmanbaria Sadar": "3400", "Sarail": "3410", "Kasba": "3420",
    "Nabinagar": "3430", "Nasirnagar": "3440", "Akhaura": "3450",
    "Bancharampur": "3460",
  },
  "Chandpur": {
    "Chandpur Sadar": "3600", "Haziganj": "3610", "Faridganj": "3620",
    "Matlab Dakshin": "3630", "Matlab Uttar": "3635", "Kachua": "3640",
    "Shahrasti": "3645", "Haimchar": "3650",
  },
  "Feni": {
    "Feni Sadar": "3900", "Chhagalnaiya": "3910", "Daganbhuiyan": "3920",
    "Parshuram": "3930", "Fulgazi": "3940", "Sonagazi": "3950",
  },
  "Lakshmipur": {
    "Lakshmipur Sadar": "3700", "Raipur": "3710", "Ramganj": "3720",
    "Ramgati": "3730", "Kamalnagar": "3740",
  },
  "Noakhali": {
    "Noakhali Sadar": "3800", "Begumganj": "3820", "Chatkhil": "3830",
    "Companiganj": "3840", "Hatiya": "3850", "Kabirhat": "3860",
    "Senbagh": "3870", "Sonaimuri": "3880", "Subarnachar": "3890",
  },
  "Khagrachhari": {
    "Khagrachhari Sadar": "4400", "Dighinala": "4410", "Lakshmichhari": "4420",
    "Mahalchhari": "4430", "Manikchhari": "4440", "Matiranga": "4450",
    "Panchhari": "4460", "Ramgarh": "4470",
  },
  "Rangamati": {
    "Rangamati Sadar": "4500", "Kaptai": "4520", "Baghaichhari": "4510",
    "Barkal": "4530", "Belaichhari": "4540", "Juraichhari": "4545",
    "Kawkhali": "4550", "Langadu": "4560", "Naniarchar": "4570", "Rajasthali": "4580",
  },
  "Bandarban": {
    "Bandarban Sadar": "4600", "Ruma": "4620", "Thanchi": "4630",
    "Lama": "4640", "Rowangchhari": "4650", "Naikhongchhari": "4660",
    "Ali Kadam": "4670",
  },

  /* ── RAJSHAHI DIVISION ─────────────────────────────── */
  "Rajshahi": {
    "Rajshahi Sadar": "6000", "Godagari": "6010", "Tanore": "6020",
    "Bagmara": "6030", "Durgapur": "6040", "Charghat": "6050",
    "Puthia": "6060", "Bagha": "6070", "Mohanpur": "6080",
  },
  "Bogra": {
    "Bogra Sadar": "5800", "Adamdighi": "5810", "Sherpur": "5820",
    "Dhunat": "5830", "Shibganj": "5840", "Kahaloo": "5850",
    "Gabtali": "5860", "Sariakandi": "5870", "Sonatala": "5880",
    "Nandigram": "5890", "Dupchanchia": "5882", "Shajahanpur": "5884",
  },
  "Chapainawabganj": {
    "Chapainawabganj Sadar": "6300", "Shibganj": "6310", "Gomastapur": "6320",
    "Nachole": "6330", "Bholahat": "6340",
  },
  "Naogaon": {
    "Naogaon Sadar": "6500", "Badalgachhi": "6510", "Dhamoirhat": "6520",
    "Atrai": "6530", "Mahadebpur": "6540", "Niamatpur": "6550",
    "Manda": "6560", "Patnitala": "6570", "Porsha": "6580",
    "Raninagar": "6590", "Sapahar": "6596",
  },
  "Natore": {
    "Natore Sadar": "6400", "Bagatipara": "6410", "Baraigram": "6420",
    "Gurudaspur": "6430", "Lalpur": "6440", "Singra": "6450",
  },
  "Pabna": {
    "Pabna Sadar": "6600", "Ishwardi": "6620", "Atgharia": "6630",
    "Chatmohar": "6640", "Santhia": "6650", "Bera": "6660",
    "Bhangura": "6670", "Sujanagar": "6680", "Faridpur": "6690",
  },
  "Joypurhat": {
    "Joypurhat Sadar": "5900", "Akkelpur": "5910", "Kalai": "5920",
    "Khetlal": "5930", "Panchbibi": "5940",
  },
  "Sirajganj": {
    "Sirajganj Sadar": "6700", "Belkuchi": "6710", "Kamarkhand": "6720",
    "Ullapara": "6730", "Chauhali": "6740", "Kazipur": "6750",
    "Raiganj": "6760", "Shahjadpur": "6770", "Tarash": "6780",
  },

  /* ── KHULNA DIVISION ────────────────────────────────── */
  "Khulna": {
    "Khulna Sadar": "9100", "Sonadanga": "9100", "Khalishpur": "9100",
    "Batiaghata": "9220", "Dacope": "9230", "Dumuria": "9240",
    "Dighalia": "9250", "Koyra": "9260", "Paikgachha": "9270",
    "Phultala": "9280", "Rupsha": "9290", "Terokhada": "9295",
    "Khan Jahan Ali": "9100",
  },
  "Jessore": {
    "Jessore Sadar": "7400", "Abhaynagar": "7420", "Bagherpara": "7430",
    "Chaugachha": "7440", "Jhikargachha": "7450", "Keshabpur": "7460",
    "Manirampur": "7470", "Sharsha": "7480",
  },
  "Satkhira": {
    "Satkhira Sadar": "9400", "Debhata": "9410", "Assasuni": "9420",
    "Kalaroa": "9430", "Kaliganj": "9440", "Shyamnagar": "9450", "Tala": "9460",
  },
  "Bagerhat": {
    "Bagerhat Sadar": "9300", "Chitalmari": "9310", "Fakirhat": "9320",
    "Kachua": "9330", "Mollahat": "9340", "Mongla": "9350",
    "Morrelganj": "9360", "Rampal": "9370", "Sarankhola": "9380",
  },
  "Kushtia": {
    "Kushtia Sadar": "7000", "Mirpur": "7030", "Bheramara": "7010",
    "Daulatpur": "7020", "Khoksa": "7040", "Kumarkhali": "7050",
  },
  "Magura": {
    "Magura Sadar": "7600", "Mohammadpur": "7650", "Shalikha": "7660",
    "Sreepur": "7670",
  },
  "Meherpur": {
    "Meherpur Sadar": "7100", "Gangni": "7110", "Mujibnagar": "7120",
  },
  "Narail": {
    "Narail Sadar": "7500", "Lohagara": "7510", "Kalia": "7520",
  },
  "Chuadanga": {
    "Chuadanga Sadar": "7200", "Alamdanga": "7210", "Damurhuda": "7220",
    "Jibannagar": "7230",
  },
  "Jhenaidah": {
    "Jhenaidah Sadar": "7300", "Harinakunda": "7310", "Kaliganj": "7320",
    "Kotchandpur": "7330", "Maheshpur": "7340", "Shailkupa": "7350",
  },

  /* ── BARISAL DIVISION ───────────────────────────────── */
  "Barisal": {
    "Barisal Sadar": "8200", "Agailjhara": "8210", "Babuganj": "8220",
    "Bakerganj": "8230", "Banaripara": "8240", "Gournadi": "8250",
    "Hizla": "8260", "Mehendiganj": "8270", "Muladi": "8280", "Wazirpur": "8290",
  },
  "Barguna": {
    "Barguna Sadar": "8700", "Amtali": "8710", "Betagi": "8730",
    "Bamna": "8720", "Patharghata": "8740", "Taltali": "8750",
  },
  "Bhola": {
    "Bhola Sadar": "8300", "Borhanuddin": "8310", "Char Fasson": "8320",
    "Daulatkhan": "8330", "Lalmohan": "8340", "Manpura": "8350", "Tazumuddin": "8360",
  },
  "Jhalokati": {
    "Jhalokati Sadar": "8400", "Rajapur": "8410", "Kathalia": "8420", "Nalchity": "8430",
  },
  "Patuakhali": {
    "Patuakhali Sadar": "8600", "Galachipa": "8610", "Dashmina": "8620",
    "Dumki": "8630", "Bauphal": "8640", "Kalapara": "8650",
    "Mirzaganj": "8660", "Rangabali": "8670",
  },
  "Pirojpur": {
    "Pirojpur Sadar": "8500", "Nesarabad": "8510", "Bhandaria": "8520",
    "Kawkhali": "8530", "Mathbaria": "8540", "Nazirpur": "8550", "Zianagar": "8560",
  },

  /* ── SYLHET DIVISION ────────────────────────────────── */
  "Sylhet": {
    "Sylhet Sadar": "3100", "Bishwanath": "3130", "Companiganj": "3120",
    "Balaganj": "3140", "Beanibazar": "3150", "Jaintiapur": "3156",
    "Fenchuganj": "3116", "Golapganj": "3160", "Gowainghat": "3170",
    "Kanaighat": "3180", "Zakiganj": "3190", "Osmani Nagar": "3100",
    "Dakshin Surma": "3100", "South Surma": "3100",
  },
  "Habiganj": {
    "Habiganj Sadar": "3300", "Shaistaganj": "3301", "Nabiganj": "3310",
    "Chunarughat": "3320", "Baniachong": "3330", "Ajmiriganj": "3340",
    "Lakhai": "3350", "Bahubal": "3360", "Madhabpur": "3370",
  },
  "Moulvibazar": {
    "Moulvibazar Sadar": "3200", "Sreemangal": "3210", "Barlekha": "3220",
    "Juri": "3230", "Kamalganj": "3240", "Kulaura": "3250", "Rajnagar": "3260",
  },
  "Sunamganj": {
    "Sunamganj Sadar": "3000", "South Sunamganj": "3010", "Bishwambarpur": "3014",
    "Chhatak": "3020", "Derai": "3030", "Dharamapasha": "3040",
    "Dowarabazar": "3050", "Jagannathpur": "3060", "Jamalganj": "3070",
    "Shalla": "3080", "Tahirpur": "3045",
  },

  /* ── RANGPUR DIVISION ───────────────────────────────── */
  "Rangpur": {
    "Rangpur Sadar": "5400", "Badarganj": "5420", "Taraganj": "5410",
    "Gangachara": "5430", "Kaunia": "5440", "Mithapukur": "5450",
    "Pirgachha": "5460", "Pirganj": "5470",
  },
  "Dinajpur": {
    "Dinajpur Sadar": "5200", "Nawabganj": "5210", "Parbatipur": "5220",
    "Phulbari": "5230", "Chirirbandar": "5240", "Bochaganj": "5250",
    "Biral": "5260", "Birampur": "5270", "Birganj": "5280",
    "Ghoraghat": "5290", "Hakimpur": "5292", "Kaharole": "5294",
    "Khansama": "5296",
  },
  "Gaibandha": {
    "Gaibandha Sadar": "5700", "Sundarganj": "5710", "Sadullapur": "5720",
    "Palashbari": "5730", "Gobindaganj": "5740", "Saghata": "5750",
    "Fulchhari": "5760",
  },
  "Kurigram": {
    "Kurigram Sadar": "5600", "Nageshwari": "5610", "Chilmari": "5620",
    "Phulbari": "5630", "Bhurungamari": "5640", "Char Rajibpur": "5650",
    "Rajarhat": "5660", "Raumari": "5670", "Ulipur": "5680",
  },
  "Lalmonirhat": {
    "Lalmonirhat Sadar": "5500", "Aditmari": "5510", "Hatibandha": "5520",
    "Kaliganj": "5530", "Patgram": "5540",
  },
  "Nilphamari": {
    "Nilphamari Sadar": "5300", "Saidpur": "5310", "Jaldhaka": "5320",
    "Domar": "5330", "Kishoreganj": "5340", "Dimla": "5350",
  },
  "Panchagarh": {
    "Panchagarh Sadar": "5000", "Atwari": "5010", "Boda": "5020",
    "Debiganj": "5030", "Tetulia": "5040",
  },
  "Thakurgaon": {
    "Thakurgaon Sadar": "5100", "Baliadangi": "5110", "Haripur": "5120",
    "Pirganj": "5130", "Ranisankail": "5140",
  },

  /* ── MYMENSINGH DIVISION ────────────────────────────── */
  "Mymensingh": {
    "Mymensingh Sadar": "2200", "Muktagachha": "2210", "Trishal": "2220",
    "Bhaluka": "2240", "Phulpur": "2230", "Gaffargaon": "2250",
    "Gauripur": "2260", "Nandail": "2270", "Ishwarganj": "2280",
    "Haluaghat": "2290", "Fulbaria": "2292", "Dhobaura": "2294",
  },
  "Jamalpur": {
    "Jamalpur Sadar": "2000", "Melandaha": "2010", "Islampur": "2020",
    "Dewanganj": "2030", "Sarishabari": "2040", "Madarganj": "2050",
    "Bakshiganj": "2060",
  },
  "Netrokona": {
    "Netrokona Sadar": "2400", "Kendua": "2450", "Atpara": "2410",
    "Barhatta": "2420", "Durgapur": "2430", "Kalmakanda": "2440",
    "Khaliajuri": "2460", "Madan": "2470", "Mohanganj": "2480",
    "Purbadhala": "2490",
  },
  "Sherpur": {
    "Sherpur Sadar": "2100", "Nakla": "2110", "Nalitabari": "2120",
    "Sreebardi": "2130", "Jhenaigati": "2140",
  },
};

export function getDivisionForDistrict(district: string): string | undefined {
  for (const [division, districts] of Object.entries(BD_DIVISIONS)) {
    if (districts.includes(district)) return division;
  }
  return undefined;
}

export function getAllDistricts(): string[] {
  return Object.values(BD_DIVISIONS).flat().sort();
}

export function getPostCode(district: string, upazila?: string): string {
  if (upazila && BD_UPAZILA_POST_CODES[district]?.[upazila]) {
    return BD_UPAZILA_POST_CODES[district][upazila];
  }
  return BD_POST_CODES[district] || "";
}

export function getUpazilasForDistrict(district: string): string[] {
  return BD_UPAZILAS[district] || [];
}
