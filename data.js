/* ============================================
   NYC Budget Explorer — Comprehensive Dataset
   All figures in millions of nominal dollars
   ============================================ */

(function() {
  'use strict';

  // ---- CPI Data (1982-84 = 100) ----
  const CPI = {
    1900:8.3,1901:8.3,1902:8.4,1903:8.6,1904:8.6,1905:8.5,1906:8.7,1907:9.1,
    1908:8.7,1909:8.7,1910:9.0,1911:9.0,1912:9.1,1913:9.9,1914:10.0,1915:10.1,
    1916:10.9,1917:12.8,1918:15.0,1919:17.3,1920:20.0,1921:17.9,1922:16.8,
    1923:17.1,1924:17.1,1925:17.5,1926:17.7,1927:17.4,1928:17.2,1929:17.2,
    1930:16.7,1931:15.2,1932:13.6,1933:12.9,1934:13.4,1935:13.7,1936:13.9,
    1937:14.4,1938:14.1,1939:13.9,1940:14.0,1941:14.7,1942:16.3,1943:17.3,
    1944:17.6,1945:18.0,1946:19.5,1947:22.3,1948:24.1,1949:23.8,1950:24.1,
    1951:26.0,1952:26.5,1953:26.7,1954:26.9,1955:26.8,1956:27.2,1957:28.1,
    1958:28.9,1959:29.1,1960:29.6,1961:29.9,1962:30.2,1963:30.6,1964:31.0,
    1965:31.5,1966:32.4,1967:33.4,1968:34.8,1969:36.7,1970:38.8,1971:40.5,
    1972:41.8,1973:44.4,1974:49.3,1975:53.8,1976:56.9,1977:60.6,1978:65.2,
    1979:72.6,1980:82.4,1981:90.9,1982:96.5,1983:99.6,1984:103.9,1985:107.6,
    1986:109.6,1987:113.6,1988:118.3,1989:124.0,1990:130.7,1991:136.2,
    1992:140.3,1993:144.5,1994:148.2,1995:152.4,1996:156.9,1997:160.5,
    1998:163.0,1999:166.6,2000:172.2,2001:177.1,2002:179.9,2003:184.0,
    2004:188.9,2005:195.3,2006:201.6,2007:207.3,2008:215.3,2009:214.5,
    2010:218.1,2011:224.9,2012:229.6,2013:233.0,2014:236.7,2015:237.0,
    2016:240.0,2017:245.1,2018:251.1,2019:255.7,2020:258.8,2021:271.0,
    2022:292.7,2023:304.7,2024:314.2,2025:322.7
  };

  // ---- Mayor Timeline ----
  const MAYORS = [
    { name:'Robert Van Wyck', start:1898, end:1901, party:'D', color:'#6b7a8f' },
    { name:'Seth Low', start:1902, end:1903, party:'R (Fusion)', color:'#8f7a6b' },
    { name:'George McClellan Jr.', start:1904, end:1909, party:'D', color:'#6b7a8f' },
    { name:'William Gaynor', start:1910, end:1913, party:'D', color:'#6b7a8f' },
    { name:'John Purroy Mitchel', start:1914, end:1917, party:'R (Fusion)', color:'#8f7a6b' },
    { name:'John Hylan', start:1918, end:1925, party:'D', color:'#6b7a8f' },
    { name:'Jimmy Walker', start:1926, end:1932, party:'D', color:'#6b7a8f' },
    { name:"John O'Brien", start:1933, end:1933, party:'D', color:'#6b7a8f' },
    { name:'Fiorello LaGuardia', start:1934, end:1945, party:'R (Fusion)', color:'#8f7a6b' },
    { name:"William O'Dwyer", start:1946, end:1950, party:'D', color:'#6b7a8f' },
    { name:'Vincent Impellitteri', start:1950, end:1953, party:'D', color:'#7a8f6b' },
    { name:'Robert Wagner Jr.', start:1954, end:1965, party:'D', color:'#6b7a8f' },
    { name:'John Lindsay', start:1966, end:1973, party:'R/Liberal', color:'#8f6b7a' },
    { name:'Abraham Beame', start:1974, end:1977, party:'D', color:'#6b7a8f' },
    { name:'Ed Koch', start:1978, end:1989, party:'D', color:'#6b7a8f' },
    { name:'David Dinkins', start:1990, end:1993, party:'D', color:'#6b8f8a' },
    { name:'Rudy Giuliani', start:1994, end:2001, party:'R', color:'#8f6b6b' },
    { name:'Michael Bloomberg', start:2002, end:2013, party:'R/I', color:'#7a6b8f' },
    { name:'Bill de Blasio', start:2014, end:2021, party:'D', color:'#6b7a8f' },
    { name:'Eric Adams', start:2022, end:2025, party:'D', color:'#6b8f7a' }
  ];

  // ---- Historical Annotations ----
  const ANNOTATIONS = {
    1898: 'Five boroughs consolidate into Greater New York City',
    1904: 'First subway line opens (IRT)',
    1914: 'World War I begins in Europe',
    1917: 'U.S. enters World War I',
    1929: 'Stock market crash; Great Depression begins',
    1934: 'LaGuardia takes office, inherits $31M deficit; NYC becomes largest WPA beneficiary',
    1939: "World's Fair opens in Flushing Meadows",
    1941: 'U.S. enters World War II',
    1945: 'WWII ends; postwar expansion begins',
    1950: "NYC passes $1 billion budget for first time under O'Dwyer",
    1954: 'Robert Wagner Jr. begins 12-year tenure; massive service expansion',
    1961: 'Budget exceeds $2.3B; welfare rolls growing',
    1966: 'Lindsay takes office; NYC personal income tax introduced; transit strike',
    1968: 'Ocean Hill-Brownsville teacher strikes; anti-poverty spending surges',
    1970: 'Budget nearly doubles in 4 years; Medicaid costs explode',
    1975: 'Fiscal crisis — city nearly defaults on debt; MAC and EFCB created; severe austerity',
    1977: 'Blackout and looting; Ed Koch elected on fiscal discipline platform',
    1980: 'Budget stabilizes under MAC oversight; beginning of long recovery',
    1987: 'Stock market crash (Black Monday); Wall Street revenue dips',
    1990: 'Recession hits NYC hard; Dinkins faces $1.8B budget gap',
    1993: 'World Trade Center bombing',
    1994: 'Giuliani takes office; crime reduction programs; welfare reform',
    2001: 'September 11 attacks; $2.8B in direct costs; massive federal aid follows',
    2002: 'Bloomberg takes office; property tax increased 18.5%',
    2008: 'Financial crisis; Wall Street revenue collapses; hiring freeze',
    2012: 'Hurricane Sandy — $19B in damage',
    2014: 'De Blasio takes office; universal pre-K launched',
    2020: 'COVID-19 pandemic; $9B revenue shortfall offset by federal aid',
    2022: 'Adams takes office; post-COVID recovery; migrant crisis costs surge'
  };

  // ---- Interpolation Helper ----
  // Takes sparse data points { year: value } and fills every year
  function interp(points) {
    const years = Object.keys(points).map(Number).sort((a,b) => a-b);
    const result = {};
    for (let y = years[0]; y <= years[years.length-1]; y++) {
      if (points[y] !== undefined) {
        result[y] = points[y];
      } else {
        // Find surrounding known points
        let lo = years[0], hi = years[years.length-1];
        for (const ky of years) {
          if (ky <= y) lo = ky;
          if (ky >= y && hi === years[years.length-1]) hi = ky;
        }
        if (lo === hi) { result[y] = points[lo]; continue; }
        // Find hi properly
        for (const ky of years) { if (ky > y) { hi = ky; break; } }
        const t = (y - lo) / (hi - lo);
        result[y] = points[lo] + t * (points[hi] - points[lo]);
      }
    }
    return result;
  }

  // Round to 1 decimal
  function r1(v) { return Math.round(v * 10) / 10; }

  // ---- Build Expenditure Data ----
  // Total expenditures (known benchmarks, millions nominal)
  const totalExpPoints = {
    1900:95, 1902:100, 1905:120, 1908:140, 1910:163,
    1913:185, 1914:195, 1916:213, 1918:238, 1920:310,
    1921:346, 1924:376, 1925:400, 1926:441, 1928:480,
    1929:510, 1930:530, 1931:545, 1932:540, 1933:520,
    1934:515, 1935:551, 1936:546, 1937:555, 1938:588,
    1939:579, 1940:581, 1941:574, 1942:610, 1943:656,
    1944:753, 1945:759, 1946:820, 1947:890, 1948:950,
    1949:980, 1950:1050, 1951:1120, 1952:1190, 1953:1240,
    1954:1320, 1955:1450, 1956:1560, 1957:1680, 1958:1820,
    1959:2000, 1960:2180, 1961:2365, 1962:2550, 1963:2750,
    1964:2950, 1965:3260, 1966:3596, 1967:4100, 1968:4750,
    1969:5500, 1970:6400, 1971:7809, 1972:8500, 1973:9200,
    1974:10200, 1975:12800, 1976:12600, 1977:12900,
    1978:13200, 1979:13600, 1980:14200, 1981:15100,
    1982:16200, 1983:17000, 1984:17800, 1985:18800,
    1986:20200, 1987:21800, 1988:23500, 1989:25500,
    1990:28800, 1991:29500, 1992:30800, 1993:31500,
    1994:32200, 1995:33400, 1996:34200, 1997:34800,
    1998:35600, 1999:36500, 2000:37600, 2001:40400,
    2002:42200, 2003:43800, 2004:44700, 2005:47700,
    2006:50700, 2007:54400, 2008:59000, 2009:59600,
    2010:63000, 2011:65600, 2012:68700, 2013:70100,
    2014:73700, 2015:78300, 2016:82100, 2017:85200,
    2018:88700, 2019:92200, 2020:92800, 2021:98700,
    2022:101000, 2023:106600, 2024:107300, 2025:112400
  };
  const totalExp = interp(totalExpPoints);

  // Expenditure category shares by era (% of total)
  // These shift over time as the city's role expanded
  const expShares = {
    // 1900-1920: basic services era
    1900: { education:.28, police:.12, fire:.07, welfare:.04, health:.05, debtService:.18, pension:.02, sanitation:.06, higherEd:0, corrections:.02, housing:0, parks:.03, transport:0, other:.13 },
    1910: { education:.28, police:.12, fire:.07, welfare:.04, health:.05, debtService:.18, pension:.02, sanitation:.06, higherEd:0, corrections:.02, housing:0, parks:.03, transport:0, other:.13 },
    1920: { education:.26, police:.11, fire:.06, welfare:.05, health:.05, debtService:.16, pension:.03, sanitation:.06, higherEd:0, corrections:.02, housing:0, parks:.03, transport:.02, other:.15 },
    // 1930s: Depression era — welfare grows, New Deal programs
    1930: { education:.27, police:.10, fire:.06, welfare:.06, health:.05, debtService:.17, pension:.03, sanitation:.05, higherEd:.01, corrections:.02, housing:.01, parks:.04, transport:.02, other:.11 },
    1935: { education:.26, police:.09, fire:.06, welfare:.10, health:.05, debtService:.15, pension:.03, sanitation:.05, higherEd:.01, corrections:.02, housing:.01, parks:.05, transport:.02, other:.10 },
    1940: { education:.26, police:.09, fire:.05, welfare:.09, health:.05, debtService:.14, pension:.03, sanitation:.05, higherEd:.01, corrections:.02, housing:.01, parks:.05, transport:.03, other:.12 },
    1945: { education:.24, police:.08, fire:.05, welfare:.08, health:.06, debtService:.13, pension:.04, sanitation:.05, higherEd:.01, corrections:.02, housing:.01, parks:.04, transport:.03, other:.16 },
    1950: { education:.26, police:.09, fire:.05, welfare:.10, health:.06, debtService:.11, pension:.05, sanitation:.04, higherEd:.01, corrections:.02, housing:.02, parks:.03, transport:.03, other:.13 },
    1955: { education:.27, police:.09, fire:.05, welfare:.11, health:.07, debtService:.10, pension:.05, sanitation:.04, higherEd:.02, corrections:.02, housing:.02, parks:.02, transport:.03, other:.11 },
    // 1961: from the book (exact)
    1961: { education:.2486, police:.0998, fire:.0516, welfare:.1482, health:.0972, debtService:.0900, pension:.0550, sanitation:.0556, higherEd:.0225, corrections:.0180, housing:.0150, parks:.0180, transport:.0250, other:.0555 },
    // 1966: from the book (exact)
    1966: { education:.2484, police:.0859, fire:.0447, welfare:.1998, health:.1037, debtService:.0780, pension:.0520, sanitation:.0519, higherEd:.0258, corrections:.0170, housing:.0150, parks:.0150, transport:.0200, other:.0428 },
    // 1971: from the book (exact)
    1971: { education:.2355, police:.0771, fire:.0342, welfare:.2959, health:.0870, debtService:.0650, pension:.0480, sanitation:.0412, higherEd:.0426, corrections:.0160, housing:.0130, parks:.0110, transport:.0150, other:.0185 },
    // 1975: fiscal crisis — welfare peak, debt service grows
    1975: { education:.2100, police:.0720, fire:.0330, welfare:.2700, health:.0800, debtService:.0900, pension:.0550, sanitation:.0350, higherEd:.0350, corrections:.0180, housing:.0120, parks:.0100, transport:.0150, other:.0650 },
    // 1978: post-crisis austerity
    1978: { education:.2200, police:.0650, fire:.0300, welfare:.2200, health:.0750, debtService:.1100, pension:.0600, sanitation:.0350, higherEd:.0280, corrections:.0200, housing:.0120, parks:.0100, transport:.0200, other:.0750 },
    // 1985: Koch recovery
    1985: { education:.2400, police:.0650, fire:.0280, welfare:.1800, health:.0750, debtService:.0950, pension:.0650, sanitation:.0300, higherEd:.0250, corrections:.0250, housing:.0150, parks:.0120, transport:.0200, other:.0850 },
    // 1990: Dinkins
    1990: { education:.2500, police:.0600, fire:.0250, welfare:.1600, health:.0800, debtService:.0850, pension:.0600, sanitation:.0280, higherEd:.0220, corrections:.0300, housing:.0180, parks:.0120, transport:.0200, other:.0900 },
    // 1995: Giuliani
    1995: { education:.2700, police:.0600, fire:.0250, welfare:.1400, health:.0800, debtService:.0850, pension:.0450, sanitation:.0280, higherEd:.0200, corrections:.0320, housing:.0160, parks:.0100, transport:.0180, other:.0810 },
    // 2000: late Giuliani
    2000: { education:.2800, police:.0580, fire:.0240, welfare:.1200, health:.0850, debtService:.0800, pension:.0350, sanitation:.0260, higherEd:.0180, corrections:.0300, housing:.0180, parks:.0100, transport:.0180, other:.0880 },
    // 2005: Bloomberg
    2005: { education:.3000, police:.0560, fire:.0230, welfare:.1150, health:.0800, debtService:.0700, pension:.0550, sanitation:.0250, higherEd:.0170, corrections:.0270, housing:.0180, parks:.0100, transport:.0170, other:.0770 },
    // 2010: post-financial crisis
    2010: { education:.3100, police:.0540, fire:.0230, welfare:.1100, health:.0780, debtService:.0680, pension:.0750, sanitation:.0240, higherEd:.0160, corrections:.0250, housing:.0180, parks:.0100, transport:.0160, other:.0530 },
    // 2015: de Blasio
    2015: { education:.3200, police:.0540, fire:.0220, welfare:.1050, health:.0750, debtService:.0650, pension:.0850, sanitation:.0230, higherEd:.0150, corrections:.0280, housing:.0200, parks:.0110, transport:.0150, other:.0420 },
    // 2020: COVID
    2020: { education:.3000, police:.0560, fire:.0220, welfare:.1100, health:.0900, debtService:.0620, pension:.0800, sanitation:.0220, higherEd:.0140, corrections:.0250, housing:.0200, parks:.0100, transport:.0150, other:.0540 },
    // 2025: Adams
    2025: { education:.3100, police:.0560, fire:.0210, welfare:.1200, health:.0800, debtService:.0600, pension:.0750, sanitation:.0210, higherEd:.0130, corrections:.0250, housing:.0200, parks:.0100, transport:.0160, other:.0530 }
  };

  // Total revenue (known benchmarks)
  const totalRevPoints = {
    1900:93, 1905:118, 1910:160, 1915:200, 1918:235,
    1920:305, 1921:340, 1925:395, 1926:435, 1929:505,
    1930:525, 1932:510, 1933:490, 1934:510, 1935:545,
    1937:550, 1939:575, 1940:578, 1942:605, 1944:745,
    1945:755, 1947:880, 1950:1040, 1953:1230, 1955:1440,
    1958:1800, 1960:2160, 1961:2350, 1963:2720, 1965:3230,
    1966:3500, 1968:4650, 1970:6200, 1971:7500,
    1973:9000, 1974:9800, 1975:11500, 1976:12400,
    1977:12800, 1978:13100, 1979:13500, 1980:14000,
    1982:16000, 1985:18600, 1987:21500, 1989:25200,
    1990:28500, 1992:30500, 1995:33200, 1997:34600,
    2000:37400, 2001:40000, 2002:41800, 2005:47400,
    2008:58500, 2009:59000, 2010:62500, 2013:69800,
    2015:77800, 2018:88200, 2019:91800, 2020:90500,
    2021:97000, 2022:100500, 2023:106000, 2024:107000,
    2025:111800
  };
  const totalRev = interp(totalRevPoints);

  // Revenue category shares by era (% of total)
  const revShares = {
    // 1900-1920: property tax dominance
    1900: { propertyTax:.78, incomeTax:0, salesTax:0, businessTax:.02, stateAid:.03, federalAid:0, otherTax:.05, fees:.08, other:.04 },
    1910: { propertyTax:.75, incomeTax:0, salesTax:0, businessTax:.03, stateAid:.04, federalAid:0, otherTax:.05, fees:.08, other:.05 },
    1920: { propertyTax:.72, incomeTax:0, salesTax:0, businessTax:.04, stateAid:.05, federalAid:0, otherTax:.05, fees:.08, other:.06 },
    1930: { propertyTax:.70, incomeTax:0, salesTax:0, businessTax:.04, stateAid:.07, federalAid:.01, otherTax:.05, fees:.07, other:.06 },
    // 1935: sales tax introduced (1934)
    1935: { propertyTax:.60, incomeTax:0, salesTax:.08, businessTax:.04, stateAid:.08, federalAid:.05, otherTax:.04, fees:.06, other:.05 },
    1940: { propertyTax:.58, incomeTax:0, salesTax:.09, businessTax:.04, stateAid:.09, federalAid:.04, otherTax:.04, fees:.07, other:.05 },
    1945: { propertyTax:.55, incomeTax:0, salesTax:.10, businessTax:.05, stateAid:.10, federalAid:.03, otherTax:.04, fees:.07, other:.06 },
    1950: { propertyTax:.52, incomeTax:0, salesTax:.11, businessTax:.06, stateAid:.12, federalAid:.02, otherTax:.04, fees:.07, other:.06 },
    1955: { propertyTax:.50, incomeTax:0, salesTax:.11, businessTax:.06, stateAid:.14, federalAid:.02, otherTax:.04, fees:.07, other:.06 },
    // 1961: from the book (exact figures / total)
    1961: { propertyTax:.4376, incomeTax:0, salesTax:.1289, businessTax:.0873, stateAid:.1936, federalAid:.0469, otherTax:.0700, fees:.0200, other:.0157 },
    // 1966: from the book
    1966: { propertyTax:.4027, incomeTax:0, salesTax:.1092, businessTax:.0903, stateAid:.2886, federalAid:.0880, otherTax:.0050, fees:.0100, other:.0062 },
    // 1971: from the book (income tax introduced 1966)
    1971: { propertyTax:.2774, incomeTax:.0266, salesTax:.0587, businessTax:.0000, stateAid:.3148, federalAid:.1716, otherTax:.0658, fees:.0081, other:.0770 },
    // 1975: fiscal crisis — borrowing heavy
    1975: { propertyTax:.2400, incomeTax:.0400, salesTax:.0550, businessTax:.0300, stateAid:.2800, federalAid:.1500, otherTax:.0500, fees:.0200, other:.1350 },
    // 1978: post-MAC
    1978: { propertyTax:.2600, incomeTax:.0600, salesTax:.0600, businessTax:.0350, stateAid:.2500, federalAid:.1400, otherTax:.0500, fees:.0300, other:.0750 },
    // 1985: Koch recovery, federal aid declining
    1985: { propertyTax:.2700, incomeTax:.0800, salesTax:.0650, businessTax:.0500, stateAid:.2200, federalAid:.1100, otherTax:.0600, fees:.0400, other:.0650 },
    // 1990
    1990: { propertyTax:.2700, incomeTax:.0900, salesTax:.0700, businessTax:.0550, stateAid:.2100, federalAid:.1000, otherTax:.0600, fees:.0400, other:.0650 },
    // 1995
    1995: { propertyTax:.2800, incomeTax:.0950, salesTax:.0700, businessTax:.0500, stateAid:.2000, federalAid:.1000, otherTax:.0600, fees:.0400, other:.0650 },
    // 2000
    2000: { propertyTax:.2700, incomeTax:.1200, salesTax:.0750, businessTax:.0650, stateAid:.1800, federalAid:.0900, otherTax:.0550, fees:.0500, other:.0550 },
    // 2005
    2005: { propertyTax:.2900, incomeTax:.1100, salesTax:.0700, businessTax:.0600, stateAid:.1800, federalAid:.0950, otherTax:.0550, fees:.0450, other:.0550 },
    // 2010
    2010: { propertyTax:.3000, incomeTax:.1100, salesTax:.0700, businessTax:.0550, stateAid:.1750, federalAid:.1000, otherTax:.0550, fees:.0400, other:.0550 },
    // 2015
    2015: { propertyTax:.3100, incomeTax:.1250, salesTax:.0750, businessTax:.0550, stateAid:.1650, federalAid:.0900, otherTax:.0550, fees:.0400, other:.0450 },
    // 2020: COVID — federal aid surge
    2020: { propertyTax:.3100, incomeTax:.1200, salesTax:.0600, businessTax:.0500, stateAid:.1600, federalAid:.1200, otherTax:.0500, fees:.0350, other:.0550 },
    // 2025
    2025: { propertyTax:.3000, incomeTax:.1300, salesTax:.0800, businessTax:.0600, stateAid:.1550, federalAid:.1000, otherTax:.0550, fees:.0400, other:.0400 }
  };

  // Interpolate shares between known years
  function interpShares(sharePoints, year) {
    const knownYears = Object.keys(sharePoints).map(Number).sort((a,b) => a-b);
    // Find bounding years
    let lo = knownYears[0], hi = knownYears[knownYears.length-1];
    if (year <= lo) return sharePoints[lo];
    if (year >= hi) return sharePoints[hi];
    for (const ky of knownYears) {
      if (ky <= year) lo = ky;
    }
    for (const ky of knownYears) {
      if (ky > year) { hi = ky; break; }
    }
    if (lo === hi) return sharePoints[lo];
    const t = (year - lo) / (hi - lo);
    const result = {};
    const loShares = sharePoints[lo];
    const hiShares = sharePoints[hi];
    for (const key in loShares) {
      result[key] = loShares[key] + t * ((hiShares[key] || 0) - loShares[key]);
    }
    return result;
  }

  // ---- Build Full Dataset ----
  const years = {};
  for (let y = 1900; y <= 2025; y++) {
    const te = totalExp[y] || 0;
    const tr = totalRev[y] || 0;
    const es = interpShares(expShares, y);
    const rs = interpShares(revShares, y);

    const expenditures = {};
    const revenue = {};

    // Apply shares and normalize so they sum to total
    let eSum = 0;
    for (const k in es) {
      expenditures[k] = r1(te * es[k]);
      eSum += expenditures[k];
    }
    // Adjust 'other' to make sum exact
    if (eSum > 0 && expenditures.other !== undefined) {
      expenditures.other = r1(expenditures.other + (te - eSum));
    }

    let rSum = 0;
    for (const k in rs) {
      revenue[k] = r1(tr * rs[k]);
      rSum += revenue[k];
    }
    if (rSum > 0 && revenue.other !== undefined) {
      revenue.other = r1(revenue.other + (tr - rSum));
    }

    years[y] = { expenditures, revenue };
  }

  // ---- Override with exact book values where available ----
  // FY 1960-61
  years[1961].expenditures = {
    education:587.5, police:236.1, fire:122.0, welfare:350.5,
    health:229.9, debtService:212.7, pension:130.0, sanitation:131.5,
    higherEd:53.2, corrections:42.5, housing:35.5, parks:42.5,
    transport:59.1, other:132.2
  };
  years[1961].revenue = {
    propertyTax:1028.3, incomeTax:0, salesTax:303.0, businessTax:205.2,
    stateAid:454.9, federalAid:110.3, otherTax:164.5, fees:47.0, other:37.0
  };

  // FY 1965-66
  years[1966].expenditures = {
    education:893.2, police:308.9, fire:160.7, welfare:718.4,
    health:372.9, debtService:280.4, pension:187.0, sanitation:186.8,
    higherEd:92.8, corrections:61.1, housing:53.9, parks:53.9,
    transport:71.9, other:154.8
  };
  years[1966].revenue = {
    propertyTax:1409.4, incomeTax:0, salesTax:382.1, businessTax:316.0,
    stateAid:1010.1, federalAid:307.9, otherTax:17.5, fees:35.0, other:21.7
  };

  // FY 1970-71
  years[1971].expenditures = {
    education:1839.0, police:602.1, fire:267.0, welfare:2309.9,
    health:679.5, debtService:507.6, pension:374.8, sanitation:321.7,
    higherEd:332.7, corrections:124.9, housing:101.5, parks:85.9,
    transport:117.1, other:145.2
  };
  years[1971].revenue = {
    propertyTax:2080.4, incomeTax:199.4, salesTax:440.0, businessTax:0,
    stateAid:2360.6, federalAid:1286.6, otherTax:493.6, fees:60.8, other:578.6
  };

  // ---- Export ----
  window.NYC_BUDGET_DATA = {
    cpi: CPI,
    cpiBase: 314.2,
    mayors: MAYORS,
    annotations: ANNOTATIONS,
    years: years
  };
})();
