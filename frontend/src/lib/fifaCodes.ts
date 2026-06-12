// FIFA trigrams for the vertical code on sticker cards.
export const FIFA_CODES: Record<string, string> = {
  'Czech Republic': 'CZE', Mexico: 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Bosnia and Herzegovina': 'BIH', Canada: 'CAN', Qatar: 'QAT', Switzerland: 'SUI',
  Brazil: 'BRA', Haiti: 'HAI', Morocco: 'MAR', Scotland: 'SCO',
  Australia: 'AUS', Paraguay: 'PAR', Turkey: 'TUR', 'United States': 'USA',
  'Curaçao': 'CUW', Ecuador: 'ECU', Germany: 'GER', 'Ivory Coast': 'CIV',
  Japan: 'JPN', Netherlands: 'NED', Sweden: 'SWE', Tunisia: 'TUN',
  Belgium: 'BEL', Egypt: 'EGY', Iran: 'IRN', 'New Zealand': 'NZL',
  'Cape Verde': 'CPV', 'Saudi Arabia': 'KSA', Spain: 'ESP', Uruguay: 'URU',
  France: 'FRA', Iraq: 'IRQ', Norway: 'NOR', Senegal: 'SEN',
  Algeria: 'ALG', Argentina: 'ARG', Austria: 'AUT', Jordan: 'JOR',
  Colombia: 'COL', 'DR Congo': 'COD', Portugal: 'POR', Uzbekistan: 'UZB',
  Croatia: 'CRO', England: 'ENG', Ghana: 'GHA', Panama: 'PAN',
}

export function fifaCode(team: string): string {
  return FIFA_CODES[team] ?? team.slice(0, 3).toUpperCase()
}
