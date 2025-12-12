export enum EnergyCalculationFormula {
  // Adultos e Idosos
  HARRIS_BENEDICT_1984 = 'harris-benedict-1984',
  HARRIS_BENEDICT_1919 = 'harris-benedict-1919',
  FAO_WHO_2004 = 'fao-who-2004',
  EER_IOM_2005 = 'eer-iom-2005',
  EER_2023 = 'eer-2023',
  KATCH_MCARDLE_1996 = 'katch-mcardle-1996',
  CUNNINGHAM_1980 = 'cunningham-1980',
  MIFFLIN_OBESIDADE_1990 = 'mifflin-obesidade-1990',
  MIFFLIN_SOBREPESO_1990 = 'mifflin-sobrepeso-1990',
  HENRY_REES_1991 = 'henry-rees-1991',
  TINSLEY_POR_PESO_2018 = 'tinsley-por-peso-2018',
  TINSLEY_POR_MLG_2018 = 'tinsley-por-mlg-2018',
  GET_POR_FORMULA_BOLSO = 'get-por-formula-bolso',
  COLOCAR_TMB_MANUALMENTE = 'colocar-tmb-manualmente',
  COLOCAR_GET_MANUALMENTE = 'colocar-get-manualmente',

  // Crianças
  EER_IOM_2005_INFANTIL = 'eer-iom-2005-infantil',
  EER_2023_INFANTIL = 'eer-2023-infantil',
  FAO_WHO_2004_INFANTIL = 'fao-who-2004-infantil',
  SCHOFIELD_1985_INFANTIL = 'schofield-1985-infantil',

  // Gestantes
  MIN_SAUDE_GESTANTE_2005 = 'min-saude-gestante-2005',
  EER_2023_GESTANTE = 'eer-2023-gestante',

  // Lactantes
  EER_2023_LACTANTE = 'eer-2023-lactante',

  // Integrações
  HANDYMET = 'handymet',
}
