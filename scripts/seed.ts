import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { User, UserSchema } from '../src/users/schemas/user.schema'
import { Patient, PatientSchema } from '../src/patients/schemas/patient.schema'
import { MealPlans, MealPlansSchema } from '../src/patients/meal-plans/schemas/meal-plans.schema'
import { Anamnesis, AnamnesisSchema } from '../src/patients/anamnesis/schemas/anamnesis.schema'
import {
  EnergyCalculation,
  EnergyCalculationSchema,
} from '../src/patients/energy-calculations/schemas/energy-calculations.schema'
import { EnergyCalculationFormula } from '../src/patients/energy-calculations/enums/energy-calculation-formula.enum'
import { PhysicalActivityFactor } from '../src/patients/energy-calculations/enums/physical-activity-factor.enum'
import { InjuryFactor } from '../src/patients/energy-calculations/enums/injury-factor.enum'
import { VALID_FOOD_IDS } from '../src/foods/data/food-data'
import { exit } from 'process'

const firstNames = [
  'Ana', 'João', 'Maria', 'Pedro', 'Carla', 'Roberto', 'Fernanda', 'Lucas',
  'Juliana', 'Ricardo', 'Patricia', 'Marcos', 'Beatriz', 'Felipe', 'Camila',
  'Rafael', 'Larissa', 'Thiago', 'Mariana', 'Gabriel', 'Isabela', 'Bruno',
  'Amanda', 'Diego', 'Vanessa', 'Rodrigo', 'Renata', 'Gustavo', 'Tatiana',
  'Andre', 'Daniela', 'Leonardo', 'Priscila', 'Eduardo', 'Monica', 'Paulo',
  'Adriana', 'Vinicius', 'Carolina', 'Henrique', 'Leticia', 'Alexandre',
]

const lastNames = [
  'Silva', 'Santos', 'Costa', 'Oliveira', 'Mendes', 'Alves', 'Lima', 'Ferreira',
  'Rocha', 'Souza', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Araujo',
  'Barbosa', 'Martins', 'Carvalho', 'Gomes', 'Ribeiro', 'Reis', 'Morais',
  'Cardoso', 'Teixeira', 'Dias', 'Monteiro', 'Cavalcanti', 'Freitas', 'Ramos',
  'Machado', 'Castro', 'Nunes', 'Moreira', 'Correia', 'Fernandes', 'Azevedo',
]

const mealNames = [
  'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar',
  'Ceia', 'Pré-treino', 'Pós-treino', 'Colação', 'Merenda',
]

const mealTimes = [
  '06:00', '07:00', '07:30', '08:00', '09:00', '10:00', '10:30', '11:00',
  '12:00', '12:30', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '19:30', '20:00', '21:00', '22:00',
]

const anamnesisTitles = [
  'Avaliação inicial', 'Revisão 30 dias', 'Acompanhamento 60 dias', 'Primeira consulta',
  'Consulta de rotina', 'Avaliação nutricional', 'Consulta de retorno',
  'Avaliação de composição corporal', 'Ajuste de macronutrientes', 'Acompanhamento semanal',
  'Consulta de emergência', 'Revisão trimestral', 'Planejamento de competição',
  'Avaliação pós-cirúrgica', 'Consulta de follow-up', 'Avaliação laboratorial',
]

const anamnesisDescriptions = [
  'Paciente relata dores lombares leves, rotina sedentária e sono irregular.',
  'Perda de 2kg, melhora do sono, adesão parcial ao plano alimentar.',
  'Ganho de 2.5kg, força aumentada. Manter protocolo atual.',
  'Paciente busca ganho de massa muscular. Histórico de treinos regulares.',
  'Paciente relata melhora no sono e digestão após ajustes na dieta.',
  'Paciente com histórico de diabetes tipo 2 na família.',
  'Paciente apresenta boa adesão ao plano alimentar.',
  'Bioimpedância realizada: massa magra 65kg, massa gorda 15kg.',
  'Paciente relata fadiga durante treinos.',
  'Paciente manteve peso estável, melhorou qualidade do sono.',
  'Paciente relata desconforto gástrico após refeições.',
  'Avaliação completa: perda de 5kg, melhora de exames laboratoriais.',
  'Paciente atleta com competição em 8 semanas.',
  'Paciente em recuperação pós-cirúrgica.',
  'Follow-up após 3 meses de tratamento.',
  'Exames laboratoriais dentro da normalidade.',
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)]
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateRandomName(): string {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`
}

function generateRandomEmail(userEmail: string, counter: number): string {
  const userPrefix = userEmail.split('@')[0]
  return `patient${counter}.${userPrefix}@example.com`
}

function generateRandomPhone(counter: number): string {
  const area = randomInt(11, 99)
  const first = String(randomInt(9000, 9999))
  const second = String(randomInt(1000, 9999))
  return `+55 ${area} ${first}-${second}`
}

function generateRandomBirthDate(): Date {
  const year = randomInt(1950, 2010)
  const month = randomInt(0, 11)
  const day = randomInt(1, 28)
  return new Date(year, month, day)
}

function generateRandomGender(): 'male' | 'female' {
  return Math.random() < 0.5 ? 'male' : 'female'
}

function generateRandomEnergyCalculation() {
  const formulas = Object.values(EnergyCalculationFormula)
  const activityFactors = Object.values(PhysicalActivityFactor).filter(
    (v) => typeof v === 'number',
  ) as number[]
  const injuryFactors = Object.values(InjuryFactor).filter(
    (v) => typeof v === 'number',
  ) as number[]
  
  return {
    height: randomInt(150, 200),
    weight: randomInt(45, 120),
    energyCalculationFormula: randomElement(formulas),
    physicalActivityFactor: randomElement(activityFactors),
    injuryFactor: randomElement(injuryFactors),
    pregnancyEnergyAdditional: Math.random() < 0.1 ? randomInt(200, 500) : 0,
  }
}

function generateRandomMealPlan(index: number) {
  const mealCount = randomInt(3, 6)
  const meals: Array<{
    name: string
    time: string
    items: Array<{ foodId: string; quantityGrams: number }>
  }> = []
  
  for (let i = 0; i < mealCount; i++) {
    const mealName = randomElement(mealNames)
    const mealTime = randomElement(mealTimes)
    const itemCount = randomInt(1, 4)
    const items: Array<{ foodId: string; quantityGrams: number }> = []
    
    const availableFoods = randomElements(VALID_FOOD_IDS, itemCount)
    for (const food of availableFoods) {
      items.push({
        foodId: food,
        quantityGrams: randomInt(50, 300),
      })
    }
    
    meals.push({
      name: mealName,
      time: mealTime,
      items,
    })
  }
  
  return {
    title: `Plano ${index + 1}`,
    meals,
  }
}

function generateRandomAnamnesisItem() {
  return {
    title: randomElement(anamnesisTitles),
    description: randomElement(anamnesisDescriptions),
  }
}

async function main() {
  const uri = process.env.MONGO_URI
  const dbName = process.env.MONGO_DB_NAME
  if (!uri) {
    throw new Error('MONGO_URI must be defined to run seed')
  }
  if (!dbName) {
    throw new Error('MONGO_DB_NAME must be defined to run seed')
  }
  await mongoose.connect(uri, { dbName })

  const UserModel = mongoose.model<User>('User', UserSchema)
  const PatientModel = mongoose.model<Patient>('Patient', PatientSchema)
  const MealPlansModel = mongoose.model<MealPlans>('MealPlans', MealPlansSchema)
  const AnamnesisModel = mongoose.model<Anamnesis>('Anamnesis', AnamnesisSchema)
  const EnergyCalculationModel = mongoose.model<EnergyCalculation>(
    'EnergyCalculation',
    EnergyCalculationSchema,
  )

  const usersData = [
    { email: 'jane.doe@example.com', password: 'Jane@2024!Secure', role: 'user' as const },
    { email: 'john.roe@example.com', password: 'JohnRoe#Pass123', role: 'user' as const },
    { email: 'maria.silva@example.com', password: 'Maria$ilva2024', role: 'user' as const },
    { email: 'carlos.santos@example.com', password: 'C@rlosSant0s!', role: 'user' as const },
  ]

  const createdUsers: { id: string; email: string }[] = []
  for (const u of usersData) {
    const existing = await UserModel.findOne({ email: u.email }).lean()
    if (existing) {
      createdUsers.push({ id: existing._id.toString(), email: existing.email })
      continue
    }
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(u.password, salt)
    const created = await UserModel.create({ email: u.email, passwordHash, role: u.role })
    createdUsers.push({ id: created._id.toString(), email: created.email })
  }

  const PATIENTS_PER_USER = 12
  const MEAL_PLANS_PER_PATIENT = 12
  const ANAMNESIS_ITEMS_PER_PATIENT = 12
  const ENERGY_CALCULATIONS_PER_PATIENT = 12

  let totalPatients = 0
  let totalMealPlans = 0
  let totalAnamnesisItems = 0
  let totalEnergyCalculations = 0
  let patientCounter = 1

  for (const user of createdUsers) {
    const userId = new Types.ObjectId(user.id)

    let patientsCreatedForUser = 0
    while (patientsCreatedForUser < PATIENTS_PER_USER) {
      const fullName = generateRandomName()
      const email = generateRandomEmail(user.email, patientCounter)
      const phone = generateRandomPhone(patientCounter)
      const gender = generateRandomGender()
      const birthDate = generateRandomBirthDate()

      const existingByEmail = await PatientModel.findOne({ email }).lean()
      const existingByPhone = await PatientModel.findOne({ phone }).lean()
      if (existingByEmail || existingByPhone) {
        patientCounter++
        continue
      }

      const patient = await PatientModel.create({
        user: userId,
        fullName,
        gender,
        birthDate,
        phone,
        email,
      })
      const patientId = patient._id
      totalPatients++
      patientsCreatedForUser++
      patientCounter++

      const mealPlans = Array.from({ length: MEAL_PLANS_PER_PATIENT }, (_, i) =>
        generateRandomMealPlan(i),
      )

      const mealDoc = await MealPlansModel.findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $set: { plans: mealPlans } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (mealDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { mealPlans: mealDoc._id }, { new: false }).lean()
        totalMealPlans += MEAL_PLANS_PER_PATIENT
      }

      const anamnesisItems = Array.from({ length: ANAMNESIS_ITEMS_PER_PATIENT }, () =>
        generateRandomAnamnesisItem(),
      )

      const anamDoc = await AnamnesisModel.findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $set: { items: anamnesisItems } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (anamDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { anamnesis: anamDoc._id }, { new: false }).lean()
        totalAnamnesisItems += ANAMNESIS_ITEMS_PER_PATIENT
      }

      const energyCalculations = Array.from({ length: ENERGY_CALCULATIONS_PER_PATIENT }, () =>
        generateRandomEnergyCalculation(),
      )

      const energyDoc = await EnergyCalculationModel.findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $set: { calculations: energyCalculations } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (energyDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { energyCalculation: energyDoc._id }, { new: false }).lean()
        totalEnergyCalculations += ENERGY_CALCULATIONS_PER_PATIENT
      }
    }
  }

  console.log('✅ Seed completed successfully!')
  console.log(`   - ${createdUsers.length} users created`)
  console.log(`   - ${totalPatients} patients created`)
  console.log(`   - ${totalMealPlans} meal plans created`)
  console.log(`   - ${totalAnamnesisItems} anamnesis items created`)
  console.log(`   - ${totalEnergyCalculations} energy calculations created`)

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err)
  try {
    await mongoose.disconnect()
  } catch {}
  exit(1)
})
